import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import https from "https";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
let firebaseConfig: any = null;
let isFirebaseConfigured = false;
try {
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE");
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json on server:", e);
}

// Cache for Google's public keys
let googlePublicKeys: Record<string, string> = {};
let keysExpiryTime = 0;

async function fetchGooglePublicKeys(): Promise<Record<string, string>> {
  if (googlePublicKeys && Object.keys(googlePublicKeys).length > 0 && Date.now() < keysExpiryTime) {
    return googlePublicKeys;
  }
  return new Promise((resolve, reject) => {
    https.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          googlePublicKeys = JSON.parse(data);
          const cacheControl = res.headers["cache-control"];
          let maxAge = 21600; // 6 hours
          if (cacheControl) {
            const match = cacheControl.match(/max-age=(\d+)/);
            if (match) maxAge = parseInt(match[1]);
          }
          keysExpiryTime = Date.now() + (maxAge * 1000);
          resolve(googlePublicKeys);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");

    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));

    const kid = header.kid;
    if (!kid) throw new Error("Missing kid in JWT header");

    const keys = await fetchGooglePublicKeys();
    const cert = keys[kid];
    if (!cert) throw new Error("Public key not found for kid");

    const verify = crypto.createVerify("RSA-SHA256");
    verify.write(`${parts[0]}.${parts[1]}`);
    verify.end();

    const isValid = verify.verify(cert, parts[2], "base64url");
    if (!isValid) throw new Error("Invalid JWT signature");

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) throw new Error("Token expired");
    if (payload.iat > now + 300) throw new Error("Token issued in future");
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Invalid issuer");
    if (payload.aud !== projectId) throw new Error("Invalid audience");

    return payload;
  } catch (error) {
    console.error("Firebase token verification failed on server:", error);
    return null;
  }
}

const db = new Database("mural.db");
console.log("Database connected.");

try {
  const test = db.prepare("SELECT 1").get();
  console.log("Database test query successful:", test);
} catch (e) {
  console.error("Database test query failed:", e);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'student',
    points INTEGER DEFAULT 0,
    last_login TEXT
  );
`);

// --- Database Cleanup: Remove duplicate emails ---
try {
  // 1. Merge ifnmg into ifmg for the specific leader email
  const ifnmgEmail = "vlp2@aluno.ifnmg.edu.br";
  const ifmgEmail = "vlp2@aluno.ifmg.edu.br";
  
  const ifnmgUser = db.prepare("SELECT * FROM users WHERE email = ?").get(ifnmgEmail) as any;
  const ifmgUser = db.prepare("SELECT * FROM users WHERE email = ?").get(ifmgEmail) as any;
  
  if (ifnmgUser && ifmgUser && ifnmgUser.id !== ifmgUser.id) {
    console.log(`Mesclando ${ifnmgEmail} em ${ifmgEmail}`);
    db.transaction(() => {
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(ifnmgUser.points || 0, ifmgUser.id);
      db.prepare("UPDATE activity_completions SET user_id = ? WHERE user_id = ?").run(ifmgUser.id, ifnmgUser.id);
      db.prepare("UPDATE announcement_views SET user_id = ? WHERE user_id = ?").run(ifmgUser.id, ifnmgUser.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(ifnmgUser.id);
    })();
  } else if (ifnmgUser && !ifmgUser) {
    console.log(`Corrigindo e-mail de ${ifnmgEmail} para ${ifmgEmail}`);
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(ifmgEmail, ifnmgUser.id);
  }

  const duplicates = db.prepare(`
    SELECT email, COUNT(*) as count 
    FROM users 
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email 
    HAVING count > 1
  `).all() as any[];

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate emails. Starting cleanup...`);
    db.transaction(() => {
      for (const dup of duplicates) {
        // Keep the one with most points or most recent login
        const records = db.prepare("SELECT id FROM users WHERE email = ? ORDER BY points DESC, last_login DESC").all(dup.email) as any[];
        const keepId = records[0].id;
        const deleteIds = records.slice(1).map(r => r.id);
        
        for (const id of deleteIds) {
          console.log(`Merging duplicate user ${id} into ${keepId} (Email: ${dup.email})`);
          // Update foreign keys to the kept ID
          db.prepare("UPDATE announcements SET author_id = ? WHERE author_id = ?").run(keepId, id);
          db.prepare("UPDATE activities SET author_id = ? WHERE author_id = ?").run(keepId, id);
          
          // For completions and views, we use INSERT OR IGNORE to avoid primary key conflicts
          db.prepare("INSERT OR IGNORE INTO activity_completions (activity_id, user_id, points_awarded) SELECT activity_id, ?, points_awarded FROM activity_completions WHERE user_id = ?").run(keepId, id);
          db.prepare("DELETE FROM activity_completions WHERE user_id = ?").run(id);
          
          db.prepare("INSERT OR IGNORE INTO announcement_views (announcement_id, user_id) SELECT announcement_id, ? FROM announcement_views WHERE user_id = ?").run(keepId, id);
          db.prepare("DELETE FROM announcement_views WHERE user_id = ?").run(id);
          
          db.prepare("INSERT OR IGNORE INTO student_activity_status (activity_id, user_id, status) SELECT activity_id, ?, status FROM student_activity_status WHERE user_id = ?").run(keepId, id);
          db.prepare("DELETE FROM student_activity_status WHERE user_id = ?").run(id);
          
          // Finally delete the duplicate user
          db.prepare("DELETE FROM users WHERE id = ?").run(id);
        }
      }
    })();
    console.log("Cleanup completed successfully.");
  }
} catch (e) {
  console.error("Database cleanup failed:", e);
}

// Migration: Add columns if they don't exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN last_login TEXT").run();
} catch (e: any) {}

try {
  db.prepare("ALTER TABLE activities ADD COLUMN subject TEXT").run();
} catch (e: any) {}

try {
  db.prepare("ALTER TABLE activities ADD COLUMN pdf_data TEXT").run();
} catch (e: any) {}

try {
  db.prepare("ALTER TABLE announcements ADD COLUMN is_important INTEGER DEFAULT 0").run();
} catch (e: any) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    date TEXT,
    is_important INTEGER DEFAULT 0,
    author_id TEXT,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    deadline TEXT,
    points INTEGER,
    subject TEXT,
    pdf_data TEXT,
    author_id TEXT,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_completions (
    activity_id INTEGER,
    user_id TEXT,
    points_awarded INTEGER,
    PRIMARY KEY (activity_id, user_id),
    FOREIGN KEY(activity_id) REFERENCES activities(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS announcement_views (
    announcement_id INTEGER,
    user_id TEXT,
    PRIMARY KEY (announcement_id, user_id),
    FOREIGN KEY(announcement_id) REFERENCES announcements(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS student_activity_status (
    activity_id INTEGER,
    user_id TEXT,
    status TEXT DEFAULT 'pending',
    PRIMARY KEY (activity_id, user_id),
    FOREIGN KEY(activity_id) REFERENCES activities(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  const onlineUsers = new Set<string>();

  app.use(express.json({ limit: "5gb" }));

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    socket.on("user:identify", (userId) => {
      socket.data.userId = userId;
      onlineUsers.add(userId);
      console.log(`User identified: ${userId}`);
      broadcastUpdate("users:updated");
      io.emit("users:online", Array.from(onlineUsers));
    });

    socket.on("users:get-online", () => {
      socket.emit("users:online", Array.from(onlineUsers));
    });

    socket.on("disconnect", () => {
      if (socket.data.userId) {
        onlineUsers.delete(socket.data.userId);
        console.log(`User disconnected: ${socket.data.userId}`);
        broadcastUpdate("users:updated");
        io.emit("users:online", Array.from(onlineUsers));
      }
    });
  });

  // Helper to broadcast updates
  const broadcastUpdate = (event: string, data?: any) => {
    io.emit(event, data);
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Middleware to resolve user id from Authorization or header securely
  const resolveUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let userId = req.headers["x-user-id"] as string;
    const authHeader = req.headers["authorization"] as string;

    if (isFirebaseConfigured && firebaseConfig && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = await verifyFirebaseIdToken(token, firebaseConfig.projectId);
      if (decoded) {
        userId = decoded.user_id || decoded.sub;
        req.headers["x-user-id"] = userId;
      } else {
        return res.status(401).json({ error: "Sua sessão expirou ou é inválida." });
      }
    }
    next();
  };

  // Middleware to check if user is leader after resolving identity
  const isLeader = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await resolveUser(req, res, () => {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
      if (user?.role === "leader") {
        next();
      } else {
        res.status(451).json({ error: "Forbidden: Leader role required" });
      }
    });
  };

  // --- Backup & Persistence Routes ---
  app.get("/api/admin/export", isLeader, (req, res) => {
    try {
      const users = db.prepare("SELECT * FROM users").all();
      const announcements = db.prepare("SELECT * FROM announcements").all();
      const activities = db.prepare("SELECT * FROM activities").all();
      const completions = db.prepare("SELECT * FROM activity_completions").all();
      const views = db.prepare("SELECT * FROM announcement_views").all();
      const studentStatus = db.prepare("SELECT * FROM student_activity_status").all();

      res.json({
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          users,
          announcements,
          activities,
          completions,
          views,
          studentStatus
        }
      });
    } catch (e) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.post("/api/admin/import", isLeader, (req, res) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "No data provided" });

    try {
      const currentUserId = req.headers["x-user-id"] as string;
      // Get current user data before clearing
      const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentUserId) as any;
      
      if (!currentUser) {
        return res.status(400).json({ error: "Current user not found in database" });
      }

      db.transaction(() => {
        // Clear existing content but be careful with users
        db.prepare("DELETE FROM announcement_views").run();
        db.prepare("DELETE FROM activity_completions").run();
        db.prepare("DELETE FROM student_activity_status").run();
        db.prepare("DELETE FROM announcements").run();
        db.prepare("DELETE FROM activities").run();
        
        // We DON'T delete all users anymore to prevent them from "disappearing"
        // if they joined after the backup. We will just update/insert from backup.
        
        // 1. Insert users from backup
        if (data.users && Array.isArray(data.users)) {
          const insertUser = db.prepare(`
            INSERT OR REPLACE INTO users (id, email, name, role, points, last_login)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          data.users.forEach((u: any) => {
            insertUser.run(u.id, u.email, u.name, u.role, u.points, u.last_login);
          });
        }

        // 2. Ensure current user exists and is a leader
        const checkUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentUserId);
        if (!checkUser) {
          db.prepare(`
            INSERT INTO users (id, email, name, role, points, last_login)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(currentUser.id, currentUser.email, currentUser.name, "leader", currentUser.points, currentUser.last_login);
        } else {
          db.prepare("UPDATE users SET role = 'leader' WHERE id = ?").run(currentUserId);
        }

        // 3. Insert other data
        if (data.activities && Array.isArray(data.activities)) {
          const insertActivity = db.prepare(`
            INSERT OR REPLACE INTO activities (id, title, description, deadline, points, subject, pdf_data, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          data.activities.forEach((a: any) => insertActivity.run(a.id, a.title, a.description, a.deadline, a.points, a.subject, a.pdf_data, a.author_id));
        }

        if (data.announcements && Array.isArray(data.announcements)) {
          const insertAnnouncement = db.prepare(`
            INSERT OR REPLACE INTO announcements (id, title, content, date, is_important, author_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          data.announcements.forEach((an: any) => insertAnnouncement.run(an.id, an.title, an.content, an.date, an.is_important, an.author_id));
        }

        if (data.completions && Array.isArray(data.completions)) {
          const insertCompletion = db.prepare(`
            INSERT OR REPLACE INTO activity_completions (user_id, activity_id, points_awarded)
            VALUES (?, ?, ?)
          `);
          data.completions.forEach((c: any) => insertCompletion.run(c.user_id, c.activity_id, c.points_awarded || 0));
        }

        if (data.views && Array.isArray(data.views)) {
          const insertView = db.prepare(`
            INSERT OR REPLACE INTO announcement_views (user_id, announcement_id)
            VALUES (?, ?)
          `);
          data.views.forEach((v: any) => insertView.run(v.user_id, v.announcement_id));
        }

        if (data.studentStatus && Array.isArray(data.studentStatus)) {
          const insertStatus = db.prepare(`
            INSERT OR REPLACE INTO student_activity_status (activity_id, user_id, status)
            VALUES (?, ?, ?)
          `);
          data.studentStatus.forEach((s: any) => insertStatus.run(s.activity_id, s.user_id, s.status || 'completed'));
        }
      })();
      
      res.json({ message: "Backup restaurado com sucesso" });
      broadcastUpdate("backup:restored");
    } catch (e) {
      console.error("Import error:", e);
      res.status(500).json({ error: `Falha na importação: ${e instanceof Error ? e.message : 'Erro desconhecido'}` });
    }
  });

  // Auth / User Routes
  app.post("/api/auth/sync", async (req, res) => {
    try {
      let { id, email, name } = req.body;
      const authHeader = req.headers["authorization"] as string;

      if (isFirebaseConfigured && firebaseConfig && authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decoded = await verifyFirebaseIdToken(token, firebaseConfig.projectId);
        if (decoded) {
          id = decoded.user_id || decoded.sub;
          email = decoded.email || email;
          name = decoded.name || name;
        } else {
          return res.status(401).json({ error: "Sua sessão de autenticação expirou ou é inválida." });
        }
      } else if (isFirebaseConfigured && firebaseConfig) {
        return res.status(401).json({ error: "O token de autorização JWT do Firebase é obrigatório." });
      }

      console.log(`Syncing user: ${name} (${email}) - ID: ${id}`);

      if (!id || !email) {
        console.warn("Sync failed: Missing ID or Email");
        return res.status(400).json({ error: "ID and Email are required" });
      }

      const extraLeaders = process.env.LEADER_EMAILS ? process.env.LEADER_EMAILS.split(",").map(e => e.trim().toLowerCase()) : [];
      const leaderEmails = [
        (process.env.LEADER_EMAIL || "vlp2@aluno.ifmg.edu.br").toLowerCase(),
        "victorlopes177777@gmail.com",
        "jblc@aluno.ifnmg.edu.br",
        ...extraLeaders
      ];
      const userEmail = (email || "").toLowerCase();
      const role = leaderEmails.includes(userEmail) ? "leader" : "student";
      const lastLogin = new Date().toISOString();

      // Check if user exists by ID
      const existingUserById = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      
      let finalId = id;

      if (existingUserById) {
        console.log(`Updating existing user by ID: ${id}`);
        // Update existing user
        db.prepare("UPDATE users SET name = ?, email = ?, role = ?, last_login = ? WHERE id = ?")
          .run(name || existingUserById.name, userEmail, role, lastLogin, id);
      } else {
        // Check if email is already taken by another ID
        const existingUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(userEmail) as any;
        
        if (existingUserByEmail) {
          console.log(`Email ${userEmail} already exists with different ID. Merging to ID: ${existingUserByEmail.id}`);
          // If email exists but ID is different, keep the OLD ID to maintain foreign key integrity
          finalId = existingUserByEmail.id;
          db.prepare("UPDATE users SET name = ?, role = ?, last_login = ? WHERE id = ?")
            .run(name || existingUserByEmail.name, role, lastLogin, finalId);
        } else {
          console.log(`Creating new user: ${name} (${userEmail})`);
          // New user entirely
          db.prepare("INSERT INTO users (id, email, name, role, last_login) VALUES (?, ?, ?, ?, ?)")
            .run(id, userEmail, name || "Estudante", role, lastLogin);
        }
      }

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(finalId);
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
      console.log(`User synced successfully. Total users in DB: ${userCount.count}`);
      
      broadcastUpdate("users:updated");
      res.json(user);
    } catch (error) {
      console.error("Auth sync error:", error);
      res.status(500).json({ 
        error: "Internal server error during authentication sync",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/users/:id", isLeader, (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting user: ${id}`);
      
      db.transaction(() => {
        // Update foreign keys to null or delete related records
        db.prepare("UPDATE announcements SET author_id = NULL WHERE author_id = ?").run(id);
        db.prepare("UPDATE activities SET author_id = NULL WHERE author_id = ?").run(id);
        db.prepare("DELETE FROM activity_completions WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM announcement_views WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM student_activity_status WHERE user_id = ?").run(id);
        
        db.prepare("DELETE FROM users WHERE id = ?").run(id);
      })();
      
      res.json({ success: true });
    } catch (e) {
      console.error("Delete user error:", e);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, name, email, points, role, last_login FROM users ORDER BY points DESC").all() as any[];
    const usersWithStatus = users.map(u => ({
      ...u,
      isOnline: onlineUsers.has(u.id)
    }));
    res.json(usersWithStatus);
  });

  app.get("/api/users/online", (req, res) => {
    const users = db.prepare("SELECT id, name, email, points, role, last_login FROM users").all() as any[];
    const onlineList = users
      .filter(u => onlineUsers.has(u.id))
      .map(u => ({
        id: u.id,
        name: u.name,
        role: u.role
      }));
    res.json(onlineList);
  });

  // Announcements Routes
  app.get("/api/announcements", (req, res) => {
    const announcements = db.prepare("SELECT * FROM announcements ORDER BY date DESC").all();
    res.json(announcements);
  });

  app.post("/api/announcements", isLeader, (req, res) => {
    const { title, content, is_important, author_id } = req.body;
    const date = new Date().toISOString();
    const result = db.prepare("INSERT INTO announcements (title, content, date, is_important, author_id) VALUES (?, ?, ?, ?, ?)").run(title, content, date, is_important ? 1 : 0, author_id);
    broadcastUpdate("announcements:updated");
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/announcements/:id", isLeader, (req, res) => {
    const { title, content, is_important } = req.body;
    db.prepare("UPDATE announcements SET title = ?, content = ?, is_important = ? WHERE id = ?").run(title, content, is_important ? 1 : 0, req.params.id);
    broadcastUpdate("announcements:updated");
    res.json({ success: true });
  });

  app.delete("/api/announcements/:id", isLeader, (req, res) => {
    db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
    broadcastUpdate("announcements:updated");
    res.json({ success: true });
  });

  // Activities Routes
  app.get("/api/activities", (req, res) => {
    // Exclude pdf_data from the list to reduce payload size and lag
    // But include a flag to show if it has a PDF
    const activities = db.prepare(`
      SELECT id, title, description, deadline, points, subject, author_id,
      (pdf_data IS NOT NULL AND pdf_data != '') as has_pdf
      FROM activities 
      ORDER BY deadline ASC
    `).all();
    res.json(activities);
  });

  app.get("/api/activities/:id/pdf", (req, res) => {
    const activity = db.prepare("SELECT pdf_data FROM activities WHERE id = ?").get(req.params.id) as { pdf_data: string } | undefined;
    if (activity) {
      res.json({ pdf_data: activity.pdf_data });
    } else {
      res.status(404).json({ error: "Activity not found" });
    }
  });

  app.post("/api/activities", isLeader, (req, res) => {
    const { title, description, deadline, points, subject, pdf_data, author_id } = req.body;
    const result = db.prepare("INSERT INTO activities (title, description, deadline, points, subject, pdf_data, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(title, description, deadline, points, subject, pdf_data, author_id);
    broadcastUpdate("activities:updated");
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/activities/:id", isLeader, (req, res) => {
    const { title, description, deadline, points, subject, pdf_data } = req.body;
    db.prepare("UPDATE activities SET title = ?, description = ?, deadline = ?, points = ?, subject = ?, pdf_data = ? WHERE id = ?").run(title, description, deadline, points, subject, pdf_data, req.params.id);
    broadcastUpdate("activities:updated");
    res.json({ success: true });
  });

  app.delete("/api/activities/:id", isLeader, (req, res) => {
    db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
    broadcastUpdate("activities:updated");
    res.json({ success: true });
  });

  // Points Management
  app.get("/api/activities/:id/completions", isLeader, (req, res) => {
    const completions = db.prepare("SELECT user_id FROM activity_completions WHERE activity_id = ?").all();
    res.json(completions.map((c: any) => c.user_id));
  });

  app.post("/api/activities/:id/toggle-completion", isLeader, (req, res) => {
    const { userId, points } = req.body;
    const activityId = req.params.id;

    const existing = db.prepare("SELECT * FROM activity_completions WHERE activity_id = ? AND user_id = ?").get(activityId, userId);

    if (existing) {
      // Remove points
      db.prepare("DELETE FROM activity_completions WHERE activity_id = ? AND user_id = ?").run(activityId, userId);
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(points, userId);
      broadcastUpdate("users:updated");
      res.json({ status: "removed" });
    } else {
      // Add points
      db.prepare("INSERT INTO activity_completions (activity_id, user_id, points_awarded) VALUES (?, ?, ?)").run(activityId, userId, points);
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(points, userId);
      broadcastUpdate("users:updated");
      res.json({ status: "added" });
    }
  });

  // Manual points adjustment
  app.post("/api/users/:id/adjust-points", isLeader, (req, res) => {
    const { amount } = req.body;
    db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(amount, req.params.id);
    broadcastUpdate("users:updated");
    res.json({ success: true });
  });

  // Announcement Views
  app.get("/api/announcements/views", resolveUser, (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const views = db.prepare("SELECT announcement_id FROM announcement_views WHERE user_id = ?").all(userId);
    res.json(views.map((v: any) => v.announcement_id));
  });

  app.post("/api/announcements/:id/view", resolveUser, (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const announcementId = req.params.id;
    db.prepare("INSERT OR IGNORE INTO announcement_views (announcement_id, user_id) VALUES (?, ?)").run(announcementId, userId);
    res.json({ success: true });
  });

  // Student Activity Status
  app.get("/api/activities/status", resolveUser, (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const status = db.prepare("SELECT activity_id FROM student_activity_status WHERE user_id = ? AND status = 'completed'").all(userId);
    res.json(status.map((s: any) => s.activity_id));
  });

  app.post("/api/activities/:id/toggle-status", resolveUser, (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const activityId = req.params.id;
    
    const existing = db.prepare("SELECT * FROM student_activity_status WHERE activity_id = ? AND user_id = ?").get(activityId, userId);
    if (existing) {
      db.prepare("DELETE FROM student_activity_status WHERE activity_id = ? AND user_id = ?").run(activityId, userId);
      broadcastUpdate("activities:updated"); // Trigger refresh for status
      res.json({ status: "pending" });
    } else {
      db.prepare("INSERT INTO student_activity_status (activity_id, user_id, status) VALUES (?, ?, 'completed')").run(activityId, userId);
      broadcastUpdate("activities:updated"); // Trigger refresh for status
      res.json({ status: "completed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized.");
    } catch (e) {
      console.error("Failed to initialize Vite middleware:", e);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { createContext, useContext, useEffect, useState, useCallback, Component, useRef, useMemo } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link,
  useLocation,
  useParams
} from "react-router-dom";
import { io } from "socket.io-client";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "firebase/auth";
import { auth, db, googleProvider, isFirebaseConfigured } from "./lib/firebase";
import { 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDocs,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { handleFirestoreError, OperationType } from "./lib/firestore-utils";
import { 
  Bell,
  Database,
  Download,
  Upload,
  LayoutDashboard, 
  Megaphone, 
  ClipboardList, 
  Trophy, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  ChevronRight,
  Medal,
  Sun,
  Moon,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  FileText,
  MessageCircle,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Copy,
  Smartphone,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Coffee,
  Compass,
  Map,
  GraduationCap,
  Utensils,
  Flame,
  Sprout,
  Truck,
  CalendarDays,
  Atom,
  Languages,
  Beaker,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

import firebaseConfig from "../firebase-applet-config.json";

// --- Types ---
interface User {
  id: string;
  email: string;
  name: string;
  role: "leader" | "student";
  points: number;
  last_login?: string;
  isOnline?: boolean;
  emoji?: string;
  bio?: string;
}

const formatDate = (dateStr: string | undefined | null, formatStr: string, options?: any) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Data inválida";
  try {
    return format(date, formatStr, options);
  } catch (e) {
    return "Erro na data";
  }
};

const IfnmgLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 72 98" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Column 1 */}
    <circle cx="10" cy="10" r="10" fill="#E2232B" />
    <rect x="0" y="26" width="20" height="20" rx="3.5" fill="#2D9F3C" />
    <rect x="0" y="52" width="20" height="20" rx="3.5" fill="#2D9F3C" />
    <rect x="0" y="78" width="20" height="20" rx="3.5" fill="#2D9F3C" />

    {/* Column 2 */}
    <rect x="26" y="0" width="20" height="20" rx="3.5" fill="#2D9F3C" />
    <rect x="26" y="26" width="20" height="20" rx="3.5" fill="#2D9F3C" />
    <rect x="26" y="52" width="20" height="20" rx="3.5" fill="#2D9F3C" />
    <rect x="26" y="78" width="20" height="20" rx="3.5" fill="#2D9F3C" />

    {/* Column 3 */}
    <rect x="52" y="0" width="20" height="20" rx="3.5" fill="#2D9F3C" />
    <rect x="52" y="52" width="20" height="20" rx="3.5" fill="#2D9F3C" />
  </svg>
);

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  is_important: boolean;
  author_id: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  deadline: string;
  points: number;
  subject?: string;
  pdf_data?: string;
  has_pdf?: boolean;
  author_id: string;
}

const SUBJECTS = [
  "Produção de Monogástricos",
  "Língua Portuguesa e Redação",
  "Física",
  "Geografia",
  "Biologia",
  "Química",
  "Culturas Anuais",
  "Espanhol",
  "História",
  "Educação Física",
  "Colocação em Comum",
  "Sociologia",
  "Matemática",
  "Irrigação",
  "Topografia",
  "Estudos da Literatura e das Artes",
  "Agroecologia"
];

// --- Setup Required Screen ---
const SetupRequired = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
    <div className="max-w-lg w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-emerald-100 dark:border-emerald-900/20 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuração Necessária</h1>
        <p className="text-gray-500 dark:text-zinc-400">O Firebase não foi configurado corretamente ou o domínio não está autorizado.</p>
      </div>
      
      <div className="space-y-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-sm">
        <p className="font-bold text-gray-700 dark:text-zinc-300">Siga estes passos para publicar:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-zinc-400">
          <li>Crie um projeto no <a href="https://console.firebase.google.com" target="_blank" className="text-emerald-600 underline">Firebase Console</a>.</li>
          <li>Ative o <strong>Google Auth</strong> em Authentication.</li>
          <li>Adicione este domínio aos domínios autorizados: <code className="bg-gray-200 dark:bg-zinc-700 px-1 rounded">{window.location.hostname}</code></li>
          <li>Configure as chaves no painel de <strong>Secrets</strong> (Configurações ⚙️).</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <button onClick={() => window.location.reload()} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all">
          Já configurei, testar agora
        </button>
      </div>
    </div>
  </div>
);

// --- Firestore Connection Test ---
async function testFirestoreConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase connection test failed: The client is offline. Please check your Firebase configuration.");
    }
  }
}
testFirestoreConnection();

// --- Toast System ---
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<{
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
} | null>(null);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-white font-medium flex items-center gap-2 min-w-[200px] ${
                toast.type === 'success' ? 'bg-emerald-600' :
                toast.type === 'error' ? 'bg-red-600' :
                'bg-zinc-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// --- Theme System ---
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (role?: "leader" | "student") => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: (role: "leader" | "student", name?: string) => Promise<void>;
  isConnected: boolean;
}

const socket = io();

const getAuthHeaders = async (currentUserId: string = "") => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-user-id": currentUserId
  };
  if (isFirebaseConfigured && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;
    } catch (e) {
      console.error("Error getting idToken on client:", e);
    }
  }
  return headers;
};

// --- Contexts ---
interface DataContextType {
  announcements: Announcement[];
  activities: Activity[];
  users: User[];
  loading: boolean;
  refreshAnnouncements: () => void;
  refreshActivities: () => void;
  refreshUsers: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isInitialAnnouncements = useRef(true);
  const isInitialActivities = useRef(true);

  const sendNativeNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { 
          body,
          icon: "https://cdn-icons-png.flaticon.com/512/564/564445.png" // School icon
        });
      } catch (e) {
        console.error("Native notification error:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setAnnouncements([]);
      setActivities([]);
      setUsers([]);
      setLoading(false);
      isInitialAnnouncements.current = true;
      isInitialActivities.current = true;
      return;
    }

    setLoading(true);
    const loadedCollections = new Set<string>();
    const totalToLoad = 3;

    const markAsLoaded = (collectionName: string) => {
      loadedCollections.add(collectionName);
      if (loadedCollections.size >= totalToLoad) {
        setLoading(false);
      }
    };

    // Safety timeout: if data doesn't load in 5 seconds, stop loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubAnnouncements = onSnapshot(
      query(collection(db, "announcements"), orderBy("date", "desc")),
      (snapshot) => {
        if (!isInitialAnnouncements.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data() as Announcement;
              if (data.author_id !== user.id) {
                showToast(`📢 Novo Aviso: ${data.title}`, "info");
                sendNativeNotification("📢 Novo Aviso no Mural", data.title);
              }
            }
          });
        }
        isInitialAnnouncements.current = false;
        
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Announcement));
        setAnnouncements(data);
        markAsLoaded("announcements");
      },
      (error) => {
        console.error("Announcements fetch error:", error);
        markAsLoaded("announcements");
      }
    );

    const unsubActivities = onSnapshot(
      query(collection(db, "activities"), orderBy("deadline", "asc")),
      (snapshot) => {
        if (!isInitialActivities.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data() as Activity;
              if (data.author_id !== user.id) {
                showToast(`📝 Nova Atividade: ${data.title}`, "success");
                sendNativeNotification("📝 Nova Atividade no Mural", data.title);
              }
            }
          });
        }
        isInitialActivities.current = false;

        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Activity));
        setActivities(data);
        markAsLoaded("activities");
      },
      (error) => {
        console.error("Activities fetch error:", error);
        markAsLoaded("activities");
      }
    );

    // Only sync users if authenticated via Firebase Auth
    let unsubUsers = () => {};
    if (auth.currentUser && !user.id.startsWith('demo-')) {
      unsubUsers = onSnapshot(
        query(collection(db, "users"), orderBy("points", "desc")),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
          setUsers(data);
          markAsLoaded("users");
        },
        (error) => {
          console.error("Users fetch error:", error);
          markAsLoaded("users");
        }
      );
    } else {
      markAsLoaded("users");
    }

    return () => {
      clearTimeout(timeoutId);
      unsubAnnouncements();
      unsubActivities();
      unsubUsers();
    };
  }, [user]);

  const refreshAnnouncements = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      const snapshot = await getDocs(query(collection(db, "announcements"), orderBy("date", "desc")));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Announcement));
      setAnnouncements(data);
    } catch (e) {
      console.error("Manual refresh error:", e);
    }
  }, []);

  const refreshActivities = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      const snapshot = await getDocs(query(collection(db, "activities"), orderBy("deadline", "asc")));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Activity));
      setActivities(data);
    } catch (e) {
      console.error("Manual refresh error:", e);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!isFirebaseConfigured || !auth.currentUser) return;
    try {
      const snapshot = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
      setUsers(data);
    } catch (e) {
      console.error("Manual refresh error:", e);
    }
  }, []);

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    const handleOnline = (ids: string[]) => {
      setOnlineUserIds(ids);
    };
    socket.on("users:online", handleOnline);
    socket.emit("users:get-online");

    return () => {
      socket.off("users:online", handleOnline);
    };
  }, []);

  const usersWithOnlineStatus = useMemo(() => {
    return users.map(u => ({
      ...u,
      isOnline: onlineUserIds.includes(u.id) || (user?.id === u.id)
    }));
  }, [users, onlineUserIds, user]);

  return (
    <DataContext.Provider value={{ 
      announcements, 
      activities, 
      users: usersWithOnlineStatus, 
      loading,
      refreshAnnouncements, 
      refreshActivities, 
      refreshUsers 
    }}>
      {children}
    </DataContext.Provider>
  );
};

const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const { showToast } = useToast();

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (isConnected && user?.id) {
      socket.emit("user:identify", user.id);
    }
  }, [isConnected, user]);

  const [pendingRole, setPendingRole] = useState<"leader" | "student" | null>(null);

  useEffect(() => {
    if (!auth || (typeof auth.onAuthStateChanged !== 'function' && !isFirebaseConfigured)) {
      setLoading(false);
      return;
    }

    // Safety timeout for auth
    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    // Handle redirect result
    if (isFirebaseConfigured) {
      getRedirectResult(auth).catch((error) => {
        console.error("Redirect login error:", error);
        if (error.code === 'auth/network-request-failed') {
          showToast("Erro de rede no login por redirecionamento. Verifique sua conexão.", "error");
        }
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeoutId);
      setLoading(true);
      try {
        if (firebaseUser) {
          try {
            const userRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDocFromServer(userRef);
            
            let userData: User;
            
            if (!userSnap.exists()) {
              // Determine role: specific email is leader, or use pendingRole
              const isFirstLeader = firebaseUser.email === "vlp2@aluno.ifmg.edu.br";
              const role = isFirstLeader ? "leader" : (pendingRole || "student");
              
              userData = {
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: firebaseUser.displayName || (role === "leader" ? "Líder" : "Estudante"),
                role: role,
                points: 0,
                last_login: new Date().toISOString()
              };
              await setDoc(userRef, userData);
            } else {
              userData = { id: userSnap.id, ...userSnap.data() } as User;
              const isFirstLeader = firebaseUser.email === "vlp2@aluno.ifmg.edu.br";
              
              // If it's the admin email but role isn't leader, update it
              if (isFirstLeader && userData.role !== 'leader') {
                userData.role = 'leader';
                await updateDoc(userRef, { 
                  role: 'leader',
                  last_login: new Date().toISOString() 
                });
              } else {
                // Update last login
                await updateDoc(userRef, { last_login: new Date().toISOString() });
              }
            }
            
            setUser(userData);
            setPendingRole(null);

            // Sync with server
            try {
              const headers = await getAuthHeaders(userData.id);
              await fetch("/api/auth/sync", {
                method: "POST",
                headers,
                body: JSON.stringify({
                  id: userData.id,
                  email: userData.email,
                  name: userData.name
                })
              });
            } catch (syncErr) {
              console.error("Server sync error:", syncErr);
            }
          } catch (error) {
            console.error("Sync error:", error);
            // If it's a permission error, we might still want to allow the user in
            // but they won't have their data synced.
            // We don't throw here to avoid blocking the UI.
          }
        } else {
          // Check for persisted demo session
          try {
            const savedDemoUser = localStorage.getItem("demo_user");
            if (savedDemoUser) {
              const demoData = JSON.parse(savedDemoUser);
              setUser({ 
                id: demoData.id, 
                email: demoData.email, 
                name: demoData.name,
                role: demoData.id.includes('leader') ? 'leader' : 'student',
                points: 0,
                last_login: new Date().toISOString()
              } as User);
            } else {
              setUser(null);
            }
          } catch (e) {
            console.error("LocalStorage error:", e);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (role?: "leader" | "student", useRedirect = false) => {
    if (!isFirebaseConfigured) {
      showToast("Configuração do Firebase ausente. Por favor, utilize o 'Modo Demo' ou configure as chaves no painel de segredos.", "error");
      return;
    }
    try {
      if (role) setPendingRole(role);
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      if (error.code === 'auth/user-disabled') {
        showToast("Esta conta foi desativada. Entre em contato com o administrador.", "error");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login popup was closed or cancelled.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.warn("Login popup closed by user.");
      } else if (error.code === 'auth/unauthorized-domain') {
        showToast("Este domínio não está autorizado no Firebase. Adicione '" + window.location.hostname + "' aos domínios autorizados no Console do Firebase (Authentication > Settings > Authorized domains).", "error");
      } else if (error.code === 'auth/network-request-failed') {
        showToast("Erro de rede ao conectar com o Firebase. Tentando via redirecionamento...", "info");
        // Fallback to redirect if popup fails with network error
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          showToast("Erro de rede persistente. Verifique sua conexão ou se o navegador está bloqueando cookies de terceiros.", "error");
        }
      } else {
        showToast("Erro ao entrar com Google: " + (error.message || "Verifique se as chaves do Firebase estão configuradas."), "error");
      }
    }
  };

  const demoLogin = async (role: "leader" | "student", customName?: string) => {
    const nameId = customName ? customName.toLowerCase().replace(/\s+/g, '-') : 'estudante';
    const demoId = role === "leader" ? "demo-leader" : `demo-student-${nameId}`;
    const demoUser: User = {
      id: demoId,
      email: role === "leader" ? "vlp2@aluno.ifmg.edu.br" : `${nameId}@demo.com`,
      name: customName || (role === "leader" ? "Líder Admin" : "Estudante"),
      role: role,
      points: 0,
      last_login: new Date().toISOString()
    };

    try {
      // Only try to write to Firestore if authenticated AND not a demo ID
      // Demo IDs should stay local to avoid permission issues for non-admins
      if (auth.currentUser && !demoId.startsWith('demo-')) {
        const userRef = doc(db, "users", demoId);
        await setDoc(userRef, demoUser, { merge: true });
      }
      
      setUser(demoUser);
      try {
        localStorage.setItem("demo_user", JSON.stringify({
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name
        }));
      } catch (e) {}
    } catch (error: any) {
      console.error("Demo login error:", error);
      handleFirestoreError(error, OperationType.WRITE, "users");
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem("demo_user");
    } catch (e) {}
    if (user?.id.startsWith("demo-")) {
      setUser(null);
    } else {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, demoLogin, isConnected }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Confirm Modal ---
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  isDestructive = false
}: ConfirmModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">{title}</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">{message}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                  isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const useConfirm = () => {
  const [config, setConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  }) => {
    setConfig({ ...options, isOpen: true });
  };

  const close = () => setConfig(prev => ({ ...prev, isOpen: false }));

  const ConfirmComponent = () => (
    <ConfirmModal
      isOpen={config.isOpen}
      title={config.title}
      message={config.message}
      onConfirm={config.onConfirm}
      onCancel={close}
      confirmText={config.confirmText}
      isDestructive={config.isDestructive}
    />
  );

  return { confirm, ConfirmComponent };
};

// --- Components ---

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-zinc-800 rounded-xl ${className}`} />
);

const AnnouncementSkeleton = () => (
  <div className="p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-3 w-1/4 mt-2" />
  </div>
);

const ActivitySkeleton = () => (
  <div className="p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
    <div className="space-y-2 flex-1">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="h-8 w-16 rounded-full" />
  </div>
);

const RankingSkeleton = () => (
  <div className="flex items-center p-4 gap-4 border-b border-gray-50 dark:border-zinc-800">
    <Skeleton className="w-8 h-6" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="w-16 h-6" />
  </div>
);

const MobileHeader = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-40 transition-colors duration-300">
      <h1 className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-3 tracking-tight">
        <IfnmgLogo className="w-6 h-8 shrink-0" />
        Mural da Sala
      </h1>
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={toggleTheme}
        className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 transition-all flex items-center justify-center shadow-sm"
      >
        {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
      </motion.button>
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Mural" },
    { path: "/avisos", icon: Megaphone, label: "Avisos" },
    { path: "/atividades", icon: ClipboardList, label: "Atividades" },
    { path: "/ranking", icon: Trophy, label: "Ranking" },
    { path: "/calendario", icon: CalendarIcon, label: "Calendário" },
    { path: "/horario", icon: Clock, label: "Horários" },
    { path: "/usuarios", icon: UserIcon, label: "Usuários" },
  ];

  if (user?.role === "leader") {
    navItems.push({ path: "/admin", icon: ShieldCheck, label: "Painel Líder" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 md:relative md:border-t-0 md:border-r md:w-64 md:h-screen p-2 md:p-5 flex md:flex-col justify-start md:justify-start gap-1 md:gap-4 z-50 overflow-x-auto md:overflow-x-visible scrollbar-none transition-colors duration-300">
      <div className="hidden md:block mb-8">
        <h1 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-3 tracking-tight">
          <IfnmgLogo className="w-7 h-10 shrink-0" />
          Mural da Sala
        </h1>
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">IFNMG Almenara</p>
      </div>
      
      <div className="flex md:flex-col md:w-full justify-start md:justify-start gap-1 md:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:px-4 md:py-3 rounded-xl md:w-full shrink-0 transition-all ${
                isActive 
                  ? "bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/10 dark:shadow-none" 
                  : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] md:text-sm font-semibold md:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="md:mt-auto flex md:flex-col gap-1 md:gap-1.5 md:border-t border-gray-100 dark:border-zinc-900 md:pt-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="hidden md:flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:px-4 md:py-3 rounded-xl text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-all text-left w-full shrink-0"
        >
          {isDark ? <Sun className="w-5 h-5 text-yellow-500 shrink-0" /> : <Moon className="w-5 h-5 text-indigo-500 shrink-0" />}
          <span className="text-[9px] md:text-sm font-semibold md:inline">
            {isDark ? "Tema Claro" : "Tema Escuro"}
          </span>
        </button>

        <Link
          to="/perfil"
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:px-4 md:py-3 rounded-xl transition-all md:w-full shrink-0 ${
            location.pathname === "/perfil" 
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm" 
              : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900"
          }`}
        >
          <UserIcon className="w-5 h-5 shrink-0" />
          <span className="text-[9px] md:text-sm font-semibold md:inline">Perfil</span>
        </Link>
        <button
          onClick={logout}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:px-4 md:py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all font-semibold md:w-full shrink-0"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="text-[9px] md:text-sm md:inline">Sair</span>
        </button>
      </div>
    </nav>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col md:flex-row transition-colors duration-300">
      <Navbar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
  const { login, demoLogin, user, loading, isConnected } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showLeaderForm, setShowLeaderForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLeaderLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      demoLogin("leader", "Líder Admin");
    } else {
      showToast("Senha administrativa incorreta.", "error");
    }
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim().length < 3) {
      showToast("Por favor, digite seu nome completo.", "error");
      return;
    }
    demoLogin("student", studentName);
  };

  const clearCache = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      showToast("Não foi possível limpar o cache.", "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#02130e] via-[#05261b] to-zinc-950 flex flex-col items-center justify-center gap-4">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"
      />
      <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest animate-pulse">Carregando o Mural...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02130e] via-[#05261b] to-zinc-950 flex flex-col items-center justify-center p-4 transition-all duration-300 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] -top-12 -left-12 pointer-events-none"></div>
      <div className="absolute w-[250px] h-[250px] bg-emerald-950/40 rounded-full blur-[60px] -bottom-10 -right-10 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="bg-zinc-900/45 backdrop-blur-2xl p-8 sm:p-10 rounded-[36px] shadow-2xl max-w-md w-full text-center border border-white/5 relative z-10"
      >
        <motion.div 
          whileHover={{ scale: 1.03, rotate: 3 }}
          className="bg-emerald-500/5 border border-emerald-500/15 w-20 h-[100px] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"
        >
          <IfnmgLogo className="w-10 h-14" />
        </motion.div>
        
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
          IFNMG Campus Almenara
        </span>

        <h1 className="text-3xl font-black text-white mt-4 mb-2 tracking-tight">Mural da Sala</h1>
        <p className="text-zinc-400 mb-8 text-sm sm:text-base leading-relaxed px-4">
          Acompanhe os avisos acadêmicos, prazos de atividades e sua pontuação de forma simples e interativa.
        </p>
        
        <div className="space-y-4">
          {!showLeaderForm && !showStudentForm ? (
            <div className="grid grid-cols-1 gap-4">
              {!isFirebaseConfigured && (
                <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400 text-xs font-semibold mb-2 border border-amber-500/20 text-left flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <span>Você está no Modo Local/Demonstração. Seus dados serão mantidos no dispositivo.</span>
                </div>
              )}
              
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isFirebaseConfigured ? login('student') : setShowStudentForm(true)}
                className="w-full bg-[#009664] text-white py-4.5 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#00a870] transition-all shadow-xl shadow-emerald-950/40 cursor-pointer"
              >
                {isFirebaseConfigured ? (
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6 bg-white rounded-md p-0.5 shadow-sm" alt="Google" />
                ) : (
                  <UserIcon className="w-5 h-5 text-emerald-100" />
                )}
                <span className="text-base">Entrar como Aluno</span>
              </motion.button>
 
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isFirebaseConfigured ? login('leader') : setShowLeaderForm(true)}
                className="w-full bg-[#1c1c1e] text-zinc-300 py-4.5 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#2c2c2e] hover:text-white transition-all border border-white/5 shadow-md cursor-pointer"
              >
                {isFirebaseConfigured ? (
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6 bg-white rounded-md p-0.5 shadow-sm" alt="Google" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-base">Acesso Administrativo</span>
              </motion.button>

              {isFirebaseConfigured && (
                <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-widest opacity-50 font-bold">
                  Firebase Project: {auth.app.options.projectId}
                </p>
              )}
            </div>
          ) : showLeaderForm ? (
            <form onSubmit={handleLeaderLogin} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Identificação</label>
                <input 
                  type="email"
                  required
                  placeholder="Seu e-mail cadastrado"
                  className="w-full p-4 rounded-2xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Senha</label>
                <input 
                  type="password"
                  required
                  placeholder="Sua senha administrativa"
                  className="w-full p-4 rounded-2xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-[#009664] text-white py-4 rounded-2xl font-black hover:bg-[#00a870] transition-all shadow-lg active:scale-95"
                >
                  Confirmar Acesso
                </motion.button>
                <button
                  type="button"
                  onClick={() => setShowLeaderForm(false)}
                  className="w-full text-zinc-500 hover:text-white text-sm font-bold py-2 transition-colors duration-200"
                >
                  Voltar para tela inicial
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStudentLogin} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Seu Nome Completo</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  className="w-full p-4 rounded-2xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600 font-medium"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-[#009664] text-white py-4 rounded-2xl font-black hover:bg-[#00a870] transition-all shadow-lg active:scale-95"
                >
                  Entrar no Mural
                </motion.button>
                <button
                  type="button"
                  onClick={() => setShowStudentForm(false)}
                  className="w-full text-zinc-500 hover:text-white text-sm font-bold py-2 transition-colors duration-200"
                >
                  Voltar para tela inicial
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {isConnected ? 'Servidor Conectado' : 'Sem conexão com o servidor'}
              </span>
            </div>
            
            <button 
              onClick={clearCache}
              className="text-[10px] text-zinc-600 hover:text-zinc-300 font-bold uppercase tracking-[0.2em] transition-all"
            >
              Limpar Cache do App
            </button>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-10 text-[10px] text-zinc-600 text-center max-w-xs leading-relaxed uppercase tracking-widest relative z-10 font-bold font-mono">
        v1.2.0 • IFNMG CAMPUS ALMENARA • Desenvolvido para a Turma
      </p>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { announcements, activities, users, loading } = useData();
  const [status, setStatus] = useState<string[]>([]);
  const [bannerPhrase, setBannerPhrase] = useState("");
  const location = useLocation();

  const onlineUsers = users.filter(u => u.isOnline && u.id !== user?.id);

  useEffect(() => {
    if (user && auth.currentUser) {
      const unsub = onSnapshot(
        query(collection(db, "activity_completions"), orderBy("activity_id")),
        (snapshot) => {
          const userCompletions = snapshot.docs
            .filter(doc => doc.data().user_id === user.id)
            .map(doc => doc.data().activity_id as string);
          setStatus(userCompletions);
        },
        (error) => handleFirestoreError(error, OperationType.GET, "activity_completions")
      );
      return unsub;
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const total = activities.length;
    const completed = activities.filter(a => status.includes(a.id)).length;

    const zeroPhrases = [
      "Vai deixar tudo pra última hora mesmo? 🤔 Faça uma atividade hoje!",
      "Tava morando em uma caverna? Olha o tanto de atividade acumulada! 🦕",
      "Nenhuma atividade concluída ainda? Que tal começarmos hoje? 💪",
      "O tempo está passando! Não deixe suas atividades da ALT 0125 acumularem! ⏳",
      "Alerta vermelho! 🚨 Suas notas vão chorar se você continuar com 0 concluídas!",
      "Preguiça? Lembre-se que no regime de alternância o tempo voa! Acorda pro mural! ⏰",
      "De grão em grão, a galinha enche o papo. De atividade em atividade, você passa de ano! 🐔",
      "O gado já foi solto no pasto e você ainda não soltou sua primeira entrega? Vamos lá! 🐂",
      "Seu futuro técnico em agropecuária depende desse clique. Comece agora! 🌾",
      "A procrastinação é a ladra do tempo. Não deixe o tempo voar sem entregar nada! ✈️"
    ];

    const highPhrases = [
      "Parabéns pelo esforço, continue assim! 🌟",
      "O bom de fazer as atividades logo é que você fica livre e não deixa acumular! 🎉",
      "Uau, tudo em dia por aqui! Excelente foco e dedicação! 🚀",
      "Seu empenho é inspirador! Que tal ajudar um colega hoje? 🤝",
      "Você está voando super alto! Alguém para esse líder dos estudos! 🦅",
      "Orgulho da turma! As entregas estão em dia e o descanso do fim de semana está garantido! 🏖️",
      "Um exemplo real de aluno de alternância. Mandou super bem! 👑",
      "Foco de aço! Continue tratorando todas as entregas! 🚜",
      "O sucesso gosta de velocidade. Suas entregas rápidas mostram que você é imparável! 🏎️",
      "Que espetáculo! Mais de 80% completo. A farda do IFNMG veste muito bem em você! 🎓"
    ];

    const inspiringPhrases = [
      "\"O sucesso é o acúmulo de pequenos esforços diários.\" Tenha um excelente dia de estudos!",
      "\"A persistência realiza o impossível.\" Mantenha o foco nos seus objetivos!",
      "Cada etapa concluída na ALT 0125 é um passo a mais rumo ao seu futuro de sucesso!",
      "Acredite em si mesmo e no seu potencial. Você é capaz de superar qualquer desafio!",
      "\"O aprendizado é a única coisa de que a mente nunca se cansa, nunca tem medo e nunca se arrepende.\"",
      "Organize seu tempo e colha os frutos de uma rotina de estudos produtiva! 📚",
      "Lembre-se: o suor de hoje na roça e no livro é a colheita farta de amanhã! 🌾",
      "Entre solos, plantas e animais: o verdadeiro técnico cultiva conhecimento todos os dias!",
      "Que seu dia seja produtivo, suas dúvidas sejam sanadas e suas entregas feitas sem estresse! ✨",
      "A agropecuária move o mundo, e o seu esforço estuda essa engrenagem!",
      "Mantenha a mente aberta e o caderno em mãos. Grandes mentes cultivam grandes ideias. 💡",
      "Um dia excelente começa com uma mente decidida e um planejamento bem feito! 📅",
      "Faça o seu melhor hoje, mesmo que seja um pequeno passo. Todo progresso é progresso! 🐢",
      "O IFNMG Almenara tem orgulho de ter alunos dedicados como você na nossa comunidade! ❤️",
      "\"Suba o primeiro degrau com fé. Não é necessário que você veja toda a escada, apenas dê o primeiro passo.\"",
      "O conhecimento é a ferramenta mais afiada de um profissional moderno!"
    ];

    let chosenList = inspiringPhrases;
    if (total > 0) {
      if (completed === 0) {
        chosenList = zeroPhrases;
      } else if (completed >= total * 0.8) {
        chosenList = highPhrases;
      }
    }

    // Pick a random phrase that is guaranteed to be dynamic and different on each tab change or visit
    const lastSessionKey = "last_banner_phrase";
    const lastPhrase = sessionStorage.getItem(lastSessionKey);
    let filteredList = chosenList.filter(p => p !== lastPhrase);
    if (filteredList.length === 0) filteredList = chosenList;
    const randomIdx = Math.floor(Math.random() * filteredList.length);
    const selectedPhrase = filteredList[randomIdx];
    sessionStorage.setItem(lastSessionKey, selectedPhrase);
    setBannerPhrase(selectedPhrase);
  }, [status.length, activities.length, loading, location.key]);

  const pendingActivitiesCount = activities.filter(a => !status.includes(a.id)).length;
  const importantAnnouncementsCount = announcements.filter(a => a.is_important).length;
  const sortedUsersList = [...users].sort((a, b) => b.points - a.points);
  const myRankNum = sortedUsersList.findIndex(u => u.id === user?.id) + 1;

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner Card */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#18181b] text-white p-6 md:p-8 shadow-xl border border-emerald-650/20"
      >
        {/* Modern Mesh Glow background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-60 h-60 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Modern Architectural Tech Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Dynamic & Transparent Floating IFNMG logo */}
        <div className="absolute -right-12 -bottom-16 opacity-10 hover:opacity-15 transition-all duration-700 transform rotate-12 scale-110 pointer-events-none">
          <IfnmgLogo className="w-64 h-[350px]" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                  IFNMG Campus Almenara
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 align-middle">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  {users.filter(u => u.isOnline).length} Online
                </span>
                {user?.role === "leader" && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full">Líder</span>
                )}
              </div>
              <h2 className="text-3xl font-black tracking-tight pt-1">
                Olá, {user?.name.split(' ')[0]}! 👋
              </h2>
              <p className="text-emerald-100/80 text-xs sm:text-sm max-w-md font-medium min-h-[40px]">
                {loading ? "Carregando..." : bannerPhrase}
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[90px] border border-white/5">
                <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Pontos</p>
                <p className="text-2xl font-black mt-1 text-emerald-300">
                  {loading ? "..." : (user?.points || 0)}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[90px] border border-white/5">
                <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Classe</p>
                <p className="text-2xl font-black mt-1 text-emerald-300">ALT 0125</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bento List */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/10 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-300/70 uppercase font-bold tracking-wider font-semibold">Pendentes</p>
                <p className="text-xs sm:text-sm font-extrabold">{pendingActivitiesCount} Atividades</p>
              </div>
            </div>

            <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/10 flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-300/70 uppercase font-bold tracking-wider font-semibold">Avisos</p>
                <p className="text-xs sm:text-sm font-extrabold">{importantAnnouncementsCount} Importantes</p>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/10 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-300/70 uppercase font-bold tracking-wider font-semibold">Turma</p>
                <p className="text-xs sm:text-sm font-extrabold">{users.length} Alunos</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </section>
      ) : onlineUsers.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Online Agora ({onlineUsers.length})
            </h3>
            <Link to="/usuarios" className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Ver todos</Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {onlineUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800">
                <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 select-none">
                  {u.emoji || localStorage.getItem(`avatar_${u.id}`) || u.name.charAt(0)}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">{u.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Megaphone className="w-5 h-5 text-emerald-500" />
              Últimos Avisos
            </h3>
            <Link to="/avisos" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Ver todos</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <>
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
              </>
            ) : (
              announcements.slice(0, 3).map(a => (
                <Link key={a.id} to={`/avisos/${a.id}`} className={`block p-4 rounded-2xl border shadow-sm transition-colors duration-300 ${a.is_important ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:border-red-200 dark:hover:border-red-900/50' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/40'}`}>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800 dark:text-zinc-100">{a.title}</h4>
                    {a.is_important && <AlertTriangle className="w-3 h-3 text-red-500" />}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2 mt-1">{a.content}</p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-2 block uppercase font-bold">
                    {formatDate(a.date, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </Link>
              ))
            )}
            {!loading && announcements.length === 0 && <p className="text-gray-400 dark:text-zinc-500 text-sm italic">Nenhum aviso no momento.</p>}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <ClipboardList className="w-5 h-5 text-emerald-500" />
              Próximas Atividades
            </h3>
            <Link to="/atividades" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <>
                <ActivitySkeleton />
                <ActivitySkeleton />
              </>
            ) : (
              activities.slice(0, 3).map(a => {
                const isDone = status.includes(a.id);
                return (
                  <Link key={a.id} to={`/atividades/${a.id}`} className={`p-4 rounded-2xl border shadow-sm flex justify-between items-center transition-colors duration-300 ${isDone ? 'bg-gray-50/50 dark:bg-zinc-800/30 border-gray-100 dark:border-zinc-800 opacity-75' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/40'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold ${isDone ? 'text-gray-500 dark:text-zinc-500' : 'text-gray-800 dark:text-zinc-100'}`}>{a.title}</h4>
                        {(a.has_pdf || a.pdf_data) && <FileText className="w-3 h-3 text-emerald-500" />}
                        {isDone && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                      </div>
                      <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
                        Entrega: {formatDate(a.deadline, "dd/MM")}
                      </p>
                    </div>
                    <div className={`${isDone ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'} px-3 py-1 rounded-full text-xs font-bold`}>
                      +{a.points} pts
                    </div>
                  </Link>
                );
              })
            )}
            {!loading && activities.length === 0 && <p className="text-gray-400 dark:text-zinc-500 text-sm italic">Nenhuma atividade pendente.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const { announcements, loading, users } = useData();
  const { showToast } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();
  const [views, setViews] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAviso, setNewAviso] = useState({ title: "", content: "", is_important: false });
  const [allViews, setAllViews] = useState<{user_id: string, announcement_id: string, viewed_at: string}[]>([]);
  const [expandedViews, setExpandedViews] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === "leader") {
      const unsub = onSnapshot(
        collection(db, "announcement_views"),
        (snapshot) => {
          const list = snapshot.docs.map(doc => doc.data() as {user_id: string, announcement_id: string, viewed_at: string});
          setAllViews(list);
        },
        (error) => console.error("Error fetching announcement views:", error)
      );
      return unsub;
    }
  }, [user]);

  const fetchViews = useCallback(() => {
    if (user && auth.currentUser) {
      const unsub = onSnapshot(
        query(collection(db, "announcement_views"), orderBy("announcement_id")),
        (snapshot) => {
          const userViews = snapshot.docs
            .filter(doc => doc.data().user_id === user.id)
            .map(doc => doc.data().announcement_id as string);
          setViews(userViews);
        },
        (error) => handleFirestoreError(error, OperationType.GET, "announcement_views")
      );
      return unsub;
    }
  }, [user]);

  useEffect(() => { 
    const unsub = fetchViews();
    return () => unsub && unsub();
  }, [fetchViews]);

  const handleAdd = async () => {
    try {
      if (editingId) {
        const avisoRef = doc(db, "announcements", editingId);
        await updateDoc(avisoRef, {
          ...newAviso,
          date: new Date().toISOString()
        });
        showToast("Aviso atualizado!", "success");
      } else {
        await addDoc(collection(db, "announcements"), {
          ...newAviso,
          author_id: user!.id,
          date: new Date().toISOString()
        });
        showToast("Aviso publicado!", "success");
      }
      setNewAviso({ title: "", content: "", is_important: false });
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "announcements");
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const viewId = `${user!.id}_${id}`;
      await setDoc(doc(db, "announcement_views", viewId), {
        user_id: user!.id,
        announcement_id: id,
        viewed_at: new Date().toISOString()
      });
      showToast("Aviso marcado como lido.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "announcement_views");
    }
  };

  const handleEdit = (a: Announcement) => {
    setNewAviso({ title: a.title, content: a.content, is_important: a.is_important });
    setEditingId(a.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: "Excluir Aviso",
      message: "Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.",
      isDestructive: true,
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "announcements", id));
          showToast("Aviso excluído.", "success");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmComponent />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
          <Megaphone className="w-7 h-7 text-emerald-500" />
          Avisos da Sala
        </h2>
        {user?.role === "leader" && (
          <button 
            onClick={() => {
              setNewAviso({ title: "", content: "", is_important: false });
              setEditingId(null);
              setIsAdding(true);
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Novo Aviso
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm space-y-4 overflow-hidden transition-colors duration-300"
          >
            <h3 className="font-bold text-emerald-600 dark:text-emerald-400">{editingId ? "Editar Aviso" : "Novo Aviso"}</h3>
            <input 
              placeholder="Título do aviso"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newAviso.title}
              onChange={e => setNewAviso({...newAviso, title: e.target.value})}
              autoComplete="off"
              name="announcement-title-prevent-autofill"
            />
            <textarea 
              placeholder="Conteúdo do aviso..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px]"
              value={newAviso.content}
              onChange={e => setNewAviso({...newAviso, content: e.target.value})}
              autoComplete="off"
              name="announcement-content-prevent-autofill"
            />
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={newAviso.is_important}
                  onChange={e => setNewAviso({...newAviso, is_important: e.target.checked})}
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${newAviso.is_important ? 'bg-red-500' : 'bg-gray-200 dark:bg-zinc-800'}`}></div>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${newAviso.is_important ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-zinc-400 group-hover:text-red-500 transition-colors">Marcar como Importante</span>
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 text-gray-500 dark:text-zinc-400 font-medium hover:text-gray-700 dark:hover:text-zinc-200 transition-all">Cancelar</button>
              <button onClick={handleAdd} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                {editingId ? "Salvar Alterações" : "Publicar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {loading ? (
          <>
            <AnnouncementSkeleton />
            <AnnouncementSkeleton />
            <AnnouncementSkeleton />
          </>
        ) : (
          announcements.map(a => {
          const isRead = views.includes(a.id);
          return (
            <div key={a.id} className={`bg-white dark:bg-zinc-900 p-6 rounded-3xl border shadow-sm group transition-all duration-300 ${a.is_important ? 'border-red-200 dark:border-red-900/40 ring-1 ring-red-50 dark:ring-red-900/10' : (isRead ? 'border-gray-100 dark:border-zinc-800 opacity-75' : 'border-emerald-200 dark:border-emerald-900/40 ring-1 ring-emerald-50 dark:ring-red-900/10')}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <Link to={`/avisos/${a.id}`} className="block group/title">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xl font-bold transition-colors ${a.is_important ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-zinc-100 group-hover/title:text-emerald-600 dark:group-hover/title:text-emerald-400'}`}>{a.title}</h3>
                      {a.is_important && <AlertTriangle className="w-5 h-5 text-red-500" />}
                      {!isRead && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest block mt-1">
                      {formatDate(a.date, "PPPP", { locale: ptBR })}
                    </span>
                    <p className="mt-4 text-gray-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed line-clamp-3">{a.content}</p>
                  </Link>
                  
                  {/* Visualizadores for Leader */}
                  {user?.role === "leader" && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/60" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedViews(expandedViews === a.id ? null : a.id);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors bg-gray-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-full cursor-pointer inline-flex"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {allViews.filter(v => v.announcement_id === a.id).length} visualizações
                        </span>
                        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expandedViews === a.id ? 'rotate-90' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {expandedViews === a.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-3 pl-2"
                          >
                            <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 mb-2">Quem já visualizou:</div>
                            {allViews.filter(v => v.announcement_id === a.id).length === 0 ? (
                              <div className="text-xs italic text-gray-400 dark:text-zinc-500 py-1">Ninguém visualizou ainda.</div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                                {allViews
                                  .filter(v => v.announcement_id === a.id)
                                  .map(v => {
                                    const u = users.find(user => user.id === v.user_id);
                                    const emoji = u?.emoji || localStorage.getItem(`avatar_${v.user_id}`) || "👤";
                                    return (
                                      <div 
                                        key={v.user_id} 
                                        className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-2.5 py-1 rounded-full text-xs font-semibold select-none"
                                        title={`Visualizado em ${new Date(v.viewed_at).toLocaleDateString()} às ${new Date(v.viewed_at).toLocaleTimeString()}`}
                                      >
                                        <span>{emoji}</span>
                                        <span>{u ? u.name : "Removido"}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {user?.role === "leader" ? (
                    <>
                      <button onClick={() => handleEdit(a)} className="text-gray-300 dark:text-zinc-600 hover:text-emerald-500 transition-all">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="text-gray-300 dark:text-zinc-600 hover:text-red-500 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    !isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(a.id)}
                        className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                      >
                        Marcar como lido
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })
        )}
        {!loading && announcements.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
            <Megaphone className="w-12 h-12 text-gray-200 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-zinc-500 font-medium tracking-wide">Nenhum aviso publicado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ActivitiesPage = () => {
  const { user } = useAuth();
  const { activities, loading, users } = useData();
  const { showToast } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();
  const [status, setStatus] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAct, setNewAct] = useState({ title: "", description: "", deadline: "", points: 10, subject: "", pdf_data: "" });
  const [allViews, setAllViews] = useState<{user_id: string, activity_id: string, viewed_at: string}[]>([]);
  const [expandedViews, setExpandedViews] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === "leader") {
      const unsub = onSnapshot(
        collection(db, "activity_views"),
        (snapshot) => {
          const list = snapshot.docs.map(doc => doc.data() as {user_id: string, activity_id: string, viewed_at: string});
          setAllViews(list);
        },
        (error) => console.error("Error fetching activity views:", error)
      );
      return unsub;
    }
  }, [user]);

  const fetchStatus = useCallback(() => {
    if (user && auth.currentUser) {
      const unsub = onSnapshot(
        query(collection(db, "activity_completions"), orderBy("activity_id")),
        (snapshot) => {
          const userCompletions = snapshot.docs
            .filter(doc => doc.data().user_id === user.id)
            .map(doc => doc.data().activity_id as string);
          setStatus(userCompletions);
        },
        (error) => handleFirestoreError(error, OperationType.GET, "activity_completions")
      );
      return unsub;
    }
  }, [user]);

  useEffect(() => { 
    const unsub = fetchStatus();
    return () => unsub && unsub();
  }, [fetchStatus]);

  const handleAdd = async () => {
    const payload = {
      ...newAct,
      has_pdf: !!newAct.pdf_data,
      points: isNaN(newAct.points) ? 0 : newAct.points,
      deadline: newAct.deadline ? new Date(newAct.deadline).toISOString() : new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "activities", editingId), payload);
        showToast("Atividade atualizada!", "success");
      } else {
        await addDoc(collection(db, "activities"), { ...payload, author_id: user!.id });
        showToast("Atividade criada!", "success");
      }
      setNewAct({ title: "", description: "", deadline: "", points: 10, subject: "", pdf_data: "" });
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "activities");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        showToast("Por favor, selecione apenas arquivos PDF.", "error");
        e.target.value = "";
        return;
      }
      if (file.size > 500 * 1024) { // Reduced limit for Firestore document size
        showToast("O arquivo deve ter no máximo 500KB.", "error");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewAct({ ...newAct, pdf_data: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const completionId = `${user!.id}_${id}`;
      const completionRef = doc(db, "activity_completions", completionId);
      const completionSnap = await getDocFromServer(completionRef);

      if (completionSnap.exists()) {
        await deleteDoc(completionRef);
        // Decrement points
        const activitySnap = await getDocFromServer(doc(db, "activities", id));
        if (activitySnap.exists()) {
          const points = activitySnap.data().points || 0;
          await updateDoc(doc(db, "users", user!.id), {
            points: increment(-points)
          });
        }
        showToast("Atividade desmarcada.", "info");
      } else {
        const activitySnap = await getDocFromServer(doc(db, "activities", id));
        if (activitySnap.exists()) {
          const points = activitySnap.data().points || 0;
          await setDoc(completionRef, {
            user_id: user!.id,
            activity_id: id,
            points_awarded: points,
            completed_at: new Date().toISOString()
          });
          // Increment points
          await updateDoc(doc(db, "users", user!.id), {
            points: increment(points)
          });
        }
        showToast("Atividade concluída! Parabéns!", "success");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "activity_completions");
    }
  };

  const handleEdit = async (a: Activity) => {
    setNewAct({ 
      title: a.title, 
      description: a.description, 
      deadline: a.deadline.split('T')[0], 
      points: a.points,
      subject: a.subject || "",
      pdf_data: a.pdf_data || ""
    });
    setEditingId(a.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: "Excluir Atividade",
      message: "Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.",
      isDestructive: true,
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "activities", id));
          showToast("Atividade excluída.", "success");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `activities/${id}`);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmComponent />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
          <ClipboardList className="w-7 h-7 text-emerald-500" />
          Atividades
        </h2>
        {user?.role === "leader" && (
          <button 
            onClick={() => {
              setNewAct({ title: "", description: "", deadline: "", points: 10, subject: "", pdf_data: "" });
              setEditingId(null);
              setIsAdding(true);
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nova Atividade
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm space-y-4 overflow-hidden transition-colors duration-300"
          >
            <h3 className="font-bold text-emerald-600 dark:text-emerald-400">{editingId ? "Editar Atividade" : "Nova Atividade"}</h3>
            <input 
              placeholder="Título da atividade"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newAct.title}
              onChange={e => setNewAct({...newAct, title: e.target.value})}
              autoComplete="off"
              name="activity-title-prevent-autofill"
            />
            <textarea 
              placeholder="Descrição..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px]"
              value={newAct.description}
              onChange={e => setNewAct({...newAct, description: e.target.value})}
              autoComplete="off"
              name="activity-description-prevent-autofill"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">Matéria</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newAct.subject}
                  onChange={e => setNewAct({...newAct, subject: e.target.value})}
                >
                  <option value="">Selecione uma matéria...</option>
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">Prazo de Entrega</label>
                <input 
                  type="date"
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newAct.deadline}
                  onChange={e => setNewAct({...newAct, deadline: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">Pontos</label>
              <input 
                type="number"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={isNaN(newAct.points) ? "" : newAct.points}
                onChange={e => setNewAct({...newAct, points: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">Anexo PDF (Opcional)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full p-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {newAct.pdf_data && (
                  <button 
                    onClick={() => setNewAct({ ...newAct, pdf_data: "" })}
                    className="text-red-500 text-xs font-bold uppercase"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 text-gray-500 dark:text-zinc-400 font-medium hover:text-gray-700 dark:hover:text-zinc-200 transition-all">Cancelar</button>
              <button onClick={handleAdd} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                {editingId ? "Salvar Alterações" : "Criar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {loading ? (
          <>
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
          </>
        ) : (
          activities.map(a => {
          const isDone = status.includes(a.id);
          return (
            <div key={a.id} className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between gap-4 transition-all duration-300 ${isDone ? 'bg-gray-50/50 dark:bg-zinc-800/30 border-gray-100 dark:border-zinc-800 opacity-75' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/40'}`}>
              <div className="flex-1">
                <Link to={`/atividades/${a.id}`} className="block group">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className={`text-xl font-bold transition-colors ${isDone ? 'text-gray-400 dark:text-zinc-600' : 'text-gray-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>{a.title}</h3>
                    {a.subject && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDone ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'}`}>
                        {a.subject}
                      </span>
                    )}
                    <span className={`${isDone ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'} px-3 py-1 rounded-full text-xs font-black`}>
                      +{a.points} PTS
                    </span>
                    {(a.has_pdf || a.pdf_data) && <FileText className="w-4 h-4 text-emerald-500" />}
                    {isDone && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4 line-clamp-2">{a.description}</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-500 dark:text-red-400 uppercase">
                    <XCircle className="w-4 h-4" />
                    Prazo: {formatDate(a.deadline, "dd/MM/yyyy")}
                  </div>
                </Link>
                
                {/* Visualizadores for Leader */}
                {user?.role === "leader" && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/60" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedViews(expandedViews === a.id ? null : a.id);
                      }}
                      className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors bg-gray-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-full cursor-pointer inline-flex"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {allViews.filter(v => v.activity_id === a.id).length} visualizações
                      </span>
                      <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expandedViews === a.id ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {expandedViews === a.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-3 pl-2"
                        >
                          <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 mb-2">Quem já visualizou:</div>
                          {allViews.filter(v => v.activity_id === a.id).length === 0 ? (
                            <div className="text-xs italic text-gray-400 dark:text-zinc-500 py-1">Ninguém visualizou ainda.</div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                              {allViews
                                .filter(v => v.activity_id === a.id)
                                .map(v => {
                                  const u = users.find(user => user.id === v.user_id);
                                  const emoji = u?.emoji || localStorage.getItem(`avatar_${v.user_id}`) || "👤";
                                  return (
                                    <div 
                                      key={v.user_id} 
                                      className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-2.5 py-1 rounded-full text-xs font-semibold select-none"
                                      title={`Visualizado em ${new Date(v.viewed_at).toLocaleDateString()} às ${new Date(v.viewed_at).toLocaleTimeString()}`}
                                    >
                                      <span>{emoji}</span>
                                      <span>{u ? u.name : "Removido"}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {user?.role === "leader" ? (
                  <>
                    <Link 
                      to={`/admin/atividade/${a.id}`}
                      className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      Gerenciar Pontos
                    </Link>
                    <button onClick={() => handleEdit(a)} className="p-2 text-gray-300 dark:text-zinc-600 hover:text-emerald-500 transition-all">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-300 dark:text-zinc-600 hover:text-red-500 transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleToggleStatus(a.id)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      isDone 
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {isDone ? "Concluída" : "Marcar como concluída"}
                  </button>
                )}
              </div>
            </div>
          );
        })
        )}
        {!loading && activities.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
            <ClipboardList className="w-12 h-12 text-gray-200 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-zinc-500 font-medium tracking-wide">Nenhuma atividade cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const UsersPage = () => {
  const { users, loading, refreshUsers } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDeleteUser = async (targetUser: User) => {
    confirm({
      title: "Excluir Usuário",
      message: `Tem certeza que deseja excluir o usuário ${targetUser.name}? Esta ação não pode ser desfeita.`,
      isDestructive: true,
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          // 1. Delete from Firestore
          if (isFirebaseConfigured) {
            const userRef = doc(db, "users", targetUser.id);
            await deleteDoc(userRef);
          }

          // 2. Delete from Server SQLite
          const headers = await getAuthHeaders(user?.id || '');
          const response = await fetch(`/api/users/${targetUser.id}`, {
            method: 'DELETE',
            headers
          });

          if (!response.ok) {
            throw new Error("Erro ao excluir usuário no servidor");
          }

          showToast("Usuário excluído com sucesso!", "success");
          refreshUsers();
        } catch (error) {
          console.error("Erro ao excluir usuário:", error);
          showToast("Erro ao excluir usuário. Tente novamente.", "error");
        }
      }
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshUsers();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Lista de usuários atualizada!", "success");
    }, 1000);
  };

  const sortedUsers = [...users].sort((a: User, b: User) => {
    if (!a.last_login) return 1;
    if (!b.last_login) return -1;
    return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <ConfirmComponent />
      <div className="text-center space-y-2 relative">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-3">
          <UserIcon className="w-8 h-8 text-emerald-500" />
          Usuários do App
        </h2>
        <p className="text-gray-500 dark:text-zinc-400">Todos que já acessaram o mural.</p>
        <div className="absolute right-0 top-0 flex items-center gap-2">
          {user?.role === 'leader' && (
            <button 
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  const headers = await getAuthHeaders(user?.id || '');
                  const querySnapshot = await getDocs(collection(db, "users"));
                  for (const doc of querySnapshot.docs) {
                    const u = doc.data();
                    await fetch("/api/auth/sync", {
                      method: "POST",
                      headers,
                      body: JSON.stringify({ id: doc.id, email: u.email, name: u.name })
                    });
                  }
                  showToast("Sincronização concluída!", "success");
                  refreshUsers();
                } catch (e) {
                  console.error("Sync all error:", e);
                  showToast("Erro na sincronização.", "error");
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all disabled:opacity-50"
              title="Sincronizar com Servidor"
            >
              <Database className={`w-5 h-5 ${isRefreshing ? 'animate-pulse' : ''}`} />
            </button>
          )}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-all disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="hidden md:grid p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest grid-cols-12 gap-4">
          <div className="col-span-6">Usuário</div>
          <div className="col-span-3 text-center">Cargo</div>
          <div className="col-span-3 text-right">Último Acesso</div>
        </div>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center p-4 gap-4 border-b border-gray-50 dark:border-zinc-800">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
            ))}
          </>
        ) : (
          sortedUsers.map((u) => (
            <div key={u.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center p-4 border-b border-gray-50 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="w-full md:col-span-6 flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg select-none">
                  {u.emoji || localStorage.getItem(`avatar_${u.id}`) || u.name.charAt(0)}
                </div>
                {u.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 truncate">
                  {u.name}
                  {u.isOnline && <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter shrink-0">Online</span>}
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{u.email}</p>
              </div>
            </div>
            <div className="flex md:contents items-center justify-between w-full">
              <div className="md:col-span-3 md:text-center">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${u.role === 'leader' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {u.role === 'leader' ? 'Líder' : 'Aluno'}
                </span>
              </div>
              <div className="md:col-span-3 md:text-right flex items-center justify-end gap-3">
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  <span className="md:hidden text-gray-400 mr-1">Acesso:</span>
                  {u.last_login ? formatDate(u.last_login, "dd/MM/yy HH:mm") : "Nunca"}
                </p>
                {user?.role === 'leader' && u.id !== user.id && (
                  <button 
                    onClick={() => handleDeleteUser(u)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Excluir usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
};

const RankingPage = () => {
  const { users, loading } = useData();
  const { user } = useAuth();

  if (loading) return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="flex justify-center items-end max-w-2xl mx-auto pt-8 px-4 gap-4">
        <Skeleton className="h-24 flex-1 rounded-t-3xl" />
        <Skeleton className="h-32 flex-1 rounded-t-3xl scale-110" />
        <Skeleton className="h-20 flex-1 rounded-t-3xl" />
      </div>
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <RankingSkeleton />
        <RankingSkeleton />
        <RankingSkeleton />
      </div>
    </div>
  );

  const maxPoints = Math.max(1, users[0]?.points || 1);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-3 tracking-tight">
          <Trophy className="w-8 h-8 text-amber-500 animate-[bounce_2s_infinite]" />
          Ranking da Turma
        </h2>
        <p className="text-gray-500 dark:text-zinc-400">Acompanhe quem está liderando o engajamento da sala!</p>
      </div>

      {/* Podium Grid */}
      <div className="flex justify-center items-end max-w-2xl mx-auto pt-10 px-4 gap-3 sm:gap-6">
        {/* 2nd Place */}
        {users[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center flex-1"
          >
            <div className="text-3xl sm:text-4xl mb-2 drop-shadow-md select-none">🥈</div>
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-t-[24px] border-x border-t border-gray-200/60 dark:border-zinc-800 shadow-md w-full text-center h-28 sm:h-32 flex flex-col justify-center transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gray-300 to-gray-400"></div>
              <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
                {users[1].name.charAt(0)}
              </div>
              <p className="font-bold text-xs sm:text-sm truncate dark:text-zinc-100">{users[1].name.split(' ')[0]}</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs sm:text-sm mt-0.5">{users[1].points} pts</p>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {users[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center flex-1 scale-110 z-10"
          >
            <div className="text-4xl sm:text-5xl mb-2 drop-shadow-xl select-none">🥇</div>
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-t-[28px] border-x border-t border-gray-200/80 dark:border-zinc-800 shadow-2xl w-full text-center h-36 sm:h-40 flex flex-col justify-center transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-300 shadow-lg shadow-amber-400/20"></div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-black text-amber-600 dark:text-amber-400 border-2 border-amber-400/40 shadow-inner">
                {users[0].name.charAt(0)}
              </div>
              <p className="font-extrabold text-xs sm:text-base truncate dark:text-zinc-100">{users[0].name.split(' ')[0]}</p>
              <p className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-lg font-black mt-0.5">{users[0].points} pts</p>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {users[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center flex-1"
          >
            <div className="text-3xl sm:text-4xl mb-2 drop-shadow-md select-none">🥉</div>
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-t-[24px] border-x border-t border-gray-200/60 dark:border-zinc-800 shadow-md w-full text-center h-24 sm:h-28 flex flex-col justify-center transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-300 to-amber-700"></div>
              <div className="w-10 h-10 bg-amber-500/10 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold text-amber-800 dark:text-amber-500 border border-amber-200/40">
                {users[2].name.charAt(0)}
              </div>
              <p className="font-bold text-xs sm:text-sm truncate dark:text-zinc-100">{users[2].name.split(' ')[0]}</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs sm:text-sm mt-0.5">{users[2].points} pts</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Full Leaderboard List */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-lg overflow-hidden transition-all duration-300 divide-y divide-gray-50 dark:divide-zinc-800/50">
        {users.map((u, i) => {
          const isCurrentUser = u.id === user?.id;
          const pct = Math.max(2, (u.points / maxPoints) * 100);

          return (
            <motion.div 
              key={u.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center p-4.5 gap-4 transition-all relative ${
                isCurrentUser 
                  ? "bg-emerald-500/10 border-l-4 border-l-emerald-500" 
                  : i < 3 
                    ? "bg-zinc-50/40 dark:bg-zinc-900/40" 
                    : ""
              }`}
            >
              {/* Placement Position Badge */}
              <span className={`w-8 text-center font-black text-sm flex items-center justify-center ${
                i === 0 ? "text-amber-500 text-lg" :
                i === 1 ? "text-gray-400 text-base" :
                i === 2 ? "text-amber-700 text-base" :
                "text-gray-400 dark:text-zinc-500"
              }`}>
                {i + 1}
              </span>

              {/* User Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg select-none shrink-0 ${
                isCurrentUser 
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                  : i === 0 
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20" 
                    : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
                {u.emoji || localStorage.getItem(`avatar_${u.id}`) || u.name.charAt(0)}
              </div>

              {/* Info Block + Relative Point Progress Bar */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-extrabold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5 truncate text-sm sm:text-base">
                    {u.name}
                    {isCurrentUser && (
                      <span className="bg-emerald-500 text-white shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Você</span>
                    )}
                  </p>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm whitespace-nowrap shrink-0">{u.points} pts</p>
                </div>
                
                {/* Thin Relative Progress Bar */}
                <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      isCurrentUser 
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                        : i === 0 
                          ? "bg-gradient-to-r from-amber-400 to-yellow-300"
                          : "bg-gradient-to-r from-emerald-600 to-teal-500"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  const { users, refreshUsers } = useData();
  const { showToast } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();

  const adjustPoints = async (id: string, amount: number) => {
    try {
      await updateDoc(doc(db, "users", id), {
        points: increment(amount)
      });
      showToast(`Pontos ajustados: ${amount > 0 ? '+' : ''}${amount}`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${id}`);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    confirm({
      title: "Excluir Usuário",
      message: `Tem certeza que deseja excluir o usuário "${name}"? Esta ação não pode ser desfeita e removerá todos os pontos e progresso.`,
      isDestructive: true,
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          // 1. Delete from Firestore
          await deleteDoc(doc(db, "users", id));
          
          // 2. Delete from Server SQLite
          const headers = await getAuthHeaders(user?.id || '');
          const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers
          });

          if (!response.ok) {
            throw new Error("Falha ao remover do servidor");
          }

          showToast("Usuário removido com sucesso.", "success");
          refreshUsers();
        } catch (error) {
          console.error("Delete user error:", error);
          showToast("Erro ao remover usuário. Verifique se você tem permissão.", "error");
        }
      }
    });
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      const [usersSnap, announcementsSnap, activitiesSnap, completionsSnap, viewsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "announcements")),
        getDocs(collection(db, "activities")),
        getDocs(collection(db, "activity_completions")),
        getDocs(collection(db, "announcement_views"))
      ]);

      const data = {
        version: "1.1",
        timestamp: new Date().toISOString(),
        data: {
          users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          announcements: announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          activities: activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          activity_completions: completionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          announcement_views: viewsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mural_backup_completo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast("Backup exportado com sucesso!", "success");
    } catch (e) {
      console.error("Export error:", e);
      showToast("Erro ao exportar backup.", "error");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!auth.currentUser) {
      showToast("Você precisa estar logado com uma conta Google real.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsImporting(true);
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importData = parsed.data || parsed;
        
        console.log("Iniciando importação...", importData);

        // 1. Users
        if (importData.users) {
          for (const u of importData.users) {
            const { id, ...rest } = u;
            if (!id) continue;
            try {
              const userData = {
                id,
                email: rest.email || "",
                name: rest.name || "Usuário",
                role: rest.role || "student",
                points: Number(rest.points) || 0,
                last_login: rest.last_login || new Date().toISOString()
              };
              await setDoc(doc(db, "users", id), userData, { merge: true });
            } catch (err) {
              console.error(`Erro ao importar usuário ${id}:`, err);
            }
          }
        }

        // 2. Announcements
        const announcements = importData.announcements || [];
        for (const a of announcements) {
          const { id, ...rest } = a;
          try {
            const announcementData = {
              title: rest.title || "Sem título",
              content: rest.content || "",
              date: rest.date || new Date().toISOString(),
              is_important: rest.is_important === true || rest.is_important === 1,
              author_id: rest.author_id || user?.id || ""
            };
            if (id) await setDoc(doc(db, "announcements", String(id)), announcementData, { merge: true });
            else await addDoc(collection(db, "announcements"), announcementData);
          } catch (err) {
            console.error("Erro ao importar aviso:", err);
          }
        }

        // 3. Activities
        const activities = importData.activities || [];
        for (const a of activities) {
          const { id, ...rest } = a;
          try {
            const activityData = {
              title: rest.title || "Sem título",
              description: rest.description || "",
              deadline: rest.deadline || new Date().toISOString(),
              points: Number(rest.points) || 0,
              subject: rest.subject || "",
              pdf_data: rest.pdf_data || "",
              author_id: rest.author_id || user?.id || ""
            };
            if (id) await setDoc(doc(db, "activities", String(id)), activityData, { merge: true });
            else await addDoc(collection(db, "activities"), activityData);
          } catch (err) {
            console.error("Erro ao importar atividade:", err);
          }
        }

        // 4. Completions
        const completions = importData.activity_completions || importData.completions || [];
        for (const c of completions) {
          const { id, ...rest } = c;
          if (!c.user_id || !c.activity_id) continue;
          const docId = id || `${c.user_id}_${c.activity_id}`;
          try {
            const completionData = {
              activity_id: String(c.activity_id),
              user_id: String(c.user_id),
              points_awarded: Number(c.points_awarded) || 0,
              completed_at: c.completed_at || new Date().toISOString()
            };
            await setDoc(doc(db, "activity_completions", String(docId)), completionData, { merge: true });
          } catch (err) {
            console.error("Erro ao importar conclusão:", err);
          }
        }

        // 5. Views
        const views = importData.announcement_views || importData.views || [];
        for (const v of views) {
          const { id, ...rest } = v;
          if (!v.user_id || !v.announcement_id) continue;
          const docId = id || `${v.user_id}_${v.announcement_id}`;
          try {
            const viewData = {
              announcement_id: String(v.announcement_id),
              user_id: String(v.user_id),
              viewed_at: v.viewed_at || new Date().toISOString()
            };
            await setDoc(doc(db, "announcement_views", String(docId)), viewData, { merge: true });
          } catch (err) {
            console.error("Erro ao importar visualização:", err);
          }
        }
        
        showToast("Backup restaurado com sucesso!", "success");
        refreshUsers();
      } catch (e) {
        console.error("Import error:", e);
        showToast("Erro ao processar arquivo de backup.", "error");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <ConfirmComponent />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
          <ShieldCheck className="w-7 h-7 text-emerald-500" />
          Painel do Líder
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-[10px] md:text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <label className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-[10px] md:text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? "Importando..." : "Importar"}
            <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={isImporting} />
          </label>
        </div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex gap-4 items-start">
        <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
          <Database className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Persistência de Dados Ativada</h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            Seus dados agora estão protegidos por um sistema de inicialização segura. 
            Como precaução extra, use os botões acima para baixar uma cópia dos seus dados semanalmente.
            Nota: Após importar um backup, peça para que outros alunos recarreguem a página para ver as atualizações.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex justify-between">
          <span>Gerenciar Alunos</span>
          <span>Status de Acesso</span>
        </div>
        {users.map(u => (
          <div key={u.id} className="flex items-center p-4 gap-4 border-b border-gray-50 dark:border-zinc-800 last:border-0">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 dark:text-zinc-100">{u.name}</p>
                {u.isOnline ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Online</span>
                  </span>
                ) : u.last_login ? (
                  <span className="w-2 h-2 bg-gray-300 dark:bg-zinc-700 rounded-full" title="Offline"></span>
                ) : (
                  <span className="w-2 h-2 bg-gray-200 dark:bg-zinc-800 rounded-full border border-gray-300" title="Nunca acessou"></span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                {u.email}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-bold">
                {u.last_login 
                  ? `Último acesso: ${formatDate(u.last_login, "dd/MM HH:mm")}`
                  : "Nunca acessou"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-600 dark:text-emerald-400 mr-4">{u.points} pts</span>
              
              {user?.role === 'leader' && u.id !== user.id && (
                <button 
                  onClick={() => deleteUser(u.id, u.name)}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
                  title="Excluir Usuário"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button 
                onClick={() => adjustPoints(u.id, -1)}
                className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
              >
                -1
              </button>
              <button 
                onClick={() => adjustPoints(u.id, 1)}
                className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
              >
                +1
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

const ActivityAdmin = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const { activities, users: allUsers } = useData();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [completions, setCompletions] = useState<string[]>([]);

  useEffect(() => {
    const found = activities.find(a => a.id === id);
    if (found) setActivity(found);
  }, [id, activities]);

  useEffect(() => {
    if (!id || !user || !auth.currentUser) return;
    const unsub = onSnapshot(
      query(collection(db, "activity_completions"), orderBy("completed_at")),
      (snapshot) => {
        const activityCompletions = snapshot.docs
          .filter(doc => doc.data().activity_id === id)
          .map(doc => doc.data().user_id as string);
        setCompletions(activityCompletions);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "activity_completions")
    );
    return unsub;
  }, [id, user]);

  const toggleCompletion = async (userId: string) => {
    if (!activity) return;
    try {
      const completionId = `${userId}_${activity.id}`;
      const completionRef = doc(db, "activity_completions", completionId);
      const completionSnap = await getDocFromServer(completionRef);

      if (completionSnap.exists()) {
        await deleteDoc(completionRef);
        await updateDoc(doc(db, "users", userId), {
          points: increment(-activity.points)
        });
      } else {
        await setDoc(completionRef, {
          user_id: userId,
          activity_id: activity.id,
          points_awarded: activity.points,
          completed_at: new Date().toISOString()
        });
        await updateDoc(doc(db, "users", userId), {
          points: increment(activity.points)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "activity_completions");
    }
  };

  if (!activity) return null;

  return (
    <div className="space-y-6">
      <Link to="/atividades" className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Voltar para Atividades
      </Link>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold dark:text-zinc-100">{activity.title}</h2>
          {activity.subject && (
            <span className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              {activity.subject}
            </span>
          )}
        </div>
        <p className="text-gray-500 dark:text-zinc-400">{activity.description}</p>
        <div className="mt-4 flex gap-4">
          <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black">
            VALE {activity.points} PONTOS
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
          Atribuir Pontos aos Alunos
        </div>
        {allUsers.map(u => {
          const isDone = completions.includes(u.id);
          return (
            <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-3 sm:gap-4 border-b border-gray-50 dark:border-zinc-800 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 truncate">{u.name}</p>
                <p className="text-[10px] md:text-xs text-gray-400 dark:text-zinc-500 truncate">{u.email}</p>
              </div>
              <button 
                onClick={() => toggleCompletion(u.id)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  isDone 
                    ? "bg-emerald-600 text-white" 
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700"
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isDone ? "Concluído" : "Marcar Concluído"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AnnouncementDetailsPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const { announcements } = useData();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    const found = announcements.find(a => a.id === id);
    if (found) setAnnouncement(found);
  }, [id, announcements]);

  const fetchViews = useCallback(async () => {
    if (!user || !id) return;
    try {
      const viewId = `${user.id}_${id}`;
      const viewSnap = await getDocFromServer(doc(db, "announcement_views", viewId));
      setIsRead(viewSnap.exists());
    } catch (e) {}
  }, [id, user]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  const handleMarkAsRead = async () => {
    if (!announcement) return;
    try {
      const viewId = `${user!.id}_${announcement.id}`;
      await setDoc(doc(db, "announcement_views", viewId), {
        user_id: user!.id,
        announcement_id: announcement.id,
        viewed_at: new Date().toISOString()
      });
      setIsRead(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "announcement_views");
    }
  };

  if (!announcement) return (
    <div className="flex items-center justify-center py-20">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/avisos" className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Voltar para Avisos
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-sm transition-colors duration-300 ${announcement.is_important ? 'border-red-100 dark:border-red-900/30' : 'border-gray-100 dark:border-zinc-800'}`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            {announcement.is_important && (
              <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest mb-2">
                <AlertTriangle className="w-4 h-4" />
                Aviso Importante
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-3xl font-bold ${announcement.is_important ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-zinc-100'}`}>{announcement.title}</h2>
              {!isRead && user?.role !== "leader" && <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>}
            </div>
            <span className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest block">
              Publicado em {formatDate(announcement.date, "PPPP", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            {user?.role !== "leader" && !isRead && (
              <button 
                onClick={handleMarkAsRead}
                className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                Marcar como Lido
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed text-lg">
            {announcement.content}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const ActivityDetailsPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const { activities } = useData();
  const { showToast } = useToast();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    const found = activities.find(a => a.id === id);
    if (found) setActivity(found);
  }, [id, activities]);

  useEffect(() => {
    if (activity && user && !user.id.startsWith("demo-")) {
      const markAsViewed = async () => {
        try {
          const viewId = `${user.id}_${activity.id}`;
          await setDoc(doc(db, "activity_views", viewId), {
            user_id: user.id,
            activity_id: activity.id,
            viewed_at: new Date().toISOString()
          });
        } catch (err) {
          console.error("Error logging activity view:", err);
        }
      };
      markAsViewed();
    }
  }, [activity, user]);

  useEffect(() => {
    if (activity?.pdf_data && !pdfData) {
      setPdfData(activity.pdf_data);
    }
  }, [activity, pdfData]);

  const fetchStatus = useCallback(async () => {
    if (!user || !id) return;
    try {
      const completionId = `${user.id}_${id}`;
      const completionSnap = await getDocFromServer(doc(db, "activity_completions", completionId));
      setIsDone(completionSnap.exists());
    } catch (e) {}
  }, [id, user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggleStatus = async () => {
    if (!activity) return;
    try {
      const completionId = `${user!.id}_${activity.id}`;
      const completionRef = doc(db, "activity_completions", completionId);
      const completionSnap = await getDocFromServer(completionRef);

      if (completionSnap.exists()) {
        await deleteDoc(completionRef);
        await updateDoc(doc(db, "users", user!.id), {
          points: increment(-activity.points)
        });
        setIsDone(false);
      } else {
        await setDoc(completionRef, {
          user_id: user!.id,
          activity_id: activity.id,
          points_awarded: activity.points,
          completed_at: new Date().toISOString()
        });
        await updateDoc(doc(db, "users", user!.id), {
          points: increment(activity.points)
        });
        setIsDone(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "activity_completions");
    }
  };

  if (!activity) return (
    <div className="flex items-center justify-center py-20">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/atividades" className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Voltar para Atividades
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">{activity.title}</h2>
              {isDone && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  <CheckCircle className="w-4 h-4" />
                  Concluída
                </div>
              )}
            </div>
            {activity.subject && (
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase tracking-widest mb-3">
                {activity.subject}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase">
                +{activity.points} PONTOS
              </span>
              <span className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Prazo: {formatDate(activity.deadline, "dd/MM/yyyy")}
              </span>
              {(activity.has_pdf || activity.pdf_data) && (
                <button 
                  onClick={() => {
                    if (pdfData) {
                      const link = document.createElement('a');
                      link.href = pdfData;
                      link.download = `${activity.title}.pdf`;
                      link.click();
                    } else {
                      showToast("O PDF ainda está sendo carregado...", "info");
                    }
                  }}
                  disabled={loadingPdf}
                  className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 hover:bg-blue-100 transition-all disabled:opacity-50"
                >
                  <FileText className="w-3 h-3" />
                  {loadingPdf ? "Carregando PDF..." : "Ver PDF Anexo"}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {user?.role !== "leader" && (
              <button 
                onClick={handleToggleStatus}
                className={`w-full sm:flex-1 md:flex-none px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${
                  isDone 
                    ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 shadow-none" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none"
                }`}
              >
                {isDone ? "Atividade Concluída" : "Marcar como Concluída"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-200 border-b border-gray-50 dark:border-zinc-800 pb-2">Descrição da Atividade</h3>
          <p className="text-gray-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {activity.description || "Nenhuma descrição detalhada fornecida."}
          </p>
        </div>

        {user?.role === "leader" && (
          <div className="mt-8 pt-8 border-t border-gray-50 dark:border-zinc-800 flex gap-4">
            <Link 
              to={`/admin/atividade/${activity.id}`}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              Gerenciar Pontuação dos Alunos
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { activities } = useData();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(true);

  // Avatar Options
  const AVATARS = [
    { emoji: "👨‍🌾", label: "Agricultor" },
    { emoji: "👩‍🌾", label: "Agricultora" },
    { emoji: "🚜", label: "Agrônomo" },
    { emoji: "🌱", label: "Cultivador" },
    { emoji: "🐄", label: "Pecuária" },
    { emoji: "🐴", label: "Cavaleiro" },
    { emoji: "🐔", label: "Avicultura" },
    { emoji: "🐝", label: "Apicultura" },
    { emoji: "🔬", label: "Biotecnologia" },
    { emoji: "📚", label: "Estudioso" },
  ];

  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem(`avatar_${user?.id}`) || "👨‍🌾";
  });

  const [bio, setBio] = useState(() => {
    return localStorage.getItem(`bio_${user?.id}`) || "Estudante do IFNMG Campus Almenara.";
  });
  const [tempBio, setTempBio] = useState(bio);
  const [isEditingBio, setIsEditingBio] = useState(false);

  const [completions, setCompletions] = useState<any[]>([]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    try {
      const unsub = onSnapshot(
        query(collection(db, "activity_completions")),
        (snapshot) => {
          const userCompletions = snapshot.docs
            .filter(doc => doc.data().user_id === user.id)
            .map(doc => ({
              activity_id: doc.data().activity_id,
              completed_at: doc.data().completed_at,
              points_awarded: doc.data().points_awarded || 0
            }))
            .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
          setCompletions(userCompletions);
        },
        (error) => console.error("Error loaded profile history:", error)
      );
      return unsub;
    } catch (err) {}
  }, [user]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast("Aplicativo adicionado com sucesso!", "success");
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    } else {
      showToast("Toque no botão de menu (três pontos) do Chrome e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'.", "info");
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      showToast("Seu navegador não suporta notificações.", "error");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    
    if (permission === "granted") {
      showToast("Notificações ativadas com sucesso!", "success");
      new Notification("Sucesso!", { body: "Você agora receberá avisos e atividades em tempo real." });
    } else if (permission === "denied") {
      showToast("Permissão negada. Ative manualmente nas configurações do navegador.", "error");
    }
  };

  const handleSaveBio = async () => {
    if (tempBio.trim().length > 150) {
      showToast("A biografia deve ter no máximo 150 caracteres.", "error");
      return;
    }
    const cleanBio = tempBio.trim();
    setBio(cleanBio);
    localStorage.setItem(`bio_${user?.id}`, cleanBio);
    
    if (user && !user.id.startsWith("demo-")) {
      try {
        await updateDoc(doc(db, "users", user.id), {
          bio: cleanBio
        });
      } catch (e) {
        console.error("Firestore user bio update error:", e);
      }
    }
    setIsEditingBio(false);
    showToast("Biografia atualizada!", "success");
  };

  const selectAvatar = async (selectedEmoji: string) => {
    const cleanEmoji = Array.from(selectedEmoji.trim())[0] || "👤";
    setAvatar(cleanEmoji);
    localStorage.setItem(`avatar_${user?.id}`, cleanEmoji);
    
    if (user && !user.id.startsWith("demo-")) {
      try {
        await updateDoc(doc(db, "users", user.id), {
          emoji: cleanEmoji
        });
      } catch (e) {
        console.error("Firestore user emoji update error:", e);
      }
    }
    showToast("Foto de perfil atualizada!", "success");
  };

  const completedLog = completions.map(c => {
    const act = activities.find(a => a.id === c.activity_id);
    return {
      title: act ? act.title : "Atividade Acadêmica",
      points: c.points_awarded || (act ? act.points : 0),
      completed_at: c.completed_at,
      subject: act ? act.subject : "Geral"
    };
  });

  const LEADER_PHONE = "5533997326173";
  const whatsappUrl = `https://wa.me/${LEADER_PHONE}?text=Estou%20com%20uma%20dúvida.%20Pode%20me%20ajudar?`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4 pb-12 px-2">
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[32px] p-6 lg:p-8 shadow-sm text-center relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-4 right-4 outline-none">
          <span className="inline-block bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {user?.role === "leader" ? "Líder Admin" : "Estudante"}
          </span>
        </div>

        <div className="relative w-32 h-32 mx-auto mb-4 group">
          <div className="w-full h-full bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-800 shadow-xl text-6xl select-none">
            {avatar}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-2 border-2 border-white dark:border-zinc-850 shadow-md">
            <Edit className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">{user?.name}</h2>
        <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{user?.email}</p>

        <div className="mt-4 max-w-md mx-auto space-y-2">
          {isEditingBio ? (
            <div className="space-y-2">
              <textarea
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                maxLength={150}
                rows={2}
                className="w-full text-sm p-3 rounded-2xl border border-gray-200 dark:border-zinc-850 dark:bg-zinc-850 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
                placeholder="Insira uma bio bacana de até 150 caracteres..."
              />
              <div className="flex justify-end gap-2 text-xs">
                <button 
                  onClick={() => setIsEditingBio(false)} 
                  className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-xl font-bold cursor-pointer hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveBio} 
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-750"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-zinc-350 italic font-medium">
                "{bio}"
              </p>
              <button 
                onClick={() => { setTempBio(bio); setIsEditingBio(true); }} 
                className="text-xs text-emerald-600 dark:text-emerald-400 font-black hover:underline cursor-pointer"
              >
                Editar Biografia
              </button>
            </div>
          )}
        </div>

        {user?.role !== "leader" && (
          <div className="mt-6 flex justify-center">
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              Chamar o Líder no WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm transition-colors duration-300">
        <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
          Personalizar seu Avatar de Estudante
        </h3>
        <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto">
          {AVATARS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => selectAvatar(item.emoji)}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl border text-2xl transition-all cursor-pointer ${
                avatar === item.emoji 
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 scale-110 shadow-sm" 
                  : "bg-gray-50 dark:bg-zinc-850 hover:bg-gray-100 dark:hover:bg-zinc-800 border-gray-100 dark:border-zinc-800"
              }`}
              title={item.label}
            >
              {item.emoji}
            </button>
          ))}
        </div>

        {/* Custom Emoji Selection Form */}
        <div className="mt-6 pt-5 border-t border-gray-150 dark:border-zinc-800/60 max-w-lg mx-auto text-left">
          <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase block mb-2">
            Ou escolha um emoji ou caractere de sua preferência:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={2}
              placeholder="Digite um emoji (ex: 🚀, 🐼, 💻, 🎓, ⚡)"
              className="flex-1 p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 dark:bg-zinc-850 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    selectAvatar(val);
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                const val = input.value.trim();
                if (val) {
                  selectAvatar(val);
                  input.value = "";
                } else {
                  showToast("Escreva ou cole um emoji primeiro.", "info");
                }
              }}
              className="bg-emerald-650 hover:bg-emerald-750 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Aplicar
            </button>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1.5 block leading-relaxed">
            Dica: No celular, abra o teclado de emojis e escolha o seu. No computador, use <kbd className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[9px]">Win + .</kbd> ou <kbd className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[9px]">Cmd + Ctrl + Espaço</kbd>.
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm text-center transition-colors duration-300">
        <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Pontuação Acumulada</p>
        <p className="text-6xl font-black text-emerald-600 dark:text-emerald-400 leading-none py-2">{user?.points}</p>
        
        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <div className="text-left font-sans">
              <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">Notificações Push</p>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                {notifPermission === 'granted' ? 'Ativadas' : notifPermission === 'denied' ? 'Bloqueadas' : 'Desativadas'}
              </p>
            </div>
            {notifPermission !== 'granted' && (
              <button 
                onClick={requestPermission}
                className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-200 transition-all cursor-pointer"
              >
                Ativar
              </button>
            )}
            {notifPermission === 'granted' && (
              <Bell className="w-4 h-4 text-emerald-500" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Histórico de Atividades e Pontos
        </h3>
        
        <div className="space-y-3">
          {completedLog.length === 0 ? (
            <p className="text-center py-6 text-sm text-gray-400 dark:text-zinc-500 italic">
              Nenhuma atividade pontuada ainda. Complete tarefas para somar conquistas!
            </p>
          ) : (
            completedLog.map((log, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-850/50 rounded-2xl border border-gray-100/50 dark:border-zinc-850"
              >
                <div className="space-y-0.5 text-left">
                  <p className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate max-w-[200px] sm:max-w-xs">{log.title}</p>
                  <div className="flex gap-2 text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                    <span>{log.subject}</span>
                    <span>•</span>
                    <span>Concluído em: {formatDate(log.completed_at, "dd/MM 'às' HH:mm")}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl text-[10px] font-black">
                    +{log.points} PTS
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showInstallBtn && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 rounded-3xl border border-emerald-500/20 shadow-xl space-y-4 font-sans"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Smartphone className="w-6 h-6 animate-bounce" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-base">Instalar no Celular (Android/iOS)</h3>
              <p className="text-xs text-emerald-100">Use o Mural como um aplicativo nativo no seu celular!</p>
            </div>
          </div>
          <button 
            onClick={handleInstallClick}
            className="w-full py-3 bg-white text-emerald-800 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            {deferredPrompt ? "Instalar Aplicativo Agora" : "Como Instalar (Guia Rápido)"}
          </button>
        </motion.div>
      )}
    </div>
  );
};

const CalendarPage = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // Default to Fevereiro (1)
  const [clickedDay, setClickedDay] = useState<number | null>(null);

  const MONTHS_DATA = [
    {
      num: 0,
      name: "Janeiro",
      tempoEscola: 0,
      tempoComunidade: 0,
      diasLetivos: 0,
      events: [
        { day: "5 a 30", title: "Férias Escolares (26 dias)", type: "férias" },
        { day: "19 a 21", title: "Renovação de Matrícula para os Cursos Técnicos Integrados", type: "evento" },
        { day: "26", title: "Publicação de Edital para ocupação de vagas remanescentes", type: "evento" },
        { day: "26", title: "Solicitação de reabertura de matrículas trancadas", type: "evento" }
      ]
    },
    {
      num: 1,
      name: "Fevereiro",
      tempoEscola: 13,
      tempoComunidade: 2,
      diasLetivos: 15,
      events: [
        { day: "2 a 4", title: "Jornada Pedagógica e Administrativa do Campus Almenara", type: "reunião" },
        { day: "4", title: "Início do Ano Letivo / Recepção Discente", type: "periodo" },
        { day: "5 a 6", title: "Data limite para dilação de prazo de integralização do curso", type: "evento" },
        { day: "5 a 6", title: "Solicitação de aproveitamento de estudos", type: "evento" },
        { day: "9 a 13", title: "Aplicação das Provas Diagnósticas para o 1º ano", type: "evento" },
        { day: "16", title: "Carnaval (Ponto Facultativo)", type: "feriado" },
        { day: "17", title: "Carnaval (Ponto Facultativo)", type: "feriado" },
        { day: "18", title: "Quarta-feira de Cinzas (Ponto Facultativo até as 14 horas)", type: "feriado" },
        { day: "18", title: "Dia escolar após as 14 horas - atividades administrativas", type: "periodo" }
      ]
    },
    {
      num: 2,
      name: "Março",
      tempoEscola: 12,
      tempoComunidade: 11,
      diasLetivos: 23,
      events: [
        { day: "6", title: "Prazo de entrega do PIT 2026/1 e RIT 2025/2", type: "evento" },
        { day: "7", title: "Reunião de Pais", type: "reunião" },
        { day: "14", title: "Sábado Letivo (referente a uma Segunda-feira)", type: "sábado" }
      ]
    },
    {
      num: 3,
      name: "Abril",
      tempoEscola: 13,
      tempoComunidade: 7,
      diasLetivos: 20,
      events: [
        { day: "3", title: "Paixão de Cristo (Feriado Nacional)", type: "feriado" },
        { day: "11", title: "Sábado Letivo (referente a uma Terça-feira)", type: "sábado" },
        { day: "13 a 17", title: "Semana de Conscientização da luta pela Educação Inclusiva", type: "evento" },
        { day: "20", title: "Ponto Facultativo", type: "feriado" },
        { day: "21", title: "Tiradentes (Feriado Nacional)", type: "feriado" }
      ]
    },
    {
      num: 4,
      name: "Maio",
      tempoEscola: 20,
      tempoComunidade: 0,
      diasLetivos: 20,
      events: [
        { day: "1", title: "Dia do Trabalhador (Feriado Nacional)", type: "feriado" },
        { day: "27 a 29", title: "VIII Mostra de Linguagens do Campus Almenara", type: "evento" }
      ]
    },
    {
      num: 5,
      name: "Junho",
      tempoEscola: 7,
      tempoComunidade: 12,
      diasLetivos: 19,
      events: [
        { day: "4", title: "Corpus Christi (Ponto Facultativo)", type: "feriado" },
        { day: "5", title: "Ponto Facultativo", type: "feriado" },
        { day: "9", title: "Simulado de Matemática e Ciências da Natureza", type: "evento" },
        { day: "19", title: "Festa Junina do Campus Almenara", type: "evento" },
        { day: "24", title: "São João (Feriado Municipal)", type: "feriado" }
      ]
    },
    {
      num: 6,
      name: "Julho",
      tempoEscola: 7,
      tempoComunidade: 0,
      diasLetivos: 7,
      events: [
        { day: "1", title: "Conselho de Classe 1º Semestre (no contraturno)", type: "reunião" },
        { day: "3", title: "Término do 1º Semestre Letivo de 2026", type: "periodo" },
        { day: "6 e 7", title: "Recuperação Parcial do 1º Semestre", type: "evento" },
        { day: "8", title: "Conselho de Classe", type: "reunião" },
        { day: "9 a 10", title: "Recuperação Final do 1º Semestre", type: "evento" },
        { day: "13 a 27", title: "Férias Escolares (15 dias)", type: "férias" },
        { day: "28", title: "Início do 2º Semestre Letivo de 2026", type: "periodo" }
      ]
    },
    {
      num: 7,
      name: "Agosto",
      tempoEscola: 15,
      tempoComunidade: 7,
      diasLetivos: 22,
      events: [
        { day: "5", title: "Conselho de Classe Final das turmas pendentes", type: "reunião" },
        { day: "8", title: "Reunião de Pais e Mestres", type: "reunião" },
        { day: "29", title: "Sábado Letivo (referente a uma Segunda-feira)", type: "sábado" }
      ]
    },
    {
      num: 8,
      name: "Setembro",
      tempoEscola: 18,
      tempoComunidade: 4,
      diasLetivos: 22,
      events: [
        { day: "7", title: "Independência do Brasil (Feriado Nacional)", type: "feriado" },
        { day: "19", title: "Sábado Letivo (referente a uma Segunda-feira)", type: "sábado" },
        { day: "25", title: "Dia do Profissional de Técnico em Agropecuária", type: "evento" }
      ]
    },
    {
      num: 9,
      name: "Outubro",
      tempoEscola: 13,
      tempoComunidade: 5,
      diasLetivos: 18,
      events: [
        { day: "5 a 9", title: "Semana Nacional de Ciência e Tecnologia (SNCT 2026)", type: "evento" },
        { day: "10", title: "Sábado Letivo (referente a uma Segunda-feira)", type: "sábado" },
        { day: "12", title: "Nossa Senhora Aparecida (Feriado Nacional)", type: "feriado" },
        { day: "13 a 16", title: "Férias Escolares (4 dias)", type: "férias" },
        { day: "28", title: "Dia do Servidor Público Federal (Ponto Facultativo)", type: "feriado" },
        { day: "31", title: "Sábado Letivo (referente a uma Quarta-feira)", type: "sábado" }
      ]
    },
    {
      num: 10,
      name: "Novembro",
      tempoEscola: 10,
      tempoComunidade: 10,
      diasLetivos: 20,
      events: [
        { day: "2", title: "Finados (Feriado Nacional)", type: "feriado" },
        { day: "15", title: "Proclamação da República (Feriado Nacional)", type: "feriado" },
        { day: "20", title: "Dia Nacional de Zumbi e da Consciência Negra (Feriado)", type: "feriado" },
        { day: "28", title: "Sábado Letivo (referente a uma Sexta-feira)", type: "sábado" }
      ]
    },
    {
      num: 11,
      name: "Dezembro",
      tempoEscola: 14,
      tempoComunidade: 0,
      diasLetivos: 14,
      events: [
        { day: "9", title: "Conselho de Classe 2º Semestre", type: "reunião" },
        { day: "14 a 15", title: "Recuperação Parcial do 2º Semestre", type: "evento" },
        { day: "16", title: "Conselho de Classe de canhotos", type: "reunião" },
        { day: "18", title: "Término do Ano Letivo de 2026", type: "periodo" },
        { day: "18", title: "Formatura dos Cursos Técnicos Integrados", type: "evento" },
        { day: "21 a 22", title: "Recuperação Final do 2º Semestre", type: "evento" },
        { day: "22", title: "Conselho de Classe Final", type: "reunião" },
        { day: "23", title: "Dia Escolar - Atividades administrativas", type: "periodo" },
        { day: "24", title: "Véspera de Natal (Ponto Facultativo após as 13h)", type: "feriado" },
        { day: "25", title: "Natal (Feriado Nacional)", type: "feriado" },
        { day: "28 a 30", title: "Atividades administrativas e pedagógicas", type: "periodo" },
        { day: "31", title: "Véspera de Ano Novo (Ponto Facultativo)", type: "feriado" }
      ]
    }
  ];

  const RANGE_DATA: Record<number, { te: { start: number; end: number }[]; tc: { start: number; end: number }[] }> = {
    0: { te: [], tc: [] },
    1: { te: [{ start: 4, end: 6 }, { start: 9, end: 13 }, { start: 23, end: 27 }], tc: [{ start: 19, end: 20 }] },
    2: { te: [{ start: 2, end: 6 }, { start: 23, end: 27 }, { start: 30, end: 31 }], tc: [{ start: 9, end: 14 }, { start: 16, end: 20 }] },
    3: { te: [{ start: 1, end: 2 }, { start: 6, end: 11 }, { start: 13, end: 17 }], tc: [{ start: 22, end: 24 }, { start: 27, end: 30 }] },
    4: { te: [{ start: 4, end: 8 }, { start: 11, end: 15 }, { start: 18, end: 22 }, { start: 25, end: 29 }], tc: [] },
    5: { te: [{ start: 15, end: 19 }, { start: 29, end: 30 }], tc: [{ start: 1, end: 3 }, { start: 8, end: 12 }, { start: 22, end: 23 }, { start: 25, end: 26 }] },
    6: { te: [{ start: 1, end: 3 }, { start: 28, end: 31 }], tc: [] },
    7: { te: [{ start: 3, end: 7 }, { start: 10, end: 14 }, { start: 17, end: 21 }], tc: [{ start: 24, end: 29 }, { start: 31, end: 31 }] },
    8: { te: [{ start: 8, end: 11 }, { start: 14, end: 19 }, { start: 21, end: 25 }, { start: 28, end: 30 }], tc: [{ start: 1, end: 4 }] },
    9: { te: [{ start: 1, end: 2 }, { start: 5, end: 10 }, { start: 26, end: 27 }, { start: 29, end: 31 }], tc: [{ start: 19, end: 23 }] },
    10: { te: [{ start: 3, end: 6 }, { start: 9, end: 13 }, { start: 30, end: 30 }], tc: [{ start: 16, end: 19 }, { start: 23, end: 28 }] },
    11: { te: [{ start: 1, end: 4 }, { start: 7, end: 11 }, { start: 14, end: 18 }], tc: [] }
  };

  const current = MONTHS_DATA.find(m => m.num === selectedMonth) || MONTHS_DATA[1];
  const ranges = RANGE_DATA[selectedMonth] || { te: [], tc: [] };

  // Calculate calendar specs for the selected month in 2026
  const year = 2026;
  const firstDayIndex = new Date(year, selectedMonth, 1).getDay(); // 0 = Sunday, 1 = Monday etc.
  const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();

  // Parse custom range in day (e.g., "5 a 30" -> number list, "6 e 7" -> [6, 7], "12" -> [12])
  const parseEventDays = (dayStr: string): number[] => {
    const days: number[] = [];
    if (dayStr.includes(" a ")) {
      const parts = dayStr.split(" a ");
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          days.push(i);
        }
      }
    } else if (dayStr.includes(" e ")) {
      const parts = dayStr.split(" e ");
      parts.forEach(p => {
        const val = parseInt(p.trim(), 10);
        if (!isNaN(val)) days.push(val);
      });
    } else {
      const val = parseInt(dayStr, 10);
      if (!isNaN(val)) days.push(val);
    }
    return days;
  };

  const isDayInTE = (d: number) => ranges.te.some(r => d >= r.start && d <= r.end);
  const isDayInTC = (d: number) => ranges.tc.some(r => d >= r.start && d <= r.end);

  const getDayStatus = (d: number) => {
    // Check events
    const daysEvents = current.events.filter(evt => parseEventDays(evt.day).includes(d));
    const isHoliday = daysEvents.some(e => e.type === "feriado" || e.type === "férias" || e.type === "ponto facultativo");
    const isSabadoLetivo = daysEvents.some(e => e.type === "sábado");
    const inTE = isDayInTE(d);
    const inTC = isDayInTC(d);

    return {
      isHoliday,
      isSabadoLetivo,
      inTE,
      inTC,
      events: daysEvents
    };
  };

  // Generate blank spots for previous month
  const blanks = Array(firstDayIndex).fill(null);
  // Generate days in current month
  const days = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);

  const padZero = (n: number) => n.toString().padStart(2, "0");

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const clickedDayDetails = clickedDay ? getDayStatus(clickedDay) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pt-4 pb-12 px-2 sm:px-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-3 tracking-tight">
          <CalendarDays className="w-8 h-8 text-emerald-600 animate-pulse" />
          Calendário Escolar 2026
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 text-sm font-semibold max-w-xl mx-auto">
          Curso Técnico Integrado ao Ensino Médio de Agropecuária • Regime de Alternância (IFNMG Almenara)
        </p>
      </div>

      {/* Metric Counters with modern design */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 p-4 sm:p-5 rounded-3xl text-center shadow-xs backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400">Tempo Escola (TE)</p>
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">{current.tempoEscola} <span className="text-xs sm:text-sm font-bold">dias</span></p>
        </div>
        <div className="space-y-1 border-x border-emerald-500/15">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
            <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400">Tempo Comunidade (TC)</p>
          </div>
          <p className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{current.tempoComunidade} <span className="text-xs sm:text-sm font-bold">dias</span></p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
            <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400">Dias Letivos</p>
          </div>
          <p className="text-xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">{current.diasLetivos} <span className="text-xs sm:text-sm font-bold">dias</span></p>
        </div>
      </div>

      {/* Month Selection Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 pt-2 scrollbar-none snap-x max-w-full">
        {MONTHS_DATA.map(m => (
          <button
            key={m.num}
            onClick={() => {
              setSelectedMonth(m.num);
              setClickedDay(null);
            }}
            className={`px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer snap-center border transition-all duration-300 ${
              selectedMonth === m.num
                ? "bg-gradient-to-r from-emerald-600 to-emerald-750 text-white border-emerald-600 shadow-md shadow-emerald-650/20 scale-[1.02]"
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-150 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Interactive Month Calendars Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Real Dynamic Calendar Grid */}
        <motion.div
          key={selectedMonth}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-7 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-[32px] border border-gray-150 dark:border-zinc-800 shadow-xl space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-zinc-800/60 pb-4 mb-4 select-none">
              <h3 className="text-xl font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-6 bg-emerald-600 rounded-full inline-block"></span>
                {current.name} {year}
              </h3>
              <span className="text-[10px] px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-full font-bold uppercase tracking-widest border border-zinc-150/40 dark:border-zinc-700/50">
                Semestre {selectedMonth < 6 ? "1º" : "2º"}
              </span>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 select-none notranslate" translate="no">
              {weekdays.map(day => (
                <div key={day} className="text-center font-black text-[10px] uppercase tracking-widest text-zinc-400 py-1" translate="no">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {blanks.map((_, index) => (
                <div key={`blank-${index}`} className="aspect-square bg-gray-50/20 dark:bg-zinc-950/10 rounded-xl border border-transparent"></div>
              ))}

              {days.map(day => {
                const { isHoliday, isSabadoLetivo, inTE, inTC, events } = getDayStatus(day);
                const isSelected = clickedDay === day;
                const isWeekend = (firstDayIndex + day - 1) % 7 === 0 || (firstDayIndex + day - 1) % 7 === 6;

                // Color themes depending on priority with beautiful, high-contrast, safe colors conforming to guidelines:
                let dayStyle = "";
                if (isHoliday) {
                  dayStyle = "bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-100/40 dark:hover:bg-red-900/35";
                } else if (isSabadoLetivo) {
                  dayStyle = "bg-indigo-50 dark:bg-indigo-950/25 text-indigo-750 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/35 font-extrabold";
                } else if (inTE && !isWeekend) {
                  dayStyle = "bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/25 dark:border-emerald-500/20 hover:bg-emerald-500/20";
                } else if (inTC && !isWeekend) {
                  dayStyle = "bg-amber-500/10 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/25 dark:border-amber-500/20 hover:bg-amber-500/20";
                } else if (isWeekend) {
                  if (inTE) {
                    dayStyle = "bg-zinc-50 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-550 border border-dashed border-emerald-500/20 dark:border-emerald-500/10";
                  } else if (inTC) {
                    dayStyle = "bg-zinc-50 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-550 border border-dashed border-amber-500/20 dark:border-amber-500/10";
                  } else {
                    dayStyle = "bg-zinc-100/30 dark:bg-zinc-950/15 text-zinc-400 dark:text-zinc-600 border border-zinc-100 dark:border-zinc-900";
                  }
                } else {
                  dayStyle = "bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-350 border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-850";
                }

                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setClickedDay(isSelected ? null : day)}
                    key={`day-${day}`}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm md:text-base font-black relative transition-all duration-200 cursor-pointer ${dayStyle} ${
                      isSelected ? "ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-zinc-900 border-none scale-[1.04]" : ""
                    }`}
                  >
                    <span>{day}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Micro Legend inside Calendar Panel */}
          <div className="border-t border-gray-150 dark:border-zinc-800/80 pt-4 mt-2 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 select-none">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-500/15 border border-emerald-500/25 block"></span>TE (Escola)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-500/15 border border-amber-500/25 block"></span>TC (Comunidade)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-red-500/15 border border-red-500/25 block"></span>Feriado/Recesso</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-indigo-500/15 border border-indigo-500/25 block"></span>Sábado Letivo</span>
          </div>
        </motion.div>

        {/* Legend Panel & Start/End Dates details */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Ranges start-end tracking details */}
          <div className="bg-gradient-to-br from-[#064e3b] via-[#022c22] to-zinc-950 text-white p-6 rounded-[32px] border border-emerald-650/40 shadow-xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-500/5 rounded-full blur-[50px] pointer-events-none" />

            <div className="relative z-10">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#00c88c] mb-3 flex items-center gap-2">
                <Compass className="w-4 h-4" />
                Início e Fim dos Períodos
              </h4>
              <p className="text-xs text-emerald-100/80 mb-5 font-medium">Marcas oficiais das datas de início e término das alternâncias deste mês:</p>
            </div>

            <div className="relative z-10 space-y-4.5">
              
              {/* Tempo Escola Start / End */}
              <div className="bg-emerald-950/45 dark:bg-zinc-900/40 border border-emerald-500/20 p-4 rounded-2xl space-y-1.5 hover:border-emerald-500/35 transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    Tempo Escola (TE)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-200">
                    {current.tempoEscola} dias úteis
                  </span>
                </div>
                {ranges.te.length === 0 ? (
                  <p className="text-xs italic text-emerald-200/55">Não há período de Tempo Escola programado para este mês.</p>
                ) : (
                  ranges.te.map((r, i) => (
                    <div key={i} className="text-xs space-y-0.5 text-left">
                      <p className="font-extrabold text-white">🎒 Período {ranges.te.length > 1 ? `${i + 1}` : ""}</p>
                      <div className="text-[11px] text-emerald-100 flex flex-wrap justify-between">
                        <span>• Início: <strong className="text-emerald-300 font-black">{padZero(r.start)} de {current.name}</strong></span>
                        <span>• Término: <strong className="text-emerald-300 font-black">{padZero(r.end)} de {current.name}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tempo Comunidade Start / End */}
              <div className="bg-amber-955/20 dark:bg-zinc-900/40 border border-amber-500/20 p-4 rounded-2xl space-y-1.5 hover:border-amber-500/35 transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/15 flex items-center gap-1">
                    <Sprout className="w-3 h-3" />
                    Tempo Comunidade (TC)
                  </span>
                  <span className="text-[10px] font-bold text-amber-200">
                    {current.tempoComunidade} dias
                  </span>
                </div>
                {ranges.tc.length === 0 ? (
                  <p className="text-xs italic text-amber-200/55">Não há Tempo Comunidade programado para este mês.</p>
                ) : (
                  ranges.tc.map((r, i) => (
                    <div key={i} className="text-xs space-y-0.5 text-left">
                      <p className="font-extrabold text-white">🏡 Período {ranges.tc.length > 1 ? `${i + 1}` : ""}</p>
                      <div className="text-[11px] text-amber-100 flex flex-wrap justify-between">
                        <span>• Início: <strong className="text-amber-300 font-black">{padZero(r.start)} de {current.name}</strong></span>
                        <span>• Término: <strong className="text-amber-300 font-black">{padZero(r.end)} de {current.name}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

          {/* Interactive Cell Info Card */}
          <AnimatePresence mode="wait">
            {clickedDay ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                key={`day-drawer-${clickedDay}`}
                className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-gray-150 dark:border-zinc-800 shadow-md space-y-3"
              >
                <div className="flex justify-between items-center border-b border-gray-150 dark:border-zinc-805 pb-2">
                  <h4 className="font-black text-sm text-gray-900 dark:text-zinc-100">
                    Informações do Dia {padZero(clickedDay)}
                  </h4>
                  <button onClick={() => setClickedDay(null)} className="text-[10px] font-black text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">Fechar</button>
                </div>

                <div className="text-xs space-y-3">
                  {/* Alternation Status */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-extrabold text-zinc-400 dark:text-zinc-500">Classificação:</span>
                      {clickedDayDetails?.inTE && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full font-black text-[10px] uppercase border border-emerald-500/20">
                          🎒 Tempo Escola (TE)
                        </span>
                      )}
                      {clickedDayDetails?.inTC && (
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full font-black text-[10px] uppercase border border-amber-500/20">
                          🏡 Tempo Comunidade (TC)
                        </span>
                      )}
                      {!clickedDayDetails?.inTE && !clickedDayDetails?.inTC && (
                        <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full font-bold text-[10px] uppercase">
                          Recesso / Férias
                        </span>
                      )}
                    </div>
                    {clickedDay && (firstDayIndex + clickedDay - 1) % 7 === 0 && (
                      <span className="text-[10px] text-red-500 dark:text-red-400 font-extrabold uppercase tracking-wider block">
                        ⚠️ Fim de Semana (Domingo) - Sem aulas normais
                      </span>
                    )}
                    {clickedDay && (firstDayIndex + clickedDay - 1) % 7 === 6 && !clickedDayDetails?.isSabadoLetivo && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider block">
                        ⚠️ Fim de Semana (Sábado) - Sem aulas normais
                      </span>
                    )}
                  </div>

                  {/* Events Detail list */}
                  <div className="space-y-1.5 pt-1 text-left">
                    <p className="font-extrabold text-zinc-500 dark:text-zinc-400">Eventos e Observações:</p>
                    {clickedDayDetails?.events && clickedDayDetails.events.length > 0 ? (
                      clickedDayDetails.events.map((evt, id) => {
                        let evtTheme = "";
                        let tagTheme = "";
                        if (evt.type === "feriado" || evt.type === "férias" || evt.type === "ponto facultativo") {
                          evtTheme = "bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-300";
                          tagTheme = "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
                        } else if (evt.type === "sábado") {
                          evtTheme = "bg-indigo-50 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300 font-extrabold";
                          tagTheme = "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300";
                        } else if (evt.type === "reunião") {
                          evtTheme = "bg-sky-50 dark:bg-sky-950/25 border-sky-200 dark:border-sky-900/40 text-sky-900 dark:text-sky-300";
                          tagTheme = "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300";
                        } else if (evt.type === "periodo") {
                          evtTheme = "bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300";
                          tagTheme = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300";
                        } else {
                          evtTheme = "bg-amber-50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-300";
                          tagTheme = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
                        }

                        return (
                          <div key={id} className={`p-3 rounded-2xl border font-bold text-xs flex flex-col gap-1.5 ${evtTheme}`}>
                            <span>{evt.title}</span>
                            <span className={`self-start px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-widest ${tagTheme}`}>
                              {evt.type}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs italic text-gray-400 dark:text-zinc-500 select-none">Nenhum evento registrado para este dia.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50/50 dark:bg-zinc-950/25 border border-dashed border-gray-200 dark:border-zinc-800/80 p-6 rounded-[28px] text-center select-none">
                <Info className="w-8 h-8 text-zinc-350 mx-auto mb-2 opacity-75" />
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Clique em qualquer dia do calendário para ver mais detalhes de eventos ou alternâncias.</p>
              </div>
            )}
          </AnimatePresence>

          {/* Standard events sidebar list for this month */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-gray-150 dark:border-zinc-800 shadow-lg space-y-4">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-550" />
              Eventos de {current.name}
            </h4>

            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
              {current.events.length === 0 ? (
                <p className="text-center py-4 text-xs text-zinc-400 italic">Nenhum evento letivo neste período.</p>
              ) : (
                current.events.map((evt, idx) => {
                  const themeColor = 
                    evt.type === "feriado" ? "bg-red-500/10 text-red-500 border border-red-500/10" :
                    evt.type === "reunião" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10" :
                    evt.type === "férias" ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/10" :
                    evt.type === "sábado" ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/10" :
                    "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 border border-transparent";

                  return (
                    <div key={idx} className="flex gap-3 items-center p-2 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl transition-all border border-transparent">
                      <div className={`text-center text-[9px] font-black uppercase py-0.5 px-2 rounded-lg shrink-0 ${themeColor}`}>
                        Dia {evt.day}
                      </div>
                      <p className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 line-clamp-2 leading-snug">{evt.title}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const SchedulePage = () => {
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const daysMap: Record<number, string> = {
      1: "Segunda",
      2: "Terça",
      3: "Quarta",
      4: "Quinta",
      5: "Sexta"
    };
    const currentDayOfWeek = new Date().getDay();
    return daysMap[currentDayOfWeek] || "Segunda";
  });
  
  const [filterType, setFilterType] = useState<string>("all"); // all, agro, propedeutica

  const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

  const TIMELINE_DATA: Record<string, any[]> = {
    "Segunda": [
      { time: "08:00 - 08:50", subject: "Produção de Monogástricos", room: "Marcus Leonardo", type: "agro" },
      { time: "08:50 - 09:40", subject: "Produção de Monogástricos", room: "Marcus Leonardo", type: "agro" },
      { time: "09:40 - 10:00", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "10:00 - 10:50", subject: "Química", room: "Roberta", type: "exatas" },
      { time: "10:50 - 11:40", subject: "Química", room: "Roberta", type: "exatas" },
      { time: "11:40 - 13:30", subject: "Almoço / Tempo Livre", room: "Refeitório", type: "intervalo" },
      { time: "13:30 - 14:20", subject: "Colocação em Comum", room: "Tania", type: "humanas" },
      { time: "14:20 - 15:10", subject: "Colocação em Comum", room: "Tania", type: "humanas" },
      { time: "15:10 - 15:30", subject: "Intervalo Escolar", room: "Lanche da Tarde", type: "intervalo" },
      { time: "15:30 - 16:20", subject: "Topografia", room: "João Alison", type: "agro" },
      { time: "16:20 - 17:10", subject: "Topografia", room: "João Alison", type: "agro" }
    ],
    "Terça": [
      { time: "08:00 - 08:50", subject: "Língua Portuguesa e Redação", room: "Ana Cláudia", type: "letras" },
      { time: "08:50 - 09:40", subject: "Língua Portuguesa e Redação", room: "Ana Cláudia", type: "letras" },
      { time: "09:40 - 10:00", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "10:00 - 10:50", subject: "Culturas Anuais", room: "Eduardo", type: "agro" },
      { time: "10:50 - 11:40", subject: "Culturas Anuais", room: "Eduardo", type: "agro" },
      { time: "11:40 - 13:30", subject: "Almoço / Tempo Livre", room: "Refeitório", type: "intervalo" },
      { time: "13:30 - 14:20", subject: "Sociologia", room: "Matheus Freitas", type: "humanas" },
      { time: "14:20 - 15:10", subject: "Matemática", room: "Débora", type: "exatas" },
      { time: "15:10 - 15:30", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "15:30 - 16:20", subject: "Atendimento de Alunos", room: "Plantão Pedagógico", type: "especial" },
      { time: "16:20 - 17:10", subject: "Atendimento de Alunos", room: "Plantão Pedagógico", type: "especial" }
    ],
    "Quarta": [
      { time: "08:00 - 08:50", subject: "Física", room: "Phileppe", type: "exatas" },
      { time: "08:50 - 09:40", subject: "Física", room: "Phileppe", type: "exatas" },
      { time: "09:40 - 10:00", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "10:00 - 10:50", subject: "Espanhol", room: "Nêmia", type: "letras" },
      { time: "10:50 - 11:40", subject: "Espanhol", room: "Nêmia", type: "letras" },
      { time: "11:40 - 17:10", subject: "Retorno à Comunidade", room: "Tempo Comunidade (Agropecuária Alternância)", type: "viagem" }
    ],
    "Quinta": [
      { time: "08:00 - 08:50", subject: "Geografia", room: "Telma", type: "humanas" },
      { time: "08:50 - 09:40", subject: "Geografia", room: "Telma", type: "humanas" },
      { time: "09:40 - 10:00", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "10:00 - 10:50", subject: "História", room: "Túlio", type: "humanas" },
      { time: "10:50 - 11:40", subject: "História", room: "Túlio", type: "humanas" },
      { time: "11:40 - 13:30", subject: "Almoço / Tempo Livre", room: "Refeitório", type: "intervalo" },
      { time: "13:30 - 14:20", subject: "Matemática", room: "Débora", type: "exatas" },
      { time: "14:20 - 15:10", subject: "Matemática", room: "Débora", type: "exatas" },
      { time: "15:10 - 15:30", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "15:30 - 16:20", subject: "Estudos da Literatura e das Artes", room: "Willian", type: "letras" },
      { time: "16:20 - 17:10", subject: "Estudos da Literatura e das Artes", room: "Willian", type: "letras" }
    ],
    "Sexta": [
      { time: "08:00 - 08:50", subject: "Biologia", room: "Jefferson", type: "exatas" },
      { time: "08:50 - 09:40", subject: "Biologia", room: "Jefferson", type: "exatas" },
      { time: "09:40 - 10:00", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "10:00 - 10:50", subject: "Educação Física", room: "Keila", type: "letras" },
      { time: "10:50 - 11:40", subject: "Educação Física", room: "Keila", type: "letras" },
      { time: "11:40 - 13:30", subject: "Almoço / Tempo Livre", room: "Refeitório", type: "intervalo" },
      { time: "13:30 - 14:20", subject: "Irrigação", room: "Antônio Clarette", type: "agro" },
      { time: "14:20 - 15:10", subject: "Irrigação", room: "Antônio Clarette", type: "agro" },
      { time: "15:10 - 15:30", subject: "Intervalo Escolar", room: "Lanche", type: "intervalo" },
      { time: "15:30 - 16:20", subject: "Agroecologia", room: "Vico", type: "agro" },
      { time: "16:20 - 17:10", subject: "Agroecologia", room: "Vico", type: "agro" }
    ]
  };

  const getTodayDayName = () => {
    const daysMap: Record<number, string> = {
      1: "Segunda",
      2: "Terça",
      3: "Quarta",
      4: "Quinta",
      5: "Sexta"
    };
    return daysMap[new Date().getDay()] || "";
  };
  
  const todayDayName = getTodayDayName();

  // Progress calculator for active classroom slots
  const getSlotProgress = (timeStr: string, dayName: string) => {
    const currentDayName = getTodayDayName();
    if (currentDayName !== dayName) return { active: false, pct: 0 };

    const [startStr, endStr] = timeStr.split(" - ");
    if (!startStr || !endStr) return { active: false, pct: 0 };

    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const elapsed = currentMinutes - startMinutes;
      const total = endMinutes - startMinutes;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      return { active: true, pct };
    }
    return { active: false, pct: 0 };
  };

  const getActiveSlotRightNow = () => {
    const items = TIMELINE_DATA[selectedDay] || [];
    for (const item of items) {
      const prog = getSlotProgress(item.time, selectedDay);
      if (prog.active) {
        return { item, prog };
      }
    }
    return null;
  };

  const activeClass = getActiveSlotRightNow();

  const getIconForSubject = (subject: string, type: string) => {
    const lower = subject.toLowerCase();
    if (type === "intervalo") {
      if (lower.includes("almoço") || lower.includes("refeitório")) {
        return <Utensils className="w-5 h-5" />;
      }
      return <Coffee className="w-5 h-5" />;
    }
    if (type === "viagem") return <Truck className="w-5 h-5 text-white" />;
    if (type === "agro") {
      if (lower.includes("topografia")) return <Compass className="w-5 h-5" />;
      return <Sprout className="w-5 h-5" />;
    }
    if (type === "exatas") {
      if (lower.includes("química") || lower.includes("laboratório")) return <Beaker className="w-5 h-5" />;
      if (lower.includes("física")) return <Atom className="w-5 h-5" />;
      return <Award className="w-5 h-5" />;
    }
    if (lower.includes("portuguesa") || lower.includes("literatura") || lower.includes("redação") || lower.includes("espanhol")) return <BookOpen className="w-5 h-5" />;
    if (lower.includes("física")) return <Flame className="w-5 h-5" />; // Ed Física
    if (type === "humanas") return <Map className="w-5 h-5" />;
    return <GraduationCap className="w-5 h-5" />;
  };

  const filteredTimeline = TIMELINE_DATA[selectedDay] || [];

  const dayActiveClasses = "bg-gradient-to-r from-emerald-600 to-emerald-750 text-white shadow-lg shadow-emerald-500/20 border-emerald-600 scale-[1.04] font-black z-10 animate-fade-in";
  const dayInactiveClasses = "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 font-bold hover:scale-[1.01]";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pt-4 pb-12 px-2 sm:px-4">
      
      {/* Header section */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-3 tracking-tight">
          <Clock className="w-8 h-8 text-emerald-600 animate-spin-slow" />
          Quadro de Horários
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 text-sm font-semibold">
          Turma: Agropecuária Integrado • Sala 0125 • IFNMG Almenara
        </p>
      </div>

      {/* Week Day Picker */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3 bg-zinc-100/50 dark:bg-zinc-950/20 p-1.5 rounded-2xl border border-gray-200/50 dark:border-zinc-800/40">
          {DAYS.map(day => {
            const isSelected = selectedDay === day;
            const isToday = todayDayName === day;

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day);
                }}
                className={`py-3 rounded-xl text-[10px] sm:text-xs text-center uppercase tracking-widest cursor-pointer border transition-all duration-300 relative flex flex-col items-center justify-center gap-0.5 ${
                  isSelected ? dayActiveClasses : dayInactiveClasses
                }`}
              >
                <span translate="no" className="notranslate">{day.substring(0, 3)}</span>
                {isToday && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'} absolute bottom-1 right-1`}></span>
                )}
                {isToday && (
                  <span className="text-[7px] font-black opacity-80 uppercase tracking-tight scale-85 hidden sm:inline">HOJE</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Glowing Classroom Widget */}
      <AnimatePresence mode="wait">
        {activeClass && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-5 rounded-[28px] shadow-lg shadow-emerald-500/15 border border-emerald-550/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                  Aula de Agora
                </span>
                <h4 className="text-lg font-black tracking-tight">{activeClass.item.subject}</h4>
                <p className="text-xs text-emerald-100 font-bold flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {activeClass.item.type === "intervalo" ? activeClass.item.room : `Prof. ${activeClass.item.room} • Sala 0125`}
                </p>
              </div>

              {/* Progress bar info */}
              <div className="w-full sm:w-48 space-y-1.5 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="font-mono">{activeClass.item.time}</span>
                  <span>{activeClass.prog.pct}% concluído</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-300 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${activeClass.prog.pct}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule List */}
      <motion.div
        key={selectedDay}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-[32px] border border-gray-200 dark:border-zinc-800 shadow-xl space-y-4"
      >
        <div className="flex border-b border-gray-100 dark:border-zinc-800 pb-3 justify-between items-center select-none">
          <div className="space-y-0.5 text-left">
            <h3 className="font-black text-lg text-gray-950 dark:text-zinc-50 uppercase tracking-wide notranslate" translate="no">
              {selectedDay}-feira
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-widest">
              Alternância Escolar
            </p>
          </div>
          <span className="text-[10px] font-black tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-1 rounded-full uppercase border border-gray-205 dark:border-zinc-700/50">
            Sala 0125
          </span>
        </div>

        {/* Timeline body */}
        {filteredTimeline.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 italic font-semibold">
            Nenhuma disciplina cadastrada para esta {selectedDay}-feira.
          </div>
        ) : (
          <div className="space-y-4 relative">
            {/* Timeline connectors on absolute (Removed as requested) */}
            {/* <div className="absolute top-2 bottom-2 left-6 w-0.5 bg-gray-100 dark:bg-zinc-850 pointer-events-none rounded-full hidden sm:block" /> */}

            {filteredTimeline.map((item, idx) => {
              const isInterval = item.type === "intervalo";
              const isViagem = item.type === "viagem";
              const prog = getSlotProgress(item.time, selectedDay);
              const isSlotActiveNow = prog.active;

              // Design types and theme alignments with highly enriched, theme-conforming colors
              let cardStyle = "";
              let leftBarColor = "";
              let iconTheme = "";
              let subjectTextColor = "";
              let subtitleTextColor = "";
              let badgeTheme = "";

              if (isInterval) {
                const isAlmoco = item.subject.toLowerCase().includes("almoço");
                cardStyle = isAlmoco
                  ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.03] border-dashed border-amber-500/25 dark:border-amber-500/20 hover:bg-amber-500/[0.08] hover:border-amber-400/40"
                  : "bg-orange-500/[0.04] dark:bg-orange-500/[0.03] border-dashed border-orange-500/25 dark:border-orange-500/20 hover:bg-orange-500/[0.08] hover:border-orange-400/40";
                leftBarColor = isAlmoco ? "bg-amber-500" : "bg-orange-500";
                iconTheme = isAlmoco
                  ? "bg-amber-500/10 border border-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "bg-orange-500/10 border border-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm";
                subjectTextColor = isAlmoco 
                  ? "text-amber-950 dark:text-amber-200 text-sm sm:text-base font-black animate-fade-in"
                  : "text-orange-950 dark:text-orange-200 text-sm sm:text-base font-black animate-fade-in";
                subtitleTextColor = "text-zinc-500 dark:text-zinc-400 text-xs font-semibold";
                badgeTheme = isAlmoco 
                  ? "bg-amber-100 dark:bg-amber-950/65 text-amber-700 dark:text-amber-300"
                  : "bg-orange-100 dark:bg-orange-950/65 text-orange-700 dark:text-orange-300";
              } else if (isViagem) {
                cardStyle = "bg-red-500/[0.04] dark:bg-red-500/[0.03] border-red-200/60 dark:border-red-900/40 hover:bg-red-500/[0.08] hover:border-red-400/50 dark:hover:bg-red-900/60";
                leftBarColor = "bg-red-650 animate-pulse";
                iconTheme = "bg-red-600 text-white";
                subjectTextColor = "text-red-950 dark:text-red-200 text-sm sm:text-base font-black";
                subtitleTextColor = "text-red-750 dark:text-red-350 text-xs font-semibold";
                badgeTheme = "bg-red-100 dark:bg-red-950/65 text-red-700 dark:text-red-300";
              } else if (item.type === "agro") {
                // Perfect theme matching: App Theme Emerald
                cardStyle = "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.03] border-emerald-500/25 dark:border-emerald-500/20 hover:bg-emerald-500/[0.08] hover:border-emerald-500/40 dark:hover:bg-emerald-500/20";
                leftBarColor = "bg-emerald-600";
                iconTheme = "bg-emerald-600 text-white";
                subjectTextColor = "text-emerald-950 dark:text-emerald-200 text-sm sm:text-base font-black";
                subtitleTextColor = "text-emerald-750 dark:text-emerald-350 text-xs font-semibold";
                badgeTheme = "bg-emerald-100 dark:bg-emerald-950/65 text-emerald-700 dark:text-emerald-300";
              } else if (item.type === "exatas") {
                // Blue Group
                cardStyle = "bg-blue-500/[0.04] dark:bg-blue-500/[0.03] border-blue-500/25 dark:border-blue-500/20 hover:bg-blue-500/[0.08] hover:border-blue-500/40 dark:hover:bg-blue-500/20";
                leftBarColor = "bg-blue-600";
                iconTheme = "bg-blue-600 text-white";
                subjectTextColor = "text-blue-950 dark:text-blue-200 text-sm sm:text-base font-black";
                subtitleTextColor = "text-blue-750 dark:text-blue-355 text-xs font-semibold";
                badgeTheme = "bg-blue-100 dark:bg-blue-950/65 text-blue-700 dark:text-blue-300";
              } else if (item.type === "letras") {
                // Purple Group
                cardStyle = "bg-purple-500/[0.04] dark:bg-purple-500/[0.03] border-purple-500/25 dark:border-purple-500/20 hover:bg-purple-500/[0.08] hover:border-purple-500/40 dark:hover:bg-purple-500/20";
                leftBarColor = "bg-purple-600";
                iconTheme = "bg-purple-600 text-white";
                subjectTextColor = "text-purple-950 dark:text-purple-200 text-sm sm:text-base font-black";
                subtitleTextColor = "text-purple-750 dark:text-purple-355 text-xs font-semibold";
                badgeTheme = "bg-purple-100 dark:bg-purple-955/65 text-purple-700 dark:text-purple-300";
              } else if (item.type === "humanas") {
                // Amber/Orange Group
                cardStyle = "bg-amber-500/[0.04] dark:bg-amber-500/[0.03] border-amber-500/25 dark:border-amber-500/20 hover:bg-amber-500/[0.08] hover:border-amber-500/40 dark:hover:bg-amber-500/20";
                leftBarColor = "bg-amber-600";
                iconTheme = "bg-amber-600 text-white";
                subjectTextColor = "text-amber-950 dark:text-amber-200 text-sm sm:text-base font-black";
                subtitleTextColor = "text-amber-800 dark:text-amber-355 text-xs font-semibold";
                badgeTheme = "bg-amber-100 dark:bg-amber-955/65 text-amber-700 dark:text-amber-300";
              } else {
                // Indigo/Especial Group
                cardStyle = "bg-indigo-500/[0.04] dark:bg-indigo-500/[0.03] border-indigo-500/25 dark:border-indigo-500/20 hover:bg-indigo-500/[0.08] hover:border-indigo-500/40 dark:hover:bg-indigo-500/20";
                leftBarColor = "bg-indigo-600";
                iconTheme = "bg-indigo-600 text-white";
                subjectTextColor = "text-indigo-950 dark:text-indigo-300 text-sm sm:text-base font-black";
                subtitleTextColor = "text-indigo-750 dark:text-indigo-355 text-xs font-semibold";
                badgeTheme = "bg-indigo-100 dark:bg-indigo-955/65 text-indigo-700 dark:text-indigo-300";
              }

              return (
                <div 
                  key={idx} 
                  className={`flex items-stretch justify-between rounded-[24px] border transition-all duration-300 select-none overflow-hidden ${cardStyle} ${
                    isSlotActiveNow ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 scale-[1.015] shadow-md shadow-emerald-500/5' : 'hover:scale-[1.005]'
                  }`}
                >
                  
                  {/* Left Accent indicator strip */}
                  {!isInterval && (
                    <div className={`w-2 shrink-0 ${leftBarColor}`} />
                  )}

                  {/* Main content body inside card */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Time slot and icon panel */}
                    <div className="flex items-center gap-4 text-left">
                      <div className={`p-3 rounded-2xl shrink-0 shadow-sm ${iconTheme}`}>
                        {getIconForSubject(item.subject, item.type)}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black font-mono text-zinc-600 dark:text-zinc-300 block tracking-wider uppercase leading-none bg-zinc-100/80 dark:bg-zinc-800/80 px-2 py-1 rounded-md border border-zinc-200/30 dark:border-zinc-700/30">
                            {item.time}
                          </span>
                          {isSlotActiveNow && (
                            <span className="bg-emerald-600 dark:bg-emerald-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-widest animate-pulse flex items-center gap-0.5 leading-none">
                              <span className="w-1 h-1 rounded-full bg-white block animate-ping"></span>
                              Agora
                            </span>
                          )}
                        </div>
                        <h4 className={subjectTextColor}>
                          {item.subject}
                        </h4>
                      </div>
                    </div>

                    {/* Teacher/Room Badge info */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {isViagem ? (
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse border border-red-500/10 ${badgeTheme}`}>
                          Regresso Alternância
                        </span>
                      ) : isInterval ? (
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-wide uppercase px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg">
                          {item.room}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-750 px-3 py-1.5 rounded-xl shadow-xs">
                          <div className="w-5 h-5 rounded-full bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center select-none uppercase">
                            {item.room.charAt(0)}
                          </div>
                          <span className="text-[10px] sm:text-xs font-extrabold text-zinc-700 dark:text-zinc-300">
                            Prof. {item.room}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  if (!isFirebaseConfigured && !localStorage.getItem("demo_user")) {
    return <SetupRequired />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/avisos" element={
                  <ProtectedRoute>
                    <Layout><AnnouncementsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/avisos/:id" element={
                  <ProtectedRoute>
                    <Layout><AnnouncementDetailsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/atividades" element={
                  <ProtectedRoute>
                    <Layout><ActivitiesPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/atividades/:id" element={
                  <ProtectedRoute>
                    <Layout><ActivityDetailsPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/ranking" element={
                  <ProtectedRoute>
                    <Layout><RankingPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/usuarios" element={
                  <ProtectedRoute>
                    <Layout><UsersPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/perfil" element={
                  <ProtectedRoute>
                    <Layout><ProfilePage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/calendario" element={
                  <ProtectedRoute>
                    <Layout><CalendarPage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/horario" element={
                  <ProtectedRoute>
                    <Layout><SchedulePage /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute leaderOnly>
                    <Layout><AdminPanel /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/atividade/:id" element={
                  <ProtectedRoute leaderOnly>
                    <Layout><ActivityAdmin /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
     </ThemeProvider>
    </ErrorBoundary>
  );
}

const ProtectedRoute = ({ children, leaderOnly }: { children: React.ReactNode, leaderOnly?: boolean }) => {
  const { user, loading } = useAuth();
  const [showForceButton, setShowForceButton] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowForceButton(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 gap-6">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full"
      />
      {showForceButton && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <p className="text-sm text-gray-500 dark:text-zinc-400">O carregamento está demorando mais que o esperado...</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
          >
            Recarregar App
          </button>
        </motion.div>
      )}
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  if (leaderOnly && user.role !== "leader") return <Navigate to="/" />;
  
  return <>{children}</>;
};

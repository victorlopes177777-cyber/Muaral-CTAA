import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

let app;
let auth: any;
let db: any;
let googleProvider: any;
const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE");

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } else {
    throw new Error("Firebase not configured");
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  // Fallback for demo mode
  auth = { 
    currentUser: null,
    onAuthStateChanged: (callback: (user: any) => void) => {
      setTimeout(() => callback(null), 0);
      return () => {};
    },
    signOut: async () => {
      return Promise.resolve();
    }
  }; 
  db = {};
  googleProvider = {};
}

export { auth, db, googleProvider, isFirebaseConfigured };

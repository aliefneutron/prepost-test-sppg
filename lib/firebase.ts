import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Default credentials dari Firebase project
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCoFKjAeMYUsIGmeYZxuBnUCALaCfP75yU",
  authDomain: "prepost-test-sppg.firebaseapp.com",
  projectId: "prepost-test-sppg",
  storageBucket: "prepost-test-sppg.firebasestorage.app",
  messagingSenderId: "866659754061",
  appId: "1:866659754061:web:4abaa5b53c83f82d31bc04",
  measurementId: "G-L2J0L9S5PE"
};

// Helper untuk membaca konfigurasi dari localStorage jika pengguna mengubahnya
const getStoredFirebaseConfig = (): Record<string, string> => {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('FIREBASE_CONFIG');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // ignore
      }
    }
  }
  return {};
};

const storedConfig = getStoredFirebaseConfig();

const rawApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || storedConfig.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey).trim();
const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || storedConfig.projectId || DEFAULT_FIREBASE_CONFIG.projectId).trim();
const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || storedConfig.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain).trim();
const storageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || storedConfig.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket).trim();
const messagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || storedConfig.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId).trim();
const appId = (import.meta.env.VITE_FIREBASE_APP_ID || storedConfig.appId || DEFAULT_FIREBASE_CONFIG.appId).trim();

export const isFirebaseConfigured = Boolean(rawApiKey && projectId && rawApiKey.startsWith('AIza'));
export const connectedProjectId = projectId;

const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId
};

// Initialize Firebase safely
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

let db: any;
let storage: any;
let auth: any = null;

try {
  db = getFirestore(app);
} catch (err) {
  console.warn("Firestore initialization warning:", err);
}

try {
  storage = getStorage(app);
} catch (err) {
  console.warn("Storage initialization warning:", err);
}

try {
  auth = getAuth(app);
} catch (err) {
  console.warn("Firebase Auth not initialized:", err);
  auth = null;
}

export const saveFirebaseConfig = (config: {
  apiKey: string;
  projectId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('FIREBASE_CONFIG', JSON.stringify(config));
    window.location.reload();
  }
};

export { db, storage, auth };

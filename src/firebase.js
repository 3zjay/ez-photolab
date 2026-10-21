import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDo02QXvyeTSPIcAGXBP4YHUyS_0TsyxHk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ez-photolab.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ez-photolab",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ez-photolab.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "118400666368",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:118400666368:web:c3e2190df8545f5b43c1e5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-H75DXTC20B"
};

// Initialize Firebase
const desktopPreview = import.meta.env.MODE === 'desktop';
const app = desktopPreview ? null : initializeApp(firebaseConfig);
const auth = app ? getAuth(app) : null;
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
const db = app ? (databaseId ? getFirestore(app, databaseId) : getFirestore(app)) : null;
const googleProvider = app ? new GoogleAuthProvider() : null;

export { auth, db, googleProvider };

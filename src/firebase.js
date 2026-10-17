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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };

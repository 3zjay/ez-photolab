import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDo02QXvyeTSPIcAGXBP4YHUyS_0TsyxHk",
  authDomain: "ez-photolab.firebaseapp.com",
  projectId: "ez-photolab",
  storageBucket: "ez-photolab.firebasestorage.app",
  messagingSenderId: "118400666368",
  appId: "1:118400666368:web:c3e2190df8545f5b43c1e5",
  measurementId: "G-H75DXTC20B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };

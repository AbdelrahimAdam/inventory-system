// src/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔑 Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRMOfDZVNyg2ns_v2m0HwKd9ALgUfB_6Q",
  authDomain: "perfume-inventory-prod.firebaseapp.com",
  projectId: "perfume-inventory-prod",
  storageBucket: "perfume-inventory-prod.firebasestorage.app",
  messagingSenderId: "1034944478855",
  appId: "1:1034944478855:web:c9970184845885b223c222",
  measurementId: "G-ZYH6ZDDT2M",
};

// 🧩 Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Export everything that AuthContext needs
export { app, auth, db, storage };
export default app;
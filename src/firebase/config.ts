// src/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

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

// 🧩 Initialize Firebase app only (lightweight)
let app: FirebaseApp | null = null;
export const getAppInstance = (): FirebaseApp => {
  if (!app) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  }
  return app;
};

// ⚡ Lazy-loaded Firebase services
let authInstance: Auth | null = null;
export const getAuth = async (): Promise<Auth> => {
  if (!authInstance) {
    const { getAuth } = await import("firebase/auth");
    authInstance = getAuth(getAppInstance());
  }
  return authInstance;
};

let dbInstance: Firestore | null = null;
export const getFirestore = async (): Promise<Firestore> => {
  if (!dbInstance) {
    const { getFirestore } = await import("firebase/firestore");
    dbInstance = getFirestore(getAppInstance());
  }
  return dbInstance;
};

let storageInstance: FirebaseStorage | null = null;
export const getStorage = async (): Promise<FirebaseStorage> => {
  if (!storageInstance) {
    const { getStorage } = await import("firebase/storage");
    storageInstance = getStorage(getAppInstance());
  }
  return storageInstance;
};

// ✅ Backward compatibility helpers (optional)
export const auth = {
  get: getAuth,
  then: (fn: (auth: Auth) => any) => getAuth().then(fn),
};

export const db = {
  get: getFirestore,
  then: (fn: (db: Firestore) => any) => getFirestore().then(fn),
};

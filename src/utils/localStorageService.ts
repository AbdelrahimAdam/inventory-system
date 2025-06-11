// src/utils/localStorageService.ts
import CryptoJS from "crypto-js";

const STORAGE_KEY = "users";
const SECRET_KEY = "your-secret-key"; // Replace with a more secure key in real usage

export const saveUsers = (users: any[]) => {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(users), SECRET_KEY).toString();
  localStorage.setItem(STORAGE_KEY, encrypted);
};

export const getUsers = (): any[] => {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return [];

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch {
    return [];
  }
};

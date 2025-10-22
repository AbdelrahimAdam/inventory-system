// src/utils/utils/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔑 Attach token on every request if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // or sessionStorage depending on your login logic
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sanitizeInput } from "../utils/security";
import { saveUsers, getUsers } from "../utils/localStorageService";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  settings: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => boolean;
  updateUserSettings: (newSettings: Record<string, any>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT_MINUTES = 60;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const expiresAt = parseInt(localStorage.getItem("sessionExpiresAt") || "0", 10);

    if (!storedToken || !expiresAt || Date.now() > expiresAt) {
      logout(false); // Soft logout: don't navigate
      setLoading(false);
      return;
    }

    try {
      const decoded = JSON.parse(atob(storedToken));
      if (!decoded.sub || !decoded.role || !decoded.email) throw new Error("Invalid token");

      const users = getUsers();
      const matchedUser = users.find((u) => u.id === decoded.sub);

      if (!matchedUser) throw new Error("User not found");

      setUser(matchedUser);
      setToken(storedToken);
    } catch {
      logout(false); // Soft logout
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiresAt = parseInt(localStorage.getItem("sessionExpiresAt") || "0", 10);
      if (expiresAt && Date.now() >= expiresAt) {
        logout(); // Force logout if session expired
      }
    }, 60 * 1000); // every minute

    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string) => {
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    const users = getUsers();

    const matched = users.find(
      (u) => u.email === sanitizedEmail && u.password === sanitizedPassword
    );

    if (!matched) throw new Error("Invalid credentials");

    const userData: User = {
      id: matched.id || "1",
      name: matched.name || "Local User",
      email: matched.email,
      role: matched.role,
      settings: matched.settings || {},
    };

    const mockToken = btoa(
      JSON.stringify({
        sub: userData.id,
        role: userData.role,
        email: userData.email,
      })
    );

    const expiresAt = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;

    localStorage.setItem("token", mockToken);
    localStorage.setItem("sessionExpiresAt", expiresAt.toString());

    setToken(mockToken);
    setUser(userData);
  };

  const logout = async (redirect: boolean = true) => {
    localStorage.removeItem("token");
    localStorage.removeItem("sessionExpiresAt");
    setToken(null);
    setUser(null);

    if (redirect) {
      navigate("/login", { replace: true });
    }
  };

  const validateSession = () => {
    if (!token) return false;
    try {
      const decoded = JSON.parse(atob(token));
      const expiresAt = parseInt(localStorage.getItem("sessionExpiresAt") || "0", 10);
      return decoded.sub && decoded.role && decoded.email && Date.now() < expiresAt;
    } catch {
      return false;
    }
  };

  const updateUserSettings = (newSettings: Record<string, any>) => {
    if (!user) return;

    const updatedUser = { ...user, settings: { ...user.settings, ...newSettings } };
    setUser(updatedUser);

    const users = getUsers();
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    saveUsers(updatedUsers);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        validateSession,
        updateUserSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

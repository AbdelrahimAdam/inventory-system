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
  logout: (redirect?: boolean) => Promise<void>;
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

  // Load session on app start
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const expiresAt = parseInt(localStorage.getItem("sessionExpiresAt") || "0", 10);

    if (!storedToken || !expiresAt || Date.now() > expiresAt) {
      logout(false); // soft logout
      setLoading(false);
      return;
    }

    try {
      const decoded = JSON.parse(atob(storedToken));
      if (!decoded.sub || !decoded.role || !decoded.email) throw new Error("Invalid token");

      let matchedUser: User | null = null;

      if (storedUser) {
        matchedUser = JSON.parse(storedUser);
      } else {
        const users = getUsers();
        matchedUser = users.find((u) => u.id === decoded.sub) || null;
      }

      if (!matchedUser) throw new Error("User not found");

      setUser(matchedUser);
      setToken(storedToken);
    } catch {
      logout(false);
    }

    setLoading(false);
  }, []);

  // Auto logout on expiration
  useEffect(() => {
    const interval = setInterval(() => {
      const expiresAt = parseInt(localStorage.getItem("sessionExpiresAt") || "0", 10);
      if (expiresAt && Date.now() >= expiresAt) {
        logout(); // force logout
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Also check on tab focus
  useEffect(() => {
    const handleFocus = () => {
      const expiresAt = parseInt(localStorage.getItem("sessionExpiresAt") || "0", 10);
      if (expiresAt && Date.now() >= expiresAt) logout();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
    localStorage.setItem("user", JSON.stringify(userData));

    setToken(mockToken);
    setUser(userData);

    // Redirect to role-based dashboard
    switch (userData.role) {
      case "admin":
        navigate("/admin");
        break;
      case "teacher":
        navigate("/teacher");
        break;
      case "student":
        navigate("/student");
        break;
      case "parent":
        navigate("/parent");
        break;
      default:
        navigate("/");
    }
  };

  const logout = async (redirect: boolean = true) => {
    localStorage.removeItem("token");
    localStorage.removeItem("sessionExpiresAt");
    localStorage.removeItem("user");
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

    localStorage.setItem("user", JSON.stringify(updatedUser));
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

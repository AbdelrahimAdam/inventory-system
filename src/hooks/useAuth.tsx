import React from 'react';
import { useNavigate } from 'react-router-dom';
import jwtDecode from "jwt-decode";
import { ROLES } from '../utils/constants';
import { sanitizeInput } from '../utils/security';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateToken: () => boolean;
}

const AuthContext = React.createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            await logout();
            return;
          }

          setToken(storedToken);
          setUser({
            id: decoded.sub || '',
            name: decoded.name || '',
            email: decoded.email || ''
          });
          setRole(decoded.role || null);
        } catch (error) {
          console.error('Token validation failed:', error);
          await logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = sanitizeInput(password);

      // In production, this would be an API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          password: sanitizedPassword
        }),
        credentials: 'include' // For HttpOnly cookies
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      const decoded = jwtDecode(data.token);

      if (!decoded.role || !Object.values(ROLES).includes(decoded.role)) {
        throw new Error('Invalid role in token');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser({
        id: decoded.sub || '',
        name: decoded.name || '',
        email: decoded.email || ''
      });
      setRole(decoded.role);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setRole(null);
      navigate('/login');
    }
  };

  const validateToken = () => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp ? decoded.exp * 1000 > Date.now() : false;
    } catch {
      return false;
    }
  };

  const value = { user, role, token, login, logout, validateToken };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
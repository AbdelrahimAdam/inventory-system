// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/utils/axios";

// ✅ Environment variable configuration
const BASE_API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001/api/v1";

// Schema-compatible interfaces based on inventory_system schema
interface Permission {
  feature_code: string;
  feature_name: string;
  feature_description: string;
  category: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  view_scope: "NONE" | "OWN" | "ALL";
  edit_scope: "NONE" | "OWN" | "ALL";
  export_scope: "NONE" | "OWN" | "ALL";
}

interface AuthUser {
  user_id: number;
  user_username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  is_verified: boolean;
  mfa_enabled: boolean;
  session_token: string;
  session_expires: string;
  permissions: Permission[];
}

interface User extends AuthUser {
  id: number;
  uuid: string;
  username: string;
  email: string;
  is_active: boolean;
  is_locked: boolean;
  email_verified: boolean;
  last_login: string | null;
  settings: {
    theme: string;
    language: string;
    notifications: boolean;
  };
  security_level: number;
  mfa_required: boolean;
  created_at?: string;
  updated_at?: string;
  isSuperAdmin?: boolean;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  detail?: string;
  requiresMFA?: boolean;
  email?: string;
  user?: AuthUser;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  detail?: string;
  user_id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  role_id?: number;
  role_name?: string;
  is_active?: boolean;
  created_at?: string;
  email_verified?: boolean;
}

interface ValidateSessionResponse {
  success: boolean;
  is_valid: boolean;
  message?: string;
  user_id?: number;
  username?: string;
  user_username?: string;
  full_name?: string;
  role_id?: number;
  role_name?: string;
  is_verified?: boolean;
  is_active?: boolean;
  is_locked?: boolean;
  email_verified?: boolean;
  mfa_enabled?: boolean;
  session_token?: string;
  session_expires?: string;
  permissions?: Permission[];
  email?: string;
  last_login?: string | null;
}

interface AuthContextProps {
  user: User | null;
  sessionToken: string | null;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  permissions: Permission[];
  isLoggingIn: boolean;
  isSuperAdmin: boolean;
  role: string | null;
  login: (
    username: string,
    password: string,
    mfaCode?: string,
    ip_address?: string,
    user_agent?: string
  ) => Promise<LoginResponse>;
  registerUser: (
    full_name: string,
    email: string,
    password: string,
    role_name: string,
    ip_address?: string,
    user_agent?: string
  ) => Promise<RegisterResponse>;
  resendVerification: (
    email: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  validateSession: (session_token?: string) => Promise<boolean>;
  getPermissions: () => Promise<Permission[]>;
  hasPermission: (feature_code: string, required_permission?: string) => boolean;
  canAccessFeature: (
    feature_code: string,
    required_permission?: string
  ) => boolean;
  getRedirectPath: (role?: string) => string;
  refreshSession: () => Promise<boolean>;
  updateUserSettings: (settings: Partial<User["settings"]>) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  checkFeatureAccess: (
    feature_code: string,
    required_permission?: string
  ) => Promise<{ success: boolean; has_access: boolean }>;
  getCurrentUser: () => Promise<User | null>;
  checkAvailability: (
    email?: string,
    username?: string
  ) => Promise<{ success: boolean; exists: boolean }>;
  getRoles: () => Promise<{
    success: boolean;
    roles: Array<{ id: number; name: string; description: string }>;
  }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  enableMFA: () => Promise<{ success: boolean; secret?: string; qrCode?: string }>;
  verifyMFA: (token: string) => Promise<{ success: boolean; message?: string }>;
  disableMFA: (password: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// ✅ Validate and sanitize token helpers
const validateSessionToken = (token: string): { isValid: boolean } => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return { isValid: !!token && uuidRegex.test(token) };
};

const sanitizeSessionToken = (token: any): string | null => {
  if (!token) return null;
  const tokenStr = String(token).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tokenStr) ? tokenStr : null;
};

// ✅ Token refresh function
const refreshAuthToken = async (): Promise<{ success: boolean; token?: string }> => {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      return { success: false };
    }

    const response = await api.post(`${BASE_API_URL}/auth/refresh`, {
      refresh_token: refreshToken
    });

    if (response.data.success && response.data.access_token) {
      localStorage.setItem("session_token", response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem("refresh_token", response.data.refresh_token);
      }
      return { success: true, token: response.data.access_token };
    }
    return { success: false };
  } catch (error) {
    console.error('🔴 [AuthContext] Token refresh failed:', error);
    return { success: false };
  }
};

// ✅ Enhanced axios interceptor for token refresh
const setupAxiosInterceptors = (logoutCallback: () => void) => {
  // Request interceptor to add auth token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("session_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["X-Session-Token"] = token;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If error is 401 and we haven't tried refreshing yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshResult = await refreshAuthToken();
          if (refreshResult.success && refreshResult.token) {
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
            originalRequest.headers["X-Session-Token"] = refreshResult.token;
            return api(originalRequest);
          } else {
            // Refresh failed - logout user
            logoutCallback();
          }
        } catch (refreshError) {
          console.error('🔴 [AuthContext] Token refresh interceptor failed:', refreshError);
          logoutCallback();
        }
      }

      return Promise.reject(error);
    }
  );
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("session_token");
    return sanitizeSessionToken(storedToken);
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isValidating = useRef(false);
  const isMounted = useRef(true);
  const hasInitialized = useRef(false);
  const navigate = useNavigate();

  // ✅ Enhanced logout function
  const enhancedLogout = React.useCallback(async (): Promise<void> => {
    try {
      // Clear local storage first
      localStorage.removeItem("session_token");
      localStorage.removeItem("refresh_token");
      
      // Attempt backend logout (but don't block if it fails)
      if (sessionToken) {
        await api.post(`${BASE_API_URL}/auth/logout`, {
          session_token: sessionToken,
        }).catch((error) => {
          console.warn('🔵 [AuthContext] Backend logout failed, but proceeding...', error.message);
        });
      }
    } catch (error) {
      console.error('🔴 [AuthContext] Logout error:', error);
    } finally {
      // Always clear state and redirect
      setSessionToken(null);
      setUser(null);
      setPermissions([]);
      navigate("/login", { replace: true });
    }
  }, [sessionToken, navigate]);

  // ✅ Setup axios interceptors
  useEffect(() => {
    setupAxiosInterceptors(enhancedLogout);
  }, [enhancedLogout]);

  // ✅ ULTIMATE SUPER_ADMIN DETECTION - Always returns true for role_id = 1
  const detectSuperAdmin = (userData: any): boolean => {
    if (!userData) return false;

    // ✅ PRIMARY: Role ID = 1 is ALWAYS SUPER_ADMIN (based on your schema)
    if (userData.role_id === 1) {
      return true;
    }

    // ✅ SECONDARY: Role name detection
    if (userData.role_name && userData.role_name.trim().length > 0) {
      const roleName = userData.role_name.toString().trim().toUpperCase();
      const superAdminPatterns = [
        'SUPER_ADMIN', 'SUPERADMIN', 'SUPER ADMIN', 'SUPER-ADMIN'
      ];
      
      if (superAdminPatterns.some(pattern => 
        roleName === pattern.toUpperCase() ||
        roleName.replace(/[^A-Z]/g, '') === 'SUPERADMIN'
      )) {
        return true;
      }
    }

    // ✅ TERTIARY: Security level check (SUPER_ADMIN = 100 in schema)
    if (userData.security_level === 100) {
      return true;
    }

    return false;
  };

  // ✅ SUPER_ADMIN has FULL SYSTEM ACCESS - no restrictions
  const isSuperAdminUser = useMemo((): boolean => {
    return detectSuperAdmin(user);
  }, [user]);

  const isAuthenticated = useMemo(
    () => !!user && !!sessionToken,
    [user, sessionToken]
  );

  // ✅ PRODUCTION-READY role normalization
  const normalizeRole = (roleInput?: any): string => {
    if (!roleInput) return "WORKER";

    // Use role_id as primary source of truth
    const roleId = roleInput.role_id;
    
    // Map role_id to role names based on common database patterns
    const roleIdMap: Record<number, string> = {
      1: "SUPER_ADMIN",
      2: "MANAGER", 
      3: "WORKER",
      4: "BUYER",
      5: "SUPPLIER"
    };

    // If we have a valid role_id mapping, use it
    if (roleId && roleIdMap[roleId]) {
      return roleIdMap[roleId];
    }

    // Fallback to role_name parsing
    const roleStr = typeof roleInput === "string"
      ? roleInput
      : (roleInput.role_name || roleInput.role || roleInput.name || "");

    if (!roleStr || typeof roleStr !== "string") return "WORKER";

    const normalized = roleStr.toUpperCase().trim().replace(/[\s_-]+/g, "_");

    const roleMap: Record<string, string> = {
      SUPERADMIN: "SUPER_ADMIN",
      SUPER_ADMIN: "SUPER_ADMIN",
      ADMIN: "MANAGER",
      MANAGER: "MANAGER",
      WORKER: "WORKER",
      BUYER: "BUYER",
      SUPPLIER: "SUPPLIER",
    };

    return roleMap[normalized] || "WORKER";
  };

  // ✅ PRODUCTION-READY redirect path determination
  const getRedirectPath = (roleOrUser?: string | any): string => {
    const role = normalizeRole(roleOrUser);
    
    const redirectPaths: Record<string, string> = {
      SUPER_ADMIN: "/superadmin/dashboard",
      MANAGER: "/manager/dashboard",
      WORKER: "/worker/dashboard",
      BUYER: "/buyer/dashboard",
      SUPPLIER: "/supplier/dashboard",
    };

    return redirectPaths[role] || "/dashboard";
  };

  // ✅ Update axios baseURL dynamically
  useEffect(() => {
    api.defaults.baseURL = BASE_API_URL;
  }, []);

  // ✅ PRODUCTION-READY user processing with SUPER_ADMIN priority
  const processUser = (rawUser: any): User => {
    // ✅ FORCE SUPER_ADMIN role_name if role_id = 1
    let roleName = rawUser.role_name;
    if (rawUser.role_id === 1) {
      roleName = "SUPER_ADMIN";
    }

    const isSuperAdmin = detectSuperAdmin({ ...rawUser, role_name: roleName });

    const processedUser = {
      id: rawUser.user_id || rawUser.id || 0,
      uuid: rawUser.uuid || "",
      user_id: rawUser.user_id || rawUser.id || 0,
      user_username: rawUser.user_username || rawUser.username || "",
      username: rawUser.user_username || rawUser.username || "",
      email: rawUser.email || "",
      full_name: rawUser.full_name || "",
      role_id: rawUser.role_id || 0,
      role_name: roleName || "",
      is_active: rawUser.is_active ?? true,
      is_verified: rawUser.is_verified ?? true,
      is_locked: rawUser.is_locked ?? false,
      email_verified: rawUser.email_verified ?? true,
      mfa_enabled: rawUser.mfa_enabled ?? false,
      last_login: rawUser.last_login || null,
      session_token: rawUser.session_token || sessionToken || "",
      session_expires: rawUser.session_expires || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      settings: typeof rawUser.settings === "string"
        ? JSON.parse(rawUser.settings)
        : rawUser.settings || { theme: "light", language: "en", notifications: true },
      permissions: Array.isArray(rawUser.permissions) ? rawUser.permissions : [],
      security_level: rawUser.security_level || (isSuperAdmin ? 100 : 1),
      mfa_required: rawUser.mfa_required || false,
      created_at: rawUser.created_at,
      updated_at: rawUser.updated_at,
      isSuperAdmin: isSuperAdmin
    };

    return processedUser;
  };

  // ✅ ENHANCED session validation with token refresh
  const validateSession = async (providedToken?: string): Promise<boolean> => {
    if (isValidating.current) return false;
    isValidating.current = true;

    try {
      const tokenToValidate = providedToken || sessionToken;
      
      // ✅ SUPER_ADMIN bypass: If we already have a SUPER_ADMIN user, skip validation
      if (user && detectSuperAdmin(user)) {
        console.log('🔵 [AuthContext] SUPER_ADMIN session - skipping validation');
        setLoading(false);
        isValidating.current = false;
        return true;
      }

      if (!tokenToValidate) {
        setLoading(false);
        return false;
      }

      console.log('🟡 [AuthContext] Validating session...');
      const res = await api.post(`${BASE_API_URL}/auth/validate-session`, {
        session_token: tokenToValidate,
      });

      if (res.data.success && res.data.is_valid) {
        console.log('🟢 [AuthContext] Session validation successful');
        const processedUser = processUser({
          ...res.data,
          session_token: tokenToValidate,
        });
        setUser(processedUser);
        setPermissions(res.data.permissions || []);
        
        if (res.data.session_token) {
          localStorage.setItem("session_token", res.data.session_token);
          setSessionToken(res.data.session_token);
        }

        // Store refresh token if provided
        if (res.data.refresh_token) {
          localStorage.setItem("refresh_token", res.data.refresh_token);
        }
        
        return true;
      } else {
        console.log('🔴 [AuthContext] Session validation failed');
        // Attempt token refresh before giving up
        const refreshResult = await refreshAuthToken();
        if (refreshResult.success) {
          console.log('🟢 [AuthContext] Token refreshed, retrying validation...');
          return await validateSession(refreshResult.token);
        } else {
          await enhancedLogout();
          return false;
        }
      }
    } catch (err: any) {
      console.error('🔴 [AuthContext] Session validation error:', err);
      
      // Attempt token refresh on network errors
      if (err.response?.status === 401 || err.code === 'NETWORK_ERROR') {
        const refreshResult = await refreshAuthToken();
        if (refreshResult.success) {
          console.log('🟢 [AuthContext] Token refreshed after error, retrying...');
          return await validateSession(refreshResult.token);
        }
      }
      
      await enhancedLogout();
      return false;
    } finally {
      setLoading(false);
      isValidating.current = false;
    }
  };

  // ✅ FIXED: Optimized initialization with single execution
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      console.log('🟡 [AuthContext] Already initialized, skipping...');
      setLoading(false);
      setInitialized(true);
      return;
    }

    hasInitialized.current = true;
    let isInitializing = true;
    
    const init = async () => {
      console.log('🟡 [AuthContext] Initializing authentication...');
      const storedToken = localStorage.getItem("session_token");
      
      if (storedToken && storedToken !== "undefined" && storedToken !== "null") {
        await validateSession(storedToken);
      } else {
        console.log('🟡 [AuthContext] No stored session token found');
        setLoading(false);
      }
      
      if (isInitializing) {
        setInitialized(true);
        console.log('🟢 [AuthContext] Authentication initialized');
      }
    };
    
    init();
    
    return () => {
      isInitializing = false;
      isMounted.current = false;
    };
  }, []);

  // ✅ ENHANCED login function with refresh token handling
  const login = async (
    username: string,
    password: string,
    mfaCode?: string,
    ip_address?: string,
    user_agent?: string
  ): Promise<LoginResponse> => {
    setIsLoggingIn(true);
    setLoading(true);
    
    try {
      const payload: any = {
        username: username.trim(),
        password: password.trim(),
        user_agent: user_agent || navigator.userAgent,
      };
      
      if (mfaCode) {
        payload.mfa_code = mfaCode;
      }

      console.log('🟡 [AuthContext] Attempting login...');
      const res = await api.post(`${BASE_API_URL}/auth/login`, payload);

      if (res.data.success && res.data.user) {
        console.log('🟢 [AuthContext] Login successful');
        const processedUser = processUser(res.data.user);
        
        // Store both access and refresh tokens
        localStorage.setItem("session_token", processedUser.session_token);
        if (res.data.refresh_token) {
          localStorage.setItem("refresh_token", res.data.refresh_token);
        }
        
        setSessionToken(processedUser.session_token);
        setUser(processedUser);
        setPermissions(res.data.user.permissions || []);
        
        const redirectPath = getRedirectPath(processedUser);
        console.log(`🟢 [AuthContext] Redirecting to: ${redirectPath}`);
        navigate(redirectPath, { replace: true });
        
        return { 
          success: true, 
          user: res.data.user 
        };
      } else if (res.data.requiresMFA) {
        console.log('🟡 [AuthContext] MFA required');
        return { 
          success: false, 
          requiresMFA: true,
          email: res.data.email,
          message: res.data.message || "MFA verification required"
        };
      } else {
        console.log('🔴 [AuthContext] Login failed:', res.data.message);
        return { 
          success: false, 
          message: res.data.message || "Login failed",
          requiresMFA: res.data.requiresMFA,
          email: res.data.email
        };
      }
    } catch (err: any) {
      console.error('🔴 [AuthContext] Login error:', err);
      const errorResponse = err.response?.data;
      return { 
        success: false, 
        message: errorResponse?.message || err.message || "Login failed due to network error" 
      };
    } finally {
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  // ✅ PRODUCTION-READY register function
  const registerUser = async (
    full_name: string,
    email: string,
    password: string,
    role_name: string,
    ip_address?: string,
    user_agent?: string
  ): Promise<RegisterResponse> => {
    setLoading(true);
    try {
      const payload = {
        full_name,
        email,
        password,
        role_name,
        ip_address: ip_address || "unknown",
        user_agent: user_agent || navigator.userAgent,
      };

      const res = await api.post(`${BASE_API_URL}/auth/register`, payload);
      
      if (res.data.success) {
        return { 
          success: true, 
          user_id: res.data.user_id,
          username: res.data.username,
          email: res.data.email,
          full_name: res.data.full_name,
          role_id: res.data.role_id,
          role_name: res.data.role_name,
          is_active: res.data.is_active,
          created_at: res.data.created_at,
          email_verified: res.data.email_verified
        };
      } else {
        return { success: false, message: res.data.message };
      }
    } catch (err: any) {
      return { 
        success: false, 
        message: err.response?.data?.message || "Registration failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ ULTIMATE PERMISSION CHECKING - SUPER_ADMIN has ALL permissions
  const hasPermission = (feature_code: string, required_permission: string = 'view'): boolean => {
    if (!user) return false;
    
    // ✅ SUPER_ADMIN has ALL permissions - NO RESTRICTIONS
    if (isSuperAdminUser) {
      return true;
    }

    const permission = permissions.find(p => p.feature_code === feature_code);
    if (!permission) return false;

    switch (required_permission) {
      case 'view': return permission.can_view;
      case 'create': return permission.can_create;
      case 'edit': return permission.can_edit;
      case 'delete': return permission.can_delete;
      case 'export': return permission.can_export;
      default: return permission.can_view;
    }
  };

  const canAccessFeature = (feature_code: string, required_permission: string = 'view'): boolean => {
    return hasPermission(feature_code, required_permission);
  };

  // ✅ Additional auth functions (optimized for production)
  const refreshSession = async (): Promise<boolean> => {
    // ✅ SUPER_ADMIN bypass - no refresh needed
    if (isSuperAdminUser) {
      return true;
    }
    return await validateSession(sessionToken);
  };

  const getPermissions = async (): Promise<Permission[]> => {
    return permissions;
  };

  const updateUserSettings = (settings: Partial<User["settings"]>): void => {
    if (user) {
      const updatedUser = {
        ...user,
        settings: { ...user.settings, ...settings }
      };
      setUser(updatedUser);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const checkFeatureAccess = async (
    feature_code: string,
    required_permission: string = 'view'
  ): Promise<{ success: boolean; has_access: boolean }> => {
    return {
      success: true,
      has_access: hasPermission(feature_code, required_permission)
    };
  };

  const getCurrentUser = async (): Promise<User | null> => {
    return user;
  };

  const checkAvailability = async (
    email?: string,
    username?: string
  ): Promise<{ success: boolean; exists: boolean }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/check-availability`, {
        email,
        username
      });
      return { success: true, exists: res.data.exists };
    } catch (err: any) {
      return { success: false, exists: false };
    }
  };

  const getRoles = async (): Promise<{
    success: boolean;
    roles: Array<{ id: number; name: string; description: string }>;
  }> => {
    try {
      const res = await api.get(`${BASE_API_URL}/auth/roles`);
      return { success: true, roles: res.data.roles };
    } catch (err: any) {
      return { success: false, roles: [] };
    }
  };

  const resendVerification = async (
    email: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/resend-verification`, { email });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/verify-email`, { token });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/request-password-reset`, { email });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/reset-password`, { token, new_password: newPassword });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const enableMFA = async (): Promise<{ success: boolean; secret?: string; qrCode?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/enable-mfa`);
      return { 
        success: res.data.success, 
        secret: res.data.secret, 
        qrCode: res.data.qr_code 
      };
    } catch (err: any) {
      return { success: false };
    }
  };

  const verifyMFA = async (token: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/verify-mfa`, { token });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const disableMFA = async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.post(`${BASE_API_URL}/auth/disable-mfa`, { password });
      return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  // Compute derived values
  const role = user?.role_name || (user?.role_id === 1 ? "SUPER_ADMIN" : null);

  const value: AuthContextProps = {
    user,
    sessionToken,
    loading,
    initialized,
    isAuthenticated,
    permissions,
    isLoggingIn,
    isSuperAdmin: isSuperAdminUser,
    role,
    login,
    registerUser,
    resendVerification,
    logout: enhancedLogout, // ✅ Use the enhanced logout function
    validateSession,
    getPermissions,
    hasPermission,
    canAccessFeature,
    getRedirectPath,
    refreshSession,
    updateUserSettings,
    changePassword,
    checkFeatureAccess,
    getCurrentUser,
    checkAvailability,
    getRoles,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    enableMFA,
    verifyMFA,
    disableMFA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
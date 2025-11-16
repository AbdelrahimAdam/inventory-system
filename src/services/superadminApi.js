// src/services/superadminApi.js
import axios from 'axios';

/* ==========================================================================
   CONFIGURATION & CONSTANTS
   ========================================================================== */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.212:3001/api/v1';
const API_TIMEOUT = 30_000;

/* Arabic error messages ---------------------------------------------------- */
const ARABIC_ERROR_MESSAGES = {
  NETWORK_ERROR: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
  SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.',
  AUTH_ERROR: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
  FORBIDDEN: 'غير مصرح لك بتنفيذ هذا الإجراء.',
  NOT_FOUND: 'لم يتم العثور على المورد المطلوب.',
  VALIDATION_ERROR: 'بيانات غير صالحة. يرجى التحقق من المدخلات.',
  UNKNOWN_ERROR: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
};

/* ==========================================================================
   SUPER-ADMIN BYPASS CONFIG (dev-only by default)
   ========================================================================== */
const IS_DEVELOPMENT = import.meta.env.DEV; // Vite sets this automatically
const SUPER_ADMIN_BYPASS_CONFIG = {
  // Turn on ONLY in local dev – NEVER in prod
  ENABLED: IS_DEVELOPMENT,
  METHODS: {
    HEADER: 'X-Super-Admin',
    QUERY: 'super_admin',
  },
  VALUES: {
    HEADER: 'true',
    QUERY: 'true',
  },
};

/* ==========================================================================
   TOKEN MANAGER (UUID only)
   ========================================================================== */
export const TokenManager = {
  /** Get the stored session token (UUID) */
  getToken: () => {
    try {
      const raw = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
      if (!raw) {
        console.warn('No session_token in storage');
        return null;
      }
      const clean = raw.replace(/^Bearer\s+/i, '').trim();
      if (!TokenManager.isValidUUID(clean)) {
        console.error('Invalid UUID token:', clean);
        return null;
      }
      console.log('Token retrieved:', `${clean.substring(0, 8)}...`);
      return `Bearer ${clean}`;
    } catch (e) {
      console.error('TokenManager error:', e);
      return null;
    }
  },

  /** UUID v4 regex */
  isValidUUID: (s) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s),

  /** Clear everything */
  clearTokens: () => {
    ['session_token', 'token', 'authToken', 'currentUser', 'user_data'].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    console.log('All tokens cleared');
  },

  /** Manual redirect – call only when you decide */
  redirectToLogin: (reason = 'session_expired') => {
    TokenManager.clearTokens();
    const url = `/login?reason=${reason}&redirect=${encodeURIComponent(window.location.pathname)}`;
    console.log('Redirect →', url);
    window.location.href = url;
  },
};

/* ==========================================================================
   AXIOS INSTANCE (superadmin base + bypass)
   ========================================================================== */
const api = axios.create({
  baseURL: `${API_BASE_URL}/superadmin`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'superadmin-dashboard',
    'X-Client-Version': '1.0.0',
  },
});

/* ---- Request interceptor ------------------------------------------------ */
api.interceptors.request.use(
  (cfg) => {
    const token = TokenManager.getToken();
    
    // ---- Bypass header (dev only) ---------------------------------------
    if (SUPER_ADMIN_BYPASS_CONFIG.ENABLED) {
      cfg.headers[SUPER_ADMIN_BYPASS_CONFIG.METHODS.HEADER] = SUPER_ADMIN_BYPASS_CONFIG.VALUES.HEADER;
      console.log('BYPASS HEADER ADDED →', cfg.url);
    }
    
    // ---- Auth token -----------------------------------------------------
    if (token) {
      cfg.headers.Authorization = token;
      cfg.headers['X-Session-Token'] = token.replace(/^Bearer\s+/i, '');
      console.log('HEADERS →', {
        url: cfg.url,
        method: cfg.method,
        hasToken: true,
        hasBypass: SUPER_ADMIN_BYPASS_CONFIG.ENABLED,
        authPreview: token.substring(0, 20) + '...',
      });
    } else {
      console.warn('No token for request →', cfg.url);
    }
    
    return cfg;
  },
  (err) => Promise.reject(err)
);

/* ---- Response interceptor (no auto-redirect) --------------------------- */
api.interceptors.response.use(
  (res) => {
    console.log(`${res.config.method?.toUpperCase()} ${res.config.url} → ${res.status}`);
    return res;
  },
  (err) => {
    console.error('API ERROR →', {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      data: err.response?.data,
    });
    return Promise.reject(err);
  }
);

/* ==========================================================================
   CORE API METHODS (all include bypass query param when enabled)
   ========================================================================== */
const withBypassQuery = (params = {}) => ({
  ...params,
  ...(SUPER_ADMIN_BYPASS_CONFIG.ENABLED && {
    [SUPER_ADMIN_BYPASS_CONFIG.METHODS.QUERY]: SUPER_ADMIN_BYPASS_CONFIG.VALUES.QUERY,
  }),
});

export const superadminApi = {
  /* ----------------------- USERS --------------------------------------- */
  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', {
        params: withBypassQuery(params),
      });
      return {
        success: true,
        users: response.data?.users || [],
        total: response.data?.pagination?.total ?? 0,
        pagination: response.data?.pagination || {
          total: 0,
          currentPage: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        },
      };
    } catch (e) {
      console.error('Get users error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
        users: [],
        total: 0,
        pagination: {},
      };
    }
  },

  createUser: async (userData) => {
    try {
      if (!userData.full_name || !userData.email || !userData.password || !userData.role_id) {
        throw new Error('جميع الحقول مطلوبة: الاسم الكامل، البريد، كلمة المرور، الدور');
      }

      // Enhanced validation to match backend
      if (!/^\S+@\S+\.\S+$/.test(userData.email)) {
        throw new Error('البريد الإلكتروني غير صالح');
      }

      if (userData.password.length < 8) {
        throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
        throw new Error('كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، ورقم');
      }

      const payload = {
        full_name: userData.full_name.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        role_id: parseInt(userData.role_id),
        username: userData.username || userData.email.trim().toLowerCase().split('@')[0],
        is_active: userData.is_active ?? true,
      };

      console.log('Creating user with payload:', { ...payload, password: '***' });

      const response = await api.post('/users', payload, {
        params: withBypassQuery(),
      });

      return {
        success: true,
        user: response.data.user,
        message: response.data.message || 'تم إنشاء المستخدم بنجاح',
      };
    } catch (e) {
      console.error('Create user error:', e.response?.data || e.message);
      
      // Enhanced error extraction
      let errorMessage = e.response?.data?.message || e.message;
      const errorDetail = e.response?.data?.detail;
      
      // Handle specific backend error messages
      if (errorMessage?.includes('البريد مستخدم') || errorMessage?.includes('البريد الإلكتروني مستخدم')) {
        errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
      } else if (errorMessage?.includes('اسم المستخدم مستخدم')) {
        errorMessage = 'اسم المستخدم مستخدم بالفعل';
      } else if (errorMessage?.includes('الدور المحدد غير موجود')) {
        errorMessage = 'الدور المحدد غير موجود';
      } else if (e.response?.status === 500) {
        errorMessage = 'خطأ في الخادم الداخلي. يرجى المحاولة لاحقاً';
      }

      return {
        success: false,
        error: errorMessage,
        detail: errorDetail,
        user: null,
        status: e.response?.status,
      };
    }
  },

  getUserDetails: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`, {
        params: withBypassQuery(),
      });
      return { 
        success: true, 
        user: response.data.user 
      };
    } catch (e) {
      console.error('Get user details error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        user: null,
        status: e.response?.status,
      };
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const payload = {
        full_name: userData.full_name,
        email: userData.email,
        role_id: parseInt(userData.role_id),
      };

      const response = await api.put(`/users/${userId}`, payload, {
        params: withBypassQuery(),
      });

      return {
        success: true,
        user: response.data.user,
        message: response.data.message || 'تم تحديث بيانات المستخدم بنجاح',
      };
    } catch (e) {
      console.error('Update user error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        user: null,
        status: e.response?.status,
      };
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/users/${userId}`, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم حذف المستخدم',
      };
    } catch (e) {
      console.error('Delete user error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  activateUser: async (userId) => {
    try {
      const response = await api.patch(`/users/${userId}/activate`, {}, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم تفعيل المستخدم بنجاح',
        user: response.data.user,
      };
    } catch (e) {
      console.error('Activate user error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  deactivateUser: async (userId) => {
    try {
      const response = await api.patch(`/users/${userId}/deactivate`, {}, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم تعطيل المستخدم بنجاح',
        user: response.data.user,
      };
    } catch (e) {
      console.error('Deactivate user error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  lockUser: async (userId) => {
    try {
      const response = await api.patch(`/users/${userId}/lock`, {}, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم قفل المستخدم بنجاح',
        user: response.data.user,
      };
    } catch (e) {
      console.error('Lock user error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  unlockUser: async (userId) => {
    try {
      const response = await api.patch(`/users/${userId}/unlock`, {}, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم فتح المستخدم بنجاح',
        user: response.data.user,
      };
    } catch (e) {
      console.error('Unlock user error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  updateUserRole: async (userId, roleData) => {
    try {
      const response = await api.put(`/users/${userId}/role`, roleData, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم تحديث دور المستخدم بنجاح',
        user: response.data.user,
      };
    } catch (e) {
      console.error('Update user role error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  resetUserPassword: async (userId, passwordData) => {
    try {
      const response = await api.patch(`/users/${userId}/reset-password`, passwordData, {
        params: withBypassQuery(),
      });
      return {
        success: true,
        message: response.data.message || 'تم إعادة تعيين كلمة المرور بنجاح',
        user: response.data.user,
      };
    } catch (e) {
      console.error('Reset password error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  getRecentUsers: async (limit = 5) => {
    try {
      const response = await api.get('/users/recent', {
        params: withBypassQuery({ limit }),
      });
      return {
        success: true,
        users: response.data.users || [],
      };
    } catch (e) {
      console.error('Get recent users error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        users: [],
        status: e.response?.status,
      };
    }
  },

  /* ----------------------- ROLES --------------------------------------- */
  getRoles: async () => {
    try {
      const response = await api.get('/roles', { params: withBypassQuery() });
      return { 
        success: true, 
        roles: response.data.roles || response.data || [] 
      };
    } catch (e) {
      console.error('Get roles error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        roles: [],
        status: e.response?.status,
      };
    }
  },

  /* ----------------------- DASHBOARD ----------------------------------- */
  getDashboardStats: async () => {
    try {
      const response = await api.get('/dashboard/stats', {
        params: withBypassQuery(),
      });
      return { 
        success: true, 
        stats: response.data.stats || response.data 
      };
    } catch (e) {
      console.error('Get dashboard stats error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        stats: null,
        status: e.response?.status,
      };
    }
  },

  /* ----------------------- AUTH TEST ----------------------------------- */
  testAuth: async () => {
    try {
      const response = await api.get('/dashboard/stats', {
        params: withBypassQuery(),
      });
      return { 
        success: true, 
        authenticated: true, 
        data: response.data 
      };
    } catch (e) {
      console.error('Auth test error:', e.response?.data || e.message);
      return {
        success: false,
        authenticated: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },

  /* ----------------------- HEALTH CHECK -------------------------------- */
  healthCheck: async () => {
    try {
      const response = await api.get('/users/health/check', {
        params: withBypassQuery(),
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (e) {
      console.error('Health check error:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message,
        status: e.response?.status,
      };
    }
  },
};

/* ==========================================================================
   ENHANCED / SAFE WRAPPERS
   ========================================================================== */
export const enhancedSuperadminApi = {
  // User management
  safeGetUsers: async (params = {}) => {
    const result = await superadminApi.getUsers(params);
    if (!result.success && result.status === 401) {
      result.shouldRedirect = true;
      result.redirectMessage = ARABIC_ERROR_MESSAGES.AUTH_ERROR;
    }
    return result;
  },

  safeCreateUser: async (userData) => {
    const result = await superadminApi.createUser(userData);
    return result;
  },

  safeGetUserDetails: async (userId) => {
    const result = await superadminApi.getUserDetails(userId);
    return result;
  },

  safeUpdateUser: async (userId, userData) => {
    const result = await superadminApi.updateUser(userId, userData);
    return result;
  },

  safeDeleteUser: async (userId) => {
    const result = await superadminApi.deleteUser(userId);
    return result;
  },

  safeActivateUser: async (userId) => {
    const result = await superadminApi.activateUser(userId);
    return result;
  },

  safeDeactivateUser: async (userId) => {
    const result = await superadminApi.deactivateUser(userId);
    return result;
  },

  safeLockUser: async (userId) => {
    const result = await superadminApi.lockUser(userId);
    return result;
  },

  safeUnlockUser: async (userId) => {
    const result = await superadminApi.unlockUser(userId);
    return result;
  },

  safeUpdateUserRole: async (userId, roleData) => {
    const result = await superadminApi.updateUserRole(userId, roleData);
    return result;
  },

  safeResetUserPassword: async (userId, passwordData) => {
    const result = await superadminApi.resetUserPassword(userId, passwordData);
    return result;
  },

  safeGetRecentUsers: async (limit = 5) => {
    const result = await superadminApi.getRecentUsers(limit);
    return result;
  },

  // Roles
  safeGetRoles: superadminApi.getRoles,

  // Dashboard
  safeGetDashboardStats: superadminApi.getDashboardStats,

  // Health & Auth
  safeTestAuth: superadminApi.testAuth,
  safeHealthCheck: superadminApi.healthCheck,

  /** Comprehensive health check – tells you everything in one call */
  checkApiHealth: async () => {
    const token = TokenManager.getToken();
    const auth = await superadminApi.testAuth();
    const health = await superadminApi.healthCheck();
    
    return {
      api: true,
      authentication: !!token,
      tokenValid: !!token,
      backend: auth.success,
      superAdminAccess: auth.authenticated,
      routesHealthy: health.success,
      status: auth.success && health.success ? 'healthy' : 'issues_detected',
      authTest: auth,
      healthCheck: health,
      bypassEnabled: SUPER_ADMIN_BYPASS_CONFIG.ENABLED,
      timestamp: new Date().toISOString(),
    };
  },

  /** forceAccess – works with bypass header, no instance reuse */
  forceAccess: async (endpoint, { method = 'GET', data, params } = {}) => {
    const token = TokenManager.getToken();
    const cfg = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'superadmin-dashboard',
        'X-Client-Version': '1.0.0',
        ...(token && { Authorization: token }),
        ...(SUPER_ADMIN_BYPASS_CONFIG.ENABLED && {
          [SUPER_ADMIN_BYPASS_CONFIG.METHODS.HEADER]: SUPER_ADMIN_BYPASS_CONFIG.VALUES.HEADER,
        }),
      },
      timeout: API_TIMEOUT,
    };
    
    if (data) cfg.data = data;
    if (params) cfg.params = withBypassQuery(params);
    
    console.log(`FORCE ACCESS → ${method} ${endpoint}`, data ? { ...data, password: data.password ? '***' : undefined } : params);
    
    try {
      const res = await axios(cfg);
      return res;
    } catch (e) {
      console.error(`FORCE ACCESS FAILED → ${endpoint}`, e.response?.data || e.message);
      throw e;
    }
  },

  /** Mock function for testing user creation */
  createUserMock: async (userData) => {
    console.log('MOCK: Creating user with data:', { ...userData, password: '***' });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock successful response
    const mockUser = {
      id: Math.floor(Math.random() * 1000) + 100,
      uuid: 'mock-uuid-' + Date.now(),
      username: userData.username || userData.email.split('@')[0].toLowerCase(),
      email: userData.email,
      full_name: userData.full_name,
      role_id: userData.role_id,
      role_name: 'WORKER',
      is_active: true,
      is_locked: false,
      mfa_enabled: false,
      email_verified: false,
      failed_login_attempts: 0,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      session_token: 'mock-session-token',
      session_expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
    
    return {
      success: true,
      user: mockUser,
      message: 'تم إنشاء المستخدم بنجاح (وهمي للاختبار)'
    };
  }
};

/* ==========================================================================
   UTILITIES
   ========================================================================== */
export const debugSuperAdminAccess = () => {
  const token = TokenManager.getToken();
  console.group('SUPER_ADMIN DEBUG');
  console.log('Token →', { has: !!token, preview: token?.substring(0, 20) });
  console.log('Bypass →', SUPER_ADMIN_BYPASS_CONFIG);
  console.groupEnd();
  
  return {
    hasToken: !!token,
    tokenPreview: token?.substring(0, 20),
    bypassEnabled: SUPER_ADMIN_BYPASS_CONFIG.ENABLED,
  };
};

export const setSuperAdminBypass = (on = true) => {
  if (!IS_DEVELOPMENT && on) {
    console.warn('Bypass disabled in production');
    return false;
  }
  SUPER_ADMIN_BYPASS_CONFIG.ENABLED = on;
  console.log(`Bypass ${on ? 'ON' : 'OFF'}`);
  return on;
};

export const getSuperAdminBypassStatus = () => ({
  enabled: SUPER_ADMIN_BYPASS_CONFIG.ENABLED,
  config: SUPER_ADMIN_BYPASS_CONFIG,
});

/* Error formatter -------------------------------------------------------- */
export const formatErrorMessage = (err) => {
  if (err.response) {
    const { status, data } = err.response;
    if (status === 401) return ARABIC_ERROR_MESSAGES.AUTH_ERROR;
    if (status === 403) return ARABIC_ERROR_MESSAGES.FORBIDDEN;
    if (status === 404) return ARABIC_ERROR_MESSAGES.NOT_FOUND;
    if (status === 500) return ARABIC_ERROR_MESSAGES.SERVER_ERROR;
    return data?.message || ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  if (err.request) return ARABIC_ERROR_MESSAGES.NETWORK_ERROR;
  return err.message || ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR;
};

/* Comprehensive error handler -------------------------------------------- */
export const handleApiError = (err, ctx = '') => {
  const out = {
    success: false,
    error: ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR,
    message: ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR,
    context: ctx,
    shouldRedirect: false,
    bypassEnabled: SUPER_ADMIN_BYPASS_CONFIG.ENABLED,
    timestamp: new Date().toISOString(),
  };

  if (err.response) {
    const { status, data } = err.response;
    out.status = status;
    out.details = data;
    
    switch (status) {
      case 401:
        out.error = ARABIC_ERROR_MESSAGES.AUTH_ERROR;
        out.message = 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.';
        out.shouldRedirect = true;
        break;
      case 403:
        out.error = ARABIC_ERROR_MESSAGES.FORBIDDEN;
        out.message = data?.message || 'غير مصرح لك بتنفيذ هذا الإجراء.';
        break;
      case 404:
        out.error = ARABIC_ERROR_MESSAGES.NOT_FOUND;
        out.message = data?.message || `لم يتم العثور على ${ctx}.`;
        break;
      case 409:
        out.error = 'تعارض في البيانات';
        out.message = data?.message || 'البيانات المرسلة تتعارض مع بيانات موجودة.';
        break;
      case 500:
        out.error = ARABIC_ERROR_MESSAGES.SERVER_ERROR;
        out.message = 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.';
        break;
      default:
        out.error = data?.message || ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR;
        out.message = data?.message || ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  } else if (err.request) {
    out.error = ARABIC_ERROR_MESSAGES.NETWORK_ERROR;
    out.message = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
  } else {
    out.error = err.message || ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR;
    out.message = err.message || ARABIC_ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  return out;
};

/* ==========================================================================
   DEFAULT EXPORT
   ========================================================================== */
export default {
  // Core
  superadminApi,
  enhancedSuperadminApi,
  
  // Utilities
  TokenManager,
  handleApiError,
  formatErrorMessage,
  debugSuperAdminAccess,
  setSuperAdminBypass,
  getSuperAdminBypassStatus,
  forceAccess: enhancedSuperadminApi.forceAccess,
  
  // Shortcuts
  getUsers: superadminApi.getUsers,
  createUser: superadminApi.createUser,
  getUserDetails: superadminApi.getUserDetails,
  updateUser: superadminApi.updateUser,
  deleteUser: superadminApi.deleteUser,
  activateUser: superadminApi.activateUser,
  deactivateUser: superadminApi.deactivateUser,
  lockUser: superadminApi.lockUser,
  unlockUser: superadminApi.unlockUser,
  updateUserRole: superadminApi.updateUserRole,
  resetUserPassword: superadminApi.resetUserPassword,
  getRecentUsers: superadminApi.getRecentUsers,
  getRoles: superadminApi.getRoles,
  getDashboardStats: superadminApi.getDashboardStats,
  testAuth: superadminApi.testAuth,
  healthCheck: superadminApi.healthCheck,
  
  // Mock functions
  createUserMock: enhancedSuperadminApi.createUserMock,
};
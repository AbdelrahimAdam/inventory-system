// src/components/RoleBasedDashboardRedirect.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Box, CircularProgress, Typography } from "@mui/material";

// ✅ Valid security event types from PostgreSQL schema
const SECURITY_EVENT_TYPES = {
  ROLE_CHANGE: 'ROLE_CHANGE',
  SUPER_ADMIN_ACCESS: 'SUPER_ADMIN_ACCESS',
  SENSITIVE_ACCESS: 'SENSITIVE_ACCESS',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  TOKEN_VERIFY_SUCCESS: 'TOKEN_VERIFY_SUCCESS',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PERMISSION_CHECK_FAILED: 'PERMISSION_CHECK_FAILED',
  REDIRECT_ERROR: 'REDIRECT_ERROR',
  SESSION_VALIDATED: 'SESSION_VALIDATED'
} as const;

const RoleBasedDashboardRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    loading, 
    initialized, 
    validateSession,
    logout,
    sessionToken,
    isAuthenticated,
    isSuperAdmin: contextIsSuperAdmin
  } = useAuth();
  
  const [validating, setValidating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // ✅ Environment variable for API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://192.168.1.209:3001/api/v1";

  // ✅ ULTIMATE SUPER_ADMIN detection - Only SUPER_ADMIN gets special privileges
  const isSuperAdmin = (userData: any): boolean => {
    if (!userData) return false;

    console.log("🔍 [SUPER_ADMIN Check] User data:", {
      role_name: userData.role_name,
      role_id: userData.role_id,
      username: userData.username
    });

    // Priority 1: Use context isSuperAdmin (highest priority)
    if (contextIsSuperAdmin) {
      console.log("👑 [SUPER_ADMIN Check] Detected by context - ULTIMATE ACCESS");
      return true;
    }

    // Priority 2: Direct role name match
    if (userData.role_name) {
      const normalizedRole = userData.role_name.toUpperCase().trim();
      if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN') {
        console.log("👑 [SUPER_ADMIN Check] Detected by role name:", normalizedRole);
        return true;
      }
    }

    // Priority 3: Role ID check (SUPER_ADMIN typically has role_id = 1)
    if (userData.role_id === 1) {
      console.log("👑 [SUPER_ADMIN Check] Detected by role ID:", userData.role_id);
      return true;
    }

    // Priority 4: Security level check
    if (userData.security_level === 100) {
      console.log("👑 [SUPER_ADMIN Check] Detected by security level");
      return true;
    }

    console.log("❌ [SUPER_ADMIN Check] Not a super admin - limited privileges");
    return false;
  };

  // Schema-compatible role normalization
  const normalizeRole = (userData: any): string => {
    if (!userData) return "GUEST";

    // SUPER_ADMIN detection takes absolute priority
    if (isSuperAdmin(userData)) {
      return "SUPER_ADMIN";
    }

    const roleStr = userData.role_name || userData.role || "";

    if (!roleStr || typeof roleStr !== "string") return "GUEST";

    const normalized = roleStr.toUpperCase().trim().replace(/\s+/g, "_");

    const roleMap: Record<string, string> = {
      SUPERADMIN: "SUPER_ADMIN",
      SUPER_ADMIN: "SUPER_ADMIN",
      ADMIN: "MANAGER",
      MANAGER: "MANAGER",
      WORKER: "WORKER",
      BUYER: "BUYER",
      SUPPLIER: "SUPPLIER",
      USER: "WORKER",
      VIEWER: "WORKER",
      GUEST: "GUEST"
    };

    return roleMap[normalized] || "WORKER";
  };

  // Enhanced session validation with SUPER_ADMIN bypass
  const validateUserSession = async (): Promise<boolean> => {
    try {
      console.log("🔐 [Session Validation] Starting validation...");
      
      if (!sessionToken) {
        console.log("❌ [Session Validation] No session token");
        return false;
      }

      // ✅ SUPER_ADMIN ULTIMATE BYPASS - Skip validation for SUPER_ADMIN
      if (isSuperAdmin(user)) {
        console.log("👑 [Session Validation] SUPER_ADMIN detected - skipping validation");
        await logSecurityEvent(
          SECURITY_EVENT_TYPES.SUPER_ADMIN_ACCESS,
          'SUPER_ADMIN session validation bypassed - ULTIMATE ACCESS',
          true,
          'INFO',
          { 
            user_id: user?.id,
            username: user?.username,
            bypass_reason: 'SUPER_ADMIN_ULTIMATE_ACCESS'
          }
        );
        return true;
      }

      // Use the AuthContext's validateSession method for non-SUPER_ADMIN users
      if (validateSession && typeof validateSession === 'function') {
        const isValid = await validateSession(sessionToken);
        console.log("✅ [Session Validation] Result:", isValid);
        return isValid;
      }

      // Fallback validation using direct API call for non-SUPER_ADMIN
      console.log("🔄 [Session Validation] Using fallback API validation");
      const response = await axios.post(`${API_BASE_URL}/auth/validate-session`, {
        session_token: sessionToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const isValid = response.data?.is_valid === true;
      console.log("✅ [Session Validation] Fallback result:", isValid);
      return isValid;

    } catch (error: any) {
      console.error("❌ [Session Validation] Error:", error.message);
      return false;
    }
  };

  // ✅ FIXED: Enhanced security logging with simplified approach
  const logSecurityEvent = async (
    eventType: string,
    description: string,
    success: boolean,
    severity: 'INFO' | 'WARN' | 'ERROR' = 'INFO',
    details?: any
  ): Promise<void> => {
    try {
      // ✅ Validate and map event type to schema-compliant value
      const validatedEventType = Object.values(SECURITY_EVENT_TYPES).includes(eventType as any) 
        ? eventType 
        : SECURITY_EVENT_TYPES.SENSITIVE_ACCESS;

      const eventDetails = {
        event_type: validatedEventType,
        event_description: description,
        success,
        severity,
        user_id: user?.id,
        username: user?.username,
        user_role: user?.role_name,
        timestamp: new Date().toISOString(),
        path: location.pathname,
        is_super_admin: isSuperAdmin(user),
        ...details
      };

      console.log(`🔐 [Security] ${validatedEventType}:`, eventDetails);

      // Only log to backend if we have a valid session token and user
      if (sessionToken && user) {
        try {
          // ✅ FIXED: Simplified payload that matches backend expectations
          const securityPayload = {
            event_type: validatedEventType,
            event_description: description,
            success,
            severity,
            user_id: user.id,
            username: user.username,
            user_role: user.role_name,
            ip_address: "client_ip_placeholder",
            user_agent: navigator.userAgent,
            details: JSON.stringify({
              timestamp: new Date().toISOString(),
              is_super_admin: isSuperAdmin(user),
              path: location.pathname,
              ...(details || {})
            })
          };

          console.log(`📨 [Security] Sending to backend:`, securityPayload);

          // ✅ FIXED: Use axios with proper error handling and no Authorization header
          const response = await axios.post(
            `${API_BASE_URL}/auth/log-security-event`, 
            securityPayload, 
            {
              timeout: 3000,
              headers: {
                'Content-Type': 'application/json',
                // ✅ REMOVED: No Authorization header - backend handles auth via session
              },
              validateStatus: (status) => status < 500 // Don't throw for 4xx errors
            }
          );

          if (response.status === 200) {
            console.log('✅ [Security] Event logged successfully');
          } else {
            console.warn(`🔵 [Security] Backend returned status: ${response.status}`, response.data);
          }

        } catch (error: any) {
          // ✅ FIXED: Better error classification
          if (axios.isCancel(error)) {
            console.warn('🔵 [Security] Request cancelled - skipping backend log');
          } else if (error.code === 'ECONNABORTED') {
            console.warn('🔵 [Security] Request timeout - skipping backend log');
          } else if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            if (status === 500) {
              console.warn('🔵 [Security] Server error (500) during logging - skipping');
            } else if (status === 401) {
              console.warn('🔵 [Security] Authentication error (401) - skipping security log');
            } else if (status === 400) {
              console.warn('🔵 [Security] Bad request (400) - check event data');
            } else {
              console.warn(`🔵 [Security] Backend error (${status}):`, error.response.data);
            }
          } else if (error.request) {
            console.warn('🔵 [Security] No response received - network error');
          } else {
            console.warn('🔵 [Security] Request setup error:', error.message);
          }
        }
      } else {
        console.log('🔵 [Security] Skipping backend log - no session token or user');
      }
    } catch (error: any) {
      console.warn('🔵 [Security] Logging failed (non-critical):', error.message);
    }
  };

  useEffect(() => {
    // ✅ Prevent multiple redirects - only redirect from root or login
    if (location.pathname !== "/" && location.pathname !== "/login") {
      console.log('🟡 [Redirect] Already on target path, skipping redirect:', location.pathname);
      return;
    }

    if (!initialized || loading) {
      console.log("⏳ [Redirect] Waiting for initialization...", { initialized, loading });
      return;
    }

    const redirectUser = async () => {
      setValidating(true);
      setDebugInfo("Starting redirect process...");

      try {
        console.log("🚀 [Redirect] Starting redirect process...", {
          hasUser: !!user,
          isAuthenticated,
          sessionToken: !!sessionToken,
          currentPath: location.pathname,
          isSuperAdmin: isSuperAdmin(user)
        });

        // Case 1: No user or not authenticated - redirect to login
        if (!user || !isAuthenticated) {
          console.log("🟡 [Redirect] No user or not authenticated, redirecting to login");
          setDebugInfo("No authenticated user - redirecting to login");
          
          await logSecurityEvent(
            SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
            'No authenticated user found for dashboard redirect',
            false,
            'WARN'
          );
          
          navigate("/login", { 
            replace: true,
            state: { from: location, reason: 'not_authenticated' }
          });
          return;
        }

        // Case 2: Validate session (with SUPER_ADMIN bypass)
        setDebugInfo("Validating session...");
        console.log("🔐 [Redirect] Validating session for user:", user.username);
        
        const isSessionValid = await validateUserSession();
        
        if (!isSessionValid) {
          console.warn("⚠️ [Redirect] Invalid session, redirecting to login");
          setDebugInfo("Session invalid - redirecting to login");
          
          await logSecurityEvent(
            SECURITY_EVENT_TYPES.AUTHENTICATION_ERROR,
            'Session validation failed during dashboard redirect',
            false,
            'WARN',
            { is_super_admin: isSuperAdmin(user) }
          );
          
          await logout();
          navigate("/login", { 
            replace: true,
            state: { from: location, reason: 'session_expired' }
          });
          return;
        }

        console.log("✅ [Redirect] Session validation successful");
        setDebugInfo("Session valid - determining role...");

        // Case 3: Determine user role and redirect
        const userRole = normalizeRole(user);
        const isUserSuperAdmin = isSuperAdmin(user);

        console.log("🎯 [Redirect] Role determination:", {
          originalRole: user.role_name,
          normalizedRole: userRole,
          isSuperAdmin: isUserSuperAdmin,
          userId: user.id,
          username: user.username
        });

        // ✅ Role-based dashboard mapping - SUPER_ADMIN has ULTIMATE ACCESS
        const rolePaths: Record<string, string> = {
          SUPER_ADMIN: "/superadmin/dashboard", // SUPER_ADMIN always starts at superadmin dashboard
          MANAGER: "/manager/dashboard",
          WORKER: "/worker/dashboard",
          BUYER: "/buyer/dashboard",
          SUPPLIER: "/supplier/dashboard",
        };

        const targetPath = rolePaths[userRole];

        if (targetPath) {
          console.log("🟢 [Redirect] Redirecting user:", {
            username: user.username,
            role: userRole,
            targetPath: targetPath,
            isSuperAdmin: isUserSuperAdmin,
            privileges: isUserSuperAdmin ? 'FULL SYSTEM ACCESS' : 'LIMITED ACCESS'
          });
          
          setDebugInfo(`Redirecting ${userRole} to ${targetPath}`);
          
          // ✅ Use schema-compliant event type with SUPER_ADMIN distinction
          const securityEventType = isUserSuperAdmin 
            ? SECURITY_EVENT_TYPES.SUPER_ADMIN_ACCESS 
            : SECURITY_EVENT_TYPES.ROLE_CHANGE;

          await logSecurityEvent(
            securityEventType,
            `User redirected to ${targetPath} based on role ${userRole}`,
            true,
            'INFO',
            { 
              user_role: user.role_name,
              normalized_role: userRole,
              target_path: targetPath,
              is_super_admin: isUserSuperAdmin,
              privileges: isUserSuperAdmin ? 'full_system_access' : 'limited_access',
              user_id: user.id,
              username: user.username
            }
          );

          // Use replace: true to prevent back button issues
          navigate(targetPath, { replace: true });
        } else {
          // Unknown role - redirect to unauthorized
          console.warn("⚠️ [Redirect] Unknown role, redirecting to unauthorized:", userRole);
          setDebugInfo(`Unknown role: ${userRole} - redirecting to unauthorized`);
          
          await logSecurityEvent(
            SECURITY_EVENT_TYPES.PERMISSION_CHECK_FAILED,
            `Unknown role ${userRole} for dashboard access`,
            false,
            'WARN',
            { 
              user_role: user.role_name,
              normalized_role: userRole,
              allowed_roles: Object.keys(rolePaths),
              is_super_admin: isUserSuperAdmin
            }
          );
          
          navigate("/unauthorized", { 
            replace: true,
            state: { 
              reason: 'unknown_role',
              userRole: userRole 
            }
          });
        }

      } catch (error: any) {
        console.error("🔴 [Redirect] Error during redirect process:", error);
        setDebugInfo(`Error: ${error.message}`);
        
        await logSecurityEvent(
          SECURITY_EVENT_TYPES.REDIRECT_ERROR,
          `Dashboard redirect error: ${error.message}`,
          false,
          'ERROR',
          { 
            stack_trace: error.stack,
            current_path: location.pathname,
            is_super_admin: isSuperAdmin(user)
          }
        );
        
        // On error, redirect to login for safety
        navigate("/login", { 
          replace: true,
          state: { 
            from: location, 
            reason: 'redirect_error',
            error: error.message 
          }
        });
      } finally {
        setValidating(false);
      }
    };

    redirectUser();
  }, [
    user, 
    initialized, 
    loading, 
    navigate, 
    location.pathname, 
    validateSession, 
    logout,
    sessionToken,
    isAuthenticated,
    contextIsSuperAdmin
  ]);

  // Show detailed loading state during initialization, validation, or redirect process
  if (!initialized || loading || validating) {
    const isUserSuperAdmin = isSuperAdmin(user);
    
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={3}
        p={3}
        sx={{ backgroundColor: 'background.default' }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary" align="center">
          {validating ? "جاري توجيهك إلى لوحة التحكم المناسبة..." : "جاري تحميل النظام..."}
        </Typography>
        
        {validating && user && (
          <Box textAlign="center" mt={2}>
            <Typography variant="body2" color="textSecondary">
              المستخدم: {user.username}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              الدور: {user.role_name}
            </Typography>
            <Typography 
              variant="body2" 
              color={isUserSuperAdmin ? "success.main" : "textSecondary"}
              fontWeight="bold"
            >
              {isUserSuperAdmin ? "👑 مدير النظام - صلاحيات كاملة" : "صلاحيات محدودة"}
            </Typography>
            {debugInfo && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                {debugInfo}
              </Typography>
            )}
          </Box>
        )}

        {process.env.NODE_ENV === 'development' && (
          <Box mt={2} p={2} sx={{ backgroundColor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>Debug Info:</strong><br />
              API: {API_BASE_URL}<br />
              Initialized: {initialized ? 'Yes' : 'No'}<br />
              Loading: {loading ? 'Yes' : 'No'}<br />
              Validating: {validating ? 'Yes' : 'No'}<br />
              User: {user ? `${user.username} (${user.role_name})` : 'None'}<br />
              SUPER_ADMIN: {isUserSuperAdmin ? 'Yes - ULTIMATE ACCESS' : 'No - LIMITED'}<br />
              Authenticated: {isAuthenticated ? 'Yes' : 'No'}<br />
              Session Token: {sessionToken ? 'Present' : 'Missing'}<br />
              Context SUPER_ADMIN: {contextIsSuperAdmin ? 'Yes' : 'No'}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // This component doesn't render anything visible when not redirecting
  return null;
};

export default RoleBasedDashboardRedirect;
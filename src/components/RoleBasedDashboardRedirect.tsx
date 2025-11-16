import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress, Typography } from "@mui/material";

const RoleBasedDashboardRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loading,
    initialized,
    isAuthenticated,
    isSuperAdmin
  } = useAuth();

  const [validating, setValidating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Enhanced role mapping for Firebase roles
  const normalizeRole = (userData: any): string => {
    if (!userData) return "guest";

    const role = userData.role?.toLowerCase() || "user";
    
    console.log("Role Normalization] Processing:", {
      original: userData.role,
      normalized: role,
      userId: userData.uid,
      email: userData.email
    });

    const roleMap: Record<string, string> = {
      superadmin: "superadmin",
      super_admin: "superadmin",

      admin: "manager",
      manager: "manager",
      administrator: "manager",

      worker: "worker",
      user: "worker",
      employee: "worker",
      staff: "worker",

      buyer: "buyer",
      supplier: "supplier",
      vendor: "supplier",
      client: "buyer",

      viewer: "viewer",
      guest: "guest"
    };

    const finalRole = roleMap[role] || "worker";

    console.log("Role Normalization] Final role:", {
      input: role,
      output: finalRole,
      email: userData.email
    });

    return finalRole;
  };

  // Enhanced session validation for Firebase
  const validateUserSession = async (): Promise<boolean> => {
    try {
      console.log("Session Validation] Starting Firebase session validation...");

      if (isSuperAdmin) {
        console.log("Session Validation] SUPER_ADMIN detected - session validation bypassed");
        return true;
      }

      // For Firebase, the session is automatically managed by Firebase Auth
      // We just need to check if the user is authenticated
      if (isAuthenticated && user) {
        console.log("Session Validation] Firebase session valid");
        return true;
      }

      console.log("Session Validation] Firebase session invalid");
      return false;
    } catch (error: any) {
      console.error("Session Validation] Error:", error.message);
      return false;
    }
  };

  useEffect(() => {
    // Don't redirect if we're already on a specific path (not root or login)
    if (location.pathname !== "/" && location.pathname !== "/login") {
      console.log('Redirect] Already on target path, skipping redirect:', location.pathname);
      return;
    }

    if (!initialized || loading) {
      console.log("Redirect] Waiting for initialization...", { initialized, loading });
      return;
    }

    const redirectUser = async () => {
      setValidating(true);
      setDebugInfo("Starting redirect process...");

      try {
        console.log("Redirect] Starting Firebase redirect process...", {
          hasUser: !!user,
          isAuthenticated,
          currentPath: location.pathname,
          isSuperAdmin,
          userData: user ? {
            uid: user.uid,
            email: user.email,
            role: user.role,
            name: user.name
          } : null
        });

        // Case 1: No user or not authenticated
        if (!user || !isAuthenticated) {
          console.log("Redirect] No user or not authenticated, redirecting to login");
          setDebugInfo("No authenticated user - redirecting to login");

          navigate("/login", {
            replace: true,
            state: { from: location, reason: 'not_authenticated' }
          });
          return;
        }

        // Case 2: Validate session with Firebase
        setDebugInfo("Validating Firebase session...");
        console.log("Redirect] Validating session for user:", user.email);

        const isSessionValid = await validateUserSession();

        if (!isSessionValid) {
          console.warn("[Redirect] Invalid session, redirecting to login");
          setDebugInfo("Session invalid - redirecting to login");

          navigate("/login", {
            replace: true,
            state: { from: location, reason: 'session_expired' }
          });
          return;
        }

        console.log("Redirect] Firebase session validation successful");
        setDebugInfo("Session valid - determining role...");

        // Case 3: Determine role for Firebase user
        const userRole = normalizeRole(user);
        const isUserSuperAdmin = isSuperAdmin;

        console.log("Redirect] Role determination:", {
          originalRole: user.role,
          normalizedRole: userRole,
          isSuperAdmin: isUserSuperAdmin,
          userId: user.uid,
          email: user.email
        });

        const rolePaths: Record<string, string> = {
          superadmin: "/superadmin/dashboard",
          manager: "/manager/dashboard",
          worker: "/worker/dashboard",
          buyer: "/buyer/dashboard",
          supplier: "/supplier/dashboard",
          viewer: "/viewer/dashboard",
        };

        const targetPath = rolePaths[userRole];

        if (targetPath) {
          console.log("Redirect] Redirecting user:", {
            email: user.email,
            originalRole: user.role,
            normalizedRole: userRole,
            targetPath: targetPath,
            isSuperAdmin: isUserSuperAdmin,
            privileges: isUserSuperAdmin ? 'FULL SYSTEM ACCESS' : 'LIMITED ACCESS'
          });

          setDebugInfo(`Redirecting ${userRole} to ${targetPath}`);

          // Add a small delay to ensure the UI updates before navigation
          setTimeout(() => {
            navigate(targetPath, { replace: true });
          }, 100);
        } else {
          console.warn("[Redirect] Unknown role, redirecting to unauthorized:", userRole);
          setDebugInfo(`Unknown role: ${userRole} - redirecting to unauthorized`);

          navigate("/unauthorized", {
            replace: true,
            state: {
              reason: 'unknown_role',
              userRole: userRole,
              originalRole: user.role
            }
          });
        }
      } catch (error: any) {
        console.error("[Redirect] Error during redirect process:", error);
        setDebugInfo(`Error: ${error.message}`);

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
    isAuthenticated,
    isSuperAdmin
  ]);

  // Loading state
  if (!initialized || loading || validating) {
    const normalizedRole = user ? normalizeRole(user) : "guest";

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
              المستخدم: {user.email}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              الدور: {user.role} {user.role !== normalizedRole && `→ ${normalizedRole}`}
            </Typography>
            <Typography
              variant="body2"
              color={isSuperAdmin ? "success.main" : "textSecondary"}
              fontWeight="bold"
            >
              {isSuperAdmin ? "مدير النظام - صلاحيات كاملة" : "صلاحيات محدودة"}
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
              <strong>Firebase Debug Info:</strong><br />
              Initialized: {initialized ? 'Yes' : 'No'}<br />
              Loading: {loading ? 'Yes' : 'No'}<br />
              Validating: {validating ? 'Yes' : 'No'}<br />
              User: {user ? `${user.email} (${user.role})` : 'None'}<br />
              Normalized Role: {user ? normalizeRole(user) : 'None'}<br />
              SUPER_ADMIN: {isSuperAdmin ? 'Yes - ULTIMATE ACCESS' : 'No - LIMITED'}<br />
              Authenticated: {isAuthenticated ? 'Yes' : 'No'}<br />
              Current Path: {location.pathname}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return null;
};

export default RoleBasedDashboardRedirect;
// src/components/RequireRole.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";

// Schema-defined roles based on inventory_system.roles table
type SchemaRole = "SUPER_ADMIN" | "MANAGER" | "WORKER" | "BUYER" | "SUPPLIER";

// Permission types based on inventory_system.role_feature_permissions
type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

interface RequireRoleProps {
  allowedRoles: SchemaRole[];
  requiredFeature?: string;
  requiredPermission?: PermissionType;
  requireOwnership?: boolean;
  ownerId?: number | string;
  children?: React.ReactNode;
}

const RequireRole: React.FC<RequireRoleProps> = ({ 
  allowedRoles, 
  requiredFeature, 
  requiredPermission = 'view',
  requireOwnership = false,
  ownerId,
  children 
}) => {
  const { 
    user, 
    loading, 
    initialized, 
    isAuthenticated, 
    hasPermission, 
    permissions,
    role,
    isSuperAdmin: contextIsSuperAdmin
  } = useAuth();
  
  const location = useLocation();
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  
  const prevAuthState = useRef({
    user: null as any,
    isAuthenticated: false,
    initialized: false,
    loading: true
  });

  const accessCheckId = useRef(0);

  // ✅ ULTIMATE SUPER_ADMIN DETECTION - Only SUPER_ADMIN gets special privileges
  const isSuperAdmin = useMemo((): boolean => {
    // Priority 1: Use context isSuperAdmin (most reliable)
    if (contextIsSuperAdmin) {
      return true;
    }

    // Priority 2: Check from AuthContext role
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // Priority 3: Check user role_name from database (exact match)
    if (user?.role_name) {
      const normalizedRole = user.role_name.toString().toUpperCase().trim();
      const superAdminPatterns = [
        'SUPER_ADMIN', 'SUPERADMIN', 'SUPER ADMIN', 'SUPER-ADMIN'
      ];
      
      if (superAdminPatterns.some(pattern => 
        normalizedRole === pattern.toUpperCase() ||
        normalizedRole.replace(/[^A-Z]/g, '') === 'SUPERADMIN'
      )) {
        return true;
      }
    }

    // Priority 4: Check role_id (SUPER_ADMIN typically has role_id = 1)
    if (user?.role_id === 1) {
      return true;
    }

    // Priority 5: Check security_level (SUPER_ADMIN = 100 in schema)
    if (user?.security_level === 100) {
      return true;
    }

    return false;
  }, [user, role, contextIsSuperAdmin]);

  // ✅ SUPER_ADMIN has immediate access to everything - NO OTHER ROLE GETS THIS
  const hasRequiredRole = useCallback((): boolean => {
    // ✅ SUPER_ADMIN ULTIMATE PRIVILEGE - ACCESS TO ALL ROUTES
    if (isSuperAdmin) {
      console.log('🔵 [RequireRole] SUPER_ADMIN ULTIMATE ACCESS - bypassing all role checks');
      return true;
    }

    // ❌ STRICT ROLE CHECK FOR NON-SUPER_ADMIN USERS
    if (!allowedRoles.length) return false; // No allowed roles = no access
    if (!user?.role_name) return false;

    const userRole = user.role_name.toUpperCase().trim();
    
    // Strict role matching - only exact matches allowed
    const hasExactRole = allowedRoles.some(allowedRole => 
      allowedRole.toUpperCase() === userRole
    );

    if (!hasExactRole) {
      console.log('🔴 [RequireRole] Role requirement not met for non-SUPER_ADMIN:', {
        userRole,
        allowedRoles,
        isSuperAdmin: false
      });
    }

    return hasExactRole;
  }, [allowedRoles, user, isSuperAdmin]);

  // ✅ Ownership check - SUPER_ADMIN bypasses all ownership restrictions
  const hasOwnership = useCallback((): boolean => {
    if (!requireOwnership || !ownerId) return true;
    if (!user) return false;

    // ✅ SUPER_ADMIN ULTIMATE PRIVILEGE - BYPASSES ALL OWNERSHIP CHECKS
    if (isSuperAdmin) {
      return true;
    }

    // ❌ STRICT OWNERSHIP CHECK FOR NON-SUPER_ADMIN USERS
    const isOwner = user.id.toString() === ownerId.toString();
    
    if (!isOwner) {
      console.log('🔴 [RequireRole] Ownership requirement not met for non-SUPER_ADMIN:', {
        userId: user.id,
        ownerId,
        isSuperAdmin: false
      });
    }

    return isOwner;
  }, [requireOwnership, ownerId, user, isSuperAdmin]);

  // ✅ Feature permission check - SUPER_ADMIN has ALL permissions
  const hasRequiredFeaturePermission = useCallback((): boolean => {
    // ✅ SUPER_ADMIN ULTIMATE PRIVILEGE - ACCESS TO ALL FEATURES
    if (isSuperAdmin) {
      return true;
    }

    if (!requiredFeature) return true;
    
    // ❌ STRICT PERMISSION CHECK FOR NON-SUPER_ADMIN USERS
    let hasPerm = false;
    
    // Use AuthContext's hasPermission method for consistency
    if (hasPermission && typeof hasPermission === 'function') {
      hasPerm = hasPermission(requiredFeature, requiredPermission);
    } else {
      // Fallback to local permission check
      const permission = permissions?.find(p => p.feature_code === requiredFeature);
      
      if (!permission) {
        hasPerm = false;
      } else {
        // Check specific permission based on requiredPermission
        switch (requiredPermission) {
          case 'view':
            hasPerm = permission.can_view === true;
            break;
          case 'create':
            hasPerm = permission.can_create === true;
            break;
          case 'edit':
            hasPerm = permission.can_edit === true;
            break;
          case 'delete':
            hasPerm = permission.can_delete === true;
            break;
          case 'export':
            hasPerm = permission.can_export === true;
            break;
          case 'approve':
            hasPerm = permission.can_approve === true;
            break;
          default:
            hasPerm = false;
        }
      }
    }

    if (!hasPerm) {
      console.log('🔴 [RequireRole] Feature permission not met for non-SUPER_ADMIN:', {
        requiredFeature,
        requiredPermission,
        isSuperAdmin: false
      });
    }

    return hasPerm;
  }, [requiredFeature, requiredPermission, isSuperAdmin, hasPermission, permissions]);

  // ✅ ULTIMATE ACCESS CHECK - SUPER_ADMIN gets immediate full access, others get strict checks
  const checkAccess = useCallback((): boolean => {
    const currentCheckId = ++accessCheckId.current;
    
    try {
      // Step 1: Check if auth is initialized and not loading
      if (!initialized || loading) {
        console.log('🟡 [RequireRole] Auth not ready - skipping check');
        return false;
      }

      // Step 2: Check if user is authenticated
      if (!isAuthenticated || !user) {
        console.log('🔴 [RequireRole] User not authenticated');
        return false;
      }

      // ✅ Step 3: SUPER_ADMIN ULTIMATE BYPASS - FULL SYSTEM ACCESS
      if (isSuperAdmin) {
        console.log('🔵 [RequireRole] SUPER_ADMIN ULTIMATE ACCESS GRANTED - bypassing all checks');
        return true;
      }

      // ❌ Step 4: STRICT role requirement for non-SUPER_ADMIN users
      if (!hasRequiredRole()) {
        console.log('🔴 [RequireRole] Role requirement not met for non-SUPER_ADMIN');
        return false;
      }

      // ❌ Step 5: STRICT feature permission requirement for non-SUPER_ADMIN users
      if (!hasRequiredFeaturePermission()) {
        console.log('🔴 [RequireRole] Feature permission not met for non-SUPER_ADMIN');
        return false;
      }

      // ❌ Step 6: STRICT ownership requirement for non-SUPER_ADMIN users
      if (requireOwnership && !hasOwnership()) {
        console.log('🔴 [RequireRole] Ownership requirement not met for non-SUPER_ADMIN');
        return false;
      }

      // All STRICT checks passed for non-SUPER_ADMIN
      console.log('🟢 [RequireRole] Access granted for non-SUPER_ADMIN user after strict checks');
      return true;

    } catch (error: any) {
      console.error('🔴 [RequireRole] Error during access check:', error);
      if (currentCheckId === accessCheckId.current) {
        setCheckError(error.message || 'Unknown error during access verification');
      }
      return false;
    }
  }, [
    initialized, 
    loading, 
    isAuthenticated, 
    user, 
    isSuperAdmin, 
    hasRequiredRole, 
    hasRequiredFeaturePermission, 
    requireOwnership, 
    hasOwnership
  ]);

  // ✅ Optimized useEffect for access verification
  useEffect(() => {
    let isMounted = true;
    let verificationTimeout: NodeJS.Timeout;

    const verifyAccess = () => {
      if (!isMounted) return;

      // Check if auth state has actually changed
      const currentAuthState = {
        user,
        isAuthenticated,
        initialized,
        loading
      };

      const prevState = prevAuthState.current;
      
      // Skip if auth state hasn't changed significantly and we've already checked
      if (
        prevState.user?.id === currentAuthState.user?.id &&
        prevState.isAuthenticated === currentAuthState.isAuthenticated &&
        prevState.initialized === currentAuthState.initialized &&
        prevState.loading === currentAuthState.loading &&
        accessChecked
      ) {
        return;
      }

      // Update previous state
      prevAuthState.current = currentAuthState;

      try {
        // Direct synchronous check - no async operations
        const hasAccess = checkAccess();
        
        if (isMounted) {
          setAccessGranted(hasAccess);
          setAccessChecked(true);
          setCheckError(null);
        }
      } catch (error: any) {
        console.error('🔴 [RequireRole] Error in verifyAccess:', error);
        if (isMounted) {
          setCheckError(error.message || 'Access verification failed');
          setAccessChecked(true);
          setAccessGranted(false);
        }
      }
    };

    // Only set timeout if we haven't checked access yet
    if (!accessChecked) {
      verificationTimeout = setTimeout(() => {
        if (isMounted && !accessChecked) {
          console.warn('🟡 [RequireRole] Access verification timeout - forcing completion');
          setAccessChecked(true);
          setAccessGranted(false);
          setCheckError('Access verification took too long');
        }
      }, 2000);
    }

    // Start verification when auth state changes
    if (initialized && !loading) {
      verifyAccess();
    } else if (!initialized && !loading) {
      // Auth failed to initialize
      setAccessChecked(true);
      setAccessGranted(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(verificationTimeout);
    };
  }, [initialized, loading, isAuthenticated, user, location.pathname, accessChecked, checkAccess]);

  // ✅ Show loading only during initial auth loading
  if (loading || !initialized) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        gap={3}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          جاري تحميل النظام...
        </Typography>
      </Box>
    );
  }

  // ✅ Show access checking state
  if (!accessChecked && initialized && !loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        gap={3}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          جاري التحقق من الصلاحيات...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {user?.role_name && `الدور: ${user.role_name}`}
          {isSuperAdmin && ' (مدير النظام - صلاحيات كاملة)'}
        </Typography>
      </Box>
    );
  }

  // ✅ Handle check errors
  if (checkError) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        gap={3}
        p={3}
      >
        <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            خطأ في النظام
          </Typography>
          <Typography variant="body1">
            حدث خطأ أثناء التحقق من الصلاحيات. يرجى المحاولة مرة أخرى.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {checkError}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>تفاصيل المستخدم:</strong>
            </Typography>
            <Typography variant="body2">
              الدور: {user?.role_name || 'غير معروف'}
            </Typography>
            <Typography variant="body2">
              SUPER_ADMIN: {isSuperAdmin ? 'نعم - صلاحيات كاملة' : 'لا - صلاحيات محدودة'}
            </Typography>
            <Typography variant="body2">
              المعرف: {user?.id || 'غير معروف'}
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  }

  // ✅ ACCESS GRANTED - render protected content
  if (accessGranted) {
    console.log('🟢 [RequireRole] Rendering protected content for:', user?.role_name, 'SUPER_ADMIN:', isSuperAdmin);
    return children ? <>{children}</> : <Outlet />;
  }

  // ✅ Check specific reasons for access denial
  if (user && isAuthenticated) {
    // User is authenticated but access was denied
    
    // SUPER_ADMIN should never reach here, but handle just in case
    if (isSuperAdmin) {
      console.error('🔴 [RequireRole] SUPER_ADMIN denied access - this should never happen!');
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location, 
            reason: 'super_admin_error',
            message: 'خطأ في نظام الصلاحيات لمدير النظام'
          }} 
          replace 
        />
      );
    }

    // Check role requirement for non-SUPER_ADMIN users
    if (!hasRequiredRole()) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location, 
            reason: 'insufficient_role',
            userRole: user.role_name,
            allowedRoles: allowedRoles,
            message: `لا تمتلك الصلاحية الكافية. دورك الحالي: ${user.role_name}، المطلوب: ${allowedRoles.join(' أو ')}`
          }} 
          replace 
        />
      );
    }

    // Check feature permission for non-SUPER_ADMIN users
    if (requiredFeature && !hasRequiredFeaturePermission()) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location, 
            reason: 'insufficient_permission',
            feature: requiredFeature,
            permission: requiredPermission,
            userRole: user.role_name,
            message: `لا تمتلك صلاحية ${requiredPermission} للميزة ${requiredFeature}`
          }} 
          replace 
        />
      );
    }

    // Check ownership for non-SUPER_ADMIN users
    if (requireOwnership && !hasOwnership()) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location, 
            reason: 'insufficient_ownership',
            userRole: user.role_name,
            message: 'لا تمتلك صلاحية التعديل على هذا العنصر'
          }} 
          replace 
        />
      );
    }

    // Session expired or other issues
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location, 
          reason: 'session_expired',
          message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'
        }} 
        replace 
      />
    );
  }

  // ✅ Not authenticated - redirect to login
  return (
    <Navigate 
      to="/login" 
      state={{ 
        from: location, 
        reason: 'authentication_required',
        message: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة'
      }} 
      replace 
    />
  );
};

export default RequireRole;
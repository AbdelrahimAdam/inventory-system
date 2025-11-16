import React, { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";

// Firebase-compatible roles
type FirebaseRole = "superadmin" | "manager" | "worker" | "buyer" | "supplier" | "user";

// Simplified permission types for Firebase
type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'manage' | 'approve';

interface RequireRoleProps {
  allowedRoles: FirebaseRole[];
  requiredFeature?: string;
  requiredPermission?: PermissionType;
  requireOwnership?: boolean;
  ownerId?: string;
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
    isSuperAdmin,
    hasRole,
    hasFeature,
    canPerform
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

  // ✅ ENHANCED Role normalization for Firebase - FIXED VERSION
  const normalizeRole = (userRole: any): FirebaseRole => {
    console.log('🔄 [RequireRole] Normalizing role:', { input: userRole, type: typeof userRole });
    
    // Handle null/undefined
    if (!userRole) return "user";
    
    // Convert to string and normalize
    const roleStr = String(userRole).toLowerCase().trim();
    
    // Handle numeric roles (like '2')
    const numericRoleMap: Record<string, FirebaseRole> = {
      '1': 'superadmin',
      '2': 'manager', 
      '3': 'worker',
      '4': 'buyer',
      '5': 'supplier',
      '6': 'user'
    };
    
    // If it's a numeric role, map it
    if (numericRoleMap[roleStr]) {
      console.log('🔢 [RequireRole] Mapped numeric role:', { input: roleStr, mapped: numericRoleMap[roleStr] });
      return numericRoleMap[roleStr];
    }
    
    // Handle string roles
    const roleMap: Record<string, FirebaseRole> = {
      'superadmin': "superadmin",
      'super_admin': "superadmin",
      'admin': "superadmin",
      'manager': "manager",
      'administrator': "manager",
      'worker': "worker",
      'user': "worker",
      'employee': "worker",
      'staff': "worker",
      'buyer': "buyer",
      'supplier': "supplier",
      'vendor': "supplier",
      'client': "buyer"
    };

    const normalizedRole = roleMap[roleStr] || "worker";
    console.log('🔤 [RequireRole] Mapped string role:', { input: roleStr, mapped: normalizedRole });
    
    return normalizedRole;
  };

  // ✅ Get user's actual role with proper normalization
  const getUserRole = useCallback((): FirebaseRole => {
    if (!user?.role) return "user";
    
    const normalized = normalizeRole(user.role);
    console.log('👤 [RequireRole] User role resolved:', { 
      raw: user.role, 
      normalized,
      isSuperAdmin 
    });
    
    return normalized;
  }, [user, isSuperAdmin]);

  // ✅ SUPER_ADMIN has immediate access to everything - FIXED
  const hasRequiredRole = useCallback((): boolean => {
    // ✅ SUPER_ADMIN ULTIMATE PRIVILEGE - ACCESS TO ALL ROUTES
    if (isSuperAdmin) {
      console.log('🔵 [RequireRole] SUPER_ADMIN ULTIMATE ACCESS - bypassing all role checks');
      return true;
    }

    // If no roles required, allow access
    if (!allowedRoles.length) {
      console.log('🟡 [RequireRole] No roles required - allowing access');
      return true;
    }

    const userRole = getUserRole();
    
    // Use the hasRole method from AuthContext which properly checks custom claims
    if (hasRole && typeof hasRole === 'function') {
      const hasRoleResult = hasRole(allowedRoles);
      console.log('🔍 [RequireRole] AuthContext hasRole result:', { 
        userRole, 
        allowedRoles, 
        result: hasRoleResult 
      });
      return hasRoleResult;
    }

    // Fallback check if hasRole method is not available
    const hasExactRole = allowedRoles.some(allowedRole => 
      allowedRole.toLowerCase() === userRole
    );

    console.log('🔍 [RequireRole] Fallback role check:', {
      userRole,
      allowedRoles,
      hasExactRole
    });

    return hasExactRole;
  }, [allowedRoles, getUserRole, isSuperAdmin, hasRole]);

  // ✅ Ownership check - SUPER_ADMIN bypasses all ownership restrictions
  const hasOwnership = useCallback((): boolean => {
    if (!requireOwnership || !ownerId) return true;
    if (!user) return false;

    // ✅ SUPER_ADMIN ULTIMATE PRIVILEGE - BYPASSES ALL OWNERSHIP CHECKS
    if (isSuperAdmin) {
      return true;
    }

    // ❌ STRICT OWNERSHIP CHECK FOR NON-SUPER_ADMIN USERS
    const isOwner = user.uid === ownerId;
    
    if (!isOwner) {
      console.log('🔴 [RequireRole] Ownership requirement not met:', {
        userId: user.uid,
        ownerId,
        isSuperAdmin
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
    
    // Use the hasFeature method from AuthContext
    if (hasFeature && typeof hasFeature === 'function') {
      const hasFeatureResult = hasFeature(requiredFeature);
      console.log('🔍 [RequireRole] AuthContext hasFeature result:', {
        requiredFeature,
        result: hasFeatureResult
      });
      return hasFeatureResult;
    }

    // Fallback check
    let hasPerm = false;
    
    if (user?.features) {
      hasPerm = user.features[requiredFeature as keyof typeof user.features] === true;
    }

    console.log('🔍 [RequireRole] Feature permission check:', {
      requiredFeature,
      hasPerm,
      userFeatures: user?.features
    });

    return hasPerm;
  }, [requiredFeature, isSuperAdmin, user, hasFeature]);

  // ✅ Permission action check
  const hasRequiredActionPermission = useCallback((): boolean => {
    if (!requiredPermission || requiredPermission === 'view') return true;
    
    // ✅ SUPER_ADMIN ULTIMATE PRIVILEGE - ALL ACTIONS ALLOWED
    if (isSuperAdmin) {
      return true;
    }

    // Use the canPerform method from AuthContext
    if (canPerform && typeof canPerform === 'function') {
      const canPerformResult = canPerform(requiredPermission);
      console.log('🔍 [RequireRole] AuthContext canPerform result:', {
        requiredPermission,
        result: canPerformResult
      });
      return canPerformResult;
    }

    // Fallback permission check
    const userRole = getUserRole();
    
    const rolePermissions = {
      'superadmin': ['view', 'create', 'edit', 'delete', 'export', 'manage', 'approve'],
      'manager': ['view', 'create', 'edit', 'export', 'manage', 'approve'],
      'worker': ['view', 'create', 'edit'],
      'buyer': ['view', 'create'],
      'supplier': ['view', 'edit'],
      'user': ['view']
    };

    const permissions = rolePermissions[userRole] || ['view'];
    const hasAction = permissions.includes(requiredPermission);

    console.log('🔍 [RequireRole] Action permission check:', {
      requiredPermission,
      userRole,
      allowedPermissions: permissions,
      hasAction
    });

    return hasAction;
  }, [requiredPermission, isSuperAdmin, getUserRole, canPerform]);

  // ✅ ULTIMATE ACCESS CHECK
  const checkAccess = useCallback((): boolean => {
    const currentCheckId = ++accessCheckId.current;
    
    try {
      console.log('🟡 [RequireRole] Starting access check:', {
        user: user ? {
          uid: user.uid,
          role: user.role,
          normalizedRole: getUserRole(),
          features: user.features
        } : 'No user',
        isSuperAdmin,
        allowedRoles,
        requiredFeature,
        requiredPermission,
        requireOwnership,
        ownerId
      });

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
        console.log('🔵 [RequireRole] SUPER_ADMIN ULTIMATE ACCESS GRANTED');
        return true;
      }

      // Step 4: Get user role for debugging
      const userRole = getUserRole();
      console.log('👤 [RequireRole] User role analysis:', {
        rawRole: user.role,
        normalizedRole: userRole,
        allowedRoles,
        isSuperAdmin
      });

      // ❌ Step 5: STRICT role requirement for non-SUPER_ADMIN users
      if (!hasRequiredRole()) {
        console.log('🔴 [RequireRole] Role requirement not met');
        return false;
      }

      // ❌ Step 6: STRICT feature permission requirement
      if (!hasRequiredFeaturePermission()) {
        console.log('🔴 [RequireRole] Feature permission not met');
        return false;
      }

      // ❌ Step 7: STRICT action permission requirement
      if (!hasRequiredActionPermission()) {
        console.log('🔴 [RequireRole] Action permission not met');
        return false;
      }

      // ❌ Step 8: STRICT ownership requirement
      if (requireOwnership && !hasOwnership()) {
        console.log('🔴 [RequireRole] Ownership requirement not met');
        return false;
      }

      // All STRICT checks passed for non-SUPER_ADMIN
      console.log('🟢 [RequireRole] Access granted after all checks');
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
    getUserRole,
    hasRequiredRole, 
    hasRequiredFeaturePermission,
    hasRequiredActionPermission,
    requireOwnership, 
    hasOwnership,
    allowedRoles,
    requiredFeature,
    requiredPermission,
    ownerId
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
        prevState.user?.uid === currentAuthState.user?.uid &&
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
        const hasAccess = checkAccess();
        
        if (isMounted) {
          setAccessGranted(hasAccess);
          setAccessChecked(true);
          setCheckError(null);
          
          console.log('📊 [RequireRole] Access check completed:', {
            granted: hasAccess,
            userRole: user?.role,
            normalizedRole: getUserRole(),
            isSuperAdmin,
            allowedRoles
          });
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

    // Set timeout for access check
    verificationTimeout = setTimeout(() => {
      if (isMounted && !accessChecked) {
        console.warn('🟡 [RequireRole] Access verification timeout');
        setAccessChecked(true);
        setAccessGranted(false);
        setCheckError('Access verification took too long');
      }
    }, 5000); // Increased timeout for better debugging

    // Start verification when auth state changes
    if (initialized && !loading) {
      verifyAccess();
    } else if (!initialized && !loading) {
      // Auth failed to initialize
      setAccessChecked(true);
      setAccessGranted(false);
      setCheckError('Authentication system failed to initialize');
    }

    return () => {
      isMounted = false;
      clearTimeout(verificationTimeout);
    };
  }, [initialized, loading, isAuthenticated, user, location.pathname, accessChecked, checkAccess, getUserRole]);

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
    const userRole = getUserRole();
    
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
          {user?.role && `الدور: ${user.role} (${userRole})`}
          {isSuperAdmin && ' (مدير النظام - صلاحيات كاملة)'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          المطلوب: {allowedRoles.join(' أو ')}
        </Typography>
        {requiredFeature && (
          <Typography variant="body2" color="textSecondary">
            الميزة المطلوبة: {requiredFeature}
          </Typography>
        )}
      </Box>
    );
  }

  // ✅ Handle check errors
  if (checkError) {
    const userRole = getUserRole();
    
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
              الدور الخام: {user?.role || 'غير معروف'}
            </Typography>
            <Typography variant="body2">
              الدور المعياري: {userRole}
            </Typography>
            <Typography variant="body2">
              SUPER_ADMIN: {isSuperAdmin ? 'نعم - صلاحيات كاملة' : 'لا - صلاحيات محدودة'}
            </Typography>
            <Typography variant="body2">
              المعرف: {user?.uid || 'غير معروف'}
            </Typography>
            <Typography variant="body2">
              الأدوار المسموحة: {allowedRoles.join(', ')}
            </Typography>
            {requiredFeature && (
              <Typography variant="body2">
                الميزة المطلوبة: {requiredFeature}
              </Typography>
            )}
          </Box>
        </Alert>
      </Box>
    );
  }

  // ✅ ACCESS GRANTED - render protected content
  if (accessGranted) {
    const userRole = getUserRole();
    console.log('🟢 [RequireRole] Rendering protected content for:', {
      rawRole: user?.role,
      normalizedRole: userRole,
      isSuperAdmin,
      allowedRoles
    });
    return children ? <>{children}</> : <Outlet />;
  }

  // ✅ ACCESS DENIED - handle different denial reasons
  if (user && isAuthenticated) {
    const userRole = getUserRole();
    
    // SUPER_ADMIN should never reach here, but handle just in case
    if (isSuperAdmin) {
      console.error('🔴 [RequireRole] SUPER_ADMIN denied access - this should never happen!');
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location, 
            reason: 'super_admin_error',
            message: 'خطأ في نظام الصلاحيات لمدير النظام',
            userRole: user.role,
            normalizedRole: userRole,
            allowedRoles
          }} 
          replace 
        />
      );
    }

    // Check specific denial reasons
    const roleDenied = !hasRequiredRole();
    const featureDenied = requiredFeature && !hasRequiredFeaturePermission();
    const actionDenied = requiredPermission && !hasRequiredActionPermission();
    const ownershipDenied = requireOwnership && !hasOwnership();

    console.log('🔴 [RequireRole] Access denied reasons:', {
      roleDenied,
      featureDenied,
      actionDenied,
      ownershipDenied,
      userRole: user.role,
      normalizedRole: userRole,
      allowedRoles,
      requiredFeature,
      requiredPermission
    });

    // Build appropriate error message
    let errorMessage = 'غير مصرح بالوصول';
    if (roleDenied) {
      errorMessage = `لا تمتلك الصلاحية الكافية. دورك الحالي: ${user.role} (${userRole})، المطلوب: ${allowedRoles.join(' أو ')}`;
    } else if (featureDenied) {
      errorMessage = `لا تمتلك صلاحية الوصول للميزة: ${requiredFeature}`;
    } else if (actionDenied) {
      errorMessage = `لا تمتلك صلاحية ${requiredPermission} لهذا العنصر`;
    } else if (ownershipDenied) {
      errorMessage = 'لا تمتلك صلاحية التعديل على هذا العنصر';
    }

    return (
      <Navigate 
        to="/unauthorized" 
        state={{ 
          from: location, 
          reason: roleDenied ? 'insufficient_role' : 
                  featureDenied ? 'insufficient_feature' :
                  actionDenied ? 'insufficient_permission' :
                  ownershipDenied ? 'insufficient_ownership' : 'unknown',
          userRole: user.role,
          normalizedRole: userRole,
          allowedRoles: allowedRoles,
          requiredFeature,
          requiredPermission,
          message: errorMessage
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
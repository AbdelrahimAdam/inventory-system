// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  IdTokenResult,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
  onSnapshotsInSync,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db } from "../firebase/config"; // ✅ FIXED IMPORT
import { EmailVerificationService, PasswordResetService } from "../services/firebase";

// === Firebase-compatible interfaces ===
interface User {
  uid: string;
  email: string | null;
  name: string;
  role: 'superadmin' | 'super_admin' | 'manager' | 'worker' | 'supplier' | 'buyer' | 'user';
  features: {
    userManagement?: boolean;
    systemConfig?: boolean;
    auditLogs?: boolean;
    backupRestore?: boolean;
    roleManagement?: boolean;
    inventoryManagement?: boolean;
    reports?: boolean;
    approvals?: boolean;
  };
  isActive: boolean;
  emailVerified: boolean;
  createdAt: any;
  updatedAt: any;
  lastVerificationSent?: any;
  settings?: {
    theme: string;
    language: string;
    notifications: boolean;
  };
}

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: User;
}

interface AuthContextProps {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  isSuperAdmin: boolean;
  role: string | null;
  isOnline: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  registerUser: (name: string, email: string, password: string, role: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  updateUserSettings: (settings: Partial<User["settings"]>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  sendEmailVerification: () => Promise<{ success: boolean; message?: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; message?: string }>;
  checkEmailVerification: () => Promise<boolean>;
  reloadUser: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasFeature: (feature: string) => boolean;
  canPerform: (action: string) => boolean;
  hasPermission: (featureCode: string, action?: string) => boolean;
  refreshUserClaims: () => Promise<void>;
}

// === Context ===
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  // === Lazy Firebase Initialization ===
  const initializeFirebase = async () => {
    try {
      console.log("🚀 Firebase services already initialized");
      setAuthReady(true);
      console.log("✅ Firebase services ready");
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      setAuthReady(true);
    }
  };

  // === Enable Offline Persistence (Lazy) ===
  const enablePersistence = async () => {
    try {
      await enableIndexedDbPersistence(db);
      console.log("💾 Persistence enabled: Firestore offline cache active");
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open");
      } else if (err.code === 'unimplemented') {
        console.warn("Persistence not supported in this browser");
      }
    }
  };

  // === Network Status Listener ===
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("🌐 Network: Back online");
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.warn("🌐 Network: Offline mode");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // === Initialize Firebase in Background ===
  useEffect(() => {
    initializeFirebase();
    enablePersistence().catch(console.error);
  }, []);

  // === FIXED: Role normalization function - HANDLES NUMERIC ROLES ===
  const normalizeRole = (role: string): string => {
    if (!role) return 'user';
    
    const normalized = role.toLowerCase().trim();
    
    console.log('🔄 [AuthContext] Normalizing role:', { 
      input: role, 
      normalized,
      type: typeof role 
    });
    
    // Handle numeric roles (like '2', '3', etc.)
    const numericRoleMap: Record<string, string> = {
      '1': 'superadmin',
      '2': 'manager',
      '3': 'worker', 
      '4': 'buyer',
      '5': 'supplier',
      '6': 'user'
    };
    
    // If it's a numeric role, map it to proper role name
    if (numericRoleMap[normalized]) {
      const mappedRole = numericRoleMap[normalized];
      console.log('🔢 [AuthContext] Mapped numeric role:', { 
        input: normalized, 
        mapped: mappedRole 
      });
      return mappedRole;
    }
    
    // Handle string role variations (ONLY for superadmin)
    if (normalized === 'super_admin' || normalized === 'super-admin' || normalized === 'super admin') {
      return 'superadmin';
    }
    
    // Return the role AS-IS for all other roles (manager, worker, etc.)
    console.log('🔤 [AuthContext] Using role as-is:', normalized);
    return normalized;
  };

  // === Enhanced Check if user is super admin ===
  const checkIsSuperAdmin = (role: string): boolean => {
    if (!role) return false;
    const normalized = normalizeRole(role);
    return normalized === 'superadmin';
  };

  // === Handle missing claims recovery ===
  const handleMissingClaims = async (firebaseUser: FirebaseUser): Promise<{ role: string; features: any } | null> => {
    try {
      console.log("🔄 Attempting to recover missing claims for user:", firebaseUser.uid);
      
      // Try to get user data from Firestore with fallback
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      } catch (error: any) {
        console.warn("⚠️ Firestore access blocked during claims recovery:", error);
        return null;
      }
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("📋 Found user data in Firestore:", userData);
        
        if (userData.role && userData.role !== 'undefined') {
          console.log("✅ Using Firestore role for claims recovery:", userData.role);
          
          try {
            const { getFunctions } = await import('firebase/functions');
            const functions = getFunctions();
            const setUserRole = httpsCallable(functions, 'setUserRoleAndFeatures');
            
            console.log("🔄 Calling setUserRole cloud function...");
            await setUserRole({ 
              targetUserId: firebaseUser.uid, 
              role: userData.role, 
              features: userData.features || {} 
            });
            
            console.log("⏳ Waiting for claims propagation...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await firebaseUser.getIdToken(true);
            console.log("✅ Claims recovery completed");
            
            return {
              role: userData.role,
              features: userData.features || {}
            };
          } catch (cloudError) {
            console.warn("Cloud function unavailable, using Firestore data:", cloudError);
            return {
              role: userData.role,
              features: userData.features || {}
            };
          }
        }
      }
      
      console.warn("❌ No valid role found in Firestore for recovery");
      return null;
    } catch (error) {
      console.error("Error in handleMissingClaims:", error);
      return null;
    }
  };

  // === Enhanced token refresh ===
  const refreshAuthToken = async (firebaseUser: FirebaseUser): Promise<IdTokenResult> => {
    try {
      const idTokenResult = await firebaseUser.getIdTokenResult(true);
      return idTokenResult;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  };

  // === Emergency User Recovery ===
  const emergencyUserRecovery = async (firebaseUser: FirebaseUser): Promise<User> => {
    console.log("🚨 EMERGENCY: Creating user profile without Firestore access");
    
    // Create a basic user object without Firestore
    const emergencyUser: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      role: 'user', // Default role
      features: {},
      isActive: true,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: { theme: "light", language: "en", notifications: true },
    };
    
    console.log("✅ Emergency user created with role:", emergencyUser.role);
    
    // Try to update Firestore in background (don't wait for it)
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: emergencyUser.name,
        role: emergencyUser.role,
        features: emergencyUser.features,
        isActive: true,
        emailVerified: firebaseUser.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: emergencyUser.settings,
      };
      
      setDoc(doc(db, "users", firebaseUser.uid), userData).catch(err => 
        console.warn("Background Firestore update failed:", err)
      );
    } catch (bgError) {
      console.warn("Background Firestore update failed:", bgError);
    }
    
    return emergencyUser;
  };

  // === Enhanced Process Firebase user with multiple fallbacks ===
  const processFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      console.log("🔄 Processing Firebase user:", firebaseUser.uid);

      let customClaims: any = {};
      let userData: any = {};
      
      try {
        const idTokenResult = await refreshAuthToken(firebaseUser);
        customClaims = idTokenResult.claims;
        console.log("🔑 Custom claims from token:", customClaims);
      } catch (err) {
        console.error("❌ Failed to refresh token:", err);
        return null;
      }

      // Try to get user data from Firestore with multiple fallbacks
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
          console.log("📋 Found user data in Firestore:", userData);
        } else {
          console.log("📝 No user document found, will create one");
          await initializeUserDocument(firebaseUser, customClaims);
        }
      } catch (err: any) {
        console.error("❌ Firestore access error:", err);
        
        // If we can't access Firestore but have claims, proceed with claims
        if (customClaims.role && customClaims.role !== 'undefined') {
          console.log("⚠️ Firestore blocked but have claims, proceeding...");
          userData = {};
        } else {
          // If no claims and no Firestore access, use emergency recovery
          console.log("🆘 Emergency recovery: No claims and Firestore blocked");
          return await emergencyUserRecovery(firebaseUser);
        }
      }

      // If no role claim found but we have Firestore data, use that
      if ((!customClaims.role || customClaims.role === 'undefined') && userData.role) {
        console.log("🔄 Using Firestore role since claims are missing:", userData.role);
        customClaims.role = userData.role;
        customClaims.features = userData.features || {};
      }

      // If still no role, this is a critical error - use emergency recovery
      if (!customClaims.role || customClaims.role === 'undefined') {
        console.error("❌ CRITICAL: No role found in claims or Firestore");
        return await emergencyUserRecovery(firebaseUser);
      }

      const rawRole = customClaims.role || userData.role || 'user';
      const role = normalizeRole(rawRole) as User['role'];
      const features = customClaims.features || userData.features || {};
      const isActive = customClaims.isActive !== false && userData.isActive !== false;

      if (!isActive) {
        console.warn("User account is not active - logging out");
        await logout();
        return null;
      }

      const processedUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        role,
        features,
        isActive,
        emailVerified: firebaseUser.emailVerified,
        createdAt: userData.createdAt || new Date(),
        updatedAt: userData.updatedAt || new Date(),
        lastVerificationSent: userData.lastVerificationSent || null,
        settings: userData.settings || { theme: "light", language: "en", notifications: true },
      };

      // Sync user document if needed (in background)
      if ((!userData.role || userData.role !== role || !userData.uid)) {
        console.log("🔄 Syncing user document with latest role:", role);
        syncUserDocument(firebaseUser.uid, processedUser).catch(err => 
          console.warn("Background sync failed:", err)
        );
      }

      console.log("✅ User processed successfully - Role:", role, "Is SuperAdmin:", checkIsSuperAdmin(role));
      return processedUser;
    } catch (error) {
      console.error('❌ Error processing user:', error);
      
      // Ultimate fallback - try emergency recovery
      try {
        return await emergencyUserRecovery(firebaseUser);
      } catch (emergencyError) {
        console.error('❌ Emergency recovery also failed:', emergencyError);
        return null;
      }
    }
  };

  // === Initialize user document ===
  const initializeUserDocument = async (firebaseUser: FirebaseUser, customClaims: any) => {
    try {
      const rawRole = customClaims.role || 'user';
      const role = normalizeRole(rawRole) as User['role'];
      
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        role,
        features: customClaims.features || {},
        isActive: true,
        emailVerified: firebaseUser.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: { theme: "light", language: "en", notifications: true },
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);
      console.log("✅ User document initialized successfully");
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error("Firebase Rules blocked user document creation");
      } else {
        console.error("Failed to create user document:", error);
      }
      throw error;
    }
  };

  // === Sync user document ===
  const syncUserDocument = async (userId: string, userData: User) => {
    try {
      const cleanData: any = { 
        ...userData, 
        updatedAt: serverTimestamp() 
      };
      
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined) delete cleanData[key];
      });

      await setDoc(doc(db, "users", userId), cleanData, { merge: true });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error("Firebase Rules blocked user document sync");
      } else {
        console.error("Failed to sync user doc:", error);
      }
    }
  };

  // === RBAC Helpers ===
  const hasRole = (role: string | string[]): boolean => {
    if (!user?.role) return false;
    
    if (checkIsSuperAdmin(user.role)) return true;
    
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some(r => normalizeRole(r) === user.role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.role) return false;
    if (checkIsSuperAdmin(user.role)) return true;
    return roles.some(role => normalizeRole(role) === user.role);
  };

  const hasFeature = (feature: string): boolean => {
    if (!user) return false;
    if (checkIsSuperAdmin(user.role)) return true;
    return user.features[feature as keyof User['features']] === true;
  };

  const canPerform = (action: string): boolean => {
    if (!user?.role) return false;
    
    const perms: Record<string, string[]> = {
      superadmin: ['read', 'write', 'create', 'delete', 'manage', 'approve', 'export', 'override', 'configure'],
      manager: ['read', 'write', 'create', 'approve', 'export', 'manage'],
      worker: ['read', 'write', 'create'],
      buyer: ['read', 'create'],
      supplier: ['read', 'update'],
      user: ['read'],
    };
    
    return (perms[user.role] || ['read']).includes(action);
  };

  const hasPermission = (featureCode: string, action: string = 'view'): boolean => {
    if (!user) return false;
    
    if (checkIsSuperAdmin(user.role)) return true;
    
    const hasAccess = user.features[featureCode as keyof User['features']] === true;
    if (!hasAccess) return false;
    
    const perms: Record<string, string[]> = {
      superadmin: ['read', 'write', 'create', 'delete', 'manage', 'approve', 'export', 'override', 'configure', 'view'],
      manager: ['read', 'write', 'create', 'approve', 'export', 'manage', 'view'],
      worker: ['read', 'write', 'create', 'view'],
      buyer: ['read', 'create', 'view'],
      supplier: ['read', 'update', 'view'],
      user: ['read', 'view'],
    };
    
    return (perms[user.role] || ['read', 'view']).includes(action);
  };

  const refreshUserClaims = async (): Promise<void> => {
    if (firebaseUser) {
      console.log("🔄 Refreshing user claims...");
      try {
        await firebaseUser.getIdToken(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const processed = await processFirebaseUser(firebaseUser);
        if (processed) {
          setUser(processed);
        }
      } catch (error) {
        console.error("❌ Failed to refresh user claims:", error);
      }
    }
  };

  // === Fixed isSuperAdmin calculation ===
  const isSuperAdmin = user ? checkIsSuperAdmin(user.role) : false;
  const isAuthenticated = !!user && user.isActive;

  // === FIXED: Redirect path function with NUMERIC ROLE HANDLING ===
  const getRedirectPath = (role?: string): string => {
    const r = role || user?.role;
    const normalizedRole = normalizeRole(r || 'user');
    
    console.log('📍 [AuthContext] Determining redirect path for role:', { 
      rawRole: r,
      normalizedRole
    });
    
    const paths: Record<string, string> = {
      'superadmin': "/superadmin/dashboard",
      'super_admin': "/superadmin/dashboard",
      'manager': "/manager/dashboard",
      'worker': "/worker/dashboard",
      'buyer': "/buyer/dashboard",
      'supplier': "/supplier/dashboard",
      'user': "/dashboard",
    };
    
    const path = paths[normalizedRole] || "/dashboard";
    
    console.log('📍 [AuthContext] Redirect path determined:', {
      rawRole: r,
      normalizedRole,
      path
    });
    
    return path;
  };

  // === Enhanced Login with robust error handling ===
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    setIsLoggingIn(true);
    try {
      console.log('🔐 Login attempt for:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Firebase auth success, UID:', userCredential.user.uid);
      
      // Force token refresh to get latest claims
      console.log('🔄 Forcing token refresh...');
      const refreshedToken = await refreshAuthToken(userCredential.user);
      console.log('🔑 Refreshed claims:', refreshedToken.claims);
      
      const processedUser = await processFirebaseUser(userCredential.user);
      
      if (processedUser) {
        console.log('✅ Processed user details:', {
          rawRole: processedUser.role,
          normalizedRole: normalizeRole(processedUser.role),
          isSuperAdmin: checkIsSuperAdmin(processedUser.role),
          email: processedUser.email
        });
        
        setUser(processedUser);
        
        const redirectPath = getRedirectPath(processedUser.role);
        console.log('📍 Redirecting to:', redirectPath, 'for role:', processedUser.role);
        
        navigate(redirectPath, { replace: true });
        return { success: true, user: processedUser };
      }
      
      console.log('❌ Failed to process user');
      return { success: false, message: "Failed to load user data" };
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      if (error.code === 'permission-denied') {
        return { success: false, message: "Access denied by security rules" };
      }
      
      return { success: false, message: error.message || "Login failed" };
    } finally {
      setIsLoggingIn(false);
    }
  };

  // === Enhanced User Registration with better error handling ===
  const registerUser = async (name: string, email: string, password: string, role: string): Promise<RegisterResponse> => {
    try {
      console.log('🚀 Starting user registration process...');
      
      // 1. Create Firebase auth user
      console.log('📝 Creating Firebase auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Firebase user created:', firebaseUser.uid);
      
      // 2. Update profile with name
      await updateProfile(firebaseUser, { displayName: name });

      // FIXED: Use role AS-IS, no normalization during registration
      const userRole = role as User['role'];
      console.log('🎯 Using role AS-IS (NO NORMALIZATION):', userRole);
      
      // 3. Create user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        name, 
        email, 
        role: userRole, // Store the role exactly as provided
        features: {}, 
        isActive: true,
        emailVerified: false, 
        settings: { theme: "light", language: "en", notifications: true },
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp()
      };

      console.log('💾 Creating user document in Firestore...');
      await setDoc(doc(db, "users", firebaseUser.uid), userData);
      console.log('✅ User document created successfully');

      // 4. Set custom claims via cloud function (non-blocking)
      try {
        console.log('☁️ Setting custom claims via cloud function...');
        const { getFunctions } = await import('firebase/functions');
        const functions = getFunctions();
        const setUserRole = httpsCallable(functions, 'setUserRoleAndFeatures');
        
        // Don't wait for this to complete
        setUserRole({ 
          targetUserId: firebaseUser.uid, 
          role: userRole, // Use the exact role
          features: {} 
        }).then(() => {
          console.log('✅ Cloud function completed');
          // Refresh token in background
          firebaseUser.getIdToken(true).catch(() => {});
        }).catch(cloudError => {
          console.warn("⚠️ Cloud function failed:", cloudError);
        });
        
      } catch (cloudError) {
        console.warn("⚠️ Cloud function unavailable:", cloudError);
      }

      // 5. Send verification email (non-blocking)
      EmailVerificationService.sendVerificationEmail().then(verificationResult => {
        if (verificationResult.success) {
          updateDoc(doc(db, "users", firebaseUser.uid), { 
            lastVerificationSent: serverTimestamp() 
          }).catch(() => {});
        }
      }).catch(() => {});

      // 6. Process and return the user immediately
      const processedUser = await processFirebaseUser(firebaseUser);
      
      if (!processedUser) {
        // Even if processing fails, return success since user was created
        console.warn("⚠️ User created but processing failed");
        return { 
          success: true, 
          message: "User created successfully. You can now login." 
        };
      }

      console.log('🎉 User registration completed successfully');
      return {
        success: true,
        user: processedUser,
        message: 'User created successfully. Please check your email for verification.'
      };
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      if (error.code === 'permission-denied') {
        return { success: false, message: "Registration not permitted by security rules" };
      }
      
      return { success: false, message: error.message || "Registration failed" };
    }
  };

  // === Logout ===
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      navigate("/login", { replace: true });
    }
  };

  // === Session Validation ===
  const validateSession = async (): Promise<boolean> => {
    if (!firebaseUser) return false;
    try {
      await refreshAuthToken(firebaseUser);
      return true;
    } catch {
      await logout();
      return false;
    }
  };

  // === Update User Settings ===
  const updateUserSettings = async (settings: Partial<User["settings"]>) => {
    if (!user) return;
    const updated = { ...user.settings, ...settings };
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        settings: updated, 
        updatedAt: serverTimestamp() 
      });
      setUser(prev => prev ? { ...prev, settings: updated } : null);
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.error("Firebase Rules blocked settings update");
        throw new Error("Permission denied to update settings");
      } else {
        throw err;
      }
    }
  };

  // === Password Change ===
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser?.email) return { success: false, message: "Not authenticated" };
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // === Password Reset ===
  const requestPasswordReset = (email: string) => PasswordResetService.sendPasswordResetEmail(email);
  const resetPassword = (token: string, newPassword: string) => PasswordResetService.confirmPasswordReset(token, newPassword);

  // === Email Verification ===
  const sendEmailVerification = async () => {
    const result = await EmailVerificationService.sendVerificationEmail();
    if (result.success && user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { 
          lastVerificationSent: serverTimestamp() 
        });
        setUser(prev => prev ? { ...prev, lastVerificationSent: new Date() } : null);
      } catch (err: any) {
        console.error("Failed to update verification timestamp:", err);
      }
    }
    return result;
  };

  const resendVerificationEmail = async () => {
    const lastSent = user?.lastVerificationSent ? new Date(user.lastVerificationSent).getTime() : undefined;
    const result = await EmailVerificationService.resendVerificationEmail(lastSent);
    if (result.success && user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { 
          lastVerificationSent: serverTimestamp() 
        });
        setUser(prev => prev ? { ...prev, lastVerificationSent: new Date() } : null);
      } catch (err: any) {
        console.error("Failed to update verification timestamp:", err);
      }
    }
    return result;
  };

  const checkEmailVerification = () => EmailVerificationService.isEmailVerified();

  // === Reload User ===
  const reloadUser = async () => {
    if (!firebaseUser) return;
    await firebaseUser.reload();
    const processed = await processFirebaseUser(firebaseUser);
    if (processed) setUser(processed);
  };

  // === Optimized Auth State Listener ===
  useEffect(() => {
    console.log("Setting up Firebase Auth listener...");

    let unsubscribe = () => {};
    let mounted = true;

    const initializeAuthListener = async () => {
      try {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mounted) return;
          
          setFirebaseUser(firebaseUser);

          if (firebaseUser) {
            try {
              const processedUser = await processFirebaseUser(firebaseUser);
              if (processedUser) {
                setUser(processedUser);
              } else {
                console.warn("❌ Failed to process user in auth listener");
                setUser(null);
              }
            } catch (error) {
              console.error("❌ Error in auth state change:", error);
              setUser(null);
            }
          } else {
            setUser(null);
          }

          setLoading(false);
          setInitialized(true);
        });
      } catch (error) {
        console.error("Failed to initialize auth listener:", error);
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuthListener();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // === Firestore Sync Status ===
  useEffect(() => {
    let unsubscribe = () => {};
    
    const setupSyncListener = async () => {
      try {
        unsubscribe = onSnapshotsInSync(db, () => {
          console.log("Firestore: All snapshots in sync");
        });
      } catch (error) {
        console.error("Failed to setup sync listener:", error);
      }
    };

    setupSyncListener();
    
    return () => unsubscribe();
  }, []);

  // === Context Value ===
  const value: AuthContextProps = {
    user,
    firebaseUser,
    loading,
    initialized,
    isAuthenticated,
    isLoggingIn,
    isSuperAdmin,
    role: user?.role || null,
    isOnline,
    authReady,
    login,
    registerUser,
    logout,
    validateSession,
    updateUserSettings,
    changePassword,
    requestPasswordReset,
    resetPassword,
    sendEmailVerification,
    resendVerificationEmail,
    checkEmailVerification,
    reloadUser,
    hasRole,
    hasAnyRole,
    hasFeature,
    canPerform,
    hasPermission,
    refreshUserClaims,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
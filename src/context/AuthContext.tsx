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
import { getAuth, getFirestore } from "../firebase/config";
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
  debugLogin: (email: string, password: string) => Promise<any>;
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
      console.log("🚀 Initializing Firebase services in background...");
      await Promise.all([
        getAuth(),
        getFirestore()
      ]);
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
      const db = await getFirestore();
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

  // === Enhanced Role normalization function ===
  const normalizeRole = (role: string): string => {
    if (!role) return 'user';
    
    const normalized = role.toLowerCase().trim();
    
    // Handle all super admin variations
    if (normalized === 'superadmin' || normalized === 'super_admin' || normalized === 'super-admin' || normalized === 'super admin') {
      return 'superadmin';
    }
    
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
      
      const db = await getFirestore();
      
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
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

  // === Debug login function ===
  const debugLogin = async (email: string, password: string) => {
    console.log('=== DEBUG LOGIN START ===');
    console.log('Email:', email);
    
    try {
      const auth = await getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase Auth Success - User UID:', user.uid);
      
      // Get token without refresh first
      const idToken1 = await user.getIdTokenResult(false);
      console.log('🔑 Claims WITHOUT refresh:', idToken1.claims);
      console.log('📅 Token issued:', new Date(idToken1.issuedAtTime).toLocaleString());
      
      // Get token with refresh
      const idToken2 = await user.getIdTokenResult(true);
      console.log('🔑 Claims WITH refresh:', idToken2.claims);
      console.log('📅 Token issued:', new Date(idToken2.issuedAtTime).toLocaleString());
      
      // Check Firestore user data
      try {
        const db = await getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          console.log('📋 Firestore user data:', userDoc.data());
        } else {
          console.log('❌ No Firestore user document found');
        }
      } catch (firestoreError) {
        console.error('❌ Firestore error:', firestoreError);
      }
      
      console.log('=== DEBUG LOGIN END ===');
      
      return { success: true, claims: idToken2.claims };
    } catch (error: any) {
      console.error('❌ Debug login error:', error);
      return { success: false, error: error.message };
    }
  };

  // === Process Firebase user ===
  const processFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      console.log("🔄 Processing Firebase user:", firebaseUser.uid);

      let customClaims: any = {};
      let claimsRecovered = false;
      
      try {
        const idTokenResult = await refreshAuthToken(firebaseUser);
        customClaims = idTokenResult.claims;
        console.log("🔑 Custom claims from token:", customClaims);
      } catch (err) {
        console.error("❌ Failed to refresh token:", err);
        return null;
      }

      // If no role claim found, try to recover from Firestore
      if (!customClaims.role || customClaims.role === 'undefined') {
        console.warn("⚠️ No valid role claim found in token, attempting recovery...");
        const recoveredClaims = await handleMissingClaims(firebaseUser);
        
        if (recoveredClaims) {
          customClaims = recoveredClaims;
          claimsRecovered = true;
        } else {
          console.error("❌ Cannot proceed without role claims");
          return null;
        }
      }

      const db = await getFirestore();
      
      let userData: any = {};
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
        } else {
          await initializeUserDocument(firebaseUser, customClaims);
        }
      } catch (err: any) {
        console.error("Firestore access error:", err);
        if (err.code === 'permission-denied') {
          console.error("Firebase Rules blocked access");
          if (customClaims.role) {
            console.log("Proceeding with claims-only data");
            userData = {};
          } else {
            throw new Error("Access denied by security rules");
          }
        } else if (err.code === 'unavailable') {
          console.warn("Firestore offline: Using cached data");
          const cachedSnap = await getDoc(doc(db, "users", firebaseUser.uid)).catch(() => null);
          if (cachedSnap?.exists()) {
            userData = cachedSnap.data();
          }
        } else {
          console.error("Firestore error:", err);
        }
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
        createdAt: userData.createdAt || serverTimestamp(),
        updatedAt: userData.updatedAt || serverTimestamp(),
        lastVerificationSent: userData.lastVerificationSent || null,
        settings: userData.settings || { theme: "light", language: "en", notifications: true },
      };

      if ((!userData.role || userData.role !== role || !userData.uid) && !claimsRecovered) {
        console.log("Syncing user document with latest role:", role);
        await syncUserDocument(firebaseUser.uid, processedUser);
      }

      console.log("✅ User processed successfully - Role:", role, "Is SuperAdmin:", checkIsSuperAdmin(role));
      return processedUser;
    } catch (error) {
      console.error('❌ Error processing user:', error);
      return null;
    }
  };

  // === Initialize user document ===
  const initializeUserDocument = async (firebaseUser: FirebaseUser, customClaims: any) => {
    try {
      const db = await getFirestore();
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
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error("Firebase Rules blocked user document creation");
      } else if (error.code !== 'unavailable') {
        console.error("Failed to create user document:", error);
      }
    }
  };

  // === Sync user document ===
  const syncUserDocument = async (userId: string, userData: User) => {
    try {
      const db = await getFirestore();
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
      } else if (error.code !== 'unavailable') {
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

  const getRedirectPath = (role?: string): string => {
    const r = role || user?.role;
    const paths: Record<string, string> = {
      superadmin: "/superadmin/dashboard",
      super_admin: "/superadmin/dashboard",
      manager: "/manager/dashboard",
      worker: "/worker/dashboard",
      buyer: "/buyer/dashboard",
      supplier: "/supplier/dashboard",
    };
    return paths[r || ''] || "/dashboard";
  };

  // === Enhanced Login with detailed logging ===
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    setIsLoggingIn(true);
    try {
      console.log('🔐 Login attempt for:', email);
      
      const auth = await getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Firebase auth success, UID:', userCredential.user.uid);
      
      // Get initial claims
      const initialToken = await userCredential.user.getIdTokenResult(false);
      console.log('🔑 Initial claims:', initialToken.claims);
      
      // Force token refresh to get latest claims
      console.log('🔄 Forcing token refresh...');
      const refreshedToken = await refreshAuthToken(userCredential.user);
      console.log('🔑 Refreshed claims:', refreshedToken.claims);
      
      const processedUser = await processFirebaseUser(userCredential.user);
      
      if (processedUser) {
        console.log('✅ Processed user role:', processedUser.role);
        console.log('✅ Is superadmin?', checkIsSuperAdmin(processedUser.role));
        
        setUser(processedUser);
        
        const redirectPath = getRedirectPath(processedUser.role);
        console.log('📍 Redirecting to:', redirectPath);
        
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

  // === Register with Firebase Rules compliance ===
  const registerUser = async (name: string, email: string, password: string, role: string): Promise<RegisterResponse> => {
    try {
      const auth = await getAuth();
      const db = await getFirestore();
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: name });

      const normalizedRole = normalizeRole(role) as User['role'];
      
      const userData = {
        uid: firebaseUser.uid,
        name, 
        email, 
        role: normalizedRole, 
        features: {}, 
        isActive: true,
        emailVerified: false, 
        settings: { theme: "light", language: "en", notifications: true },
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);

      try {
        const { getFunctions } = await import('firebase/functions');
        const functions = getFunctions();
        const setUserRole = httpsCallable(functions, 'setUserRoleAndFeatures');
        
        await setUserRole({ 
          targetUserId: firebaseUser.uid, 
          role: normalizedRole, 
          features: {} 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        await firebaseUser.getIdToken(true);
        
      } catch (err) {
        console.warn("Cloud function unavailable - claims may not be set immediately:", err);
      }

      const verificationResult = await EmailVerificationService.sendVerificationEmail();
      if (verificationResult.success) {
        await updateDoc(doc(db, "users", firebaseUser.uid), { 
          lastVerificationSent: serverTimestamp() 
        });
      }

      const processedUser = await processFirebaseUser(firebaseUser);
      
      if (!processedUser) {
        return { 
          success: false, 
          message: "User created but failed to load user data. Please refresh the page." 
        };
      }

      return {
        success: true,
        user: processedUser,
        message: verificationResult.success
          ? 'Please check your email for verification.'
          : 'Registered, but verification email failed.'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'permission-denied') {
        return { success: false, message: "Registration not permitted by security rules" };
      }
      
      return { success: false, message: error.message || "Registration failed" };
    }
  };

  // === Logout ===
  const logout = async (): Promise<void> => {
    try {
      const auth = await getAuth();
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
      const db = await getFirestore();
      await updateDoc(doc(db, "users", user.uid), { 
        settings: updated, 
        updatedAt: serverTimestamp() 
      });
      setUser(prev => prev ? { ...prev, settings: updated } : null);
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.error("Firebase Rules blocked settings update");
        throw new Error("Permission denied to update settings");
      } else if (err.code !== 'unavailable') {
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
        const db = await getFirestore();
        await updateDoc(doc(db, "users", user.uid), { 
          lastVerificationSent: serverTimestamp() 
        });
        setUser(prev => prev ? { ...prev, lastVerificationSent: new Date() } : null);
      } catch (err: any) {
        if (err.code !== 'unavailable') console.error(err);
      }
    }
    return result;
  };

  const resendVerificationEmail = async () => {
    const lastSent = user?.lastVerificationSent ? new Date(user.lastVerificationSent).getTime() : undefined;
    const result = await EmailVerificationService.resendVerificationEmail(lastSent);
    if (result.success && user) {
      try {
        const db = await getFirestore();
        await updateDoc(doc(db, "users", user.uid), { 
          lastVerificationSent: serverTimestamp() 
        });
        setUser(prev => prev ? { ...prev, lastVerificationSent: new Date() } : null);
      } catch (err: any) {
        if (err.code !== 'unavailable') console.error(err);
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
        const auth = await getAuth();
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mounted) return;
          
          setFirebaseUser(firebaseUser);

          if (firebaseUser) {
            try {
              const processedUser = await processFirebaseUser(firebaseUser);
              if (processedUser) {
                setUser(processedUser);
              } else {
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
        const db = await getFirestore();
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
    debugLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
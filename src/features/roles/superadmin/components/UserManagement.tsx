import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  X,
  Check,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  RotateCcw,
  Calendar,
  Shield,
  RefreshCw,
  Filter,
  Download,
  MoreVertical,
  Star,
  Crown,
  Settings,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { app } from '@/services/firebase';

// Types - Updated to match actual Firestore structure from your AuthContext
interface User {
  id: string;
  uid: string;
  email: string | null;
  name: string;
  role: 'superadmin' | 'super_admin' | 'manager' | 'worker' | 'supplier' | 'buyer' | 'user';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: any;
  updatedAt: any;
  lastVerificationSent?: any;
  features?: {
    userManagement?: boolean;
    systemConfig?: boolean;
    auditLogs?: boolean;
    backupRestore?: boolean;
    roleManagement?: boolean;
    inventoryManagement?: boolean;
    reports?: boolean;
    approvals?: boolean;
  };
  settings?: {
    theme: string;
    language: string;
    notifications: boolean;
  };
  // Additional fields that might exist
  username?: string;
  full_name?: string;
  is_locked?: boolean;
  last_login?: any;
  mfa_enabled?: boolean;
  failed_login_attempts?: number;
  lockout_until?: any;
}

interface UserDetails {
  id: string;
  uid: string;
  email: string | null;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: any;
  updatedAt: any;
  features?: any;
  settings?: any;
  last_login?: any;
  mfa_enabled?: boolean;
  failed_login_attempts?: number;
  is_locked?: boolean;
  lockout_until?: any;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  security_level: number;
  is_system_role: boolean;
  max_session_hours?: number;
  password_policy?: string;
  mfa_required?: boolean;
  is_active?: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  password?: string;
}

interface Pagination {
  totalPages: number;
  currentPage: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterState {
  role: string;
  status: 'all' | 'active' | 'inactive';
  lockStatus: 'all' | 'locked' | 'unlocked';
}

// Constants - Updated to match your actual role names
const DEFAULT_ROLES: Role[] = [
  { 
    id: 'superadmin', 
    name: 'superadmin', 
    description: 'System administrator with full access', 
    security_level: 10, 
    is_system_role: true,
    is_active: true
  },
  { 
    id: 'manager', 
    name: 'manager', 
    description: 'Manager with elevated permissions', 
    security_level: 8, 
    is_system_role: false,
    is_active: true
  },
  { 
    id: 'worker', 
    name: 'worker', 
    description: 'Regular worker', 
    security_level: 5, 
    is_system_role: false,
    is_active: true
  },
  { 
    id: 'buyer', 
    name: 'buyer', 
    description: 'Buyer role', 
    security_level: 3, 
    is_system_role: false,
    is_active: true
  },
  { 
    id: 'supplier', 
    name: 'supplier', 
    description: 'Supplier role', 
    security_level: 3, 
    is_system_role: false,
    is_active: true
  }
];

// Firebase instances
const auth = getAuth(app);
const db = getFirestore(app);

// Utility functions
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const validateEmail = (email: string): boolean => 
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email);

const validatePassword = (password: string): boolean => 
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*]{8,}$/.test(password);

const validateFullName = (name: string): boolean => 
  /^[a-zA-Z\u0600-\u06FF\s]{2,50}$/.test(name.replace(/[\n\r\t"]/g, ""));

const getRoleDisplayName = (roleName: string): string => {
  const map: { [key: string]: string } = {
    'superadmin': "مشرف عام",
    'super_admin': "مشرف عام",
    'manager': "مدير",
    'worker': "عامل",
    'buyer': "مشتري",
    'supplier': "مورد",
    'user': "مستخدم"
  };
  return map[roleName] || roleName;
};

const formatDate = (date: any): string => {
  if (!date) return 'لم يسجل دخول';
  try {
    // Handle Firestore timestamps
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return 'تاريخ غير صالح';
  }
};

// Firebase User Management Service
class UserManagementService {
  private static instance: UserManagementService;

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  // Initialize default roles in Firestore
  async initializeDefaultRoles(): Promise<void> {
    try {
      const rolesRef = collection(db, 'roles');
      const snapshot = await getDocs(rolesRef);
      
      if (snapshot.empty) {
        const batch = writeBatch(db);
        DEFAULT_ROLES.forEach(role => {
          const roleRef = doc(rolesRef, role.id);
          batch.set(roleRef, role);
        });
        await batch.commit();
        console.log('Default roles initialized in Firestore');
      }
    } catch (error) {
      console.error('Error initializing default roles:', error);
    }
  }

  // Get roles from Firestore
  async getRoles(): Promise<Role[]> {
    try {
      await this.initializeDefaultRoles();
      
      const rolesRef = collection(db, 'roles');
      const q = query(rolesRef, where('is_active', '==', true));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.warn('No roles found in Firestore, using default roles');
        return DEFAULT_ROLES;
      }

      const rolesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Role[];

      return rolesData.sort((a, b) => a.security_level - b.security_level);
    } catch (error) {
      console.error('Error getting roles:', error);
      return DEFAULT_ROLES;
    }
  }

  // Get users from Firestore - FIXED to match actual data structure
  async getUsers(params: any): Promise<{ users: User[]; pagination: Pagination }> {
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef);
      
      console.log('🔍 Fetching users from Firestore with params:', params);

      // Apply filters - using the actual field names from your AuthContext
      if (params.role && params.role !== 'all') {
        q = query(q, where('role', '==', params.role));
      }
      if (params.isActive !== undefined) {
        q = query(q, where('isActive', '==', params.isActive));
      }
      if (params.is_locked !== undefined) {
        q = query(q, where('is_locked', '==', params.is_locked));
      }
      
      // Order by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      console.log('📊 Firestore query result:', snapshot.size, 'users found');
      
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('👤 User data:', data);
        return {
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email,
          name: data.name || data.full_name || data.email?.split('@')[0] || 'User',
          role: data.role || 'user',
          isActive: data.isActive !== false,
          emailVerified: data.emailVerified || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          features: data.features || {},
          settings: data.settings || {},
          is_locked: data.is_locked || false,
          last_login: data.last_login,
          mfa_enabled: data.mfa_enabled || false,
          failed_login_attempts: data.failed_login_attempts || 0,
          lockout_until: data.lockout_until
        } as User;
      });

      console.log('✅ Processed users:', usersData);

      // Simple pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = usersData.slice(startIndex, endIndex);
      
      return {
        users: paginatedUsers,
        pagination: {
          totalPages: Math.ceil(usersData.length / limit),
          currentPage: page,
          totalItems: usersData.length,
          hasNext: endIndex < usersData.length,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      console.error('❌ Error getting users:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Check your Firebase rules and user claims');
      }
      throw new Error('فشل جلب المستخدمين: ' + error.message);
    }
  }

  // Get user details from Firestore
  async getUserDetails(userId: string): Promise<{ user: UserDetails }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userDetails: UserDetails = {
          id: userDoc.id,
          uid: data.uid || userDoc.id,
          email: data.email,
          name: data.name || data.full_name || data.email?.split('@')[0] || 'User',
          role: data.role || 'user',
          isActive: data.isActive !== false,
          emailVerified: data.emailVerified || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          features: data.features || {},
          settings: data.settings || {},
          last_login: data.last_login,
          mfa_enabled: data.mfa_enabled || false,
          failed_login_attempts: data.failed_login_attempts || 0,
          is_locked: data.is_locked || false,
          lockout_until: data.lockout_until
        };
        return { user: userDetails };
      } else {
        throw new Error('User not found');
      }
    } catch (error: any) {
      console.error('Error getting user details:', error);
      throw new Error('فشل جلب تفاصيل المستخدم: ' + error.message);
    }
  }

  // Create user with Firebase Auth and Firestore - FIXED to match your AuthContext structure
  async createUser(userData: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { email, password, name, role } = userData;
      
      console.log('🔄 Creating user with data:', { email, name, role });

      // Validate role exists
      const roles = await this.getRoles();
      const roleObj = roles.find(r => r.id === role);
      if (!roleObj) {
        throw new Error('الدور المحدد غير موجود');
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile
      await updateProfile(user, {
        displayName: name
      });
      
      // Create user document in Firestore - matching your AuthContext structure
      const userDoc = {
        uid: user.uid,
        email: email,
        name: name,
        role: role,
        isActive: true,
        emailVerified: false,
        features: {},
        settings: { theme: "light", language: "en", notifications: true },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        is_locked: false,
        mfa_enabled: false,
        failed_login_attempts: 0
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      console.log('✅ User document created in Firestore');
      
      // Send email verification
      await sendEmailVerification(user);
      
      return { 
        success: true, 
        message: 'تم إنشاء المستخدم بنجاح',
        data: { id: user.uid, ...userDoc }
      };
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  // Update user in Firestore
  async updateUser(userId: string, userData: any): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'تم تحديث المستخدم بنجاح' };
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw new Error('فشل تحديث المستخدم: ' + error.message);
    }
  }

  // Update user role
  async updateUserRole(userId: string, roleData: { role: string }): Promise<{ success: boolean; message: string }> {
    try {
      const roles = await this.getRoles();
      const role = roles.find(r => r.id === roleData.role);
      if (!role) throw new Error('الدور غير موجود');
      
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        role: roleData.role,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'تم تحديث الدور بنجاح' };
    } catch (error: any) {
      console.error('Error updating user role:', error);
      throw new Error('فشل تحديث الدور: ' + error.message);
    }
  }

  // Activate user
  async activateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        isActive: true,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'تم تفعيل المستخدم بنجاح' };
    } catch (error: any) {
      console.error('Error activating user:', error);
      throw new Error('فشل تفعيل المستخدم: ' + error.message);
    }
  }

  // Deactivate user
  async deactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'تم تعطيل المستخدم بنجاح' };
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      throw new Error('فشل تعطيل المستخدم: ' + error.message);
    }
  }

  // Lock user
  async lockUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        is_locked: true,
        lockout_until: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'تم قفل المستخدم بنجاح' };
    } catch (error: any) {
      console.error('Error locking user:', error);
      throw new Error('فشل قفل المستخدم: ' + error.message);
    }
  }

  // Unlock user
  async unlockUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        is_locked: false,
        lockout_until: null,
        failed_login_attempts: 0,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, message: 'تم فتح المستخدم بنجاح' };
    } catch (error: any) {
      console.error('Error unlocking user:', error);
      throw new Error('فشل فتح المستخدم: ' + error.message);
    }
  }
}

// Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white dark:bg-gray-800 rounded-2xl w-full ${sizeClasses[size]} shadow-xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700`}
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Loading Spinner
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({ size = 'md', text = 'جار التحميل...' }) => {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} role="status" aria-label="جار التحميل"></div>
      {text && <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{text}</p>}
    </div>
  );
};

// Status Badge
const StatusBadge: React.FC<{ status: 'active' | 'inactive' | 'locked' | 'unlocked' | 'mfa' | 'verified'; text: string }> = ({ status, text }) => {
  const config = {
    active: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    inactive: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
    locked: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    unlocked: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
    mfa: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
    verified: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' }
  }[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {text}
    </span>
  );
};

// Role Badge
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const config = {
    superadmin: { bg: 'bg-gradient-to-r from-rose-500 to-pink-600', icon: Crown },
    super_admin: { bg: 'bg-gradient-to-r from-rose-500 to-pink-600', icon: Crown },
    manager: { bg: 'bg-gradient-to-r from-amber-500 to-orange-600', icon: Star },
    worker: { bg: 'bg-gradient-to-r from-emerald-500 to-green-600', icon: UserCheck },
    buyer: { bg: 'bg-gradient-to-r from-purple-500 to-indigo-600', icon: null },
    supplier: { bg: 'bg-gradient-to-r from-teal-500 to-emerald-600', icon: null },
    user: { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', icon: null }
  }[role] || { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', icon: null };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1 space-x-reverse px-3 py-1.5 rounded-full text-xs font-semibold text-white ${config.bg} shadow-sm`}>
      {Icon && <Icon className="h-3 w-3" />}
      <span>{getRoleDisplayName(role)}</span>
    </span>
  );
};

// User Avatar
const UserAvatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg'; src?: string; className?: string }> = ({ name, size = 'md', src, className = '' }) => {
  const sizes = { sm: 'h-8 w-8 text-sm', md: 'h-10 w-10 text-base', lg: 'h-16 w-16 text-xl' };
  const gradient = "bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500";

  if (src) return <img src={src} alt={name} className={`rounded-full object-cover ${sizes[size]} ${className} border-2 border-white dark:border-gray-800 shadow-sm`} />;
  
  return (
    <div className={`rounded-full flex items-center justify-center text-white font-semibold ${sizes[size]} ${gradient} ${className} border-2 border-white dark:border-gray-800 shadow-sm`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pagination, setPagination] = useState<Pagination>({ totalPages: 1, currentPage: 1, totalItems: 0, hasNext: false, hasPrev: false });
  const [filters, setFilters] = useState<FilterState>({ role: 'all', status: 'all', lockStatus: 'all' });
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>();

  // Service instance
  const userService = useMemo(() => UserManagementService.getInstance(), []);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      const rolesData = await userService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('فشل تحميل الأدوار');
      setRoles(DEFAULT_ROLES);
    }
  }, [userService]);

  // Load users with debouncing
  const loadUsers = useCallback(
    debounce(async (page: number, search: string, filters: FilterState) => {
      setLoading(true);
      setError(null);
      try {
        const params: any = { page, limit: 10 };
        if (search) params.search = search;
        if (filters.role !== 'all') params.role = filters.role;
        if (filters.status !== 'all') params.isActive = filters.status === 'active';
        if (filters.lockStatus !== 'all') params.is_locked = filters.lockStatus === 'locked';

        const result = await userService.getUsers(params);
        
        setUsers(result.users || []);
        setPagination(result.pagination || { totalPages: 1, currentPage: 1, totalItems: 0, hasNext: false, hasPrev: false });
        setSelectedUsers([]);
      } catch (error: any) {
        console.error('Error loading users:', error);
        const errorMessage = error.message || 'فشل جلب المستخدمين';
        setError(errorMessage);
        toast.error(errorMessage);
        setUsers([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }, 500),
    [userService]
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRoles();
    loadUsers(1, searchTerm, filters);
  };

  // Initial load
  useEffect(() => {
    fetchRoles();
    loadUsers(1, '', filters);
  }, [fetchRoles, loadUsers, filters]);

  // Handle search term changes
  useEffect(() => {
    loadUsers(1, searchTerm, filters);
  }, [searchTerm, filters, loadUsers]);

  // Create user
  const handleCreateUser = async (formData: UserFormData) => {
    const { name, email, password, role } = formData;
    setFormError("");
    setFormSuccess("");

    if (!name || !email || !password || !role) {
      setFormError("يرجى تعبئة جميع الحقول");
      return;
    }

    if (!validateFullName(name)) {
      setFormError("الاسم يجب أن يكون بين 2 و50 حرفًا ويحتوي على أحرف عربية أو إنجليزية فقط");
      return;
    }

    if (!validateEmail(email)) {
      setFormError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }

    if (!validatePassword(password)) {
      setFormError("كلمة المرور يجب أن تكون 8 أحرف على الأقل، وتحتوي على حرف كبير، حرف صغير، ورقم على الأقل");
      return;
    }

    try {
      setFormLoading(true);

      const userData = {
        email,
        password,
        name,
        role: role,
        isActive: true
      };

      const result = await userService.createUser(userData);
      
      if (result.success) {
        const successMessage = `تم إنشاء حساب ${getRoleDisplayName(role)} بنجاح`;
        setFormSuccess(successMessage);
        toast.success(successMessage);
        
        setTimeout(() => {
          setIsAddModalOpen(false);
          handleClearForm();
          loadUsers(1, searchTerm, filters);
        }, 2000);
      } else {
        throw new Error(result.message || "فشل في إنشاء الحساب");
      }
    } catch (err: any) {
      console.error("Create user error:", err);
      let errorMessage = "حدث خطأ أثناء إنشاء المستخدم. يرجى المحاولة مرة أخرى";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "البريد الإلكتروني مستخدم بالفعل";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "صيغة البريد الإلكتروني غير صحيحة";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "كلمة المرور ضعيفة جداً";
      } else if (err.message?.includes("الدور المحدد غير موجود")) {
        errorMessage = "الدور المحدد غير موجود";
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleClearForm = () => {
    reset();
    setFormError("");
    setFormSuccess("");
    setShowPassword(false);
  };

  const handleViewUserDetails = async (userId: string) => {
    try {
      setUserDetailsLoading(true);
      const result = await userService.getUserDetails(userId);
      if (result.user) {
        setViewingUser(result.user);
        setIsViewModalOpen(true);
      } else {
        throw new Error('لا توجد بيانات');
      }
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      toast.error(error.message || 'فشل جلب تفاصيل المستخدم');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!window.confirm(`هل أنت متأكد من ${isActive ? 'تعطيل' : 'تفعيل'} هذا المستخدم؟`)) return;
    
    try {
      const result = isActive ? 
        await userService.deactivateUser(userId) : 
        await userService.activateUser(userId);
      
      if (result.success) {
        toast.success(result.message);
        loadUsers(pagination.currentPage, searchTerm, filters);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error(error.message);
    }
  };

  const handleBulkToggleStatus = async (activate: boolean) => {
    if (selectedUsers.length === 0) return toast.error('يرجى تحديد مستخدم واحد على الأقل');
    if (!window.confirm(`هل أنت متأكد من ${activate ? 'تفعيل' : 'تعطيل'} ${selectedUsers.length} مستخدم؟`)) return;
    
    try {
      const promises = selectedUsers.map(id => 
        activate ? userService.activateUser(id) : userService.deactivateUser(id)
      );
      const results = await Promise.all(promises);
      const successes = results.filter(r => r.success).length;
      
      if (successes === selectedUsers.length) {
        toast.success(`${activate ? 'تفعيل' : 'تعطيل'} ${successes} مستخدم بنجاح`);
      } else {
        toast.error(`تم ${activate ? 'تفعيل' : 'تعطيل'} ${successes} من ${selectedUsers.length} مستخدم`);
      }
      
      loadUsers(pagination.currentPage, searchTerm, filters);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error in bulk toggle status:', error);
      toast.error(`فشل ${activate ? 'تفعيل' : 'تعطيل'} المستخدمين`);
    }
  };

  const handleToggleUserLock = async (userId: string, isLocked: boolean) => {
    if (!window.confirm(`هل أنت متأكد من ${isLocked ? 'فتح' : 'قفل'} هذا المستخدم؟`)) return;
    
    try {
      const result = isLocked ? 
        await userService.unlockUser(userId) : 
        await userService.lockUser(userId);
      
      if (result.success) {
        toast.success(result.message);
        loadUsers(pagination.currentPage, searchTerm, filters);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error toggling user lock:', error);
      toast.error(error.message);
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    
    try {
      const updateData = {
        name: data.name,
        email: data.email,
        role: data.role
      };
      
      const result = await userService.updateUser(editingUser.id, updateData);
      if (result.success) {
        toast.success(result.message);
        setIsEditModalOpen(false);
        setEditingUser(null);
        reset();
        loadUsers(pagination.currentPage, searchTerm, filters);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      const result = await userService.updateUserRole(userId, { role });
      if (result.success) {
        toast.success(result.message);
        loadUsers(pagination.currentPage, searchTerm, filters);
        if (isViewModalOpen && viewingUser?.id === userId) {
          const updated = await userService.getUserDetails(userId);
          if (updated.user) setViewingUser(updated.user);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message);
    }
  };

  const handleResetPassword = async (userId: string) => {
    toast.info('سيتم إرسال رابط إعادة تعيين كلمة المرور إلى المستخدم');
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    toast.error('خاصية الحذف غير متاحة حالياً');
  };

  const handleExportToCSV = () => {
    const headers = ['ID', 'UUID', 'Name', 'Email', 'Role', 'Status', 'Locked', 'Last Login', 'Created At', 'Updated At'];
    const rows = users.map(u => [
      u.id, u.uid, `"${u.name}"`, u.email, u.role,
      u.isActive ? 'Active' : 'Inactive', u.is_locked ? 'Locked' : 'Unlocked',
      u.last_login || 'Never', u.createdAt, u.updatedAt
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير المستخدمين بنجاح');
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(selectedUsers.length === users.length ? [] : users.map(u => u.id));
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleClearFilters = () => {
    setFilters({ role: 'all', status: 'all', lockStatus: 'all' });
  };

  const filteredUsers = useMemo(() => users, [users]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const locked = users.filter(u => u.is_locked).length;
    const mfaEnabled = users.filter(u => u.mfa_enabled).length;
    return { total, active, locked, mfaEnabled };
  }, [users]);

  const availableRoles = useMemo(() => 
    roles.filter(role => role.is_active !== false), 
    [roles]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans" dir="rtl">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-l from-blue-600 to-purple-600 bg-clip-text text-transparent">
                إدارة المستخدمين
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">إدارة وتعديل مستخدمي النظام - صلاحيات المدير العام</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 space-x-reverse">
            <button onClick={handleRefresh} disabled={isRefreshing} className="px-6 py-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 border border-gray-200 dark:border-gray-700 flex items-center justify-center space-x-2 space-x-reverse shadow-sm" aria-label="تحديث البيانات">
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
            
            <div className="flex space-x-2 space-x-reverse">
              <button onClick={handleExportToCSV} className="px-6 py-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 border border-gray-200 dark:border-gray-700 flex items-center space-x-2 space-x-reverse shadow-sm" aria-label="تصدير المستخدمين">
                <Download className="h-5 w-5" />
                <span>تصدير</span>
              </button>
              
              <button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-l from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center space-x-2 space-x-reverse transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-lg hover:shadow-xl" aria-label="إضافة مستخدم جديد">
                <Plus className="h-5 w-5" />
                <span>مستخدم جديد</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">إجمالي المستخدمين</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">نشط</p>
                <p className="text-3xl font-bold mt-1">{stats.active}</p>
              </div>
              <Activity className="h-10 w-10 text-emerald-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">مقفل</p>
                <p className="text-3xl font-bold mt-1">{stats.locked}</p>
              </div>
              <Lock className="h-10 w-10 text-amber-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm">مفعل MFA</p>
                <p className="text-3xl font-bold mt-1">{stats.mfaEnabled}</p>
              </div>
              <Shield className="h-10 w-10 text-violet-200" />
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث بالاسم، البريد، أو المعرف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button onClick={handleClearSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all flex items-center space-x-2 space-x-reverse"
              >
                <Filter className="h-5 w-5" />
                <span>تصفية</span>
                {(filters.role !== 'all' || filters.status !== 'all' || filters.lockStatus !== 'all') && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>
                )}
              </button>
              
              {(filters.role !== 'all' || filters.status !== 'all' || filters.lockStatus !== 'all') && (
                <button onClick={handleClearFilters} className="px-4 py-3 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-all">
                  <RotateCcw className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور</label>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع الأدوار</option>
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.name}>{getRoleDisplayName(role.name)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">حالة القفل</label>
                  <select
                    value={filters.lockStatus}
                    onChange={(e) => setFilters({ ...filters, lockStatus: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="locked">مقفل</option>
                    <option value="unlocked">مفتوح</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center space-x-3 space-x-reverse">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <p className="text-rose-800 dark:text-rose-300">{error}</p>
          </motion.div>
        )}

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-blue-800 dark:text-blue-300 font-medium">
              تم تحديد {selectedUsers.length} مستخدم
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkToggleStatus(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>تفعيل</span>
              </button>
              <button
                onClick={() => handleBulkToggleStatus(false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>تعطيل</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Users Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-12">
              <LoadingSpinner text="جارٍ تحميل المستخدمين..." />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">لا يوجد مستخدمون</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">المستخدم</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">البريد</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الدور</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">آخر دخول</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <UserAvatar name={user.name} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.email}</td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2 space-x-reverse">
                          <StatusBadge status={user.isActive ? 'active' : 'inactive'} text={user.isActive ? 'نشط' : 'معطل'} />
                          {user.is_locked && <StatusBadge status="locked" text="مقفل" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.last_login)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleViewUserDetails(user.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            aria-label="عرض التفاصيل"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                            aria-label="تعديل"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            className={`p-2 ${user.isActive ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'} rounded-lg transition-colors`}
                            aria-label={user.isActive ? 'تعطيل' : 'تفعيل'}
                          >
                            {user.isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                          </button>
                          
                          <button
                            onClick={() => handleToggleUserLock(user.id, user.is_locked)}
                            className={`p-2 ${user.is_locked ? 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'} rounded-lg transition-colors`}
                            aria-label={user.is_locked ? 'فتح' : 'قفل'}
                          >
                            {user.is_locked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            aria-label="حذف"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  عرض {((pagination.currentPage - 1) * 10) + 1} إلى {Math.min(pagination.currentPage * 10, pagination.totalItems)} من {pagination.totalItems} نتيجة
                </p>
                <div className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => loadUsers(pagination.currentPage - 1, searchTerm, filters)}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => loadUsers(pagination.currentPage + 1, searchTerm, filters)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Add User Modal */}
        <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); handleClearForm(); }} title="إضافة مستخدم جديد" size="md">
          <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-6 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم الكامل</label>
                <input
                  {...register('name', { required: true })}
                  type="text"
                  placeholder="أدخل الاسم الكامل"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && <p className="text-rose-600 text-sm mt-1">هذا الحقل مطلوب</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني</label>
                <input
                  {...register('email', { required: true })}
                  type="email"
                  placeholder="example@domain.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.email && <p className="text-rose-600 text-sm mt-1">هذا الحقل مطلوب</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور</label>
                <select
                  {...register('role', { required: true })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر الدور</option>
                  {availableRoles
                    .filter(role => role.name !== 'superadmin') // Filter out superadmin for security
                    .map(role => (
                      <option key={role.id} value={role.id}>
                        {getRoleDisplayName(role.name)} - {role.description}
                      </option>
                    ))
                  }
                </select>
                {errors.role && <p className="text-rose-600 text-sm mt-1">هذا الحقل مطلوب</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">كلمة المرور</label>
                <div className="relative">
                  <input
                    {...register('password', { required: true })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-rose-600 text-sm mt-1">هذا الحقل مطلوب</p>}
                <p className="text-xs text-gray-500 mt-1">كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير، صغير، ورقم</p>
              </div>
            </div>

            {formError && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center space-x-3 space-x-reverse">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <p className="text-rose-800 dark:text-rose-300">{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center space-x-3 space-x-reverse">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-emerald-800 dark:text-emerald-300">{formSuccess}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 space-x-reverse pt-4">
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); handleClearForm(); }}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-8 py-3 bg-gradient-to-l from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold flex items-center space-x-2 space-x-reverse transition-all disabled:opacity-50"
              >
                {formLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                    <span>جارٍ الإنشاء...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>إنشاء الحساب</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingUser(null); reset(); }} title="تعديل المستخدم" size="md">
          {editingUser && (
            <form onSubmit={handleSubmit(handleUpdateUser)} className="space-y-6 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم الكامل</label>
                <input
                  {...register('name', { required: true })}
                  defaultValue={editingUser.name}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني</label>
                <input
                  {...register('email', { required: true })}
                  defaultValue={editingUser.email || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور</label>
                <select
                  {...register('role', { required: true })}
                  defaultValue={editingUser.role}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRoles
                    .filter(role => role.name !== 'superadmin' || editingUser.role === 'superadmin')
                    .map(role => (
                      <option key={role.id} value={role.id}>{getRoleDisplayName(role.name)}</option>
                    ))
                  }
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingUser(null); reset(); }}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-l from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all"
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* View Details Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="تفاصيل المستخدم" size="xl">
          {userDetailsLoading ? (
            <div className="p-12">
              <LoadingSpinner text="جارٍ تحميل التفاصيل..." />
            </div>
          ) : viewingUser ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-6 space-x-reverse">
                <UserAvatar name={viewingUser.name} size="lg" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{viewingUser.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{viewingUser.email}</p>
                  <div className="flex items-center space-x-3 space-x-reverse mt-2">
                    <RoleBadge role={viewingUser.role} />
                    <StatusBadge status={viewingUser.isActive ? 'active' : 'inactive'} text={viewingUser.isActive ? 'نشط' : 'معطل'} />
                    {viewingUser.is_locked && <StatusBadge status="locked" text="مقفل" />}
                    {viewingUser.mfa_enabled && <StatusBadge status="mfa" text="MFA" />}
                    {viewingUser.emailVerified && <StatusBadge status="verified" text="موثق" />}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
                    <p className="font-medium text-gray-900 dark:text-white">{viewingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">آخر دخول</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(viewingUser.last_login)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الإنشاء</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(viewingUser.createdAt)}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">محاولات تسجيل دخول فاشلة</p>
                    <p className="font-medium text-gray-900 dark:text-white">{viewingUser.failed_login_attempts || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">قفل حتى</p>
                    <p className="font-medium text-gray-900 dark:text-white">{viewingUser.lockout_until ? formatDate(viewingUser.lockout_until) : 'غير مقفل'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تأكيد البريد</p>
                    <p className="font-medium text-gray-900 dark:text-white">{viewingUser.emailVerified ? 'مؤكد' : 'غير مؤكد'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleResetPassword(viewingUser.id)}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium flex items-center space-x-2 space-x-reverse transition-colors"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>إعادة تعيين كلمة المرور</span>
                </button>
                
                <select
                  value={viewingUser.role}
                  onChange={(e) => handleAssignRole(viewingUser.id, e.target.value)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {availableRoles
                    .filter(role => role.name !== 'superadmin' || viewingUser.role === 'superadmin')
                    .map(role => (
                      <option key={role.id} value={role.id}>{getRoleDisplayName(role.name)}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد بيانات</div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default UserManagement;
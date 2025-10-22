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
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { enhancedSuperadminApi, debugSuperAdminAccess as debugAuthStatus, handleApiError } from '@/services/superadminApi';
// Types
interface User {
  id: number;
  uuid: string;
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  is_locked: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  mfa_enabled: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  phone_number?: string;
  department?: string;
  position?: string;
  avatar_url?: string;
  lockout_until?: string | null;
  last_failed_login?: string | null;
}

interface UserDetails {
  id: number;
  uuid: string;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  is_locked: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  mfa_enabled: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  phone_number?: string;
  department?: string;
  position?: string;
  session_expires: string | null;
  last_password_change: string | null;
  avatar_url?: string;
  lockout_until?: string | null;
  last_failed_login?: string | null;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  security_level: number;
  is_system_role: boolean;
}

interface UserFormData {
  full_name: string;
  email: string;
  username: string;
  role_id: number;
  password?: string;
  phone_number?: string;
  department?: string;
  position?: string;
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

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({ size = 'md', text = 'جار التحميل...' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} role="status" aria-label="جار التحميل"></div>
      {text && <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{text}</p>}
    </div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ 
  status: 'active' | 'inactive' | 'locked' | 'unlocked' | 'mfa' | 'verified';
  text: string;
}> = ({ status, text }) => {
  const statusConfig = {
    active: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    inactive: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
    locked: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    unlocked: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
    mfa: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
    verified: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {text}
    </span>
  );
};

// Role Badge Component
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const roleConfig = {
    SUPER_ADMIN: { bg: 'bg-gradient-to-r from-rose-500 to-pink-600', icon: Crown },
    MANAGER: { bg: 'bg-gradient-to-r from-amber-500 to-orange-600', icon: Star },
    ADMIN: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-600', icon: Settings },
    WORKER: { bg: 'bg-gradient-to-r from-emerald-500 to-green-600', icon: UserCheck },
    BUYER: { bg: 'bg-gradient-to-r from-purple-500 to-indigo-600', icon: null },
    SUPPLIER: { bg: 'bg-gradient-to-r from-teal-500 to-emerald-600', icon: null }
  };

  const config = roleConfig[role as keyof typeof roleConfig] || { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', icon: null };
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1 space-x-reverse px-3 py-1.5 rounded-full text-xs font-semibold text-white ${config.bg} shadow-sm`}>
      {IconComponent && <IconComponent className="h-3 w-3" />}
      <span>{role}</span>
    </span>
  );
};

// User Avatar Component
const UserAvatar: React.FC<{ 
  name: string; 
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  className?: string;
}> = ({ name, size = 'md', src, className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-16 w-16 text-xl'
  };

  const gradientClass = "bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className} border-2 border-white dark:border-gray-800 shadow-sm`}
      />
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center text-white font-semibold ${sizeClasses[size]} ${gradientClass} ${className} border-2 border-white dark:border-gray-800 shadow-sm`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pagination, setPagination] = useState<Pagination>({ 
    totalPages: 1, 
    currentPage: 1, 
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState<FilterState>({ 
    role: 'all', 
    status: 'all',
    lockStatus: 'all'
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [departments] = useState<string[]>([
    'الإدارة العليا',
    'إدارة النظام',
    'المبيعات والتسويق',
    'الدعم الفني',
    'التطوير والبرمجة',
    'الجودة والتدقيق',
    'المالية والمحاسبة',
    'التدريب والتطوير',
    'خدمة العملاء',
    'الموارد البشرية'
  ]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<UserFormData>();

  // Custom debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      console.log('🔄 جلب الأدوار...');
      const result = await enhancedSuperadminApi.safeGetRoles();
      
      if (result.success) {
        setRoles(result.roles || []);
        console.log(`✅ تم جلب ${result.roles?.length || 0} دور`);
      } else {
        console.error('❌ خطأ في جلب الأدوار:', result.error);
        toast.error('فشل جلب الأدوار');
        setRoles([
          { id: 1, name: 'SUPER_ADMIN', description: 'System administrator with full access', security_level: 10, is_system_role: true },
          { id: 2, name: 'MANAGER', description: 'Manager with elevated permissions', security_level: 8, is_system_role: false },
          { id: 3, name: 'ADMIN', description: 'Administrator with system access', security_level: 7, is_system_role: false },
          { id: 4, name: 'WORKER', description: 'Regular worker', security_level: 5, is_system_role: false },
          { id: 5, name: 'BUYER', description: 'Buyer role', security_level: 3, is_system_role: false },
          { id: 6, name: 'SUPPLIER', description: 'Supplier role', security_level: 2, is_system_role: false }
        ]);
      }
    } catch (error: any) {
      console.error('❌ خطأ في جلب الأدوار:', error);
      toast.error('فشل جلب الأدوار');
      setRoles([
        { id: 1, name: 'SUPER_ADMIN', description: 'System administrator with full access', security_level: 10, is_system_role: true },
        { id: 2, name: 'MANAGER', description: 'Manager with elevated permissions', security_level: 8, is_system_role: false },
        { id: 3, name: 'ADMIN', description: 'Administrator with system access', security_level: 7, is_system_role: false },
        { id: 4, name: 'WORKER', description: 'Regular worker', security_level: 5, is_system_role: false },
        { id: 5, name: 'BUYER', description: 'Buyer role', security_level: 3, is_system_role: false },
        { id: 6, name: 'SUPPLIER', description: 'Supplier role', security_level: 2, is_system_role: false }
      ]);
    }
  }, []);

  // Load users
  const loadUsers = useCallback(
    debounce(async (page: number, search: string, filters: FilterState) => {
      setLoading(true);
      try {
        console.log('🔄 جلب المستخدمين...', { page, search, filters });
        
        const params: any = {
          page,
          limit: 10,
          search
        };

        if (filters.role !== 'all') params.role = filters.role;
        if (filters.status !== 'all') params.is_active = filters.status === 'active';
        if (filters.lockStatus !== 'all') params.is_locked = filters.lockStatus === 'locked';

        const result = await enhancedSuperadminApi.safeGetUsers(params);

        if (result.success) {
          setUsers(result.users || []);
          setPagination(result.pagination || {
            totalPages: 1,
            currentPage: 1,
            totalItems: 0,
            hasNext: false,
            hasPrev: false
          });
          setSelectedUsers([]);
          console.log(`✅ تم جلب ${result.users?.length || 0} مستخدم`);
        } else {
          console.error('❌ خطأ في جلب المستخدمين:', result.error);
          toast.error('فشل جلب المستخدمين');
          setUsers([]);
        }
      } catch (error: any) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        toast.error('فشل جلب المستخدمين');
        setUsers([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }, 500),
    []
  );

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRoles();
    loadUsers(pagination.currentPage, searchTerm, filters);
  };

  // Initial load
  useEffect(() => {
    console.log('🚀 UserManagement component mounted');
    debugAuthStatus();
    fetchRoles();
    loadUsers(1, '', filters);
  }, [fetchRoles, loadUsers]);

  // Load users when filters change
  useEffect(() => {
    loadUsers(1, searchTerm, filters);
  }, [searchTerm, filters, loadUsers]);

  // Handle user details view
  const handleViewUserDetails = async (userId: number) => {
    try {
      setUserDetailsLoading(true);
      console.log('🟡 جلب تفاصيل المستخدم للمعرف:', userId);
      
      const result = await enhancedSuperadminApi.safeGetUserDetails(userId);
      
      if (result.success && result.user) {
        setViewingUser(result.user);
        setIsViewModalOpen(true);
        console.log('✅ تم جلب تفاصيل المستخدم');
      } else {
        throw new Error(result.error || 'لا توجد بيانات في الاستجابة');
      }
    } catch (error: any) {
      console.error('🔴 خطأ في جلب تفاصيل المستخدم:', error);
      const errorMessage = handleApiError(error, 'فشل جلب تفاصيل المستخدم');
      toast.error(errorMessage);
    } finally {
      setUserDetailsLoading(false);
    }
  };

  // Handle user activation/deactivation
  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    const action = isActive ? 'تعطيل' : 'تفعيل';
    if (!window.confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;

    try {
      let result;
      if (isActive) {
        result = await enhancedSuperadminApi.safeDeactivateUser(userId);
      } else {
        result = await enhancedSuperadminApi.safeActivateUser(userId);
      }

      if (result.success) {
        toast.success(result.message);
        loadUsers(pagination.currentPage, searchTerm, filters);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error(`❌ خطأ في ${action} المستخدم:`, error);
      toast.error(`فشل ${action} المستخدم`);
    }
  };

  // Handle bulk user activation/deactivation
  const handleBulkToggleStatus = async (activate: boolean) => {
    if (selectedUsers.length === 0) {
      toast.error('يرجى تحديد مستخدم واحد على الأقل');
      return;
    }

    const action = activate ? 'تفعيل' : 'تعطيل';
    if (!window.confirm(`هل أنت متأكد من ${action} ${selectedUsers.length} مستخدم؟`)) return;

    try {
      const promises = selectedUsers.map(userId => 
        activate 
          ? enhancedSuperadminApi.safeActivateUser(userId) 
          : enhancedSuperadminApi.safeDeactivateUser(userId)
      );
      const results = await Promise.all(promises);

      const successes = results.filter(r => r.success).length;
      if (successes === selectedUsers.length) {
        toast.success(`${action} ${successes} مستخدم بنجاح`);
      } else {
        toast.error(`تم ${action} ${successes} من ${selectedUsers.length} مستخدم`);
      }
      loadUsers(pagination.currentPage, searchTerm, filters);
      setSelectedUsers([]);
    } catch (error: any) {
      console.error(`❌ خطأ في ${action} المستخدمين:`, error);
      toast.error(`فشل ${action} المستخدمين`);
    }
  };

  // Handle user lock/unlock
  const handleToggleUserLock = async (userId: number, isLocked: boolean) => {
    const action = isLocked ? 'فتح' : 'قفل';
    if (!window.confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;

    try {
      let result;
      if (isLocked) {
        result = await enhancedSuperadminApi.safeUnblockUser(userId);
      } else {
        result = await enhancedSuperadminApi.safeBlockUser(userId);
      }

      if (result.success) {
        toast.success(result.message);
        loadUsers(pagination.currentPage, searchTerm, filters);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error(`❌ خطأ في ${action} المستخدم:`, error);
      toast.error(`فشل ${action} المستخدم`);
    }
  };

  // Handle user creation
  const handleCreateUser = async (data: UserFormData) => {
    try {
      console.log('🔄 إنشاء مستخدم جديد:', data);
      const result = await enhancedSuperadminApi.safeCreateUser({
        ...data,
        phone_number: data.phone_number || null,
        department: data.department || null,
        position: data.position || null
      });

      if (result.success) {
        toast.success(result.message);
        setIsAddModalOpen(false);
        reset();
        loadUsers(1, searchTerm, filters);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء المستخدم:', error);
      const errorMessage = handleApiError(error, 'فشل إنشاء المستخدم');
      toast.error(errorMessage);
    }
  };

  // Handle user update
  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    
    try {
      console.log('🔄 تحديث المستخدم:', editingUser.id, data);
      const result = await enhancedSuperadminApi.safeUpdateUser(editingUser.id, {
        ...data,
        phone_number: data.phone_number || null,
        department: data.department || null,
        position: data.position || null
      });

      if (result.success) {
        toast.success(result.message);
        setIsEditModalOpen(false);
        setEditingUser(null);
        reset();
        loadUsers(pagination.currentPage, searchTerm, filters);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('❌ خطأ في تحديث المستخدم:', error);
      const errorMessage = handleApiError(error, 'فشل تحديث المستخدم');
      toast.error(errorMessage);
    }
  };

  // Handle role assignment
  const handleAssignRole = async (userId: number, roleId: number) => {
    try {
      const result = await enhancedSuperadminApi.safeUpdateUserRole(userId, { role_id: roleId });
      if (result.success) {
        toast.success(result.message);
        loadUsers(pagination.currentPage, searchTerm, filters);
        if (isViewModalOpen && viewingUser?.id === userId) {
          const updatedUser = await enhancedSuperadminApi.safeGetUserDetails(userId);
          if (updatedUser.success && updatedUser.user) {
            setViewingUser(updatedUser.user);
          }
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('❌ خطأ في تعيين الدور:', error);
      toast.error('فشل تعيين الدور');
    }
  };

  // Handle password reset
  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('أدخل كلمة المرور الجديدة (يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير، حرف صغير، ورقم):');
    if (!newPassword) return;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير، حرف صغير، ورقم');
      return;
    }

    try {
      const result = await enhancedSuperadminApi.safeResetUserPassword(userId, newPassword);
      if (result.success) {
        toast.success(result.message);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
      toast.error('فشل إعادة تعيين كلمة المرور');
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;

    try {
      toast.error('خاصية الحذف غير متاحة حالياً');
    } catch (error: any) {
      console.error('❌ خطأ في حذف المستخدم:', error);
      toast.error('فشل حذف المستخدم');
    }
  };

  // Handle export to CSV
  const handleExportToCSV = () => {
    const headers = [
      'ID',
      'UUID',
      'Username',
      'Full Name',
      'Email',
      'Role',
      'Status',
      'Locked',
      'Last Login',
      'Created At',
      'Updated At',
      'Phone Number',
      'Department',
      'Position'
    ];

    const rows = users.map(user => [
      user.id,
      user.uuid,
      user.username,
      `"${user.full_name}"`,
      user.email,
      user.role_name || getRoleNameById(user.role_id),
      user.is_active ? 'Active' : 'Inactive',
      user.is_locked ? 'Locked' : 'Unlocked',
      user.last_login || 'Never',
      user.created_at,
      user.updated_at,
      user.phone_number || '',
      user.department || '',
      user.position || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير المستخدمين بنجاح');
  };

  // Handle checkbox selection
  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all users
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      role: 'all',
      status: 'all',
      lockStatus: 'all'
    });
  };

  // Memoized filtered users - FIXED: Added proper array check
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) {
      console.warn('⚠️ users is not an array, returning empty array');
      return [];
    }
    return users;
  }, [users]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'لم يسجل دخول';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats calculation - FIXED: Added proper array check
  const stats = useMemo(() => {
    const userArray = Array.isArray(users) ? users : [];
    const total = userArray.length;
    const active = userArray.filter(user => user.is_active).length;
    const locked = userArray.filter(user => user.is_locked).length;
    const mfaEnabled = userArray.filter(user => user.mfa_enabled).length;

    return { total, active, locked, mfaEnabled };
  }, [users]);

  // Safe roles array
  const safeRoles = Array.isArray(roles) ? roles : [];

  // Get role name by ID
  const getRoleNameById = (roleId: number) => {
    const role = safeRoles.find(r => r.id === roleId);
    return role ? role.name : 'UNKNOWN';
  };

  // Debug component
  const AuthDebugInfo = () => {
    const [authStatus, setAuthStatus] = useState<string>('جارٍ التحقق...');
    
    useEffect(() => {
      const tokenStatus = debugAuthStatus();
      if (tokenStatus.hasToken && tokenStatus.isValid) {
        setAuthStatus(`✅ مصادق - ${tokenStatus.token}`);
      } else {
        setAuthStatus('❌ غير مصادق');
      }
    }, []);

    if (process.env.NODE_ENV === 'production') return null;

    return (
      <div className="fixed bottom-4 left-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 text-xs max-w-xs z-50 shadow-lg">
        <div className="font-semibold text-yellow-800">🔐 حالة المصادقة:</div>
        <div className="text-yellow-700">{authStatus}</div>
        <div className="mt-1 text-yellow-600">
          التخزين: {Object.keys(localStorage).filter(k => k.includes('token') || k.includes('session')).join(', ') || 'لا توجد رموز'}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans" dir="rtl">
      <AuthDebugInfo />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0"
        >
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
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
                إدارة وتعديل مستخدمي النظام - صلاحيات المدير العام
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 space-x-reverse">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-6 py-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 border border-gray-200 dark:border-gray-700 flex items-center justify-center space-x-2 space-x-reverse shadow-sm"
              aria-label="تحديث البيانات"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
            
            <div className="flex space-x-2 space-x-reverse">
              <button 
                onClick={handleExportToCSV}
                className="px-6 py-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 border border-gray-200 dark:border-gray-700 flex items-center space-x-2 space-x-reverse shadow-sm"
                aria-label="تصدير المستخدمين"
              >
                <Download className="h-5 w-5" />
                <span>تصدير</span>
              </button>
              
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-l from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center space-x-2 space-x-reverse transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-lg hover:shadow-xl"
                aria-label="إضافة مستخدم جديد"
              >
                <Plus className="h-5 w-5" />
                <span>مستخدم جديد</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">المستخدمين النشطين</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.active}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${stats.total ? (stats.active / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الحسابات المقفلة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.locked}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${stats.total ? (stats.locked / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">المصادقة الثنائية</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.mfaEnabled}</p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-violet-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${stats.total ? (stats.mfaEnabled / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث عن مستخدم بالاسم، البريد الإلكتروني، أو اسم المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg placeholder-gray-500 dark:placeholder-gray-400"
                aria-label="البحث عن مستخدم"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                  aria-label="مسح البحث"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center space-x-3 space-x-reverse">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-4 rounded-xl font-medium flex items-center space-x-2 space-x-reverse transition-all duration-200 ${
                  showFilters 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-label={showFilters ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
              >
                <Filter className="h-5 w-5" />
                <span>الفلاتر</span>
                {Object.values(filters).some(val => val !== 'all') && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {Object.values(filters).filter(val => val !== 'all').length}
                  </span>
                )}
              </button>

              {Object.values(filters).some(val => val !== 'all') && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  aria-label="مسح الفلاتر"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور</label>
                    <select
                      value={filters.role}
                      onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      aria-label="تصفية حسب الدور"
                    >
                      <option value="all">جميع الأدوار</option>
                      {safeRoles.map((role) => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">حالة الحساب</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterState['status'] })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      aria-label="تصفية حسب حالة الحساب"
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
                      onChange={(e) => setFilters({ ...filters, lockStatus: e.target.value as FilterState['lockStatus'] })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      aria-label="تصفية حسب حالة القفل"
                    >
                      <option value="all">جميع حالات القفل</option>
                      <option value="locked">مقفل</option>
                      <option value="unlocked">مفتوح</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4 space-x-reverse"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {selectedUsers.length} مستخدم محدد
            </span>
            <button
              onClick={() => handleBulkToggleStatus(true)}
              className="px-4 py-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              aria-label="تفعيل المستخدمين المحددين"
            >
              تفعيل
            </button>
            <button
              onClick={() => handleBulkToggleStatus(false)}
              className="px-4 py-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
              aria-label="تعطيل المستخدمين المحددين"
            >
              تعطيل
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/20 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
              aria-label="إلغاء التحديد"
            >
              إلغاء
            </button>
          </motion.div>
        )}

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {loading ? (
            <LoadingSpinner text="جارٍ تحميل المستخدمين..." />
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl inline-block mb-4">
                  <UserX className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">لا يوجد مستخدمون</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm || Object.values(filters).some(val => val !== 'all') 
                    ? 'لم يتم العثور على مستخدمين مطابقين لمعايير البحث' 
                    : 'لم يتم إضافة أي مستخدمين بعد'
                  }
                </p>
                {(searchTerm || Object.values(filters).some(val => val !== 'all')) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      handleClearFilters();
                    }}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                  >
                    عرض جميع المستخدمين
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-l from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={handleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500"
                          aria-label="تحديد جميع المستخدمين"
                        />
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">المستخدم</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">الدور</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">آخر دخول</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 group"
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                            aria-label={`تحديد ${user.username}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <UserAvatar name={user.username} src={user.avatar_url} />
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center space-x-1 space-x-reverse mt-1">
                                <span>@{user.username}</span>
                                {user.phone_number && (
                                  <>
                                    <span>•</span>
                                    <span>{user.phone_number}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            <RoleBadge role={user.role_name || getRoleNameById(user.role_id)} />
                            {user.department && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                {user.department}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            <StatusBadge 
                              status={user.is_active ? 'active' : 'inactive'} 
                              text={user.is_active ? 'نشط' : 'معطل'} 
                            />
                            {user.is_locked && (
                              <StatusBadge status="locked" text="مقفل" />
                            )}
                            {user.mfa_enabled && (
                              <StatusBadge status="mfa" text="MFA" />
                            )}
                            {user.email_verified && (
                              <StatusBadge status="verified" text="مفعل" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(user.last_login)}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(user.created_at).toLocaleDateString('ar-EG')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end space-x-1 space-x-reverse">
                            <button
                              onClick={() => handleViewUserDetails(user.id)}
                              disabled={userDetailsLoading}
                              className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none disabled:opacity-50 transition-all duration-200 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 group/btn"
                              aria-label={`عرض تفاصيل ${user.username}`}
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setIsEditModalOpen(true);
                                reset({
                                  full_name: user.full_name,
                                  email: user.email,
                                  username: user.username,
                                  role_id: user.role_id,
                                  phone_number: user.phone_number,
                                  department: user.department,
                                  position: user.position
                                });
                              }}
                              className="p-2 text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 focus:outline-none transition-all duration-200 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group/btn"
                              aria-label={`تعديل ${user.username}`}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handleToggleUserLock(user.id, user.is_locked)}
                              className={`p-2 focus:outline-none transition-all duration-200 rounded-xl group/btn ${
                                user.is_locked 
                                  ? 'text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                  : 'text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              }`}
                              aria-label={user.is_locked ? `فتح ${user.username}` : `قفل ${user.username}`}
                              title={user.is_locked ? 'فتح المستخدم' : 'قفل المستخدم'}
                            >
                              {user.is_locked ? 
                                <Unlock className="h-4 w-4 group-hover/btn:scale-110 transition-transform" /> : 
                                <Lock className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                              }
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="p-2 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 focus:outline-none transition-all duration-200 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 group/btn"
                              aria-label={`إعادة تعيين كلمة مرور ${user.username}`}
                              title="إعادة تعيين كلمة المرور"
                            >
                              <RotateCcw className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="p-2 text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300 focus:outline-none transition-all duration-200 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 group/btn"
                              aria-label={`حذف ${user.username}`}
                              title="حذف المستخدم"
                            >
                              <Trash2 className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    عرض <span className="font-semibold">{filteredUsers.length}</span> من <span className="font-semibold">{pagination.totalItems}</span> مستخدم
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => loadUsers(Math.max(pagination.currentPage - 1, 1), searchTerm, filters)}
                      disabled={pagination.currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                      aria-label="الصفحة السابقة"
                    >
                      السابق
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                      الصفحة {pagination.currentPage} من {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => loadUsers(Math.min(pagination.currentPage + 1, pagination.totalPages), searchTerm, filters)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                      aria-label="الصفحة التالية"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          reset();
        }}
        title="إضافة مستخدم جديد"
        size="lg"
      >
        <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم الكامل *</label>
              <input
                id="full_name"
                {...register('full_name', { required: 'الاسم الكامل مطلوب' })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.full_name ? 'true' : 'false'}
                placeholder="أدخل الاسم الكامل"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.full_name.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني *</label>
              <input
                id="email"
                type="email"
                {...register('email', {
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'تنسيق البريد الإلكتروني غير صالح',
                  },
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.email ? 'true' : 'false'}
                placeholder="example@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم المستخدم *</label>
              <input
                id="username"
                {...register('username', {
                  required: 'اسم المستخدم مطلوب',
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط',
                  },
                  minLength: {
                    value: 3,
                    message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'
                  }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.username ? 'true' : 'false'}
                placeholder="اسم المستخدم"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.username.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">كلمة المرور *</label>
              <input
                id="password"
                type="password"
                {...register('password', {
                  required: 'كلمة المرور مطلوبة',
                  minLength: {
                    value: 8,
                    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'يجب أن تحتوي كلمة المرور على حرف كبير، حرف صغير، ورقم',
                  },
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.password ? 'true' : 'false'}
                placeholder="كلمة المرور"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
              <input
                id="phone_number"
                type="tel"
                {...register('phone_number')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="+966 5X XXX XXXX"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">القسم</label>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    aria-label="اختيار القسم"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المنصب</label>
              <input
                id="position"
                {...register('position')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="المسمى الوظيفي"
              />
            </div>

            <div>
              <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور *</label>
              <Controller
                name="role_id"
                control={control}
                rules={{ required: 'الدور مطلوب' }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    aria-invalid={errors.role_id ? 'true' : 'false'}
                    aria-label="اختيار الدور"
                  >
                    <option value="">اختر دورًا</option>
                    {safeRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.role_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.role_id.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                reset();
              }}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors font-medium"
              aria-label="إلغاء إضافة المستخدم"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-l from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="إضافة المستخدم"
            >
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة المستخدم'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          reset();
        }}
        title="تعديل المستخدم"
        size="lg"
      >
        <form onSubmit={handleSubmit(handleUpdateUser)} className="space-y-6 p-6">     
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم الكامل *</label>
              <input
                id="full_name"
                {...register('full_name', { required: 'الاسم الكامل مطلوب' })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.full_name ? 'true' : 'false'}
                placeholder="أدخل الاسم الكامل"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.full_name.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني *</label>
              <input
                id="email"
                type="email"
                {...register('email', {
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'تنسيق البريد الإلكتروني غير صالح',
                  },
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.email ? 'true' : 'false'}
                placeholder="example@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم المستخدم *</label>
              <input
                id="username"
                {...register('username', {
                  required: 'اسم المستخدم مطلوب',
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط',
                  },
                  minLength: {
                    value: 3,
                    message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'
                  }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-invalid={errors.username ? 'true' : 'false'}
                placeholder="اسم المستخدم"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.username.message}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
              <input
                id="phone_number"
                type="tel"
                {...register('phone_number')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="+966 5X XXX XXXX"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">القسم</label>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    aria-label="اختيار القسم"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المنصب</label>
              <input
                id="position"
                {...register('position')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="المسمى الوظيفي"
              />
            </div>

            <div>
              <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور *</label>
              <Controller
                name="role_id"
                control={control}
                rules={{ required: 'الدور مطلوب' }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    aria-invalid={errors.role_id ? 'true' : 'false'}
                    aria-label="اختيار الدور"
                  >
                    <option value="">اختر دورًا</option>
                    {safeRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.role_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1 space-x-reverse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.role_id.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
                reset();
              }}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors font-medium"
              aria-label="إلغاء التعديل"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-l from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="حفظ التعديلات"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View User Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingUser(null);
        }}
        title="تفاصيل المستخدم"
        size="lg"
      >
        <div className="p-6 space-y-6">
          {userDetailsLoading ? (
            <LoadingSpinner text="جارٍ تحميل تفاصيل المستخدم..." />
          ) : viewingUser ? (
            <>
              <div className="flex items-center space-x-4 space-x-reverse">
                <UserAvatar 
                  name={viewingUser.full_name} 
                  size="lg" 
                  src={viewingUser.avatar_url}
                  className="border-4 border-blue-100 dark:border-blue-900/30"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{viewingUser.full_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{viewingUser.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{viewingUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الدور</label>
                    <div className="mt-1 flex items-center space-x-2 space-x-reverse">
                      <RoleBadge role={viewingUser.role_name || getRoleNameById(viewingUser.role_id)} />
                      <button
                        onClick={() => {
                          const newRoleId = prompt(
                            'اختر دورًا جديدًا (معرف الدور): ' + 
                            safeRoles.map(r => `${r.id}: ${r.name}`).join(', ')
                          );
                          if (newRoleId && !isNaN(parseInt(newRoleId))) {
                            handleAssignRole(viewingUser.id, parseInt(newRoleId));
                          }
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        aria-label="تغيير الدور"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">القسم</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingUser.department || 'غير محدد'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المنصب</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingUser.position || 'غير محدد'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingUser.phone_number || 'غير محدد'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</label>
                    <div className="mt-1 flex flex-col space-y-2">
                      <StatusBadge 
                        status={viewingUser.is_active ? 'active' : 'inactive'} 
                        text={viewingUser.is_active ? 'نشط' : 'معطل'} 
                      />
                      {viewingUser.is_locked && <StatusBadge status="locked" text="مقفل" />}
                      {viewingUser.mfa_enabled && <StatusBadge status="mfa" text="مفعل MFA" />}
                      {viewingUser.email_verified && <StatusBadge status="verified" text="البريد مؤكد" />}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">آخر تسجيل دخول</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.last_login)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الإنشاء</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.created_at)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">آخر تحديث</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.updated_at)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">معلومات الأمان</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">محاولات تسجيل الدخول الفاشلة</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewingUser.failed_login_attempts || 0}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">آخر محاولة فاشلة</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.last_failed_login)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">انتهاء الجلسة</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.session_expires)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">آخر تغيير لكلمة المرور</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.last_password_change)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">القفل حتى</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.lockout_until)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleResetPassword(viewingUser.id)}
                  className="px-6 py-3 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors font-medium"
                  aria-label="إعادة تعيين كلمة المرور"
                >
                  إعادة تعيين كلمة المرور
                </button>
                <button
                  onClick={() => handleToggleUserLock(viewingUser.id, viewingUser.is_locked)}
                  className={`px-6 py-3 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                    viewingUser.is_locked
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus:ring-emerald-500'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 focus:ring-amber-500'
                  }`}
                  aria-label={viewingUser.is_locked ? 'فتح الحساب' : 'قفل الحساب'}
                >
                  {viewingUser.is_locked ? 'فتح الحساب' : 'قفل الحساب'}
                </button>
                <button
                  onClick={() => handleToggleUserStatus(viewingUser.id, viewingUser.is_active)}
                  className={`px-6 py-3 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                    viewingUser.is_active
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 focus:ring-rose-500'
                      : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus:ring-emerald-500'
                  }`}
                  aria-label={viewingUser.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                >
                  {viewingUser.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">لا توجد بيانات لعرضها</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
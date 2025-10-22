// src/features/roles/superadmin/components/RoleManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Plus, 
  Edit, 
  Save, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Users, 
  Key,
  Filter,
  Eye,
  FileText,
  Download,
  CheckCircle,
  Settings
} from 'lucide-react';

interface Role {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  security_level: number;
  is_system_role: boolean;
  max_session_hours: number;
  password_policy: string;
  mfa_required: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  user_count?: number;
}

interface Feature {
  id: number;
  uuid: string;
  feature_code: string;
  feature_name: string;
  feature_description: string | null;
  category: string;
  is_system_critical: boolean;
  requires_super_admin: boolean;
  requires_mfa: boolean;
  enabled_by_default: boolean;
}

interface RolePermission {
  id: number;
  role_id: number;
  feature_id: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
  view_scope: 'NONE' | 'OWN' | 'ALL';
  edit_scope: 'NONE' | 'OWN' | 'ALL';
  export_scope: 'NONE' | 'OWN' | 'ALL';
  feature?: Feature;
}

interface RolesResponse {
  roles: Role[];
  total_count: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const rolesPerPage = 10;

  const [filters, setFilters] = useState({
    search: '',
    isSystemRole: '',
    securityLevel: '',
    mfaRequired: ''
  });

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    security_level: 5,
    max_session_hours: 8,
    password_policy: 'STANDARD',
    mfa_required: false
  });

  const [editRole, setEditRole] = useState({
    name: '',
    description: '',
    security_level: 5,
    max_session_hours: 8,
    password_policy: 'STANDARD',
    mfa_required: false
  });

  const passwordPolicies = [
    'STANDARD',
    'STRONG',
    'VERY_STRONG',
    'CUSTOM'
  ];

  // Enhanced API call helper with better error handling
  const apiCall = async <T,>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    const defaultOptions: RequestInit = {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Server returned HTML instead of JSON. Endpoint may not exist.');
      }

      if (!response.ok) {
        // Try to parse error response as JSON
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: ApiResponse<T> = await response.json();
      return data;

    } catch (err: any) {
      console.error(`API call failed for ${url}:`, err);
      throw new Error(err.message || 'فشل في الاتصال بالخادم');
    }
  };

  // Fetch roles with security integration
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: rolesPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.isSystemRole && { is_system_role: filters.isSystemRole }),
        ...(filters.securityLevel && { security_level: filters.securityLevel }),
        ...(filters.mfaRequired && { mfa_required: filters.mfaRequired })
      });

      const response = await apiCall<RolesResponse>(`/api/superadmin/roles?${queryParams}`);
      
      if (response.success && response.data) {
        setRoles(response.data.roles || []);
        setTotalPages(response.data.total_pages || 1);
        setTotalCount(response.data.total_count || 0);
        setSuccess(`تم تحميل ${response.data.roles?.length || 0} دور`);
      } else {
        throw new Error(response.message || 'فشل في تحميل الأدوار');
      }

    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ أثناء تحميل الأدوار';
      setError(errorMsg);
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const fetchFeatures = useCallback(async () => {
    try {
      const response = await apiCall<{ features: Feature[] }>('/api/superadmin/features');
      
      if (response.success && response.data) {
        setFeatures(response.data.features || []);
      } else {
        throw new Error(response.message || 'فشل في تحميل الميزات');
      }
    } catch (err: any) {
      console.error('Failed to load features:', err);
      // Don't show error to user for features loading as it's not critical
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchFeatures();
  }, [fetchRoles, fetchFeatures]);

  const logSecurityEvent = async (eventType: string, description: string, success: boolean) => {
    try {
      await apiCall('/api/security/log', {
        method: 'POST',
        body: JSON.stringify({
          event_type: eventType,
          event_description: description,
          success,
          severity: success ? 'INFO' : 'ERROR',
          details: { 
            component: 'RoleManagement',
            filters: filters,
            page: currentPage
          }
        })
      });
    } catch (error) {
      // Silently fail for security logging - don't show errors to user
      console.warn('Failed to log security event:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      setProcessing(true);
      setError('');

      if (!newRole.name.trim()) {
        setError('اسم الدور مطلوب');
        return;
      }

      const response = await apiCall<{ role: Role }>('/api/superadmin/roles', {
        method: 'POST',
        body: JSON.stringify(newRole)
      });

      if (response.success) {
        setSuccess('تم إنشاء الدور بنجاح');
        setNewRole({
          name: '',
          description: '',
          security_level: 5,
          max_session_hours: 8,
          password_policy: 'STANDARD',
          mfa_required: false
        });
        setIsCreateModalOpen(false);
        fetchRoles();

        await logSecurityEvent('ROLE_CREATE', `تم إنشاء الدور: ${newRole.name}`, true);
      } else {
        throw new Error(response.message || 'فشل في إنشاء الدور');
      }

    } catch (err: any) {
      setError(err.message || 'فشل في إنشاء الدور');
      await logSecurityEvent('ROLE_CREATE', `فشل إنشاء الدور: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditRole = async () => {
    try {
      if (!selectedRole) return;
      
      setProcessing(true);
      setError('');

      if (!editRole.name.trim()) {
        setError('اسم الدور مطلوب');
        return;
      }

      const response = await apiCall<{ role: Role }>(`/api/superadmin/roles/${selectedRole.id}`, {
        method: 'PUT',
        body: JSON.stringify(editRole)
      });

      if (response.success) {
        setSuccess('تم تحديث الدور بنجاح');
        setIsEditModalOpen(false);
        setSelectedRole(null);
        fetchRoles();

        await logSecurityEvent('ROLE_UPDATE', `تم تحديث الدور: ${editRole.name}`, true);
      } else {
        throw new Error(response.message || 'فشل في تحديث الدور');
      }

    } catch (err: any) {
      setError(err.message || 'فشل في تحديث الدور');
      await logSecurityEvent('ROLE_UPDATE', `فشل تحديث الدور: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenPermissionModal = async (role: Role) => {
    if (role.is_system_role) {
      setError('لا يمكن تعديل أدوار النظام');
      return;
    }

    setSelectedRole(role);
    setLoading(true);
    
    try {
      const response = await apiCall<{ permissions: RolePermission[] }>(`/api/superadmin/roles/${role.id}/permissions`);
      
      if (response.success && response.data) {
        setRolePermissions(response.data.permissions || []);
        setIsPermissionModalOpen(true);
        setError('');
        await logSecurityEvent('ROLE_PERMISSIONS_VIEW', `عرض صلاحيات الدور: ${role.name}`, true);
      } else {
        throw new Error(response.message || 'فشل في تحميل الصلاحيات');
      }

    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الصلاحيات');
      await logSecurityEvent('ROLE_PERMISSIONS_VIEW', `فشل تحميل الصلاحيات: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = (permissionId: number, field: keyof RolePermission, value: any) => {
    setRolePermissions(prev =>
      prev.map(perm =>
        perm.id === permissionId ? { ...perm, [field]: value } : perm
      )
    );
  };

  const handleSavePermissions = async () => {
    try {
      if (!selectedRole) return;
      
      setProcessing(true);
      setError('');

      const response = await apiCall(`/api/superadmin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissions: rolePermissions
        })
      });

      if (response.success) {
        setSuccess('تم تحديث الصلاحيات بنجاح');
        setIsPermissionModalOpen(false);
        setSelectedRole(null);
        setRolePermissions([]);

        await logSecurityEvent('ROLE_PERMISSIONS_UPDATE', `تم تحديث صلاحيات الدور: ${selectedRole.name}`, true);
      } else {
        throw new Error(response.message || 'فشل في تحديث الصلاحيات');
      }

    } catch (err: any) {
      setError(err.message || 'فشل في تحديث الصلاحيات');
      await logSecurityEvent('ROLE_PERMISSIONS_UPDATE', `فشل تحديث الصلاحيات: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRole = async () => {
    try {
      if (!selectedRole) return;
      
      setProcessing(true);
      setError('');

      if (selectedRole.is_system_role) {
        setError('لا يمكن حذف أدوار النظام');
        return;
      }

      const response = await apiCall(`/api/superadmin/roles/${selectedRole.id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        setSuccess('تم حذف الدور بنجاح');
        setIsDeleteModalOpen(false);
        setSelectedRole(null);
        fetchRoles();

        await logSecurityEvent('ROLE_DELETE', `تم حذف الدور: ${selectedRole.name}`, true);
      } else {
        throw new Error(response.message || 'فشل في حذف الدور');
      }

    } catch (err: any) {
      setError(err.message || 'فشل في حذف الدور');
      await logSecurityEvent('ROLE_DELETE', `فشل حذف الدور: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      isSystemRole: '',
      securityLevel: '',
      mfaRequired: ''
    });
    setCurrentPage(1);
  };

  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleEditClick = (role: Role) => {
    if (role.is_system_role) {
      setError('لا يمكن تعديل أدوار النظام');
      return;
    }
    
    setSelectedRole(role);
    setEditRole({
      name: role.name,
      description: role.description || '',
      security_level: role.security_level,
      max_session_hours: role.max_session_hours,
      password_policy: role.password_policy,
      mfa_required: role.mfa_required
    });
    setIsEditModalOpen(true);
  };

  const getPasswordPolicyLabel = (policy: string): string => {
    const policyMap: { [key: string]: string } = {
      'STANDARD': 'قياسي',
      'STRONG': 'قوي',
      'VERY_STRONG': 'قوي جداً',
      'CUSTOM': 'مخصص'
    };
    return policyMap[policy] || policy;
  };

  const getScopeLabel = (scope: string): string => {
    const scopeMap: { [key: string]: string } = {
      'NONE': 'لا شيء',
      'OWN': 'خاص به',
      'ALL': 'الكل'
    };
    return scopeMap[scope] || scope;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSecurityLevelColor = (level: number): string => {
    if (level <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
    if (level <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (level <= 8) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
  };

  // Initialize default features if not loaded
  const getDefaultFeatures = (): Feature[] => [
    {
      id: 1,
      uuid: 'default-feature-1',
      feature_code: 'ROLE_MANAGEMENT',
      feature_name: 'إدارة الأدوار',
      feature_description: 'إدارة أدوار النظام والصلاحيات',
      category: 'SYSTEM',
      is_system_critical: true,
      requires_super_admin: true,
      requires_mfa: true,
      enabled_by_default: true
    },
    {
      id: 2,
      uuid: 'default-feature-2',
      feature_code: 'USER_MANAGEMENT',
      feature_name: 'إدارة المستخدمين',
      feature_description: 'إدارة حسابات المستخدمين',
      category: 'SYSTEM',
      is_system_critical: true,
      requires_super_admin: false,
      requires_mfa: false,
      enabled_by_default: true
    },
    {
      id: 3,
      uuid: 'default-feature-3',
      feature_code: 'INVENTORY_VIEW',
      feature_name: 'عرض المخزون',
      feature_description: 'عرض عناصر المخزون',
      category: 'INVENTORY',
      is_system_critical: false,
      requires_super_admin: false,
      requires_mfa: false,
      enabled_by_default: true
    }
  ];

  const effectiveFeatures = features.length > 0 ? features : getDefaultFeatures();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                إدارة الأدوار والصلاحيات
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                إدارة أدوار النظام والتحكم في الصلاحيات والإعدادات الأمنية
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={processing}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-5 h-5" />
                إنشاء دور جديد
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-green-800 dark:text-green-300 text-sm font-medium">{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الأدوار</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCount}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">أدوار النظام</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {roles.filter(r => r.is_system_role).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">أدوار مخصصة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {roles.filter(r => !r.is_system_role).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">يتطلب MFA</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {roles.filter(r => r.mfa_required).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">تصفية النتائج</h3>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm">فلاتر البحث</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                بحث في الأدوار
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="ابحث بالاسم أو الوصف..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* System Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الدور
              </label>
              <select
                value={filters.isSystemRole}
                onChange={(e) => handleFilterChange('isSystemRole', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                <option value="">جميع الأدوار</option>
                <option value="true">أدوار النظام</option>
                <option value="false">أدوار مخصصة</option>
              </select>
            </div>

            {/* Security Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                مستوى الأمان
              </label>
              <select
                value={filters.securityLevel}
                onChange={(e) => handleFilterChange('securityLevel', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                <option value="">جميع المستويات</option>
                <option value="1">1 - منخفض</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 - متوسط</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8 - عالي</option>
                <option value="9">9</option>
                <option value="10">10 - أقصى</option>
              </select>
            </div>

            {/* MFA Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المصادقة الثنائية
              </label>
              <select
                value={filters.mfaRequired}
                onChange={(e) => handleFilterChange('mfaRequired', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                <option value="">جميع الحالات</option>
                <option value="true">يتطلب MFA</option>
                <option value="false">لا يتطلب MFA</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              عرض <span className="font-medium text-gray-900 dark:text-white">{roles.length}</span> من <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> دور
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">جاري تحميل الأدوار...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">يرجى الانتظار</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد أدوار</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                لم يتم العثور على أدوار تطابق معايير البحث
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                إنشاء أول دور
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الدور
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الإحصائيات
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الإعدادات الأمنية
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        آخر تحديث
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-right">
                            <div className="flex items-center gap-3 justify-end">
                              <div className="flex-1">
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {role.name}
                                </p>
                                {role.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                    {role.description}
                                  </p>
                                )}
                              </div>
                              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                                {role.name.charAt(0)}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 justify-end">
                              {role.is_system_role && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800">
                                  <Settings className="w-3 h-3 ml-1" />
                                  نظام
                                </span>
                              )}
                              {role.mfa_required && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                  <Key className="w-3 h-3 ml-1" />
                                  MFA
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-right space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">المستخدمون:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {role.user_count || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">مستوى الأمان:</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSecurityLevelColor(role.security_level)}`}>
                                {role.security_level}/10
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-right space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">مدة الجلسة:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {role.max_session_hours} ساعة
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">كلمة المرور:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {getPasswordPolicyLabel(role.password_policy)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                            {formatDateTime(role.updated_at)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleOpenPermissionModal(role)}
                              disabled={role.is_system_role}
                              className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200 dark:border-blue-800"
                              title="إدارة الصلاحيات"
                            >
                              <Key className="w-4 h-4 ml-2" />
                              الصلاحيات
                            </button>
                            <button
                              onClick={() => handleEditClick(role)}
                              disabled={role.is_system_role}
                              className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-200 dark:border-green-800"
                              title="تعديل الدور"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {!role.is_system_role && (
                              <button
                                onClick={() => handleDeleteClick(role)}
                                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-800"
                                title="حذف الدور"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {roles.map((role) => (
                  <div key={role.id} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-600">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenPermissionModal(role)}
                            disabled={role.is_system_role}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-xl disabled:opacity-50"
                            title="إدارة الصلاحيات"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(role)}
                            disabled={role.is_system_role}
                            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-xl disabled:opacity-50"
                            title="تعديل الدور"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!role.is_system_role && (
                            <button
                              onClick={() => handleDeleteClick(role)}
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-xl"
                              title="حذف الدور"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-right flex-1">
                          <p className="text-xl font-semibold text-gray-900 dark:text-white">
                            {role.name}
                          </p>
                          <div className="flex gap-2 mt-2 justify-end">
                            {role.is_system_role && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                نظام
                              </span>
                            )}
                            {role.mfa_required && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                                MFA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      {role.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-right leading-relaxed">
                          {role.description}
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-gray-600 dark:text-gray-400">المستخدمون:</p>
                          <p className="text-gray-900 dark:text-white font-medium text-lg">
                            {role.user_count || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600 dark:text-gray-400">مستوى الأمان:</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSecurityLevelColor(role.security_level)}`}>
                            {role.security_level}/10
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600 dark:text-gray-400">مدة الجلسة:</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {role.max_session_hours} ساعة
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600 dark:text-gray-400">كلمة المرور:</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {getPasswordPolicyLabel(role.password_policy)}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="text-right pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          آخر تحديث: {formatDateTime(role.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    الصفحة <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> من <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 ml-2" />
                      السابق
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = currentPage <= 3 ? i + 1 : 
                                   currentPage >= totalPages - 2 ? totalPages - 4 + i : 
                                   currentPage - 2 + i;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm rounded-xl transition-colors ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      التالي
                      <ChevronLeft className="w-4 h-4 mr-2" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Role Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  إنشاء دور جديد
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      اسم الدور *
                    </label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      placeholder="أدخل اسم الدور"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      وصف الدور
                    </label>
                    <textarea
                      value={newRole.description}
                      onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors resize-none"
                      placeholder="وصف مختصر للدور والصلاحيات..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        مستوى الأمان
                      </label>
                      <select
                        value={newRole.security_level}
                        onChange={(e) => setNewRole(prev => ({ ...prev, security_level: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                          <option key={level} value={level}>مستوى {level}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        مستوى الأمان يحدد صلاحيات الوصول والحماية
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        مدة الجلسة (ساعات)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={newRole.max_session_hours}
                        onChange={(e) => setNewRole(prev => ({ ...prev, max_session_hours: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        مدة بقاء المستخدم مسجلاً دخولاً
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        سياسة كلمة المرور
                      </label>
                      <select
                        value={newRole.password_policy}
                        onChange={(e) => setNewRole(prev => ({ ...prev, password_policy: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      >
                        {passwordPolicies.map(policy => (
                          <option key={policy} value={policy}>{getPasswordPolicyLabel(policy)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        يتطلب المصادقة الثنائية (MFA)
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRole.mfa_required}
                          onChange={(e) => setNewRole(prev => ({ ...prev, mfa_required: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={processing || !newRole.name.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium shadow-lg shadow-indigo-500/25"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  إنشاء الدور
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Role Modal */}
        {isEditModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  تعديل الدور: {selectedRole.name}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      اسم الدور *
                    </label>
                    <input
                      type="text"
                      value={editRole.name}
                      onChange={(e) => setEditRole(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      وصف الدور
                    </label>
                    <textarea
                      value={editRole.description}
                      onChange={(e) => setEditRole(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        مستوى الأمان
                      </label>
                      <select
                        value={editRole.security_level}
                        onChange={(e) => setEditRole(prev => ({ ...prev, security_level: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                          <option key={level} value={level}>مستوى {level}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        مدة الجلسة (ساعات)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={editRole.max_session_hours}
                        onChange={(e) => setEditRole(prev => ({ ...prev, max_session_hours: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        سياسة كلمة المرور
                      </label>
                      <select
                        value={editRole.password_policy}
                        onChange={(e) => setEditRole(prev => ({ ...prev, password_policy: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      >
                        {passwordPolicies.map(policy => (
                          <option key={policy} value={policy}>{getPasswordPolicyLabel(policy)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        يتطلب المصادقة الثنائية (MFA)
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editRole.mfa_required}
                          onChange={(e) => setEditRole(prev => ({ ...prev, mfa_required: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleEditRole}
                  disabled={processing || !editRole.name.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium shadow-lg shadow-indigo-500/25"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Management Modal */}
        {isPermissionModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    إدارة صلاحيات الدور: {selectedRole.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    تحكم في الصلاحيات والإجراءات المسموحة لهذا الدور
                  </p>
                </div>
                <button
                  onClick={() => setIsPermissionModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">جاري تحميل الصلاحيات...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rolePermissions.map((permission) => {
                      const feature = effectiveFeatures.find(f => f.id === permission.feature_id);
                      if (!feature) return null;

                      return (
                        <div key={permission.id} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-600">
                          {/* Feature Header */}
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-2">
                              {feature.is_system_critical && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800">
                                  <Settings className="w-3 h-3 ml-1" />
                                  نظام
                                </span>
                              )}
                              {feature.requires_super_admin && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Shield className="w-3 h-3 ml-1" />
                                  مسؤول
                                </span>
                              )}
                              {feature.requires_mfa && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                  <Key className="w-3 h-3 ml-1" />
                                  MFA
                                </span>
                              )}
                            </div>
                            <div className="text-right flex-1">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {feature.feature_name}
                              </p>
                              {feature.feature_description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  {feature.feature_description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {feature.feature_code} • {feature.category}
                              </p>
                            </div>
                          </div>

                          {/* Permissions Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-8 gap-4 text-sm">
                            {/* Action Permissions */}
                            <div className="text-center">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <Eye className="w-4 h-4 mx-auto mb-1" />
                                عرض
                              </label>
                              <input
                                type="checkbox"
                                checked={permission.can_view}
                                onChange={(e) => handleUpdatePermission(permission.id, 'can_view', e.target.checked)}
                                disabled={feature.requires_super_admin}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <Plus className="w-4 h-4 mx-auto mb-1" />
                                إنشاء
                              </label>
                              <input
                                type="checkbox"
                                checked={permission.can_create}
                                onChange={(e) => handleUpdatePermission(permission.id, 'can_create', e.target.checked)}
                                disabled={feature.requires_super_admin}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <Edit className="w-4 h-4 mx-auto mb-1" />
                                تعديل
                              </label>
                              <input
                                type="checkbox"
                                checked={permission.can_edit}
                                onChange={(e) => handleUpdatePermission(permission.id, 'can_edit', e.target.checked)}
                                disabled={feature.requires_super_admin}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <Trash2 className="w-4 h-4 mx-auto mb-1" />
                                حذف
                              </label>
                              <input
                                type="checkbox"
                                checked={permission.can_delete}
                                onChange={(e) => handleUpdatePermission(permission.id, 'can_delete', e.target.checked)}
                                disabled={feature.requires_super_admin}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <Download className="w-4 h-4 mx-auto mb-1" />
                                تصدير
                              </label>
                              <input
                                type="checkbox"
                                checked={permission.can_export}
                                onChange={(e) => handleUpdatePermission(permission.id, 'can_export', e.target.checked)}
                                disabled={feature.requires_super_admin}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                                اعتماد
                              </label>
                              <input
                                type="checkbox"
                                checked={permission.can_approve}
                                onChange={(e) => handleUpdatePermission(permission.id, 'can_approve', e.target.checked)}
                                disabled={feature.requires_super_admin}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>

                            {/* Scopes */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3 text-right">
                                نطاق العرض
                              </label>
                              <select
                                value={permission.view_scope}
                                onChange={(e) => handleUpdatePermission(permission.id, 'view_scope', e.target.value)}
                                disabled={feature.requires_super_admin || !permission.can_view}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                              >
                                <option value="NONE">لا شيء</option>
                                <option value="OWN">خاص به</option>
                                <option value="ALL">الكل</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3 text-right">
                                نطاق التعديل
                              </label>
                              <select
                                value={permission.edit_scope}
                                onChange={(e) => handleUpdatePermission(permission.id, 'edit_scope', e.target.value)}
                                disabled={feature.requires_super_admin || !permission.can_edit}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                              >
                                <option value="NONE">لا شيء</option>
                                <option value="OWN">خاص به</option>
                                <option value="ALL">الكل</option>
                              </select>
                            </div>
                          </div>

                          {feature.requires_super_admin && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <p className="text-xs text-yellow-800 dark:text-yellow-300 text-right">
                                ⚠️ هذه الصلاحية تتطلب صلاحيات المسؤول الرئيسي ولا يمكن تعديلها
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsPermissionModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium shadow-lg shadow-indigo-500/25"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  حفظ الصلاحيات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
              <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-right flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    تأكيد حذف الدور
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    هل أنت متأكد من رغبتك في حذف هذا الدور؟
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-800 dark:text-red-300 text-right">
                    <strong className="text-base">{selectedRole.name}</strong>
                    <br />
                    {selectedRole.description && (
                      <span className="text-xs mt-1 block">{selectedRole.description}</span>
                    )}
                  </p>
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-700 dark:text-red-300 text-right">
                      ⚠️ تحذير: سيتم حذف جميع الصلاحيات المرتبطة بهذا الدور
                      <br />
                      ⚠️ لا يمكن التراجع عن هذا الإجراء
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteRole}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium shadow-lg shadow-red-500/25"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  حذف الدور
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagement;
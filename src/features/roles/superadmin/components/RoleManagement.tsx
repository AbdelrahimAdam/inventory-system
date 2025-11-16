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
  Download,
  CheckCircle,
  Settings
} from 'lucide-react';
import { getFirestore } from '../../../../firebase/config';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

interface Role {
  id: string;
  uuid: string;
  name: string;
  description: string | null;
  security_level: number;
  is_system_role: boolean;
  max_session_hours: number;
  password_policy: string;
  mfa_required: boolean;
  created_at: any;
  updated_at: any;
  created_by: string;
  user_count?: number;
}

interface Feature {
  id: string;
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
  id: string;
  role_id: string;
  feature_id: string;
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

  // Real-time Firestore listeners
  useEffect(() => {
    let unsubscribeRoles: () => void;
    let unsubscribeFeatures: () => void;

    const initializeFirestore = async () => {
      try {
        setLoading(true);
        const db = await getFirestore();

        // Real-time roles listener
        let rolesQuery = query(collection(db, 'roles'), orderBy('name'));
        
        unsubscribeRoles = onSnapshot(rolesQuery, 
          (snapshot) => {
            const rolesData: Role[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              rolesData.push({
                id: doc.id,
                ...data
              } as Role);
            });
            
            // Apply filters
            let filteredRoles = rolesData;
            
            if (filters.search) {
              filteredRoles = filteredRoles.filter(role => 
                role.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                (role.description && role.description.toLowerCase().includes(filters.search.toLowerCase()))
              );
            }

            if (filters.isSystemRole) {
              filteredRoles = filteredRoles.filter(role => 
                role.is_system_role === (filters.isSystemRole === 'true')
              );
            }

            if (filters.securityLevel) {
              filteredRoles = filteredRoles.filter(role => 
                role.security_level === parseInt(filters.securityLevel)
              );
            }

            if (filters.mfaRequired) {
              filteredRoles = filteredRoles.filter(role => 
                role.mfa_required === (filters.mfaRequired === 'true')
              );
            }

            // Calculate pagination
            const startIndex = (currentPage - 1) * rolesPerPage;
            const endIndex = startIndex + rolesPerPage;
            const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

            setRoles(paginatedRoles);
            setTotalCount(filteredRoles.length);
            setTotalPages(Math.ceil(filteredRoles.length / rolesPerPage));
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching roles:', error);
            setError('فشل في تحميل الأدوار');
            setLoading(false);
          }
        );

        // Real-time features listener
        const featuresQuery = query(collection(db, 'features'), orderBy('feature_name'));
        
        unsubscribeFeatures = onSnapshot(featuresQuery, 
          (snapshot) => {
            const featuresData: Feature[] = [];
            snapshot.forEach((doc) => {
              featuresData.push({
                id: doc.id,
                ...doc.data()
              } as Feature);
            });
            setFeatures(featuresData);
          },
          (error) => {
            console.error('Error fetching features:', error);
          }
        );

      } catch (error) {
        console.error('Error initializing Firestore:', error);
        setError('فشل في الاتصال بقاعدة البيانات');
        setLoading(false);
      }
    };

    initializeFirestore();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeRoles) unsubscribeRoles();
      if (unsubscribeFeatures) unsubscribeFeatures();
    };
  }, [currentPage, filters]);

  // Initialize default features if collection is empty
  const initializeDefaultFeatures = async () => {
    try {
      const db = await getFirestore();
      const featuresSnapshot = await getDocs(collection(db, 'features'));
      if (featuresSnapshot.empty) {
        const defaultFeatures = getDefaultFeatures();
        const batch = writeBatch(db);
        
        defaultFeatures.forEach(feature => {
          const featureRef = doc(collection(db, 'features'));
          batch.set(featureRef, {
            ...feature,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log('Default features initialized');
      }
    } catch (error) {
      console.error('Error initializing default features:', error);
    }
  };

  // Initialize default system roles if collection is empty
  const initializeDefaultRoles = async () => {
    try {
      const db = await getFirestore();
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      if (rolesSnapshot.empty) {
        const defaultRoles = getDefaultRoles();
        const batch = writeBatch(db);
        
        defaultRoles.forEach(role => {
          const roleRef = doc(collection(db, 'roles'));
          batch.set(roleRef, {
            ...role,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log('Default roles initialized');
      }
    } catch (error) {
      console.error('Error initializing default roles:', error);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    initializeDefaultFeatures();
    initializeDefaultRoles();
  }, []);

  const logSecurityEvent = async (eventType: string, description: string, success: boolean) => {
    try {
      const db = await getFirestore();
      await addDoc(collection(db, 'security_logs'), {
        event_type: eventType,
        event_description: description,
        success,
        severity: success ? 'INFO' : 'ERROR',
        user_id: 'current-user',
        user_email: 'admin@system.com',
        component: 'RoleManagement',
        details: { 
          filters: filters,
          page: currentPage
        },
        timestamp: serverTimestamp()
      });
    } catch (error) {
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

      const db = await getFirestore();

      // Check if role name already exists
      const existingRoleQuery = query(
        collection(db, 'roles'), 
        where('name', '==', newRole.name.trim())
      );
      const existingRoleSnapshot = await getDocs(existingRoleQuery);
      
      if (!existingRoleSnapshot.empty) {
        setError('اسم الدور موجود مسبقاً');
        return;
      }

      const roleData = {
        ...newRole,
        name: newRole.name.trim(),
        description: newRole.description.trim(),
        uuid: generateUUID(),
        is_system_role: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: 'system',
        user_count: 0
      };

      const docRef = await addDoc(collection(db, 'roles'), roleData);
      
      // Create default permissions for the new role
      await createDefaultPermissions(docRef.id);
      
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

      await logSecurityEvent('ROLE_CREATE', `تم إنشاء الدور: ${newRole.name}`, true);

    } catch (err: any) {
      console.error('Error creating role:', err);
      setError(err.message || 'فشل في إنشاء الدور');
      await logSecurityEvent('ROLE_CREATE', `فشل إنشاء الدور: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const createDefaultPermissions = async (roleId: string) => {
    try {
      const db = await getFirestore();
      const featuresSnapshot = await getDocs(collection(db, 'features'));
      const batch = writeBatch(db);
      
      featuresSnapshot.forEach((featureDoc) => {
        const feature = featureDoc.data() as Feature;
        const permissionRef = doc(collection(db, 'role_permissions'));
        batch.set(permissionRef, {
          role_id: roleId,
          feature_id: featureDoc.id,
          can_view: feature.enabled_by_default,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_export: false,
          can_approve: false,
          view_scope: 'NONE',
          edit_scope: 'NONE',
          export_scope: 'NONE',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Failed to create default permissions:', error);
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

      const db = await getFirestore();

      // Check if role name already exists (excluding current role)
      const existingRoleQuery = query(
        collection(db, 'roles'), 
        where('name', '==', editRole.name.trim())
      );
      const existingRoleSnapshot = await getDocs(existingRoleQuery);
      
      const existingRole = existingRoleSnapshot.docs.find(doc => doc.id !== selectedRole.id);
      if (existingRole) {
        setError('اسم الدور موجود مسبقاً');
        return;
      }

      const roleRef = doc(db, 'roles', selectedRole.id);
      await updateDoc(roleRef, {
        name: editRole.name.trim(),
        description: editRole.description.trim(),
        security_level: editRole.security_level,
        max_session_hours: editRole.max_session_hours,
        password_policy: editRole.password_policy,
        mfa_required: editRole.mfa_required,
        updated_at: serverTimestamp()
      });

      setSuccess('تم تحديث الدور بنجاح');
      setIsEditModalOpen(false);
      setSelectedRole(null);

      await logSecurityEvent('ROLE_UPDATE', `تم تحديث الدور: ${editRole.name}`, true);

    } catch (err: any) {
      console.error('Error updating role:', err);
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
      const db = await getFirestore();
      const q = query(
        collection(db, 'role_permissions'), 
        where('role_id', '==', role.id)
      );
      
      const querySnapshot = await getDocs(q);
      const permissionsData: RolePermission[] = [];
      
      for (const permissionDoc of querySnapshot.docs) {
        const permissionData = permissionDoc.data();
        let feature: Feature | undefined;
        
        // Fetch feature details
        if (permissionData.feature_id) {
          const featureDoc = await getDoc(doc(db, 'features', permissionData.feature_id));
          if (featureDoc.exists()) {
            feature = {
              id: featureDoc.id,
              ...featureDoc.data()
            } as Feature;
          }
        }

        permissionsData.push({
          id: permissionDoc.id,
          ...permissionData,
          feature
        } as RolePermission);
      }

      setRolePermissions(permissionsData);
      setIsPermissionModalOpen(true);
      setError('');
      await logSecurityEvent('ROLE_PERMISSIONS_VIEW', `عرض صلاحيات الدور: ${role.name}`, true);

    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message || 'فشل في تحميل الصلاحيات');
      await logSecurityEvent('ROLE_PERMISSIONS_VIEW', `فشل تحميل الصلاحيات: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = (permissionId: string, field: keyof RolePermission, value: any) => {
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

      const db = await getFirestore();
      const batch = writeBatch(db);
      
      rolePermissions.forEach(permission => {
        const permissionRef = doc(db, 'role_permissions', permission.id);
        batch.update(permissionRef, {
          can_view: permission.can_view,
          can_create: permission.can_create,
          can_edit: permission.can_edit,
          can_delete: permission.can_delete,
          can_export: permission.can_export,
          can_approve: permission.can_approve,
          view_scope: permission.view_scope,
          edit_scope: permission.edit_scope,
          export_scope: permission.export_scope,
          updated_at: serverTimestamp()
        });
      });

      await batch.commit();

      setSuccess('تم تحديث الصلاحيات بنجاح');
      setIsPermissionModalOpen(false);
      setSelectedRole(null);
      setRolePermissions([]);

      await logSecurityEvent('ROLE_PERMISSIONS_UPDATE', `تم تحديث صلاحيات الدور: ${selectedRole.name}`, true);

    } catch (err: any) {
      console.error('Error updating permissions:', err);
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

      const db = await getFirestore();

      // Delete role permissions first
      const permissionsQuery = query(
        collection(db, 'role_permissions'), 
        where('role_id', '==', selectedRole.id)
      );
      const permissionsSnapshot = await getDocs(permissionsQuery);
      
      const batch = writeBatch(db);
      permissionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete the role
      batch.delete(doc(db, 'roles', selectedRole.id));
      
      await batch.commit();

      setSuccess('تم حذف الدور بنجاح');
      setIsDeleteModalOpen(false);
      setSelectedRole(null);

      await logSecurityEvent('ROLE_DELETE', `تم حذف الدور: ${selectedRole.name}`, true);

    } catch (err: any) {
      console.error('Error deleting role:', err);
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

  // Helper functions
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const getDefaultFeatures = (): Omit<Feature, 'id'>[] => [
    {
      uuid: generateUUID(),
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
      uuid: generateUUID(),
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
      uuid: generateUUID(),
      feature_code: 'INVENTORY_VIEW',
      feature_name: 'عرض المخزون',
      feature_description: 'عرض عناصر المخزون',
      category: 'INVENTORY',
      is_system_critical: false,
      requires_super_admin: false,
      requires_mfa: false,
      enabled_by_default: true
    },
    {
      uuid: generateUUID(),
      feature_code: 'INVENTORY_MANAGE',
      feature_name: 'إدارة المخزون',
      feature_description: 'إضافة وتعديل وحذف عناصر المخزون',
      category: 'INVENTORY',
      is_system_critical: false,
      requires_super_admin: false,
      requires_mfa: false,
      enabled_by_default: false
    },
    {
      uuid: generateUUID(),
      feature_code: 'REPORTS_VIEW',
      feature_name: 'عرض التقارير',
      feature_description: 'عرض تقارير النظام',
      category: 'REPORTS',
      is_system_critical: false,
      requires_super_admin: false,
      requires_mfa: false,
      enabled_by_default: true
    }
  ];

  const getDefaultRoles = (): Omit<Role, 'id'>[] => [
    {
      uuid: generateUUID(),
      name: 'مدير النظام',
      description: 'صلاحيات كاملة للنظام',
      security_level: 10,
      is_system_role: true,
      max_session_hours: 8,
      password_policy: 'STRONG',
      mfa_required: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: 'system',
      user_count: 1
    },
    {
      uuid: generateUUID(),
      name: 'مشرف',
      description: 'صلاحيات إشرافية',
      security_level: 7,
      is_system_role: false,
      max_session_hours: 8,
      password_policy: 'STANDARD',
      mfa_required: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: 'system',
      user_count: 0
    },
    {
      uuid: generateUUID(),
      name: 'مستخدم عادي',
      description: 'صلاحيات أساسية',
      security_level: 3,
      is_system_role: false,
      max_session_hours: 8,
      password_policy: 'STANDARD',
      mfa_required: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: 'system',
      user_count: 0
    }
  ];

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

  const formatDateTime = (date: any): string => {
    if (!date) return 'غير محدد';
    
    try {
      let dateObj;
      if (date.toDate) {
        dateObj = date.toDate();
      } else if (date.seconds) {
        dateObj = new Date(date.seconds * 1000);
      } else {
        dateObj = new Date(date);
      }
      
      return dateObj.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'غير محدد';
    }
  };

  const getSecurityLevelColor = (level: number): string => {
    if (level <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
    if (level <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (level <= 8) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
  };

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
                      const feature = permission.feature;
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
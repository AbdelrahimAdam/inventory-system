// src/features/roles/superadmin/components/FeatureManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit, Save, X, ChevronLeft, ChevronRight, Search, Trash2, AlertTriangle } from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

interface FeaturesResponse {
  features: Feature[];
  total_count: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const FeatureManagement: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const featuresPerPage = 10;

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    isSystemCritical: '',
    requiresSuperAdmin: ''
  });

  const [newFeature, setNewFeature] = useState({
    feature_code: '',
    feature_name: '',
    feature_description: '',
    category: 'general',
    is_system_critical: false,
    requires_super_admin: false,
    requires_mfa: false,
    enabled_by_default: true
  });

  const categories = [
    'general',
    'admin', 
    'security',
    'inventory',
    'factory',
    'reporting',
    'user_management'
  ];

  // Fetch features with security integration
  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: featuresPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.isSystemCritical && { is_system_critical: filters.isSystemCritical }),
        ...(filters.requiresSuperAdmin && { requires_super_admin: filters.requiresSuperAdmin })
      });

      const response = await fetch(`/api/superadmin/features?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل الميزات');
      }

      const data: FeaturesResponse = await response.json();
      
      setFeatures(data.features || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);

      await logSecurityEvent('FEATURES_VIEW', 'عرض إدارة الميزات', true);
      setSuccess(`تم تحميل ${data.features?.length || 0} ميزة`);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الميزات');
      await logSecurityEvent('FEATURES_VIEW', `فشل تحميل الميزات: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const logSecurityEvent = async (eventType: string, description: string, success: boolean) => {
    try {
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          event_type: eventType,
          event_description: description,
          success,
          severity: success ? 'INFO' : 'ERROR',
          details: { 
            component: 'FeatureManagement',
            filters: filters,
            page: currentPage
          }
        })
      });
    } catch (error) {
      console.error('فشل في تسجيل حدث الأمان:', error);
    }
  };

  const handleCreateFeature = async () => {
    try {
      setProcessing(true);
      setError('');

      if (!newFeature.feature_code || !newFeature.feature_name) {
        setError('كود الميزة واسم الميزة مطلوبان');
        return;
      }

      const response = await fetch('/api/superadmin/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newFeature)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إنشاء الميزة');
      }

      setSuccess('تم إنشاء الميزة بنجاح');
      setNewFeature({
        feature_code: '',
        feature_name: '',
        feature_description: '',
        category: 'general',
        is_system_critical: false,
        requires_super_admin: false,
        requires_mfa: false,
        enabled_by_default: true
      });
      setIsCreateModalOpen(false);
      fetchFeatures();

      await logSecurityEvent('FEATURE_CREATE', `تم إنشاء الميزة: ${newFeature.feature_code}`, true);

    } catch (err: any) {
      setError(err.message || 'فشل في إنشاء الميزة');
      await logSecurityEvent('FEATURE_CREATE', `فشل إنشاء الميزة: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateFeature = async () => {
    try {
      if (!selectedFeature) return;
      
      setProcessing(true);
      setError('');

      const response = await fetch(`/api/superadmin/features/${selectedFeature.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(selectedFeature)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث الميزة');
      }

      setSuccess('تم تحديث الميزة بنجاح');
      setIsEditModalOpen(false);
      setSelectedFeature(null);
      fetchFeatures();

      await logSecurityEvent('FEATURE_UPDATE', `تم تحديث الميزة: ${selectedFeature.feature_code}`, true);

    } catch (err: any) {
      setError(err.message || 'فشل في تحديث الميزة');
      await logSecurityEvent('FEATURE_UPDATE', `فشل تحديث الميزة: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteFeature = async () => {
    try {
      if (!selectedFeature) return;
      
      setProcessing(true);
      setError('');

      if (selectedFeature.is_system_critical) {
        setError('لا يمكن حذف الميزات الحاسمة للنظام');
        return;
      }

      const response = await fetch(`/api/superadmin/features/${selectedFeature.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في حذف الميزة');
      }

      setSuccess('تم حذف الميزة بنجاح');
      setIsDeleteModalOpen(false);
      setSelectedFeature(null);
      fetchFeatures();

      await logSecurityEvent('FEATURE_DELETE', `تم حذف الميزة: ${selectedFeature.feature_code}`, true);

    } catch (err: any) {
      setError(err.message || 'فشل في حذف الميزة');
      await logSecurityEvent('FEATURE_DELETE', `فشل حذف الميزة: ${err.message}`, false);
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
      category: '',
      isSystemCritical: '',
      requiresSuperAdmin: ''
    });
    setCurrentPage(1);
  };

  const handleEditFeature = (feature: Feature) => {
    setSelectedFeature({...feature});
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsDeleteModalOpen(true);
  };

  const getCategoryLabel = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'general': 'عام',
      'admin': 'إداري',
      'security': 'أمان',
      'inventory': 'مخزون',
      'factory': 'مصنع',
      'reporting': 'تقارير',
      'user_management': 'إدارة المستخدمين'
    };
    return categoryMap[category] || category;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                إدارة الميزات
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                إدارة صلاحيات وميزات النظام
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إنشاء ميزة جديدة
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                بحث
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="ابحث في الميزات..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                الفئة
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              >
                <option value="">جميع الفئات</option>
                {categories.map(category => (
                  <option key={category} value={category}>{getCategoryLabel(category)}</option>
                ))}
              </select>
            </div>

            {/* System Critical */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                حاسم للنظام
              </label>
              <select
                value={filters.isSystemCritical}
                onChange={(e) => handleFilterChange('isSystemCritical', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              >
                <option value="">الكل</option>
                <option value="true">نعم</option>
                <option value="false">لا</option>
              </select>
            </div>

            {/* Requires Super Admin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                يتطلب مسؤول رئيسي
              </label>
              <select
                value={filters.requiresSuperAdmin}
                onChange={(e) => handleFilterChange('requiresSuperAdmin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              >
                <option value="">الكل</option>
                <option value="true">نعم</option>
                <option value="false">لا</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            إجمالي الميزات: <span className="font-medium">{totalCount}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            الصفحة {currentPage} من {totalPages}
          </p>
        </div>

        {/* Features Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">جاري تحميل الميزات...</p>
            </div>
          ) : features.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد ميزات</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                لم يتم العثور على ميزات تطابق معايير البحث
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        كود الميزة
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الاسم والوصف
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الفئة
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الإعدادات
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
                    {features.map((feature) => (
                      <tr key={feature.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                              {feature.feature_code}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {feature.feature_name}
                            </p>
                            {feature.feature_description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {feature.feature_description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            {getCategoryLabel(feature.category)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {feature.is_system_critical && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                نظام
                              </span>
                            )}
                            {feature.requires_super_admin && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                                مسؤول
                              </span>
                            )}
                            {feature.requires_mfa && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                                MFA
                              </span>
                            )}
                            {feature.enabled_by_default && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                مفعل
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                            {formatDateTime(feature.updated_at)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleEditFeature(feature)}
                              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                              disabled={processing}
                            >
                              <Edit className="w-3 h-3 ml-1" />
                              تعديل
                            </button>
                            {!feature.is_system_critical && (
                              <button
                                onClick={() => handleDeleteClick(feature)}
                                className="flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                                disabled={processing}
                              >
                                <Trash2 className="w-3 h-3 ml-1" />
                                حذف
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
                {features.map((feature) => (
                  <div key={feature.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditFeature(feature)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!feature.is_system_critical && (
                            <button
                              onClick={() => handleDeleteClick(feature)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                            {feature.feature_code}
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {feature.feature_name}
                          </p>
                        </div>
                      </div>
                      
                      {feature.feature_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                          {feature.feature_description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 justify-end">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {getCategoryLabel(feature.category)}
                        </span>
                        {feature.is_system_critical && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                            نظام
                          </span>
                        )}
                        {feature.requires_super_admin && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                            مسؤول
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          آخر تحديث: {formatDateTime(feature.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 ml-2" />
                    السابق
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : 
                                 currentPage >= totalPages - 2 ? totalPages - 4 + i : 
                                 currentPage - 2 + i;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
              )}
            </>
          )}
        </div>

        {/* Create Feature Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right">
                  إنشاء ميزة جديدة
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    كود الميزة *
                  </label>
                  <input
                    type="text"
                    value={newFeature.feature_code}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, feature_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                    placeholder="USER_MANAGE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    اسم الميزة *
                  </label>
                  <input
                    type="text"
                    value={newFeature.feature_name}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, feature_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                    placeholder="إدارة المستخدمين"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    الوصف
                  </label>
                  <textarea
                    value={newFeature.feature_description}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, feature_description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                    placeholder="وصف الميزة..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    الفئة
                  </label>
                  <select
                    value={newFeature.category}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{getCategoryLabel(category)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      حاسم للنظام
                    </span>
                    <input
                      type="checkbox"
                      checked={newFeature.is_system_critical}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, is_system_critical: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      يتطلب مسؤول رئيسي
                    </span>
                    <input
                      type="checkbox"
                      checked={newFeature.requires_super_admin}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, requires_super_admin: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      يتطلب MFA
                    </span>
                    <input
                      type="checkbox"
                      checked={newFeature.requires_mfa}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, requires_mfa: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      مفعل افتراضياً
                    </span>
                    <input
                      type="checkbox"
                      checked={newFeature.enabled_by_default}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, enabled_by_default: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateFeature}
                  disabled={processing || !newFeature.feature_code || !newFeature.feature_name}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  إنشاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Feature Modal */}
        {isEditModalOpen && selectedFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right">
                  تعديل الميزة
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    كود الميزة
                  </label>
                  <input
                    type="text"
                    value={selectedFeature.feature_code}
                    onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, feature_code: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    اسم الميزة
                  </label>
                  <input
                    type="text"
                    value={selectedFeature.feature_name}
                    onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, feature_name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    الوصف
                  </label>
                  <textarea
                    value={selectedFeature.feature_description || ''}
                    onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, feature_description: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    الفئة
                  </label>
                  <select
                    value={selectedFeature.category}
                    onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{getCategoryLabel(category)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      حاسم للنظام
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedFeature.is_system_critical}
                      onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, is_system_critical: e.target.checked } : null)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      يتطلب مسؤول رئيسي
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedFeature.requires_super_admin}
                      onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, requires_super_admin: e.target.checked } : null)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      يتطلب MFA
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedFeature.requires_mfa}
                      onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, requires_mfa: e.target.checked } : null)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                      مفعل افتراضياً
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedFeature.enabled_by_default}
                      onChange={(e) => setSelectedFeature(prev => prev ? { ...prev, enabled_by_default: e.target.checked } : null)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateFeature}
                  disabled={processing || !selectedFeature.feature_code || !selectedFeature.feature_name}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
              <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-right flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    تأكيد الحذف
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    هل أنت متأكد من رغبتك في حذف هذه الميزة؟
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-800 dark:text-red-300 text-right">
                    <strong>{selectedFeature.feature_name}</strong>
                    <br />
                    <span className="font-mono">{selectedFeature.feature_code}</span>
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-right">
                    لا يمكن التراجع عن هذا الإجراء
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteFeature}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureManagement;
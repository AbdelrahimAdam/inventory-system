// src/features/roles/superadmin/components/AuditLogs.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Filter, ChevronLeft, ChevronRight, Search, Download, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: number;
  uuid: string;
  operation_type: string;
  target_user_id: number | null;
  performed_by: number;
  performed_by_username: string;
  target_username: string | null;
  details: any;
  ip_address: string;
  user_agent: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  created_at: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total_count: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const logsPerPage = 20;

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    operationType: '',
    severity: '',
    search: '',
  });

  const operationTypes = [
    'USER_CREATE',
    'USER_UPDATE', 
    'USER_DELETE',
    'ROLE_CREATE',
    'ROLE_UPDATE',
    'PERMISSION_UPDATE',
    'SYSTEM_CONFIG_UPDATE',
    'LOGIN_ATTEMPT',
    'SECURITY_EVENT',
    'DATA_EXPORT',
    'BACKUP_OPERATION'
  ];

  const severityLevels = [
    'INFO',
    'WARN', 
    'ERROR',
    'CRITICAL'
  ];

  // Fetch audit logs with security integration
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: logsPerPage.toString(),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.userId && { user_id: filters.userId }),
        ...(filters.operationType && { operation_type: filters.operationType }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/superadmin/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل سجلات التدقيق');
      }

      const data: AuditLogsResponse = await response.json();
      
      setLogs(data.logs || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);

      await logSecurityEvent('AUDIT_LOGS_VIEW', 'عرض سجلات التدقيق', true);
      setSuccess(`تم تحميل ${data.logs?.length || 0} سجل`);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل سجلات التدقيق');
      await logSecurityEvent('AUDIT_LOGS_VIEW', `فشل تحميل سجلات التدقيق: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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
            component: 'AuditLogs',
            filters: filters,
            page: currentPage
          }
        })
      });
    } catch (error) {
      console.error('فشل في تسجيل حدث الأمان:', error);
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleExportLogs = async () => {
    try {
      setProcessing(true);
      setError('');

      const response = await fetch('/api/superadmin/audit-logs/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تصدير السجلات');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await logSecurityEvent('AUDIT_LOGS_EXPORT', 'تصدير سجلات التدقيق', true);
      setSuccess('تم تصدير السجلات بنجاح');

    } catch (err: any) {
      setError(err.message || 'فشل في تصدير السجلات');
      await logSecurityEvent('AUDIT_LOGS_EXPORT', `فشل تصدير السجلات: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      operationType: '',
      severity: '',
      search: '',
    });
    setCurrentPage(1);
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'ERROR': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'حرج';
      case 'ERROR': return 'خطأ';
      case 'WARN': return 'تحذير';
      default: return 'معلومات';
    }
  };

  const getOperationTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'USER_CREATE': 'إنشاء مستخدم',
      'USER_UPDATE': 'تحديث مستخدم',
      'USER_DELETE': 'حذف مستخدم',
      'ROLE_CREATE': 'إنشاء دور',
      'ROLE_UPDATE': 'تحديث دور',
      'PERMISSION_UPDATE': 'تحديث الصلاحيات',
      'SYSTEM_CONFIG_UPDATE': 'تحديث إعدادات النظام',
      'LOGIN_ATTEMPT': 'محاولة تسجيل دخول',
      'SECURITY_EVENT': 'حدث أمان',
      'DATA_EXPORT': 'تصدير بيانات',
      'BACKUP_OPERATION': 'عملية نسخ احتياطي'
    };
    return typeMap[type] || type;
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

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return formatDateTime(dateString);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                سجلات التدقيق
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                مراقبة وإدارة سجلات أنشطة النظام
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              <button
                onClick={handleExportLogs}
                disabled={processing || logs.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
              <button
                onClick={fetchAuditLogs}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث
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
                  placeholder="ابحث في السجلات..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Operation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                نوع العملية
              </label>
              <select
                value={filters.operationType}
                onChange={(e) => handleFilterChange('operationType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              >
                <option value="">جميع العمليات</option>
                {operationTypes.map(type => (
                  <option key={type} value={type}>{getOperationTypeLabel(type)}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                مستوى الخطورة
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              >
                <option value="">جميع المستويات</option>
                {severityLevels.map(level => (
                  <option key={level} value={level}>{getSeverityLabel(level)}</option>
                ))}
              </select>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                معرف المستخدم
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="أدخل معرف المستخدم"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                من تاريخ
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            إجمالي السجلات: <span className="font-medium">{totalCount}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            الصفحة {currentPage} من {totalPages}
          </p>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">جاري تحميل السجلات...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد سجلات</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                لم يتم العثور على سجلات تطابق معايير البحث
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
                        العملية
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        المستخدم
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        المستخدم المستهدف
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الخطورة
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        العنوان IP
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الوقت
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {getOperationTypeLabel(log.operation_type)}
                            </p>
                            {log.details && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white text-right">
                            {log.performed_by_username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                            ID: {log.performed_by}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white text-right">
                            {log.target_username || '—'}
                          </p>
                          {log.target_user_id && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                              ID: {log.target_user_id}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                            {getSeverityLabel(log.severity)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white text-right font-mono">
                            {log.ip_address}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-900 dark:text-white">
                              {formatDateTime(log.created_at)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {getTimeAgo(log.created_at)}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {logs.map((log) => (
                  <div key={log.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                          {getSeverityLabel(log.severity)}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getOperationTypeLabel(log.operation_type)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getTimeAgo(log.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-gray-600 dark:text-gray-400">المستخدم:</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {log.performed_by_username}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600 dark:text-gray-400">المستخدم المستهدف:</p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {log.target_username || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          IP: {log.ip_address}
                        </p>
                        {log.details && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
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
      </div>
    </div>
  );
};

export default AuditLogs;
// src/components/SecurityLogs.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SecurityLog {
  id: number;
  uuid: string;
  event_type: string;
  event_description: string;
  user_id: number | null;
  username: string | null;
  ip_address: string;
  user_agent: string | null;
  request_method: string | null;
  request_path: string | null;
  request_params: any;
  success: boolean;
  severity: string;
  details: any;
  created_at: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface Filters {
  eventType: string;
  severity: string;
  success: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  username: string;
  ipAddress: string;
}

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  });
  const [filters, setFilters] = useState<Filters>({
    eventType: '',
    severity: '',
    success: '',
    dateRange: {
      start: subDays(new Date(), 7),
      end: new Date()
    },
    username: '',
    ipAddress: ''
  });
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [exporting, setExporting] = useState(false);

  // Event types from your schema
  const eventTypes = useMemo(() => [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_LOCKOUT', 'LOGIN_ERROR', 'LOGIN_ATTEMPT',
    'PASSWORD_CHANGE', 'PASSWORD_CHANGE_ATTEMPT', 'PASSWORD_CHANGE_FAILED', 'PASSWORD_CHANGE_ERROR',
    'PERMISSION_CHANGE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_CHANGE',
    'DATA_EXPORT', 'SENSITIVE_ACCESS', 'UNAUTHORIZED_ACCESS', 'SYSTEM_CONFIG',
    'SYSTEM_DEPLOYMENT', 'BACKUP_OPERATION', 'AUTHENTICATION_ERROR', 'ROLES_FETCHED',
    'TOKEN_VERIFY_FAILED', 'TOKEN_VERIFY_SUCCESS', 'TOKEN_VERIFY_ERROR',
    'REFRESH_TOKEN_ATTEMPT', 'REFRESH_TOKEN_FAILED', 'REFRESH_TOKEN_SUCCESS', 'REFRESH_TOKEN_ERROR',
    'SETTINGS_UPDATE_ATTEMPT', 'SETTINGS_UPDATE_FAILED', 'SETTINGS_UPDATE', 'SETTINGS_UPDATE_ERROR',
    'LOGOUT', 'LOGOUT_ERROR', 'PERMISSIONS_FETCHED', 'PERMISSIONS_FETCH_ERROR',
    'REGISTER_ATTEMPT', 'REGISTER_FAILED', 'REGISTER_WARNING', 'REGISTER_SUCCESS', 'REGISTER_ERROR',
    'FACTORY_REGISTER_ATTEMPT', 'FACTORY_REGISTER_FAILED', 'FACTORY_REGISTER_WARNING',
    'FACTORY_REGISTER_SUCCESS', 'FACTORY_REGISTER_ERROR', 'RESEND_VERIFICATION_ATTEMPT',
    'RESEND_VERIFICATION_FAILED', 'RESEND_VERIFICATION_SUCCESS', 'RESEND_VERIFICATION_ERROR',
    'EMAIL_VERIFICATION_ATTEMPT', 'EMAIL_VERIFICATION_FAILED', 'EMAIL_VERIFICATION_SUCCESS',
    'EMAIL_VERIFICATION_ERROR', 'MFA_VERIFY_ATTEMPT', 'MFA_VERIFY_FAILED', 'MFA_VERIFY_SUCCESS',
    'MFA_VERIFY_ERROR', 'GET_ME_FAILED', 'GET_ME_SUCCESS', 'GET_ME_ERROR'
  ], []);

  const severityLevels = useMemo(() => [
    'INFO', 'WARN', 'ERROR'
  ], []);

  const successOptions = useMemo(() => [
    { value: '', label: 'الكل' },
    { value: 'true', label: 'ناجح' },
    { value: 'false', label: 'فاشل' }
  ], []);

  const buildQueryParams = useCallback((currentFilters: Filters, page: number) => {
    const params = new URLSearchParams();
    
    params.append('page', page.toString());
    params.append('limit', pagination.itemsPerPage.toString());
    
    if (currentFilters.eventType) {
      params.append('event_type', currentFilters.eventType);
    }
    
    if (currentFilters.severity) {
      params.append('severity', currentFilters.severity);
    }
    
    if (currentFilters.success) {
      params.append('success', currentFilters.success);
    }
    
    if (currentFilters.username) {
      params.append('username', currentFilters.username);
    }
    
    if (currentFilters.ipAddress) {
      params.append('ip_address', currentFilters.ipAddress);
    }
    
    if (currentFilters.dateRange.start) {
      params.append('start_date', startOfDay(currentFilters.dateRange.start).toISOString());
    }
    
    if (currentFilters.dateRange.end) {
      params.append('end_date', endOfDay(currentFilters.dateRange.end).toISOString());
    }
    
    return params.toString();
  }, [pagination.itemsPerPage]);

  const fetchLogs = useCallback(async (page: number = 1, currentFilters: Filters = filters) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = buildQueryParams(currentFilters, page);
      const response = await fetch(`/api/security/logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل سجلات الأمان');
      }

      const data = await response.json();
      
      setLogs(data.logs || []);
      setPagination(data.pagination || {
        currentPage: page,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: pagination.itemsPerPage
      });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل السجلات');
      console.error('Error fetching security logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryParams, pagination.itemsPerPage]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleDateRangeChange = (key: 'start' | 'end', value: Date | null) => {
    const newDateRange = { ...filters.dateRange, [key]: value };
    setFilters({ ...filters, dateRange: newDateRange });
  };

  const handleApplyFilters = () => {
    fetchLogs(1, filters);
  };

  const handleResetFilters = () => {
    const resetFilters: Filters = {
      eventType: '',
      severity: '',
      success: '',
      dateRange: {
        start: subDays(new Date(), 7),
        end: new Date()
      },
      username: '',
      ipAddress: ''
    };
    setFilters(resetFilters);
    fetchLogs(1, resetFilters);
  };

  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const queryParams = buildQueryParams(filters, 1);
      const response = await fetch(`/api/security/logs/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تصدير السجلات');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Log export event
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          event_type: 'DATA_EXPORT',
          event_description: 'تم تصدير سجلات الأمان',
          success: true,
          severity: 'INFO',
          details: { filters, format: 'CSV' }
        })
      });
      
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التصدير');
      
      // Log export failure
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          event_type: 'DATA_EXPORT',
          event_description: 'فشل تصدير سجلات الأمان',
          success: false,
          severity: 'ERROR',
          details: { error: err.message }
        })
      });
    } finally {
      setExporting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'INFO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSuccessIcon = (success: boolean) => {
    return success ? (
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  };

  const formatEventType = (eventType: string) => {
    return eventType.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ar });
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-lg transition-colors ${
            pagination.currentPage === i
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          عرض {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} -{' '}
          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} من{' '}
          {pagination.totalItems} سجل
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {pages}
          
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderLogDetails = () => {
    if (!selectedLog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              تفاصيل سجل الأمان
            </h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    نوع الحدث
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatEventType(selectedLog.event_type)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الوصف
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {selectedLog.event_description}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    المستخدم
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {selectedLog.username || 'غير معروف'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    عنوان IP
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-900 dark:text-white font-mono">
                      {selectedLog.ip_address}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    مستوى الخطورة
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedLog.severity)}`}>
                      {selectedLog.severity}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الحالة
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      {getSuccessIcon(selectedLog.success)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {selectedLog.success ? 'ناجح' : 'فاشل'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الوقت
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatDateTime(selectedLog.created_at)}
                    </span>
                  </div>
                </div>
                
                {selectedLog.request_path && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      المسار
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-900 dark:text-white font-mono">
                        {selectedLog.request_method} {selectedLog.request_path}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  التفاصيل الإضافية
                </label>
                <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-auto text-sm text-gray-900 dark:text-white">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedLog.user_agent && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Agent
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-900 dark:text-white break-all">
                    {selectedLog.user_agent}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                سجلات الأمان
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                مراقبة وتحليل أحداث الأمان في النظام
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button
                onClick={handleExport}
                disabled={exporting || logs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    تصدير CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الحدث
              </label>
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                <option value="">كل الأحداث</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {formatEventType(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                مستوى الخطورة
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                <option value="">كل المستويات</option>
                {severityLevels.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Success Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الحالة
              </label>
              <select
                value={filters.success}
                onChange={(e) => handleFilterChange('success', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                {successOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Username Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="البحث باسم المستخدم..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Date Range Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                من تاريخ
              </label>
              <input
                type="date"
                value={filters.dateRange.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value ? parseISO(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filters.dateRange.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value ? parseISO(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              />
            </div>

            {/* IP Address Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                عنوان IP
              </label>
              <input
                type="text"
                value={filters.ipAddress}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                placeholder="البحث بعنوان IP..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
              تطبيق الفلتر
            </button>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              إعادة التعيين
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600 dark:text-gray-400">جاري تحميل سجلات الأمان...</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد سجلات</h3>
              <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على سجلات أمان تطابق معايير البحث.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        الحدث
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        المستخدم
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        IP
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        الخطورة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        الحالة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        الوقت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatEventType(log.event_type)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {log.event_description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {log.username || 'غير معروف'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900 dark:text-white">
                            {log.ip_address}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getSuccessIcon(log.success)}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {log.success ? 'ناجح' : 'فاشل'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDateTime(log.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  {renderPagination()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Log Details Modal */}
        {renderLogDetails()}
      </div>
    </div>
  );
};

export default SecurityLogs;
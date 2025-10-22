// src/features/roles/superadmin/components/SystemConfig.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface SystemConfig {
  id: number;
  uuid: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description: string;
  is_editable: boolean;
  is_sensitive: boolean;
  min_value?: string;
  max_value?: string;
  allowed_values?: string[];
  created_by: number;
  created_at: string;
  updated_at: string;
  updated_by?: number;
}

interface SystemConfigForm {
  config_value: string;
}

const SystemConfig: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SystemConfigForm>();
  
  const categories = [
    { value: 'all', label: 'جميع الإعدادات' },
    { value: 'security', label: 'الأمان' },
    { value: 'authentication', label: 'المصادقة' },
    { value: 'session', label: 'الجلسات' },
    { value: 'email', label: 'البريد الإلكتروني' },
    { value: 'system', label: 'النظام' },
    { value: 'performance', label: 'الأداء' },
    { value: 'backup', label: 'النسخ الاحتياطي' }
  ];

  // Fetch system configurations
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/system/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل إعدادات النظام');
      }

      const data = await response.json();
      setConfigs(data.configs || []);
      
      // Log security event
      await logSecurityEvent('SYSTEM_CONFIG_ACCESS', 'تم الوصول إلى إعدادات النظام', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الإعدادات');
      await logSecurityEvent('SYSTEM_CONFIG_ACCESS', `فشل الوصول إلى إعدادات النظام: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Filter configurations based on search and category
  useEffect(() => {
    let filtered = configs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(config =>
        config.config_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category (based on config key patterns)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(config => {
        const key = config.config_key.toLowerCase();
        switch (categoryFilter) {
          case 'security':
            return key.includes('password') || key.includes('secret') || key.includes('auth') || key.includes('security');
          case 'authentication':
            return key.includes('login') || key.includes('mfa') || key.includes('token') || key.includes('session');
          case 'session':
            return key.includes('session') || key.includes('timeout') || key.includes('expiry');
          case 'email':
            return key.includes('email') || key.includes('smtp') || key.includes('mail');
          case 'performance':
            return key.includes('timeout') || key.includes('limit') || key.includes('pool') || key.includes('cache');
          case 'backup':
            return key.includes('backup') || key.includes('export') || key.includes('archive');
          case 'system':
            return !key.includes('password') && !key.includes('secret') && !key.includes('auth') && 
                   !key.includes('session') && !key.includes('email') && !key.includes('performance') && 
                   !key.includes('backup');
          default:
            return true;
        }
      });
    }

    // Filter sensitive values
    if (!showSensitive) {
      filtered = filtered.filter(config => !config.is_sensitive);
    }

    setFilteredConfigs(filtered);
  }, [configs, searchTerm, categoryFilter, showSensitive]);

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
          details: { component: 'SystemConfig' }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    reset({ config_value: config.config_value });
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    reset();
  };

  const onSubmit = async (data: SystemConfigForm) => {
    if (!editingConfig) return;

    try {
      setSaving(editingConfig.config_key);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/system/config/${editingConfig.uuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          config_value: data.config_value,
          updated_by: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث الإعداد');
      }

      // Update local state
      setConfigs(prev => prev.map(config =>
        config.uuid === editingConfig.uuid
          ? { ...config, config_value: data.config_value, updated_at: new Date().toISOString() }
          : config
      ));

      setSuccess(`تم تحديث الإعداد ${editingConfig.config_key} بنجاح`);
      setEditingConfig(null);
      reset();

      // Log security event
      await logSecurityEvent('SYSTEM_CONFIG_UPDATE', `تم تحديث إعداد النظام: ${editingConfig.config_key}`, true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث الإعداد');
      await logSecurityEvent('SYSTEM_CONFIG_UPDATE', `فشل تحديث إعداد النظام: ${editingConfig?.config_key} - ${err.message}`, false);
    } finally {
      setSaving(null);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    // In a real app, this would come from your auth context
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const handleResetToDefault = async (config: SystemConfig) => {
    if (!confirm(`هل أنت متأكد من إعادة تعيين ${config.config_key} إلى القيمة الافتراضية؟`)) {
      return;
    }

    try {
      setSaving(config.config_key);
      setError('');

      const response = await fetch(`/api/system/config/${config.uuid}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في إعادة التعيين');
      }

      const defaultData = await response.json();
      
      // Update local state
      setConfigs(prev => prev.map(c =>
        c.uuid === config.uuid
          ? { ...c, config_value: defaultData.default_value, updated_at: new Date().toISOString() }
          : c
      ));

      setSuccess(`تم إعادة تعيين ${config.config_key} إلى القيمة الافتراضية`);
      
      await logSecurityEvent('SYSTEM_CONFIG_RESET', `تم إعادة تعيين إعداد النظام: ${config.config_key}`, true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إعادة التعيين');
      await logSecurityEvent('SYSTEM_CONFIG_RESET', `فشل إعادة تعيين إعداد النظام: ${config.config_key} - ${err.message}`, false);
    } finally {
      setSaving(null);
    }
  };

  const renderConfigValue = (config: SystemConfig) => {
    if (config.is_sensitive && !showSensitive) {
      return (
        <span className="text-gray-400 dark:text-gray-500 font-mono">
          ••••••••••••••••
        </span>
      );
    }

    switch (config.config_type) {
      case 'boolean':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            config.config_value === 'true' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}>
            {config.config_value === 'true' ? 'مفعل' : 'معطل'}
          </span>
        );
      
      case 'json':
        try {
          const parsed = JSON.parse(config.config_value);
          return (
            <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          return <span className="text-red-500 font-mono text-sm">{config.config_value}</span>;
        }
      
      case 'array':
        try {
          const parsed = JSON.parse(config.config_value);
          return (
            <div className="flex flex-wrap gap-1">
              {Array.isArray(parsed) && parsed.map((item, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs">
                  {item}
                </span>
              ))}
            </div>
          );
        } catch {
          return <span className="text-red-500 font-mono text-sm">{config.config_value}</span>;
        }
      
      default:
        return (
          <span className="font-mono text-sm text-gray-900 dark:text-white break-all">
            {config.config_value}
          </span>
        );
    }
  };

  const renderEditField = (config: SystemConfig) => {
    const value = watch('config_value');

    switch (config.config_type) {
      case 'boolean':
        return (
          <select
            {...register('config_value', { required: 'هذا الحقل مطلوب' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
          >
            <option value="true">مفعل</option>
            <option value="false">معطل</option>
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            {...register('config_value', {
              required: 'هذا الحقل مطلوب',
              min: config.min_value ? { value: Number(config.min_value), message: `القيمة يجب أن تكون ${config.min_value} على الأقل` } : undefined,
              max: config.max_value ? { value: Number(config.max_value), message: `القيمة يجب أن تكون ${config.max_value} على الأكثر` } : undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
          />
        );

      case 'json':
        return (
          <textarea
            {...register('config_value', {
              required: 'هذا الحقل مطلوب',
              validate: {
                validJson: (v) => {
                  try {
                    JSON.parse(v);
                    return true;
                  } catch {
                    return 'صيغة JSON غير صالحة';
                  }
                }
              }
            })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors font-mono text-sm"
            placeholder='{"key": "value"}'
          />
        );

      case 'array':
        return (
          <textarea
            {...register('config_value', {
              required: 'هذا الحقل مطلوب',
              validate: {
                validArray: (v) => {
                  try {
                    const parsed = JSON.parse(v);
                    return Array.isArray(parsed) || 'يجب أن تكون القيمة مصفوفة';
                  } catch {
                    return 'صيغة JSON غير صالحة';
                  }
                }
              }
            })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors font-mono text-sm"
            placeholder='["item1", "item2"]'
          />
        );

      default:
        return config.allowed_values && config.allowed_values.length > 0 ? (
          <select
            {...register('config_value', { required: 'هذا الحقل مطلوب' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
          >
            {config.allowed_values.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        ) : (
          <input
            type={config.is_sensitive ? 'password' : 'text'}
            {...register('config_value', { required: 'هذا الحقل مطلوب' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
          />
        );
    }
  };

  const getConfigIcon = (config: SystemConfig) => {
    const key = config.config_key.toLowerCase();
    
    if (key.includes('password') || key.includes('secret') || key.includes('key')) {
      return '🔒';
    } else if (key.includes('email') || key.includes('smtp')) {
      return '📧';
    } else if (key.includes('session') || key.includes('token')) {
      return '🔄';
    } else if (key.includes('timeout') || key.includes('expiry')) {
      return '⏰';
    } else if (key.includes('limit') || key.includes('max')) {
      return '📊';
    } else if (key.includes('url') || key.includes('host')) {
      return '🌐';
    } else if (key.includes('backup') || key.includes('export')) {
      return '💾';
    } else {
      return '⚙️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                إعدادات النظام
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                إدارة وتكوين إعدادات النظام الأساسية
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button
                onClick={() => setShowSensitive(!showSensitive)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                {showSensitive ? '🔓' : '🔒'}
                {showSensitive ? 'إخفاء القيم الحساسة' : 'إظهار القيم الحساسة'}
              </button>
              
              <button
                onClick={fetchConfigs}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                تحديث
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                البحث في الإعدادات
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الإعداد أو الوصف..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                التصنيف
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الإحصائيات
              </label>
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  عرض <span className="font-semibold text-gray-900 dark:text-white">{filteredConfigs.length}</span> من أصل{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{configs.length}</span> إعداد
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Configurations Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-400">جاري تحميل إعدادات النظام...</span>
            </div>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد إعدادات</h3>
            <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على إعدادات تطابق معايير البحث.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredConfigs.map((config) => (
              <div
                key={config.uuid}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getConfigIcon(config)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {config.config_key}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {config.is_sensitive && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        حساس
                      </span>
                    )}
                    {!config.is_editable && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        للقراءة فقط
                      </span>
                    )}
                  </div>
                </div>

                {/* Current Value */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    القيمة الحالية
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    {renderConfigValue(config)}
                  </div>
                </div>

                {/* Edit Form */}
                {editingConfig?.uuid === config.uuid ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        القيمة الجديدة
                      </label>
                      {renderEditField(config)}
                      {errors.config_value && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.config_value.message}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving === config.config_key}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                      >
                        {saving === config.config_key ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          'حفظ التغييرات'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={saving === config.config_key}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Action Buttons */
                  <div className="flex gap-2">
                    {config.is_editable && (
                      <button
                        onClick={() => handleEdit(config)}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        تعديل
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleResetToDefault(config)}
                      disabled={saving === config.config_key || !config.is_editable}
                      className="px-4 py-2 border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium text-sm"
                    >
                      {saving === config.config_key ? (
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'إعادة تعيين'
                      )}
                    </button>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>آخر تحديث: {new Date(config.updated_at).toLocaleDateString('ar-EG')}</span>
                    <span className="capitalize">{config.config_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-right">
              <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                تنبيه أمان
              </h4>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                تغيير إعدادات النظام قد يؤثر على أمان واستقرار النظام. تأكد من فهمك لتأثير التغييرات قبل تطبيقها.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
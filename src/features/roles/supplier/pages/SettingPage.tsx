// src/features/roles/supplier/pages/SettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface UserSettings {
  id: number;
  uuid: string;
  full_name: string;
  email: string;
  username: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  is_verified: boolean;
  mfa_enabled: boolean;
  settings: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
    low_stock_alerts: boolean;
    invoice_approval_alerts: boolean;
    auto_logout_minutes: number;
    items_per_page: number;
    default_invoice_type: 'PURCHASE' | 'PURCHASE_RETURN';
    currency: string;
    date_format: string;
    timezone: string;
  };
}

interface SecuritySettings {
  current_password: string;
  new_password: string;
  confirm_password: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  last_password_change: string;
  password_expiry_days: number;
}

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  description: string;
  is_editable: boolean;
  is_sensitive: boolean;
}

interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'preferences'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig[]>([]);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true
  });

  const { register: registerGeneral, handleSubmit: handleSubmitGeneral, reset: resetGeneral, formState: { errors: errorsGeneral } } = useForm();
  const { register: registerSecurity, handleSubmit: handleSubmitSecurity, reset: resetSecurity, watch, formState: { errors: errorsSecurity } } = useForm();
  const { register: registerNotifications, handleSubmit: handleSubmitNotifications, reset: resetNotifications, formState: { errors: errorsNotifications } } = useForm();
  const { register: registerPreferences, handleSubmit: handleSubmitPreferences, reset: resetPreferences, formState: { errors: errorsPreferences } } = useForm();

  const newPassword = watch('new_password');

  // Fetch user settings and system configuration
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [userResponse, configResponse] = await Promise.all([
        fetch('/api/user/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/system/config', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!userResponse.ok) {
        throw new Error('فشل في تحميل إعدادات المستخدم');
      }

      const userData = await userResponse.json();
      setUserSettings(userData);

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setSystemConfig(configData.config || []);
      }

      // Reset forms with fetched data
      resetGeneral({
        full_name: userData.full_name,
        email: userData.email,
        language: userData.settings?.language || 'ar',
        timezone: userData.settings?.timezone || 'Asia/Riyadh'
      });

      resetNotifications({
        notifications: userData.settings?.notifications || true,
        email_notifications: userData.settings?.email_notifications || true,
        sms_notifications: userData.settings?.sms_notifications || false,
        low_stock_alerts: userData.settings?.low_stock_alerts || true,
        invoice_approval_alerts: userData.settings?.invoice_approval_alerts || true
      });

      resetPreferences({
        theme: userData.settings?.theme || 'auto',
        items_per_page: userData.settings?.items_per_page || 25,
        default_invoice_type: userData.settings?.default_invoice_type || 'PURCHASE',
        currency: userData.settings?.currency || 'SAR',
        date_format: userData.settings?.date_format || 'dd/MM/yyyy',
        auto_logout_minutes: userData.settings?.auto_logout_minutes || 30
      });

      await logSecurityEvent('SETTINGS_VIEW', 'عرض صفحة الإعدادات', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الإعدادات');
      await logSecurityEvent('SETTINGS_VIEW', `فشل عرض الإعدادات: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [resetGeneral, resetNotifications, resetPreferences]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
          details: { component: 'SettingsPage', tab: activeTab }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < passwordPolicy.min_length) {
      errors.push(`كلمة المرور يجب أن تكون ${passwordPolicy.min_length} أحرف على الأقل`);
    }
    
    if (passwordPolicy.require_uppercase && !/(?=.*[A-Z])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل');
    }
    
    if (passwordPolicy.require_lowercase && !/(?=.*[a-z])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل');
    }
    
    if (passwordPolicy.require_numbers && !/(?=.*\d)/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
    }
    
    if (passwordPolicy.require_special_chars && !/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل');
    }
    
    return errors;
  };

  const handleGeneralSettings = async (data: any) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/user/settings/general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          full_name: data.full_name,
          language: data.language,
          timezone: data.timezone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في حفظ الإعدادات العامة');
      }

      setSuccess('تم حفظ الإعدادات العامة بنجاح');
      await logSecurityEvent('SETTINGS_UPDATE', 'تم تحديث الإعدادات العامة', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
      await logSecurityEvent('SETTINGS_UPDATE', `فشل تحديث الإعدادات العامة: ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySettings = async (data: any) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate password
      const passwordErrors = validatePassword(data.new_password);
      if (passwordErrors.length > 0) {
        setError(passwordErrors.join('\n'));
        return;
      }

      if (data.new_password !== data.confirm_password) {
        setError('كلمات المرور غير متطابقة');
        return;
      }

      const response = await fetch('/api/user/settings/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
          mfa_enabled: data.mfa_enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث إعدادات الأمان');
      }

      setSuccess('تم تحديث إعدادات الأمان بنجاح');
      resetSecurity();
      await logSecurityEvent('PASSWORD_CHANGE', 'تم تغيير كلمة المرور', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث إعدادات الأمان');
      await logSecurityEvent('PASSWORD_CHANGE', `فشل تغيير كلمة المرور: ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSettings = async (data: any) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/user/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notifications: data.notifications,
          email_notifications: data.email_notifications,
          sms_notifications: data.sms_notifications,
          low_stock_alerts: data.low_stock_alerts,
          invoice_approval_alerts: data.invoice_approval_alerts
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في حفظ إعدادات الإشعارات');
      }

      setSuccess('تم حفظ إعدادات الإشعارات بنجاح');
      await logSecurityEvent('SETTINGS_UPDATE', 'تم تحديث إعدادات الإشعارات', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ إعدادات الإشعارات');
      await logSecurityEvent('SETTINGS_UPDATE', `فشل تحديث إعدادات الإشعارات: ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceSettings = async (data: any) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/user/settings/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          theme: data.theme,
          items_per_page: parseInt(data.items_per_page),
          default_invoice_type: data.default_invoice_type,
          currency: data.currency,
          date_format: data.date_format,
          auto_logout_minutes: parseInt(data.auto_logout_minutes)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في حفظ التفضيلات');
      }

      setSuccess('تم حفظ التفضيلات بنجاح');
      await logSecurityEvent('SETTINGS_UPDATE', 'تم تحديث تفضيلات المستخدم', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ التفضيلات');
      await logSecurityEvent('SETTINGS_UPDATE', `فشل تحديث التفضيلات: ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong'; percentage: number } => {
    if (!password) return { strength: 'weak', percentage: 0 };
    
    let score = 0;
    if (password.length >= passwordPolicy.min_length) score += 25;
    if (/(?=.*[A-Z])/.test(password)) score += 25;
    if (/(?=.*[a-z])/.test(password)) score += 25;
    if (/(?=.*\d)/.test(password)) score += 15;
    if (/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) score += 10;

    if (score >= 80) return { strength: 'strong', percentage: 100 };
    if (score >= 60) return { strength: 'medium', percentage: 75 };
    return { strength: 'weak', percentage: 50 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-right">
            الإعدادات
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة إعدادات حسابك وتفضيلات النظام
          </p>
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
              <p className="text-red-800 dark:text-red-300 text-sm whitespace-pre-line">{error}</p>
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Sidebar Navigation */}
            <div className="lg:w-64 border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-700">
              <nav className="p-6 space-y-2">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'general'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الإعدادات العامة</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'security'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الأمان</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الإشعارات</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'preferences'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">التفضيلات</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <form onSubmit={handleSubmitGeneral(handleGeneralSettings)}>
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                        الإعدادات العامة
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            الاسم الكامل *
                          </label>
                          <input
                            type="text"
                            {...registerGeneral('full_name', { required: 'الاسم الكامل مطلوب' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                            placeholder="أدخل الاسم الكامل"
                          />
                          {errorsGeneral.full_name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                              {errorsGeneral.full_name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            البريد الإلكتروني
                          </label>
                          <input
                            type="email"
                            value={userSettings?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-right cursor-not-allowed"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                            لا يمكن تغيير البريد الإلكتروني
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            اللغة
                          </label>
                          <select
                            {...registerGeneral('language')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          >
                            <option value="ar">العربية</option>
                            <option value="en">English</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            المنطقة الزمنية
                          </label>
                          <select
                            {...registerGeneral('timezone')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          >
                            <option value="Asia/Riyadh">الرياض (UTC+3)</option>
                            <option value="Asia/Dubai">دبي (UTC+4)</option>
                            <option value="Europe/London">لندن (UTC+0)</option>
                            <option value="America/New_York">نيويورك (UTC-5)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          'حفظ الإعدادات'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <form onSubmit={handleSubmitSecurity(handleSecuritySettings)}>
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                        إعدادات الأمان
                      </h2>

                      {/* Password Change */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                          تغيير كلمة المرور
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                              كلمة المرور الحالية *
                            </label>
                            <input
                              type="password"
                              {...registerSecurity('current_password', { required: 'كلمة المرور الحالية مطلوبة' })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                              placeholder="أدخل كلمة المرور الحالية"
                            />
                            {errorsSecurity.current_password && (
                              <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                                {errorsSecurity.current_password.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                                كلمة المرور الجديدة *
                              </label>
                              <input
                                type="password"
                                {...registerSecurity('new_password', { required: 'كلمة المرور الجديدة مطلوبة' })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                                placeholder="أدخل كلمة المرور الجديدة"
                              />
                              {newPassword && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">قوة كلمة المرور</span>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                      {getPasswordStrength(newPassword).strength === 'strong' && 'قوية'}
                                      {getPasswordStrength(newPassword).strength === 'medium' && 'متوسطة'}
                                      {getPasswordStrength(newPassword).strength === 'weak' && 'ضعيفة'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        getPasswordStrength(newPassword).strength === 'strong' ? 'bg-green-500' :
                                        getPasswordStrength(newPassword).strength === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${getPasswordStrength(newPassword).percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                                تأكيد كلمة المرور *
                              </label>
                              <input
                                type="password"
                                {...registerSecurity('confirm_password', { required: 'تأكيد كلمة المرور مطلوب' })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                                placeholder="أعد إدخال كلمة المرور الجديدة"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Password Policy */}
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 text-right mb-2">
                            متطلبات كلمة المرور:
                          </h4>
                          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 text-right">
                            <li className={`${newPassword && newPassword.length >= passwordPolicy.min_length ? 'text-green-600' : ''}`}>
                              • {passwordPolicy.min_length} أحرف على الأقل
                            </li>
                            <li className={`${newPassword && /(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • حرف كبير واحد على الأقل
                            </li>
                            <li className={`${newPassword && /(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • حرف صغير واحد على الأقل
                            </li>
                            <li className={`${newPassword && /(?=.*\d)/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • رقم واحد على الأقل
                            </li>
                            <li className={`${newPassword && /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • رمز خاص واحد على الأقل
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* MFA Settings */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                          المصادقة الثنائية
                        </h3>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">تفعيل المصادقة الثنائية</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              تضيف طبقة إضافية من الأمان لحسابك
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              {...registerSecurity('mfa_enabled')}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري التحديث...
                          </>
                        ) : (
                          'تحديث إعدادات الأمان'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <form onSubmit={handleSubmitNotifications(handleNotificationSettings)}>
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                      إعدادات الإشعارات
                    </h2>

                    <div className="space-y-6">
                      {/* General Notifications */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                          الإشعارات العامة
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">تفعيل جميع الإشعارات</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                استلام جميع أنواع الإشعارات في النظام
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerNotifications('notifications')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">الإشعارات البريدية</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                إرسال الإشعارات إلى بريدك الإلكتروني
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerNotifications('email_notifications')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">الإشعارات النصية</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                إرسال إشعارات SMS إلى هاتفك
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerNotifications('sms_notifications')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Business Notifications */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                          إشعارات العمل
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">تنبيهات المخزون المنخفض</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                إشعار عند وصول المخزون إلى الحد الأدنى
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerNotifications('low_stock_alerts')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">إشعارات اعتماد الفواتير</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                إشعار عند اعتماد أو رفض الفواتير
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerNotifications('invoice_approval_alerts')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          'حفظ إعدادات الإشعارات'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Preference Settings */}
              {activeTab === 'preferences' && (
                <form onSubmit={handleSubmitPreferences(handlePreferenceSettings)}>
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                      التفضيلات
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          المظهر
                        </label>
                        <select
                          {...registerPreferences('theme')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        >
                          <option value="auto">تلقائي</option>
                          <option value="light">فاتح</option>
                          <option value="dark">داكن</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          عدد العناصر في الصفحة
                        </label>
                        <select
                          {...registerPreferences('items_per_page')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        >
                          <option value="10">10 عناصر</option>
                          <option value="25">25 عنصر</option>
                          <option value="50">50 عنصر</option>
                          <option value="100">100 عنصر</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          نوع الفاتورة الافتراضي
                        </label>
                        <select
                          {...registerPreferences('default_invoice_type')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        >
                          <option value="PURCHASE">فاتورة شراء</option>
                          <option value="PURCHASE_RETURN">مرتجع شراء</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          العملة
                        </label>
                        <select
                          {...registerPreferences('currency')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        >
                          <option value="SAR">ريال سعودي (SAR)</option>
                          <option value="USD">دولار أمريكي (USD)</option>
                          <option value="EUR">يورو (EUR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          تنسيق التاريخ
                        </label>
                        <select
                          {...registerPreferences('date_format')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        >
                          <option value="dd/MM/yyyy">يوم/شهر/سنة (31/12/2023)</option>
                          <option value="MM/dd/yyyy">شهر/يوم/سنة (12/31/2023)</option>
                          <option value="yyyy-MM-dd">سنة-شهر-يوم (2023-12-31)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          مدة الخروج التلقائي (دقيقة)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="480"
                          {...registerPreferences('auto_logout_minutes', { 
                            required: 'مدة الخروج التلقائي مطلوبة',
                            min: { value: 5, message: 'يجب أن تكون المدة 5 دقائق على الأقل' },
                            max: { value: 480, message: 'يجب ألا تزيد المدة عن 480 دقيقة' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        />
                        {errorsPreferences.auto_logout_minutes && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                            {errorsPreferences.auto_logout_minutes.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          'حفظ التفضيلات'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
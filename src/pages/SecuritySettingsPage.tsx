// src/pages/SecuritySettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface SecuritySettings {
  mfa_enabled: boolean;
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  password_expiry_days: number;
  password_min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  ip_whitelist: string[];
  user_agent_validation: boolean;
}

interface SecurityEvent {
  id: number;
  event_type: string;
  event_description: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  severity: string;
  created_at: string;
}

interface ActiveSession {
  id: number;
  session_token: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const SecuritySettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'sessions' | 'events' | 'password'>('settings');
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register: registerSettings, handleSubmit: handleSubmitSettings, reset: resetSettings, formState: { errors: errorsSettings } } = useForm<SecuritySettings>();
  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, watch: watchPassword, formState: { errors: errorsPassword } } = useForm<PasswordFormData>();

  const newPassword = watchPassword('new_password');

  // Fetch security data
  const fetchSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [settingsResponse, eventsResponse, sessionsResponse] = await Promise.all([
        fetch('/api/security/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/security/events?limit=50', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/security/sessions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!settingsResponse.ok) {
        throw new Error('فشل في تحميل إعدادات الأمان');
      }

      const settingsData = await settingsResponse.json();
      setSecuritySettings(settingsData.settings);
      resetSettings(settingsData.settings);

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setSecurityEvents(eventsData.events || []);
      }

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setActiveSessions(sessionsData.sessions || []);
      }

      await logSecurityEvent('SECURITY_SETTINGS_VIEW', 'عرض صفحة إعدادات الأمان', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('SECURITY_SETTINGS_VIEW', `فشل عرض إعدادات الأمان: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [resetSettings]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

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
          details: { component: 'SecuritySettings', tab: activeTab }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    const settings = securitySettings;
    
    if (!settings) return errors;

    if (password.length < settings.password_min_length) {
      errors.push(`كلمة المرور يجب أن تكون ${settings.password_min_length} أحرف على الأقل`);
    }
    
    if (settings.require_uppercase && !/(?=.*[A-Z])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل');
    }
    
    if (settings.require_lowercase && !/(?=.*[a-z])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل');
    }
    
    if (settings.require_numbers && !/(?=.*\d)/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
    }
    
    if (settings.require_special_chars && !/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل');
    }
    
    return errors;
  };

  const handleSettingsUpdate = async (data: SecuritySettings) => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث إعدادات الأمان');
      }

      const result = await response.json();

      setSuccess('تم تحديث إعدادات الأمان بنجاح');
      setSecuritySettings(result.settings);

      await logSecurityEvent('SECURITY_SETTINGS_UPDATE', 'تم تحديث إعدادات الأمان', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث إعدادات الأمان');
      await logSecurityEvent('SECURITY_SETTINGS_UPDATE', `فشل تحديث إعدادات الأمان: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      // Validate password against current settings
      const passwordErrors = validatePassword(data.new_password);
      if (passwordErrors.length > 0) {
        setError(passwordErrors.join('\n'));
        return;
      }

      if (data.new_password !== data.confirm_password) {
        setError('كلمات المرور غير متطابقة');
        return;
      }

      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تغيير كلمة المرور');
      }

      setSuccess('تم تغيير كلمة المرور بنجاح');
      resetPassword();

      await logSecurityEvent('PASSWORD_CHANGE', 'تم تغيير كلمة المرور', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
      await logSecurityEvent('PASSWORD_CHANGE', `فشل تغيير كلمة المرور: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleTerminateSession = async (sessionId: number) => {
    try {
      setError('');

      const response = await fetch(`/api/security/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في إنهاء الجلسة');
      }

      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      setSuccess('تم إنهاء الجلسة بنجاح');

      await logSecurityEvent('SESSION_TERMINATE', 'تم إنهاء جلسة مستخدم', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنهاء الجلسة');
      await logSecurityEvent('SESSION_TERMINATE', `فشل إنهاء الجلسة: ${err.message}`, false);
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      setError('');

      const response = await fetch('/api/security/sessions', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في إنهاء جميع الجلسات');
      }

      setActiveSessions([]);
      setSuccess('تم إنهاء جميع الجلسات بنجاح');

      await logSecurityEvent('SESSIONS_TERMINATE_ALL', 'تم إنهاء جميع جلسات المستخدم', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنهاء الجلسات');
      await logSecurityEvent('SESSIONS_TERMINATE_ALL', `فشل إنهاء الجلسات: ${err.message}`, false);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong'; percentage: number } => {
    if (!password) return { strength: 'weak', percentage: 0 };
    
    let score = 0;
    const settings = securitySettings;

    if (settings) {
      if (password.length >= settings.password_min_length) score += 25;
      if (settings.require_uppercase && /(?=.*[A-Z])/.test(password)) score += 25;
      if (settings.require_lowercase && /(?=.*[a-z])/.test(password)) score += 25;
      if (settings.require_numbers && /(?=.*\d)/.test(password)) score += 15;
      if (settings.require_special_chars && /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) score += 10;
    }

    if (score >= 80) return { strength: 'strong', percentage: 100 };
    if (score >= 60) return { strength: 'medium', percentage: 75 };
    return { strength: 'weak', percentage: 50 };
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'LOW': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'حرج';
      case 'HIGH': return 'مرتفع';
      case 'MEDIUM': return 'متوسط';
      case 'LOW': return 'منخفض';
      case 'INFO': return 'معلومات';
      default: return severity;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل إعدادات الأمان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-right">
            إعدادات الأمان
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة إعدادات الأمان والجلسات وسجلات الأحداث
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
                  onClick={() => setActiveTab('settings')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الإعدادات</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('password')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'password'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">كلمة المرور</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'sessions'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الجلسات</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('events')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'events'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">سجل الأحداث</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {/* Security Settings Tab */}
              {activeTab === 'settings' && securitySettings && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                    إعدادات الأمان
                  </h2>

                  <form onSubmit={handleSubmitSettings(handleSettingsUpdate)} className="space-y-6">
                    {/* Authentication Settings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                        إعدادات المصادقة
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between">
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">المصادقة الثنائية</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              تضيف طبقة إضافية من الأمان لحسابك
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              {...registerSettings('mfa_enabled')}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            مدة انتهاء الجلسة (دقيقة)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="480"
                            {...registerSettings('session_timeout', { 
                              required: 'مدة الجلسة مطلوبة',
                              min: { value: 5, message: 'يجب أن تكون المدة 5 دقائق على الأقل' },
                              max: { value: 480, message: 'يجب ألا تزيد المدة عن 480 دقيقة' }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                          {errorsSettings.session_timeout && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                              {errorsSettings.session_timeout.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            الحد الأقصى لمحاولات تسجيل الدخول
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            {...registerSettings('max_login_attempts', { 
                              required: 'الحد الأقصى للمحاولات مطلوب',
                              min: { value: 1, message: 'يجب أن يكون الحد الأدنى 1' },
                              max: { value: 10, message: 'يجب ألا يزيد الحد الأقصى عن 10' }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                          {errorsSettings.max_login_attempts && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                              {errorsSettings.max_login_attempts.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            مدة القفل (دقيقة)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            {...registerSettings('lockout_duration', { 
                              required: 'مدة القفل مطلوبة',
                              min: { value: 1, message: 'يجب أن تكون المدة 1 دقيقة على الأقل' },
                              max: { value: 1440, message: 'يجب ألا تزيد المدة عن 1440 دقيقة' }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                          {errorsSettings.lockout_duration && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                              {errorsSettings.lockout_duration.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Password Policy */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                        سياسة كلمة المرور
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            مدة انتهاء كلمة المرور (يوم)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            {...registerSettings('password_expiry_days', { 
                              required: 'مدة الانتهاء مطلوبة',
                              min: { value: 1, message: 'يجب أن تكون المدة 1 يوم على الأقل' },
                              max: { value: 365, message: 'يجب ألا تزيد المدة عن 365 يوم' }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                          {errorsSettings.password_expiry_days && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                              {errorsSettings.password_expiry_days.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            الحد الأدنى لطول كلمة المرور
                          </label>
                          <input
                            type="number"
                            min="6"
                            max="20"
                            {...registerSettings('password_min_length', { 
                              required: 'الحد الأدنى للطول مطلوب',
                              min: { value: 6, message: 'يجب أن يكون الطول 6 أحرف على الأقل' },
                              max: { value: 20, message: 'يجب ألا يزيد الطول عن 20 حرف' }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                          {errorsSettings.password_min_length && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                              {errorsSettings.password_min_length.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">الحروف الكبيرة</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerSettings('require_uppercase')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">الحروف الصغيرة</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerSettings('require_lowercase')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">الأرقام</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerSettings('require_numbers')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">الرموز الخاصة</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...registerSettings('require_special_chars')}
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
                        disabled={processing}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                      >
                        {processing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          'حفظ الإعدادات'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                    تغيير كلمة المرور
                  </h2>

                  <form onSubmit={handleSubmitPassword(handlePasswordChange)} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          كلمة المرور الحالية *
                        </label>
                        <input
                          type="password"
                          {...registerPassword('current_password', { required: 'كلمة المرور الحالية مطلوبة' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          placeholder="أدخل كلمة المرور الحالية"
                        />
                        {errorsPassword.current_password && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                            {errorsPassword.current_password.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            كلمة المرور الجديدة *
                          </label>
                          <input
                            type="password"
                            {...registerPassword('new_password', { required: 'كلمة المرور الجديدة مطلوبة' })}
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
                            {...registerPassword('confirm_password', { required: 'تأكيد كلمة المرور مطلوب' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                            placeholder="أعد إدخال كلمة المرور الجديدة"
                          />
                        </div>
                      </div>

                      {/* Password Policy Display */}
                      {securitySettings && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 text-right mb-2">
                            متطلبات كلمة المرور:
                          </h4>
                          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 text-right">
                            <li className={`${newPassword && newPassword.length >= securitySettings.password_min_length ? 'text-green-600' : ''}`}>
                              • {securitySettings.password_min_length} أحرف على الأقل
                            </li>
                            <li className={`${newPassword && securitySettings.require_uppercase && /(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • حرف كبير واحد على الأقل
                            </li>
                            <li className={`${newPassword && securitySettings.require_lowercase && /(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • حرف صغير واحد على الأقل
                            </li>
                            <li className={`${newPassword && securitySettings.require_numbers && /(?=.*\d)/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • رقم واحد على الأقل
                            </li>
                            <li className={`${newPassword && securitySettings.require_special_chars && /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword) ? 'text-green-600' : ''}`}>
                              • رمز خاص واحد على الأقل
                            </li>
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={processing}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                        >
                          {processing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              جاري التحديث...
                            </>
                          ) : (
                            'تغيير كلمة المرور'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === 'sessions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right">
                      الجلسات النشطة
                    </h2>
                    <button
                      onClick={handleTerminateAllSessions}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium text-sm"
                    >
                      إنهاء جميع الجلسات
                    </button>
                  </div>

                  {activeSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد جلسات نشطة</h3>
                      <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على جلسات نشطة.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="text-right flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {getTimeAgo(session.last_activity)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {formatDateTime(session.created_at)}
                                  </p>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-gray-900 dark:text-white">{session.ip_address}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                    {session.user_agent}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleTerminateSession(session.id)}
                              className="mr-4 p-2 text-red-600 hover:text-red-700 transition-colors"
                              title="إنهاء الجلسة"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Security Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                    سجل الأحداث الأمنية
                  </h2>

                  {securityEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد أحداث</h3>
                      <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على أحداث أمنية.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {securityEvents.map((event) => (
                        <div key={event.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="text-right flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                                  {getSeverityLabel(event.severity)}
                                </span>
                                <div className="text-left">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatDateTime(event.created_at)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {event.ip_address}
                                  </p>
                                </div>
                              </div>
                              <p className={`text-sm font-medium ${
                                event.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {event.event_description}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {event.event_type}
                              </p>
                            </div>
                            <div className={`w-3 h-3 rounded-full ml-4 mt-1 ${
                              event.success ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;
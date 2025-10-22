// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface UserProfile {
  id: number;
  uuid: string;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_locked: boolean;
  last_login: string;
  last_password_change: string;
  mfa_enabled: boolean;
  email_verified: boolean;
  settings: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
    items_per_page: number;
    default_invoice_type: string;
    currency: string;
    date_format: string;
    timezone: string;
  };
  created_at: string;
  updated_at: string;
}

interface ProfileFormData {
  full_name: string;
  email: string;
  language: string;
  timezone: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface SecuritySettings {
  mfa_enabled: boolean;
  session_timeout: number;
}

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    mfa_enabled: false,
    session_timeout: 30
  });

  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfile, formState: { errors: errorsProfile } } = useForm<ProfileFormData>();
  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, watch: watchPassword, formState: { errors: errorsPassword } } = useForm<PasswordFormData>();
  const { register: registerSecurity, handleSubmit: handleSubmitSecurity, formState: { errors: errorsSecurity } } = useForm<SecuritySettings>();

  const newPassword = watchPassword('new_password');

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الملف الشخصي');
      }

      const profileData = await response.json();
      setUserProfile(profileData.user);

      // Reset forms with fetched data
      resetProfile({
        full_name: profileData.user.full_name,
        email: profileData.user.email,
        language: profileData.user.settings?.language || 'ar',
        timezone: profileData.user.settings?.timezone || 'Asia/Riyadh'
      });

      setSecuritySettings({
        mfa_enabled: profileData.user.mfa_enabled || false,
        session_timeout: profileData.user.settings?.session_timeout || 30
      });

      await logSecurityEvent('PROFILE_VIEW', 'عرض الصفحة الشخصية', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('PROFILE_VIEW', `فشل عرض الصفحة الشخصية: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [resetProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
          details: { component: 'ProfilePage', tab: activeTab }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل');
    }
    
    return errors;
  };

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          language: data.language,
          timezone: data.timezone,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث الملف الشخصي');
      }

      const result = await response.json();

      setSuccess('تم تحديث الملف الشخصي بنجاح');
      setUserProfile(prev => prev ? { ...prev, ...result.user } : null);

      await logSecurityEvent('PROFILE_UPDATE', 'تم تحديث البيانات الشخصية', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
      await logSecurityEvent('PROFILE_UPDATE', `فشل تحديث البيانات الشخصية: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      setProcessing(true);
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

  const handleSecuritySettingsUpdate = async (data: SecuritySettings) => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/user/security-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          mfa_enabled: data.mfa_enabled,
          session_timeout: data.session_timeout,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث إعدادات الأمان');
      }

      setSuccess('تم تحديث إعدادات الأمان بنجاح');
      setSecuritySettings(data);

      await logSecurityEvent('SECURITY_SETTINGS_UPDATE', 'تم تحديث إعدادات الأمان', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث إعدادات الأمان');
      await logSecurityEvent('SECURITY_SETTINGS_UPDATE', `فشل تحديث إعدادات الأمان: ${err.message}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong'; percentage: number } => {
    if (!password) return { strength: 'weak', percentage: 0 };
    
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/(?=.*[A-Z])/.test(password)) score += 25;
    if (/(?=.*[a-z])/.test(password)) score += 25;
    if (/(?=.*\d)/.test(password)) score += 15;
    if (/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) score += 10;

    if (score >= 80) return { strength: 'strong', percentage: 100 };
    if (score >= 60) return { strength: 'medium', percentage: 75 };
    return { strength: 'weak', percentage: 50 };
  };

  const formatLastLogin = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'اليوم';
    } else if (diffDays === 1) {
      return 'أمس';
    } else if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    } else {
      return date.toLocaleDateString('ar-EG');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-right">
            الملف الشخصي
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة معلومات حسابك وإعدادات الأمان
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
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الملف الشخصي</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'activity'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">النشاط</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                      المعلومات الشخصية
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="text-sm text-gray-600 dark:text-gray-400">اسم المستخدم</p>
                              <p className="font-medium text-gray-900 dark:text-white">{userProfile?.username}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                {userProfile?.full_name?.charAt(0) || userProfile?.username?.charAt(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          الاسم الكامل *
                        </label>
                        <input
                          type="text"
                          {...registerProfile('full_name', { required: 'الاسم الكامل مطلوب' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          placeholder="أدخل الاسم الكامل"
                        />
                        {errorsProfile.full_name && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                            {errorsProfile.full_name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          البريد الإلكتروني *
                        </label>
                        <input
                          type="email"
                          {...registerProfile('email', { 
                            required: 'البريد الإلكتروني مطلوب',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'البريد الإلكتروني غير صحيح'
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          placeholder="أدخل البريد الإلكتروني"
                        />
                        {errorsProfile.email && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                            {errorsProfile.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                          اللغة
                        </label>
                        <select
                          {...registerProfile('language')}
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
                          {...registerProfile('timezone')}
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
                      onClick={handleSubmitProfile(handleProfileUpdate)}
                      disabled={processing}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        'حفظ التغييرات'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                    الأمان
                  </h2>

                  {/* Password Change */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                      تغيير كلمة المرور
                    </h3>
                    
                    <form onSubmit={handleSubmitPassword(handlePasswordChange)} className="space-y-4">
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

                      {/* Password Policy */}
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 text-right mb-2">
                          متطلبات كلمة المرور:
                        </h4>
                        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 text-right">
                          <li className={`${newPassword && newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                            • 8 أحرف على الأقل
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
                    </form>
                  </div>

                  {/* Security Settings */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                      إعدادات الأمان
                    </h3>
                    
                    <form onSubmit={handleSubmitSecurity(handleSecuritySettingsUpdate)} className="space-y-4">
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
                            {...registerSecurity('mfa_enabled')}
                            className="sr-only peer"
                            defaultChecked={securitySettings.mfa_enabled}
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
                          {...registerSecurity('session_timeout', { 
                            required: 'مدة الجلسة مطلوبة',
                            min: { value: 5, message: 'يجب أن تكون المدة 5 دقائق على الأقل' },
                            max: { value: 480, message: 'يجب ألا تزيد المدة عن 480 دقيقة' }
                          })}
                          defaultValue={securitySettings.session_timeout}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        />
                        {errorsSecurity.session_timeout && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                            {errorsSecurity.session_timeout.message}
                          </p>
                        )}
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
                            'حفظ إعدادات الأمان'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                    التفضيلات
                  </h2>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-right">
                        <p className="text-yellow-800 dark:text-yellow-300 font-medium">قيد التطوير</p>
                        <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                          سيتم إضافة تفضيلات إضافية مثل إعدادات الإشعارات وتخصيص الواجهة في التحديثات القادمة.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                        المظهر
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        defaultValue={userProfile?.settings?.theme || 'auto'}
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        defaultValue={userProfile?.settings?.items_per_page || 25}
                      >
                        <option value="10">10 عناصر</option>
                        <option value="25">25 عنصر</option>
                        <option value="50">50 عنصر</option>
                        <option value="100">100 عنصر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                        العملة الافتراضية
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        defaultValue={userProfile?.settings?.currency || 'SAR'}
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                        defaultValue={userProfile?.settings?.date_format || 'dd/MM/yyyy'}
                      >
                        <option value="dd/MM/yyyy">يوم/شهر/سنة (31/12/2023)</option>
                        <option value="MM/dd/yyyy">شهر/يوم/سنة (12/31/2023)</option>
                        <option value="yyyy-MM-dd">سنة-شهر-يوم (2023-12-31)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">
                    النشاط
                  </h2>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">
                      معلومات الحساب
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            اسم المستخدم
                          </label>
                          <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <span className="text-gray-900 dark:text-white">{userProfile?.username}</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            الدور
                          </label>
                          <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <span className="text-gray-900 dark:text-white">{userProfile?.role_name}</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            حالة الحساب
                          </label>
                          <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              userProfile?.is_active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            }`}>
                              {userProfile?.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            آخر تسجيل دخول
                          </label>
                          <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <span className="text-gray-900 dark:text-white">
                              {userProfile?.last_login ? formatLastLogin(userProfile.last_login) : 'غير متوفر'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            آخر تغيير لكلمة المرور
                          </label>
                          <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <span className="text-gray-900 dark:text-white">
                              {userProfile?.last_password_change ? formatLastLogin(userProfile.last_password_change) : 'غير متوفر'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            تاريخ الإنشاء
                          </label>
                          <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <span className="text-gray-900 dark:text-white">
                              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-right">
                        <p className="text-blue-800 dark:text-blue-300 font-medium">سجل النشاط</p>
                        <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                          سيتم إضافة سجل النشاط الكامل وتقارير الأمان في التحديثات القادمة.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
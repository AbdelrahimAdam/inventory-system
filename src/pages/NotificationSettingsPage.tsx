import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

// Interfaces aligned with PostgreSQL schema
interface NotificationSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  low_stock_alerts: boolean;
  low_stock_threshold: number;
  invoice_approval_alerts: boolean;
  purchase_order_alerts: boolean;
  factory_dispatch_alerts: boolean;
  quality_check_alerts: boolean;
  security_alerts: boolean;
  system_maintenance_alerts: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  monthly_report: boolean;
  alert_frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface NotificationPreference {
  id: number;
  uuid: string;
  notification_type: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  enabled: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  updated_at: string;
}

interface NotificationHistory {
  id: number;
  uuid: string;
  notification_type: string;
  title: string;
  message: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  sent_at: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  read_at: string | null;
}

interface SecurityLog {
  event_type:
    | 'SETTINGS_UPDATE'
    | 'SETTINGS_UPDATE_ATTEMPT'
    | 'SETTINGS_UPDATE_FAILED'
    | 'SETTINGS_UPDATE_ERROR'
    | 'NOTIFICATION_TEST'
    | 'NOTIFICATION_TEST_ATTEMPT'
    | 'NOTIFICATION_TEST_FAILED'
    | 'NOTIFICATION_TEST_ERROR';
  event_description: string;
  user_id: number;
  username: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  severity: 'INFO' | 'WARN' | 'ERROR';
  details: Record<string, any>;
}

// Component
const NotificationSettingsPage: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'settings' | 'preferences' | 'history'>('settings');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Form
  const { register: registerSettings, handleSubmit: handleSubmitSettings, reset: resetSettings, watch: watchSettings, formState: { errors: errorsSettings } } = useForm<NotificationSettings>();
  const notificationsEnabled = watchSettings('notifications_enabled');
  const emailEnabled = watchSettings('email_notifications');
  const smsEnabled = watchSettings('sms_notifications');
  const quietHoursEnabled = watchSettings('quiet_hours_enabled');

  // Helper Functions
  const getCurrentUser = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) throw new Error('User not authenticated');
    return JSON.parse(userData) as { id: number; username: string; email: string; role_id: number };
  };

  const getChannelLabel = (channel: string): string => {
    const labels: Record<string, string> = {
      EMAIL: 'البريد الإلكتروني',
      SMS: 'رسالة نصية',
      PUSH: 'إشعار التطبيق',
    };
    return labels[channel] || channel;
  };

  const getNotificationTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      LOW_STOCK: 'تنبيهات المخزون المنخفض',
      INVOICE_APPROVAL: 'إشعارات اعتماد الفواتير',
      PURCHASE_ORDER: 'إشعارات أوامر الشراء',
      FACTORY_DISPATCH: 'إشعارات تحويلات المصنع',
      QUALITY_CHECK: 'إشعارات فحوصات الجودة',
      SECURITY_ALERT: 'تنبيهات الأمان',
      SYSTEM_MAINTENANCE: 'إشعارات صيانة النظام',
      DAILY_SUMMARY: 'ملخص يومي',
      WEEKLY_REPORT: 'تقرير أسبوعي',
      MONTHLY_REPORT: 'تقرير شهري',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      SENT: 'تم الإرسال',
      DELIVERED: 'تم التسليم',
      READ: 'تم القراءة',
      FAILED: 'فشل الإرسال',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      READ: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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

  // API Calls
  const logSecurityEvent = async (
    eventType: SecurityLog['event_type'],
    description: string,
    success: boolean,
    severity: SecurityLog['severity'] = 'INFO',
    details: Record<string, any> = {}
  ) => {
    try {
      const user = await getCurrentUser();
      const response = await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          event_description: description,
          user_id: user.id,
          username: user.username,
          ip_address: '127.0.0.1', // Replace with actual IP retrieval
          user_agent: navigator.userAgent,
          success,
          severity,
          details,
        } as SecurityLog),
      });

      if (!response.ok) {
        throw new Error('Failed to log security event');
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const checkPermission = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          feature_code: 'SYSTEM_CONFIG',
          required_permission: 'edit',
        }),
      });

      const result = await response.json();
      setHasPermission(result.has_access || false);
      if (!result.has_access) {
        setError('ليس لديك الصلاحية لتعديل إعدادات الإشعارات');
        await logSecurityEvent(
          'UNAUTHORIZED_ACCESS',
          'Attempted to access notification settings without permission',
          false,
          'WARN',
          { user_id: user.id, feature_code: 'SYSTEM_CONFIG' }
        );
      }
    } catch (error) {
      setError('فشل في التحقق من الصلاحيات');
      console.error('Permission check failed:', error);
    }
  }, []);

  const fetchNotificationData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const user = await getCurrentUser();
      const [settingsResponse, preferencesResponse, historyResponse] = await Promise.all([
        fetch('/api/notifications/settings', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/notifications/preferences', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/notifications/history?limit=20', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!settingsResponse.ok) throw new Error('فشل في تحميل إعدادات الإشعارات');

      const settingsData = await settingsResponse.json();
      setNotificationSettings(settingsData.settings);
      resetSettings(settingsData.settings);

      if (preferencesResponse.ok) {
        const preferencesData = await preferencesResponse.json();
        setNotificationPreferences(preferencesData.preferences || []);
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setNotificationHistory(historyData.history || []);
      }

      await logSecurityEvent(
        'SETTINGS_UPDATE_ATTEMPT',
        'Viewed notification settings page',
        true,
        'INFO',
        { user_id: user.id, tab: activeTab }
      );
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      const user = await getCurrentUser().catch(() => ({ id: 0, username: 'unknown' }));
      await logSecurityEvent(
        'SETTINGS_UPDATE_ERROR',
        `Failed to load notification settings: ${err.message}`,
        false,
        'ERROR',
        { user_id: user.id, error: err.message }
      );
    } finally {
      setLoading(false);
    }
  }, [resetSettings, activeTab]);

  const handleSettingsUpdate = async (data: NotificationSettings) => {
    if (!hasPermission) {
      setError('ليس لديك الصلاحية لتعديل إعدادات الإشعارات');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const user = await getCurrentUser();

      await logSecurityEvent(
        'SETTINGS_UPDATE_ATTEMPT',
        'Attempting to update notification settings',
        true,
        'INFO',
        { user_id: user.id, settings: data }
      );

      if (data.quiet_hours_enabled) {
        if (!data.quiet_hours_start || !data.quiet_hours_end) {
          setError('يجب تحديد وقت بداية ونهاية الساعات الهادئة');
          await logSecurityEvent(
            'SETTINGS_UPDATE_FAILED',
            'Invalid quiet hours configuration',
            false,
            'WARN',
            { user_id: user.id, quiet_hours_start: data.quiet_hours_start, quiet_hours_end: data.quiet_hours_end }
          );
          return;
        }

        const startTime = new Date(`2000-01-01T${data.quiet_hours_start}`);
        const endTime = new Date(`2000-01-01T${data.quiet_hours_end}`);
        if (startTime >= endTime) {
          setError('وقت البداية يجب أن يكون قبل وقت النهاية');
          await logSecurityEvent(
            'SETTINGS_UPDATE_FAILED',
            'Invalid quiet hours time range',
            false,
            'WARN',
            { user_id: user.id, quiet_hours_start: data.quiet_hours_start, quiet_hours_end: data.quiet_hours_end }
          );
          return;
        }
      }

      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...data,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث إعدادات الإشعارات');
      }

      const result = await response.json();
      setSuccess('تم تحديث إعدادات الإشعارات بنجاح');
      setNotificationSettings(result.settings);
      await logSecurityEvent(
        'SETTINGS_UPDATE',
        'Notification settings updated successfully',
        true,
        'INFO',
        { user_id: user.id, settings: result.settings }
      );
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث إعدادات الإشعارات');
      const user = await getCurrentUser().catch(() => ({ id: 0, username: 'unknown' }));
      await logSecurityEvent(
        'SETTINGS_UPDATE_ERROR',
        `Failed to update notification settings: ${err.message}`,
        false,
        'ERROR',
        { user_id: user.id, error: err.message }
      );
    } finally {
      setProcessing(false);
    }
  };

  const handlePreferenceUpdate = async (preferenceId: number, enabled: boolean) => {
    if (!hasPermission) {
      setError('ليس لديك الصلاحية لتعديل تفضيلات الإشعارات');
      return;
    }

    try {
      setError('');
      const user = await getCurrentUser();
      await logSecurityEvent(
        'SETTINGS_UPDATE_ATTEMPT',
        `Attempting to update notification preference ${preferenceId}`,
        true,
        'INFO',
        { user_id: user.id, preference_id: preferenceId, enabled }
      );

      const response = await fetch(`/api/notifications/preferences/${preferenceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          enabled,
          user_id: user.id,
        }),
      });

      if (!response.ok) throw new Error('فشل في تحديث تفضيل الإشعار');

      setNotificationPreferences((prev) =>
        prev.map((pref) => (pref.id === preferenceId ? { ...pref, enabled } : pref))
      );
      setSuccess('تم تحديث تفضيل الإشعار بنجاح');
      await logSecurityEvent(
        'SETTINGS_UPDATE',
        `Notification preference ${preferenceId} updated to ${enabled ? 'enabled' : 'disabled'}`,
        true,
        'INFO',
        { user_id: user.id, preference_id: preferenceId, enabled }
      );
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث تفضيل الإشعار');
      const user = await getCurrentUser().catch(() => ({ id: 0, username: 'unknown' }));
      await logSecurityEvent(
        'SETTINGS_UPDATE_ERROR',
        `Failed to update notification preference: ${err.message}`,
        false,
        'ERROR',
        { user_id: user.id, preference_id: preferenceId, error: err.message }
      );
    }
  };

  const handleTestNotification = async (channel: 'EMAIL' | 'SMS' | 'PUSH') => {
    if (!hasPermission) {
      setError('ليس لديك الصلاحية لإرسال إشعارات تجريبية');
      return;
    }

    try {
      setTestSending(true);
      setError('');
      const user = await getCurrentUser();
      await logSecurityEvent(
        'NOTIFICATION_TEST_ATTEMPT',
        `Attempting to send test notification via ${channel}`,
        true,
        'INFO',
        { user_id: user.id, channel }
      );

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          channel,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `فشل في إرسال إشعار تجريبي عبر ${channel}`);
      }

      setSuccess(`تم إرسال إشعار تجريبي عبر ${getChannelLabel(channel)} بنجاح`);
      await logSecurityEvent(
        'NOTIFICATION_TEST',
        `Test notification sent successfully via ${channel}`,
        true,
        'INFO',
        { user_id: user.id, channel }
      );
    } catch (err: any) {
      setError(err.message || `حدث خطأ أثناء إرسال الإشعار التجريبي`);
      const user = await getCurrentUser().catch(() => ({ id: 0, username: 'unknown' }));
      await logSecurityEvent(
        'NOTIFICATION_TEST_ERROR',
        `Failed to send test notification: ${err.message}`,
        false,
        'ERROR',
        { user_id: user.id, channel, error: err.message }
      );
    } finally {
      setTestSending(false);
    }
  };

  // Effects
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    if (hasPermission) {
      fetchNotificationData();
    }
  }, [fetchNotificationData, hasPermission]);

  // Render
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg">ليس لديك الصلاحية للوصول إلى هذه الصفحة</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">يرجى التواصل مع المسؤول للحصول على الصلاحيات اللازمة</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل إعدادات الإشعارات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-right">إعدادات الإشعارات</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">إدارة تفضيلات الإشعارات والإعدادات</p>
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Sidebar Navigation */}
            <div className="lg:w-64 border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-700">
              <nav className="p-6 space-y-2">
                {[
                  { tab: 'settings', label: 'الإعدادات العامة', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                  { tab: 'preferences', label: 'تفضيلات الإشعارات', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                  { tab: 'history', label: 'سجل الإشعارات', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                ].map(({ tab, label, icon }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                      activeTab === tab
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{label}</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {/* Settings Tab */}
              {activeTab === 'settings' && notificationSettings && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right mb-6">الإعدادات العامة</h2>
                  <form onSubmit={handleSubmitSettings(handleSettingsUpdate)} className="space-y-6">
                    {/* Global Settings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">الإعدادات العامة</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">تفعيل الإشعارات</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تفعيل أو تعطيل جميع الإشعارات</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" {...registerSettings('notifications_enabled')} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                        {notificationsEnabled && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              {[
                                { field: 'email_notifications', label: 'البريد الإلكتروني', description: 'إشعارات عبر البريد الإلكتروني' },
                                { field: 'sms_notifications', label: 'الرسائل النصية', description: 'إشعارات عبر الرسائل النصية' },
                                { field: 'push_notifications', label: 'إشعارات التطبيق', description: 'إشعارات داخل التطبيق' },
                              ].map(({ field, label, description }) => (
                                <div key={field} className="flex items-center justify-between">
                                  <div className="text-right">
                                    <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" {...registerSettings(field as keyof NotificationSettings)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                  </label>
                                </div>
                              ))}
                            </div>
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">تواتر الإشعارات</label>
                              <select
                                {...registerSettings('alert_frequency')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                              >
                                <option value="IMMEDIATE">فوري</option>
                                <option value="HOURLY">كل ساعة</option>
                                <option value="DAILY">يومي</option>
                                <option value="WEEKLY">أسبوعي</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Business Alerts */}
                    {notificationsEnabled && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">تنبيهات العمل</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">تنبيهات المخزون المنخفض</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إشعار عند وصول المخزون إلى الحد الأدنى</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" {...registerSettings('low_stock_alerts')} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                          {notificationSettings.low_stock_alerts && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">الحد الأدنى للمخزون</label>
                              <input
                                type="number"
                                min="1"
                                {...registerSettings('low_stock_threshold', {
                                  required: 'الحد الأدنى للمخزون مطلوب',
                                  min: { value: 1, message: 'يجب أن يكون الحد الأدنى 1 على الأقل' },
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                              />
                              {errorsSettings.low_stock_threshold && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errorsSettings.low_stock_threshold.message}</p>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { field: 'invoice_approval_alerts', label: 'إشعارات اعتماد الفواتير', description: 'إشعار عند اعتماد أو رفض الفواتير' },
                              { field: 'purchase_order_alerts', label: 'إشعارات أوامر الشراء', description: 'إشعارات بخصوص أوامر الشراء' },
                              { field: 'factory_dispatch_alerts', label: 'إشعارات تحويلات المصنع', description: 'إشعارات بخصوص تحويلات المصنع' },
                              { field: 'quality_check_alerts', label: 'إشعارات فحوصات الجودة', description: 'إشعارات بخصوص فحوصات الجودة' },
                            ].map(({ field, label, description }) => (
                              <div key={field} className="flex items-center justify-between">
                                <div className="text-right">
                                  <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" {...registerSettings(field as keyof NotificationSettings)} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* System Alerts */}
                    {notificationsEnabled && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">تنبيهات النظام</h3>
                        <div className="space-y-4">
                          {[
                            { field: 'security_alerts', label: 'تنبيهات الأمان', description: 'إشعارات بخصوص الأمان والنشاط المشبوه' },
                            { field: 'system_maintenance_alerts', label: 'إشعارات صيانة النظام', description: 'إشعارات بخصوص صيانة النظام والتحديثات' },
                          ].map(({ field, label, description }) => (
                            <div key={field} className="flex items-center justify-between">
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" {...registerSettings(field as keyof NotificationSettings)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reports */}
                    {notificationsEnabled && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">التقارير</h3>
                        <div className="space-y-4">
                          {[
                            { field: 'daily_summary', label: 'ملخص يومي', description: 'ملخص يومي للنشاطات والمخزون' },
                            { field: 'weekly_report', label: 'تقرير أسبوعي', description: 'تقرير أسبوعي شامل' },
                            { field: 'monthly_report', label: 'تقرير شهري', description: 'تقرير شهري شامل' },
                          ].map(({ field, label, description }) => (
                            <div key={field} className="flex items-center justify-between">
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" {...registerSettings(field as keyof NotificationSettings)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiet Hours */}
                    {notificationsEnabled && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">الساعات الهادئة</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-white">تفعيل الساعات الهادئة</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تعطيل الإشعارات خلال أوقات محددة</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" {...registerSettings('quiet_hours_enabled')} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                          {quietHoursEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              {[
                                { field: 'quiet_hours_start', label: 'وقت البداية', requiredMessage: 'وقت البداية مطلوب' },
                                { field: 'quiet_hours_end', label: 'وقت النهاية', requiredMessage: 'وقت النهاية مطلوب' },
                              ].map(({ field, label, requiredMessage }) => (
                                <div key={field}>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">{label}</label>
                                  <input
                                    type="time"
                                    {...registerSettings(field as keyof NotificationSettings, {
                                      required: quietHoursEnabled ? requiredMessage : false,
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                                  />
                                  {errorsSettings[field as keyof NotificationSettings] && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                                      {errorsSettings[field as keyof NotificationSettings]?.message}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Test Notifications */}
                    {notificationsEnabled && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right mb-4">اختبار الإشعارات</h3>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-right">اختبار إرسال الإشعارات عبر القنوات المختلفة</p>
                          <div className="flex flex-wrap gap-3 justify-end">
                            {[
                              { channel: 'EMAIL', label: 'اختبار البريد الإلكتروني', enabled: emailEnabled, color: 'indigo', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                              { channel: 'SMS', label: 'اختبار الرسائل النصية', enabled: smsEnabled, color: 'green', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
                              { channel: 'PUSH', label: 'اختبار إشعارات التطبيق', enabled: true, color: 'purple', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                            ].map(({ channel, label, enabled, color, icon }) => (
                              enabled && (
                                <button
                                  key={channel}
                                  type="button"
                                  onClick={() => handleTestNotification(channel as 'EMAIL' | 'SMS' | 'PUSH')}
                                  disabled={testSending}
                                  className={`px-4 py-2 bg-${color}-600 hover:bg-${color}-700 disabled:bg-${color}-400 text-white rounded-xl transition-colors flex items-center gap-2`}
                                >
                                  {testSending ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      جاري الإرسال...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                                      </svg>
                                      {label}
                                    </>
                                  )}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-600">
                      <button
                        type="submit"
                        disabled={processing || !hasPermission}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                      >
                        {processing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            حفظ الإعدادات
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right">تفضيلات الإشعارات</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{notificationPreferences.length} تفضيل</p>
                  </div>
                  {notificationPreferences.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد تفضيلات</p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm">سيتم إنشاء التفضيلات تلقائياً عند تفعيل الإشعارات</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notificationPreferences.map((preference) => (
                        <div key={preference.id} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="text-right flex-1">
                              <div className="flex items-center gap-3 justify-end mb-2">
                                <span
                                  className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                    preference.priority === 'CRITICAL'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                      : preference.priority === 'HIGH'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                                      : preference.priority === 'MEDIUM'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                                  }`}
                                >
                                  {preference.priority === 'CRITICAL' ? 'حرج' : preference.priority === 'HIGH' ? 'عالي' : preference.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{getChannelLabel(preference.channel)}</span>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-lg">{getNotificationTypeLabel(preference.notification_type)}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">آخر تحديث: {formatDateTime(preference.updated_at)}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                              <input
                                type="checkbox"
                                checked={preference.enabled}
                                onChange={(e) => handlePreferenceUpdate(preference.id, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right">سجل الإشعارات</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">آخر {notificationHistory.length} إشعار</p>
                  </div>
                  {notificationHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد إشعارات سابقة</p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm">سيظهر سجل الإشعارات هنا عند إرسال الإشعارات</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notificationHistory.map((notification) => (
                        <div key={notification.id} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="text-right flex-1">
                              <div className="flex items-center gap-3 justify-end mb-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(notification.status)}`}>
                                  {getStatusLabel(notification.status)}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{getChannelLabel(notification.channel)}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{getTimeAgo(notification.sent_at)}</span>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-lg">{notification.title}</p>
                              <p className="text-gray-600 dark:text-gray-400 mt-2 text-right">{notification.message}</p>
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{getNotificationTypeLabel(notification.notification_type)}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(notification.sent_at)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {notificationHistory.length > 0 && (
                    <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => fetchNotificationData()}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                      >
                        تحميل المزيد
                      </button>
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

export default NotificationSettingsPage;

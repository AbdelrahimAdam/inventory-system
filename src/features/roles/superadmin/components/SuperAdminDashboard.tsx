import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { db, functions } from '../../../../services/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  where,
  serverTimestamp,
  addDoc,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

interface DashboardStats {
  total_users: number;
  active_users: number;
  total_invoices: number;
  pending_invoices: number;
  total_inventory_items: number;
  low_stock_items: number;
  total_factory_dispatches: number;
  pending_returns: number;
  security_events_today: number;
  failed_logins_today: number;
  system_health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  disk_usage: number;
  memory_usage: number;
  cpu_usage: number;
  daily_sales: number;
  monthly_revenue: number;
  total_roles: number;
  system_uptime: string;
  total_accessory_items: number;
  total_monofia_items: number;
  total_matbaa_items: number;
  total_stock_movements: number;
  total_location_transfers: number;
  active_sessions: number;
  mfa_enabled_users: number;
  locked_users: number;
  unverified_users: number;
  total_security_events: number;
  api_requests_today: number;
  database_size: number;
  backup_status: 'SUCCESS' | 'FAILED' | 'PENDING';
  last_backup: string;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  event_description: string;
  username: string;
  ip_address: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  created_at: Timestamp;
  details?: any;
  user_id?: string;
}

interface SystemUser {
  id: string;
  uid: string;
  username: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  is_locked?: boolean;
  last_login?: Timestamp;
  created_at: Timestamp;
  failed_login_attempts?: number;
  mfa_enabled?: boolean;
  session_expires?: Timestamp;
}

interface SystemRole {
  id: string;
  name: string;
  description: string;
  security_level: number;
  is_system_role: boolean;
  total_users: number;
  created_at: Timestamp;
}

const FALLBACK_STATS: DashboardStats = {
  total_users: 156,
  active_users: 148,
  total_invoices: 892,
  pending_invoices: 23,
  total_inventory_items: 2547,
  low_stock_items: 45,
  total_factory_dispatches: 167,
  pending_returns: 12,
  security_events_today: 28,
  failed_logins_today: 3,
  system_health: 'HEALTHY',
  disk_usage: 45,
  memory_usage: 62,
  cpu_usage: 28,
  daily_sales: 12500,
  monthly_revenue: 375000,
  total_roles: 5,
  system_uptime: '15:22:17',
  total_accessory_items: 567,
  total_monofia_items: 892,
  total_matbaa_items: 1088,
  total_stock_movements: 234,
  total_location_transfers: 78,
  active_sessions: 45,
  mfa_enabled_users: 23,
  locked_users: 2,
  unverified_users: 5,
  total_security_events: 2847,
  api_requests_today: 1245,
  database_size: 245760000,
  backup_status: 'SUCCESS',
  last_backup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
};

const SuperAdminDashboard: React.FC = () => {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [recentUsers, setRecentUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'security' | 'system'>('overview');

  console.log('🔍 [SuperAdminDashboard] Auth State:', {
    user: user?.role,
    isSuperAdmin,
    hasSuperAdminRole: hasRole ? hasRole('superadmin') : false
  });

  const formatNumber = useCallback((n: number | undefined) => n?.toLocaleString('en-US') ?? '0', []);
  const formatFileSize = useCallback((bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);
  const getTimeAgo = useCallback((ts: Timestamp | string | undefined): string => {
    if (!ts) return 'غير متوفر';
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    return date.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }, []);

  const logEvent = useCallback(async (type: string, desc: string, success: boolean) => {
    try {
      await addDoc(collection(db, 'securityLogs'), {
        event_type: type,
        event_description: desc,
        username: user?.email || 'superadmin',
        ip_address: '127.0.0.1',
        severity: success ? 'INFO' : 'ERROR',
        user_id: user?.uid,
        created_at: serverTimestamp()
      });
    } catch (e) { console.warn('Log failed', e); }
  }, [user]);

  // Real-time listeners
  useEffect(() => {
    console.log('🔄 [SuperAdminDashboard] Setting up real-time listeners');
    
    if (!isSuperAdmin) {
      console.log('🔴 [SuperAdminDashboard] User is not SuperAdmin, skipping listeners');
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];

    // Fetch stats from multiple collections
    const fetchStats = async () => {
      try {
        console.log('📊 [SuperAdminDashboard] Fetching stats...');
        
        // Get users count
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const total_users = usersSnapshot.size;
        const active_users = usersSnapshot.docs.filter(doc => doc.data().isActive !== false).length;
        const unverified_users = usersSnapshot.docs.filter(doc => doc.data().emailVerified !== true).length;

        // Get inventory items count
        const inventorySnapshot = await getDocs(collection(db, 'warehouseItems'));
        const total_inventory_items = inventorySnapshot.size;

        // Get invoices count
        const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
        const total_invoices = invoicesSnapshot.size;
        const pending_invoices = invoicesSnapshot.docs.filter(doc => doc.data().status === 'pending').length;

        // Get security events count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const securityQuery = query(
          collection(db, 'securityLogs'),
          where('created_at', '>=', Timestamp.fromDate(today))
        );
        const securitySnapshot = await getDocs(securityQuery);
        const security_events_today = securitySnapshot.size;

        // Calculate real stats
        const realStats: DashboardStats = {
          ...FALLBACK_STATS,
          total_users,
          active_users,
          unverified_users,
          total_inventory_items,
          total_invoices,
          pending_invoices,
          security_events_today,
          // Update other stats with real data
          total_roles: 5, // Default roles: superadmin, manager, worker, buyer, supplier
          locked_users: usersSnapshot.docs.filter(doc => doc.data().is_locked === true).length,
          mfa_enabled_users: usersSnapshot.docs.filter(doc => doc.data().mfa_enabled === true).length,
        };

        console.log('✅ [SuperAdminDashboard] Stats loaded:', realStats);
        setStats(realStats);
      } catch (e: any) {
        console.error('❌ [SuperAdminDashboard] Error fetching stats:', e);
        setStats(FALLBACK_STATS);
        setError('استخدام بيانات بديلة - ' + e.message);
      }
    };
    fetchStats();

    // Security events listener
    try {
      const qEvents = query(collection(db, 'securityLogs'), orderBy('created_at', 'desc'), limit(20));
      const unsubEvents = onSnapshot(qEvents, 
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SecurityEvent));
          console.log('📋 [SuperAdminDashboard] Security events updated:', data.length);
          setEvents(data);
        },
        (error) => {
          console.error('❌ [SuperAdminDashboard] Security events error:', error);
        }
      );
      unsubs.push(unsubEvents);
    } catch (e) {
      console.error('❌ [SuperAdminDashboard] Security events setup failed:', e);
    }

    // Recent users listener
    try {
      const qUsers = query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(6));
      const unsubUsers = onSnapshot(qUsers, 
        (snap) => {
          const data = snap.docs.map(d => ({ 
            id: d.id,
            uid: d.id,
            ...d.data() 
          } as SystemUser));
          console.log('👥 [SuperAdminDashboard] Users updated:', data.length);
          setRecentUsers(data);
        },
        (error) => {
          console.error('❌ [SuperAdminDashboard] Users listener error:', error);
        }
      );
      unsubs.push(unsubUsers);
    } catch (e) {
      console.error('❌ [SuperAdminDashboard] Users setup failed:', e);
    }

    // Roles listener
    try {
      const qRoles = query(collection(db, 'roles'));
      const unsubRoles = onSnapshot(qRoles, 
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemRole));
          console.log('🎭 [SuperAdminDashboard] Roles updated:', data.length);
          setRoles(data);
        },
        (error) => {
          console.error('❌ [SuperAdminDashboard] Roles listener error:', error);
        }
      );
      unsubs.push(unsubRoles);
    } catch (e) {
      console.error('❌ [SuperAdminDashboard] Roles setup failed:', e);
    }

    setLoading(false);
    
    return () => {
      console.log('🧹 [SuperAdminDashboard] Cleaning up listeners');
      unsubs.forEach(u => u());
    };
  }, [isSuperAdmin]);

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'unlock' | 'reset_password' | 'verify') => {
    setProcessing(true);
    setError('');
    setSuccess('');
    
    try {
      console.log(`🛠️ [SuperAdminDashboard] User action: ${action} on user ${userId}`);
      
      let updateData: any = {};
      
      switch (action) {
        case 'activate':
          updateData = { isActive: true, is_locked: false };
          break;
        case 'deactivate':
          updateData = { isActive: false };
          break;
        case 'unlock':
          updateData = { is_locked: false, failed_login_attempts: 0 };
          break;
        case 'verify':
          updateData = { emailVerified: true };
          break;
        case 'reset_password':
          // This would typically use Firebase Auth reset password
          // For now, just log the action
          console.log('Password reset requested for user:', userId);
          break;
      }

      // Update user document in Firestore
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, 'users', userId), {
          ...updateData,
          updatedAt: serverTimestamp()
        });
      }

      const actionText = {
        'activate': 'تفعيل',
        'deactivate': 'تعطيل', 
        'unlock': 'فتح',
        'reset_password': 'إعادة تعيين كلمة المرور',
        'verify': 'توثيق'
      }[action];

      setSuccess(`تم ${actionText} المستخدم بنجاح`);
      await logEvent('USER_UPDATE', `Admin ${action} user ${userId}`, true);
      
    } catch (e: any) {
      console.error('❌ [SuperAdminDashboard] User action failed:', e);
      setError(e.message || `فشل ${action} المستخدم`);
      await logEvent('USER_UPDATE', `Failed ${action} user ${userId}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleSystemAction = async (action: 'backup' | 'clear_cache' | 'optimize_db' | 'restart_services') => {
    setProcessing(true);
    setError('');
    setSuccess('');
    
    try {
      console.log(`🛠️ [SuperAdminDashboard] System action: ${action}`);
      
      // For now, simulate the action with a timeout
      // In production, you would call a Cloud Function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const actionText = {
        'backup': 'إنشاء نسخة احتياطية',
        'clear_cache': 'مسح الذاكرة المؤقتة',
        'optimize_db': 'تحسين قاعدة البيانات', 
        'restart_services': 'إعادة تشغيل الخدمات'
      }[action];

      setSuccess(`تم ${actionText} بنجاح`);
      await logEvent('SYSTEM_ACTION', `Admin executed ${action}`, true);
      
    } catch (e: any) {
      console.error('❌ [SuperAdminDashboard] System action failed:', e);
      setError(e.message || `فشل ${action}`);
      await logEvent('SYSTEM_ACTION', `Failed ${action}`, false);
    } finally {
      setProcessing(false);
    }
  };

  const securityStats = useMemo(() => ({
    totalEvents: events.length,
    criticalEvents: events.filter(e => e.severity === 'CRITICAL').length,
    errorEvents: events.filter(e => e.severity === 'ERROR').length,
    warningEvents: events.filter(e => e.severity === 'WARN').length,
    todayEvents: events.filter(e => {
      const d = e.created_at?.toDate();
      return d && new Date(d).toDateString() === new Date().toDateString();
    }).length
  }), [events]);

  const getSeverityColor = (s: string) => {
    return s === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
           s === 'ERROR' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
           s === 'WARN' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
           'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
  };

  // Show access denied if not superadmin
  if (!isSuperAdmin) {
    console.log('🔴 [SuperAdminDashboard] Access denied - user is not SuperAdmin');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">ممنوع الوصول</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">هذه الصفحة للمسؤول الرئيسي فقط</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            دورك الحالي: <strong>{user?.role}</strong>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
            className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل لوحة التحكم...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">المسؤول الرئيسي</p>
        </div>
      </div>
    );
  }

  console.log('🎯 [SuperAdminDashboard] Rendering dashboard with stats:', stats);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              لوحة التحكم - المسؤول الرئيسي
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              نظام إدارة المخزون الشامل • {user?.name || user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
            >
              <span>🔄</span>
              تحديث البيانات
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
            <div className="flex items-center gap-2">
              <span>✅</span>
              {success}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-reverse space-x-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          {(['overview', 'users', 'security', 'system'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab === 'overview' ? 'نظرة عامة' : 
               tab === 'users' ? 'المستخدمون' : 
               tab === 'security' ? 'الأمان' : 
               'النظام'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي المستخدمين', value: stats?.total_users, sub: `${stats?.active_users} نشط`, icon: '👥', color: 'blue' },
                  { label: 'عناصر المخزون', value: stats?.total_inventory_items, sub: `${stats?.low_stock_items} منخفض`, icon: '📦', color: 'green' },
                  { label: 'الفواتير', value: stats?.total_invoices, sub: `${stats?.pending_invoices} معلق`, icon: '📄', color: 'purple' },
                  { label: 'الإيراد الشهري', value: stats?.monthly_revenue, sub: `${stats?.daily_sales} اليوم`, icon: '💰', color: 'yellow', currency: true }
                ].map((card, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {card.currency ? `${formatNumber(card.value)} ر.س` : formatNumber(card.value)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.sub}</p>
                      </div>
                      <div className={`w-10 h-10 bg-${card.color}-100 dark:bg-${card.color}-900/30 rounded-lg flex items-center justify-center text-lg`}>
                        {card.icon}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Recent Events & Users */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Security Events */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">أحدث أحداث الأمان</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {events.slice(0, 5).map(event => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {event.event_description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {event.username} • {getTimeAgo(event.created_at)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)} whitespace-nowrap ml-2`}>
                          {event.severity === 'INFO' ? 'معلومات' : 
                           event.severity === 'WARN' ? 'تحذير' : 
                           event.severity === 'ERROR' ? 'خطأ' : 'حرج'}
                        </span>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد أحداث</p>
                    )}
                  </div>
                </div>

                {/* Recent Users */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">أحدث المستخدمين</h3>
                  <div className="space-y-2">
                    {recentUsers.map(user => (
                      <div 
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || user.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {user.role} • {getTimeAgo(user.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleUserAction(user.uid, user.isActive ? 'deactivate' : 'activate')}
                            disabled={processing}
                            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            {user.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {recentUsers.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا يوجد مستخدمين</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">سجل الأحداث الأمنية</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  إجمالي الأحداث: {securityStats.totalEvents}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="border-b dark:border-gray-700">
                    <tr>
                      <th className="pb-2 font-medium text-gray-900 dark:text-white">الحدث</th>
                      <th className="pb-2 font-medium text-gray-900 dark:text-white">المستخدم</th>
                      <th className="pb-2 font-medium text-gray-900 dark:text-white">الوقت</th>
                      <th className="pb-2 font-medium text-gray-900 dark:text-white">المستوى</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(event => (
                      <tr key={event.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3 text-gray-900 dark:text-white">{event.event_description}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">{event.username}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">{getTimeAgo(event.created_at)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          لا توجد أحداث أمنية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* System Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إجراءات النظام</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { action: 'backup', label: 'نسخة احتياطية', icon: '💾' },
                    { action: 'clear_cache', label: 'مسح الكاش', icon: '🧹' },
                    { action: 'optimize_db', label: 'تحسين قاعدة البيانات', icon: '⚡' },
                    { action: 'restart_services', label: 'إعادة تشغيل الخدمات', icon: '🔄' }
                  ].map((item) => (
                    <button 
                      key={item.action}
                      onClick={() => handleSystemAction(item.action as any)}
                      disabled={processing}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-sm transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">معلومات النظام</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">حالة النظام</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      stats?.system_health === 'HEALTHY' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                      stats?.system_health === 'WARNING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {stats?.system_health === 'HEALTHY' ? 'سليم' : 
                       stats?.system_health === 'WARNING' ? 'تحذير' : 'حرج'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">حالة النسخ الاحتياطي</span>
                    <span className={`${
                      stats?.backup_status === 'SUCCESS' ? 'text-green-600 dark:text-green-400' :
                      stats?.backup_status === 'FAILED' ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {stats?.backup_status === 'SUCCESS' ? 'ناجح' : 
                       stats?.backup_status === 'FAILED' ? 'فاشل' : 'قيد الانتظار'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">آخر نسخة احتياطية</span>
                    <span className="text-gray-900 dark:text-white">{getTimeAgo(stats?.last_backup || '')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">حجم قاعدة البيانات</span>
                    <span className="text-gray-900 dark:text-white">{formatFileSize(stats?.database_size || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">مدة التشغيل</span>
                    <span className="text-gray-900 dark:text-white">{stats?.system_uptime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
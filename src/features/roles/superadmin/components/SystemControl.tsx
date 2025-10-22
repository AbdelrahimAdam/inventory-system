import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ToggleLeft, 
  AlertTriangle, 
  Save, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Users,
  Database,
  Bell,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Network,
  Calendar,
  CheckCircle,
  Play,
  Pause,
  Download,
  RefreshCw,
  BarChart3,
  Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { superadminApi } from '@/services/superadminApi';

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  description: string | null;
  is_editable: boolean;
}

interface SystemStats {
  totalUsers: number;
  activeSessions: number;
  storageUsed: string;
  storageTotal: string;
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
  uptime: string;
  lastBackup: string;
  securityEvents: number;
  pendingUpdates: number;
}

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  authentication: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  lastChecked: string;
}

const SystemControl = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeSessions: 0,
    storageUsed: '0 GB',
    storageTotal: '0 GB',
    cpuUsage: 0,
    memoryUsage: 0,
    networkIn: 0,
    networkOut: 0,
    uptime: '0 days',
    lastBackup: 'Never',
    securityEvents: 0,
    pendingUpdates: 0
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'healthy',
    api: 'healthy',
    authentication: 'healthy',
    storage: 'healthy',
    lastChecked: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);
  const [newConfigValue, setNewConfigValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; value: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const configsPerPage = 10;

  // Pagination
  const indexOfLastConfig = currentPage * configsPerPage;
  const indexOfFirstConfig = indexOfLastConfig - configsPerPage;
  const currentConfigs = Array.isArray(configs) ? configs.slice(indexOfFirstConfig, indexOfLastConfig) : [];
  const totalPages = Math.ceil((Array.isArray(configs) ? configs.length : 0) / configsPerPage);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchSystemConfig(),
        fetchSystemStats(),
        fetchSystemStatus()
      ]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching system data:', err);
      setError(err.response?.data?.message || 'فشل تحميل بيانات النظام');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const response = await superadminApi.getSystemConfig();
      let configsData = [];
      if (response.data && Array.isArray(response.data.data)) {
        configsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        configsData = response.data;
      } else if (response.data && Array.isArray(response.data.configs)) {
        configsData = response.data.configs;
      }
      setConfigs(Array.isArray(configsData) ? configsData : []);
    } catch (err: any) {
      throw err;
    }
  };

  const fetchSystemStats = async () => {
    // Simulate API call - replace with actual API
    const mockStats: SystemStats = {
      totalUsers: 1247,
      activeSessions: 42,
      storageUsed: '2.3 GB',
      storageTotal: '10 GB',
      cpuUsage: 23,
      memoryUsage: 65,
      networkIn: 124,
      networkOut: 89,
      uptime: '15 days, 8 hours',
      lastBackup: '2024-01-15 02:00',
      securityEvents: 12,
      pendingUpdates: 3
    };
    setSystemStats(mockStats);
  };

  const fetchSystemStatus = async () => {
    // Simulate API call - replace with actual API
    const mockStatus: SystemStatus = {
      database: 'healthy',
      api: 'healthy',
      authentication: 'warning',
      storage: 'healthy',
      lastChecked: new Date().toISOString()
    };
    setSystemStatus(mockStatus);
  };

  const handleToggleSystem = async (enabled: boolean) => {
    setConfirmAction({ type: 'system', value: enabled });
    setIsConfirmModalOpen(true);
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    setConfirmAction({ type: 'maintenance', value: enabled });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !user) return;
    setLoading(true);
    try {
      if (confirmAction.type === 'system') {
        await superadminApi.toggleSystem({ enabled: confirmAction.value, performedBy: user.id });
        setSuccess(`تم ${confirmAction.value ? 'تفعيل' : 'تعطيل'} النظام بنجاح`);
      } else if (confirmAction.type === 'maintenance') {
        await superadminApi.toggleMaintenance({ enabled: confirmAction.value, performedBy: user.id });
        setSuccess(`تم ${confirmAction.value ? 'تفعيل' : 'تعطيل'} وضع الصيانة بنجاح`);
      }
      fetchSystemConfig();
      setIsConfirmModalOpen(false);
      setConfirmAction(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تنفيذ الإجراء');
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (config: SystemConfig) => {
    if (!config.is_editable) {
      setError('هذا الإعداد غير قابل للتعديل');
      return;
    }
    setSelectedConfig(config);
    setNewConfigValue(config.config_value);
    setIsEditModalOpen(true);
  };

  const handleUpdateConfig = async () => {
    if (!selectedConfig || !user) return;
    if (!validateConfigValue(selectedConfig.config_type, newConfigValue)) {
      setError('قيمة الإعداد غير صالحة لهذا النوع');
      return;
    }
    setLoading(true);
    try {
      await superadminApi.updateSystemConfig(selectedConfig.config_key, { 
        value: newConfigValue, 
        performedBy: user.id 
      });
      setSuccess('تم تحديث الإعداد بنجاح');
      setIsEditModalOpen(false);
      setSelectedConfig(null);
      setNewConfigValue('');
      fetchSystemConfig();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحديث الإعداد');
    } finally {
      setLoading(false);
    }
  };

  const validateConfigValue = (type: string, value: string): boolean => {
    if (type === 'number') {
      return !isNaN(Number(value)) && value.trim() !== '';
    }
    if (type === 'boolean') {
      return ['true', 'false'].includes(value.toLowerCase());
    }
    return value.trim() !== '';
  };

  const renderConfigInput = () => {
    if (!selectedConfig) return null;
    if (selectedConfig.config_type === 'boolean') {
      return (
        <select
          value={newConfigValue}
          onChange={(e) => setNewConfigValue(e.target.value)}
          className={`mt-1 block w-full rounded-xl border-2 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors p-3`}
          disabled={loading}
        >
          <option value="true">مفعل</option>
          <option value="false">معطل</option>
        </select>
      );
    }
    if (selectedConfig.config_type === 'number') {
      return (
        <input
          type="number"
          value={newConfigValue}
          onChange={(e) => setNewConfigValue(e.target.value)}
          className={`mt-1 block w-full rounded-xl border-2 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors p-3`}
          disabled={loading}
        />
      );
    }
    return (
      <input
        type="text"
        value={newConfigValue}
        onChange={(e) => setNewConfigValue(e.target.value)}
        className={`mt-1 block w-full rounded-xl border-2 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors p-3`}
        disabled={loading}
      />
    );
  };

  const generateKey = (config: SystemConfig, index: number) => {
    return config.id ? `config-${config.id}` : `config-${config.config_key}-${index}`;
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'warning': return 'text-yellow-500 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'error': return 'text-red-500 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <X className="w-5 h-5" />;
    }
  };

  const StatusIndicator = ({ service, status }: { service: string; status: 'healthy' | 'warning' | 'error' }) => (
    <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${getStatusColor(status)} transition-all duration-200`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon(status)}
        <span className="font-semibold text-gray-800 dark:text-white">{service}</span>
      </div>
      <span className="text-sm font-medium capitalize">{status === 'healthy' ? 'سليم' : status === 'warning' ? 'تحذير' : 'خطأ'}</span>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, trend, description }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        {trend && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            trend.startsWith('+') 
              ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
              : 'text-red-600 bg-red-50 dark:bg-red-900/20'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
      <p className="text-gray-600 dark:text-gray-300 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</p>
      )}
    </div>
  );

  const ProgressBar = ({ percentage, label, color = 'blue' }: any) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">{label}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">لوحة تحكم النظام</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">مراقبة وإدارة نظام الجرد الخاص بك</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSystemData}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">حالة النظام</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                آخر فحص: {new Date(systemStatus.lastChecked).toLocaleTimeString()}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatusIndicator service="قاعدة البيانات" status={systemStatus.database} />
              <StatusIndicator service="خدمة API" status={systemStatus.api} />
              <StatusIndicator service="المصادقة" status={systemStatus.authentication} />
              <StatusIndicator service="التخزين" status={systemStatus.storage} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-6 h-6" />
            <h3 className="text-lg font-semibold">مدة التشغيل</h3>
          </div>
          <p className="text-2xl font-bold mb-2">{systemStats.uptime}</p>
          <p className="text-blue-100 text-sm">تشغيل مستمر</p>
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">آخر نسخة احتياطية</span>
              <span className="font-medium">{systemStats.lastBackup}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">أحداث الأمان</span>
              <span className="font-medium">{systemStats.securityEvents} اليوم</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="إجمالي المستخدمين"
          value={systemStats.totalUsers}
          icon={Users}
          trend="+5.2%"
          description="مستخدمي النظام النشطين"
        />
        <StatCard
          title="الجلسات النشطة"
          value={systemStats.activeSessions}
          icon={Shield}
          description="جلسات المستخدم الحالية"
        />
        <StatCard
          title="المساحة المستخدمة"
          value={systemStats.storageUsed}
          icon={Database}
          description={`من ${systemStats.storageTotal} الإجمالي`}
        />
        <StatCard
          title="التحديثات المعلقة"
          value={systemStats.pendingUpdates}
          icon={Bell}
          trend="3 حرجة"
          description="تحديثات أمان متاحة"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">مقاييس الأداء</h2>
            <div className="space-y-6">
              <ProgressBar 
                percentage={systemStats.cpuUsage} 
                label="استخدام المعالج" 
                color={systemStats.cpuUsage > 80 ? 'red' : systemStats.cpuUsage > 60 ? 'yellow' : 'blue'}
              />
              <ProgressBar 
                percentage={systemStats.memoryUsage} 
                label="استخدام الذاكرة"
                color={systemStats.memoryUsage > 80 ? 'red' : systemStats.memoryUsage > 60 ? 'yellow' : 'green'}
              />
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <Network className="w-8 h-8 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">الشبكة الداخلة</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{systemStats.networkIn} م.ب/ث</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <Download className="w-8 h-8 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">الشبكة الخارجة</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{systemStats.networkOut} م.ب/ث</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* System Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">التحكم بالنظام</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleToggleSystem(configs.find(c => c.config_key === 'SYSTEM_ENABLED')?.config_value !== 'true')}
                className={`w-full flex items-center justify-center space-x-3 p-3 rounded-xl transition-colors ${
                  configs.find(c => c.config_key === 'SYSTEM_ENABLED')?.config_value === 'true' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:bg-gray-400`}
                disabled={loading}
              >
                <ToggleLeft className="w-5 h-5" />
                <span>
                  {configs.find(c => c.config_key === 'SYSTEM_ENABLED')?.config_value === 'true' 
                    ? 'تعطيل النظام' 
                    : 'تفعيل النظام'}
                </span>
              </button>
              <button
                onClick={() => handleToggleMaintenance(configs.find(c => c.config_key === 'MAINTENANCE_MODE')?.config_value !== 'true')}
                className={`w-full flex items-center justify-center space-x-3 p-3 rounded-xl transition-colors ${
                  configs.find(c => c.config_key === 'MAINTENANCE_MODE')?.config_value === 'true' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:bg-gray-400`}
                disabled={loading}
              >
                <Settings className="w-5 h-5" />
                <span>
                  {configs.find(c => c.config_key === 'MAINTENANCE_MODE')?.config_value === 'true' 
                    ? 'إيقاف وضع الصيانة' 
                    : 'تفعيل وضع الصيانة'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">إجراءات سريعة</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>نسخ قاعدة البيانات احتياطيًا</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Play className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>بدء الصيانة</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>فحص الأمان</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Configurations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">إعدادات النظام</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchSystemData}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 bg-red-100 dark:bg-red-900/20 border-r-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 bg-green-100 dark:bg-green-900/20 border-r-4 border-green-500 text-green-700 dark:text-green-400 p-4 rounded-xl">
            {success}
          </div>
        )}

        {/* Configurations List */}
        {loading ? (
          <div className="animate-pulse p-6">
            <div className="bg-gray-200 dark:bg-gray-700 h-12 rounded-xl mb-2"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-12 rounded-xl mb-2"></div>
          </div>
        ) : (
          <>
            {/* Desktop: Table View */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      المفتاح
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      القيمة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      الوصف
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentConfigs.length > 0 ? (
                    currentConfigs.map((config, index) => (
                      <tr key={generateKey(config, index)} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {config.config_key}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {config.config_type === 'boolean' ? (config.config_value === 'true' ? 'مفعل' : 'معطل') : config.config_value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {config.config_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {config.description || 'لا يوجد وصف'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEditConfig(config)}
                            className={`flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ${
                              !config.is_editable ? 'opacity-50 cursor-not-allowed' : ''
                            } transition-colors`}
                            disabled={!config.is_editable || loading}
                          >
                            <Settings className="h-4 w-4 ml-2" />
                            تعديل
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        لا توجد إعدادات متاحة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-900">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 ml-2" />
                    السابق
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    التالي
                    <ChevronLeft className="h-5 w-5 mr-2" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: Card View */}
            <div className="lg:hidden space-y-4 p-6">
              {currentConfigs.length > 0 ? (
                currentConfigs.map((config, index) => (
                  <div key={generateKey(config, index)} className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {config.config_key}
                      </h3>
                      <button
                        onClick={() => handleEditConfig(config)}
                        className={`flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ${
                          !config.is_editable ? 'opacity-50 cursor-not-allowed' : ''
                        } transition-colors`}
                        disabled={!config.is_editable || loading}
                      >
                        <Settings className="h-4 w-4 ml-2" />
                        تعديل
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      القيمة: {config.config_type === 'boolean' ? (config.config_value === 'true' ? 'مفعل' : 'معطل') : config.config_value}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      النوع: {config.config_type}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      الوصف: {config.description || 'لا يوجد وصف'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    لا توجد إعدادات متاحة
                  </p>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 ml-2" />
                    السابق
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  >
                    التالي
                    <ChevronLeft className="h-5 w-5 mr-2" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تأكيد الإجراء
              </h3>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 ml-3" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {confirmAction.type === 'system'
                  ? `هل أنت متأكد من ${confirmAction.value ? 'تفعيل' : 'تعطيل'} النظام؟`
                  : `هل أنت متأكد من ${confirmAction.value ? 'تفعيل' : 'إيقاف'} وضع الصيانة؟`}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                disabled={loading}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {isEditModalOpen && selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تعديل الإعداد: {selectedConfig.config_key}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  القيمة
                </label>
                {renderConfigInput()}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  الوصف: {selectedConfig.description || 'لا يوجد وصف'}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateConfig}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 ml-2 inline" />
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemControl;
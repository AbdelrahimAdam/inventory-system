import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { superadminApi } from '@/services/superadminApi';

interface SystemStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_sessions: number;
  total_requests: number;
  error_rate: number;
  response_time: number;
}

interface PerformanceMetric {
  timestamp: string;
  value: number;
}

const SystemMonitoring = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemMetrics();
    const interval = setInterval(loadSystemMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemMetrics = async () => {
    try {
      const response = await superadminApi.getSystemMetrics();
      setSystemStats(response.data.data.current_stats);
      setPerformanceMetrics(response.data.data.performance_metrics || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل مقاييس النظام');
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage > 90) return 'text-red-500';
    if (usage > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageBgColor = (usage: number) => {
    if (usage > 90) return 'bg-red-500';
    if (usage > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 dark:bg-gray-700 h-8 rounded-xl w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-32 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          مراقبة النظام
        </h2>
        <button
          onClick={loadSystemMetrics}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          disabled={loading}
        >
          <Activity className="h-5 w-5 ml-2" />
          تحديث
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 rounded-xl">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 ml-2" />
            {error}
          </div>
        </div>
      )}

      {/* System Stats Grid */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPU Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">استخدام المعالج</p>
                <p className={`text-2xl font-bold ${getUsageColor(systemStats.cpu_usage)}`}>
                  {systemStats.cpu_usage}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageBgColor(systemStats.cpu_usage)}`}
                style={{ width: `${systemStats.cpu_usage}%` }}
              ></div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">استخدام الذاكرة</p>
                <p className={`text-2xl font-bold ${getUsageColor(systemStats.memory_usage)}`}>
                  {systemStats.memory_usage}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Server className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageBgColor(systemStats.memory_usage)}`}
                style={{ width: `${systemStats.memory_usage}%` }}
              ></div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">استخدام التخزين</p>
                <p className={`text-2xl font-bold ${getUsageColor(systemStats.disk_usage)}`}>
                  {systemStats.disk_usage}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageBgColor(systemStats.disk_usage)}`}
                style={{ width: `${systemStats.disk_usage}%` }}
              ></div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الجلسات النشطة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemStats.active_sessions}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {systemStats.total_requests} طلب اليوم
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            وقت الاستجابة (مللي ثانية)
          </h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {systemStats?.response_time || 0}ms
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            متوسط وقت استجابة النظام
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            معدل الأخطاء
          </h3>
          <div className={`text-3xl font-bold ${
            (systemStats?.error_rate || 0) > 5 ? 'text-red-500' : 'text-green-500'
          }`}>
            {systemStats?.error_rate || 0}%
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            نسبة الطلبات الفاشلة
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          مقاييس الأداء الحديثة
        </h3>
        {performanceMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الوقت
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    استخدام المعالج
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    استخدام الذاكرة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    وقت الاستجابة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {performanceMetrics.slice(0, 10).map((metric, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {new Date(metric.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {metric.value}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {metric.value}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {metric.value}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            لا توجد بيانات متاحة
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMonitoring;
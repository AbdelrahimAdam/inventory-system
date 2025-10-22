import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  CloudArrowUpIcon, 
  CloudArrowDownIcon,
  ServerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface DatabaseBackup {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  status: 'completed' | 'failed' | 'in-progress';
  type: 'full' | 'incremental';
}

interface DatabaseStatus {
  connections: number;
  size: string;
  uptime: string;
  performance: 'excellent' | 'good' | 'fair' | 'poor';
  lastBackup: string;
}

interface DatabaseTable {
  name: string;
  size: string;
  rows: number;
  lastModified: string;
}

const DatabaseManagement: React.FC = () => {
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<DatabaseBackup | null>(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('full');
  const [backupName, setBackupName] = useState('');

  // Mock data initialization
  useEffect(() => {
    const mockBackups: DatabaseBackup[] = [
      {
        id: '1',
        name: 'backup_2024_01_15_full',
        size: '2.4 GB',
        createdAt: '2024-01-15 14:30:00',
        status: 'completed',
        type: 'full'
      },
      {
        id: '2',
        name: 'backup_2024_01_16_inc',
        size: '450 MB',
        createdAt: '2024-01-16 02:15:00',
        status: 'completed',
        type: 'incremental'
      },
      {
        id: '3',
        name: 'backup_2024_01_17_full',
        size: '2.6 GB',
        createdAt: '2024-01-17 14:45:00',
        status: 'in-progress',
        type: 'full'
      }
    ];

    const mockStatus: DatabaseStatus = {
      connections: 24,
      size: '15.8 GB',
      uptime: '15 days, 8 hours',
      performance: 'excellent',
      lastBackup: '2024-01-16 02:15:00'
    };

    const mockTables: DatabaseTable[] = [
      { name: 'users', size: '450 MB', rows: 12500, lastModified: '2024-01-17 10:30:00' },
      { name: 'inventory_items', size: '2.1 GB', rows: 85000, lastModified: '2024-01-17 11:15:00' },
      { name: 'invoices', size: '1.2 GB', rows: 45000, lastModified: '2024-01-17 09:45:00' },
      { name: 'stock_movements', size: '3.5 GB', rows: 120000, lastModified: '2024-01-17 12:00:00' },
      { name: 'security_logs', size: '850 MB', rows: 35000, lastModified: '2024-01-17 13:20:00' }
    ];

    setBackups(mockBackups);
    setStatus(mockStatus);
    setTables(mockTables);
    setLoading(false);
  }, []);

  const handleCreateBackup = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newBackup: DatabaseBackup = {
        id: Date.now().toString(),
        name: backupName || `backup_${new Date().toISOString().split('T')[0]}_${backupType}`,
        size: '0 MB',
        createdAt: new Date().toLocaleString('ar-EG'),
        status: 'in-progress',
        type: backupType
      };
      setBackups(prev => [newBackup, ...prev]);
      setShowBackupDialog(false);
      setBackupName('');
      setBackupType('full');
      setLoading(false);
    }, 2000);
  };

  const handleRestoreBackup = (backup: DatabaseBackup) => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
  };

  const confirmRestore = () => {
    setLoading(true);
    // Simulate restore process
    setTimeout(() => {
      setShowRestoreDialog(false);
      setSelectedBackup(null);
      setLoading(false);
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'fair': return 'text-yellow-600 dark:text-yellow-400';
      case 'poor': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل بيانات قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              إدارة قاعدة البيانات
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              إدارة النسخ الاحتياطية واستعادة البيانات ومراقبة أداء النظام
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
            <button
              onClick={() => setShowBackupDialog(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              <CloudArrowUpIcon className="h-5 w-5 ml-2" />
              إنشاء نسخة احتياطية
            </button>
            <button
              onClick={() => setLoading(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors duration-200"
            >
              <ArrowPathIcon className="h-5 w-5 ml-2" />
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ServerIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الاتصالات النشطة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{status?.connections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">حجم قاعدة البيانات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{status?.size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مدة التشغيل</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{status?.uptime}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <SpeedIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الأداء</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(status?.performance || '')}`}>
                {status?.performance === 'excellent' ? 'ممتاز' : 
                 status?.performance === 'good' ? 'جيد' :
                 status?.performance === 'fair' ? 'متوسط' : 'ضعيف'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Backups Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                النسخ الاحتياطية
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {backups.length} نسخة احتياطية
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className={`p-2 rounded-lg ${
                      backup.type === 'full' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'
                    }`}>
                      {backup.type === 'full' ? (
                        <DocumentArrowDownIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <DocumentArrowUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{backup.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {backup.size} • {backup.createdAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                      {backup.status === 'completed' ? 'مكتمل' :
                       backup.status === 'failed' ? 'فشل' : 'قيد التنفيذ'}
                    </span>
                    <button
                      onClick={() => handleRestoreBackup(backup)}
                      disabled={backup.status === 'in-progress'}
                      className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CloudArrowDownIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Database Tables Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              جداول قاعدة البيانات
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {tables.map((table, index) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <TableIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{table.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {table.rows.toLocaleString('ar-EG')} صف • {table.size}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      آخر تعديل
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {table.lastModified}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Dialog */}
      {showBackupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إنشاء نسخة احتياطية جديدة
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم النسخة الاحتياطية
                </label>
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="أدخل اسم النسخة الاحتياطية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع النسخة الاحتياطية
                </label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value as 'full' | 'incremental')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="full">نسخة كاملة</option>
                  <option value="incremental">نسخة تزايدية</option>
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      النسخة الكاملة: تحتوي على جميع البيانات وتأخذ وقت أطول
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      النسخة التزايدية: تحتوي على التغييرات منذ آخر نسخة وتكون أسرع
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowBackupDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء النسخة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Dialog */}
      {showRestoreDialog && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 space-x-reverse mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تأكيد استعادة النسخة الاحتياطية
              </h3>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>تحذير:</strong> عملية الاستعادة ستحذف جميع البيانات الحالية وتستبدلها بالنسخة الاحتياطية. هذه العملية لا يمكن التراجع عنها.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">النسخة الاحتياطية:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedBackup.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الحجم:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedBackup.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">تاريخ الإنشاء:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedBackup.createdAt}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRestore}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الاستعادة...' : 'تأكيد الاستعادة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-900 dark:text-white">جاري معالجة طلبك...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Icons
const SpeedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TableIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export default DatabaseManagement;
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Shield, 
  Activity, 
  Archive, 
  FileText,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import SystemControl from './SystemControl';
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import AuditLogs from './AuditLogs';
import SystemMonitoring from './SystemMonitoring';
import { superadminApi } from '../../services/superadminApi';

const SuperAdminDashboard = () => {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Activity },
    { id: 'users', label: 'إدارة المستخدمين', icon: Users },
    { id: 'roles', label: 'إدارة الأدوار', icon: Shield },
    { id: 'system', label: 'إعدادات النظام', icon: Settings },
    { id: 'monitoring', label: 'مراقبة النظام', icon: Activity },
    { id: 'logs', label: 'سجلات التدقيق', icon: FileText },
  ];

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      const response = await superadminApi.getSystemStats();
      setSystemStats(response.data.data);
    } catch (error) {
      console.error('Error loading system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview stats={systemStats} />;
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'system':
        return <SystemControl />;
      case 'monitoring':
        return <SystemMonitoring />;
      case 'logs':
        return <AuditLogs />;
      default:
        return <DashboardOverview stats={systemStats} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            tabs={tabs}
          />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          tabs={tabs}
        />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                className="lg:hidden mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                لوحة الإدارة العامة
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  SA
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {loading && activeTab === 'dashboard' ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-200 dark:bg-gray-700 h-32 rounded-2xl"></div>
                ))}
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ activeTab, setActiveTab, tabs }) => {
  const { isDark } = useTheme();

  return (
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-4 mb-8">
        <Shield className="h-8 w-8 text-blue-600" />
        <span className="mr-3 text-xl font-bold text-gray-900 dark:text-white">
          النظام الإداري
        </span>
      </div>

      {/* Navigation */}
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 w-full text-right ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-r-4 border-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const DashboardOverview = ({ stats }) => {
  const { isDark } = useTheme();

  if (!stats) return null;

  const statCards = [
    {
      title: 'إجمالي المستخدمين',
      value: stats.total_users,
      icon: Users,
      color: 'blue',
      change: '+12%',
    },
    {
      title: 'المستخدمين النشطين',
      value: stats.active_users,
      icon: Users,
      color: 'green',
      change: '+5%',
    },
    {
      title: 'إجمالي الفواتير',
      value: stats.total_invoices,
      icon: FileText,
      color: 'purple',
      change: '+23%',
    },
    {
      title: 'أصناف المخزون',
      value: stats.total_inventory_items,
      icon: Archive,
      color: 'orange',
      change: '+8%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* System Status Banner */}
      <div className={`rounded-2xl p-6 ${
        stats.system_status === 'Enabled' 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
          : 'bg-gradient-to-r from-red-500 to-pink-600'
      } text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              حالة النظام: {stats.system_status === 'Enabled' ? 'مفعل' : 'معطل'}
            </h2>
            <p className="opacity-90">
              {stats.system_status === 'Enabled' 
                ? 'النظام يعمل بشكل طبيعي' 
                : 'النظام متوقف حاليًا'
              }
            </p>
          </div>
          <div className={`p-3 rounded-full bg-white bg-opacity-20`}>
            <Activity className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            green: 'from-green-500 to-green-600',
            purple: 'from-purple-500 to-purple-600',
            orange: 'from-orange-500 to-orange-600',
          };

          return (
            <div key={index} className={`bg-gradient-to-br ${colorClasses[card.color]} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                  <span className="text-blue-200 text-xs mt-1">{card.change} عن الشهر الماضي</span>
                </div>
                <div className="p-3 rounded-full bg-white bg-opacity-20">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard
          title="إنشاء مستخدم جديد"
          description="إضافة مستخدم جديد إلى النظام"
          icon={Users}
          action={() => window.dispatchEvent(new CustomEvent('openUserCreate'))}
          color="blue"
        />
        <QuickActionCard
          title="إدارة الأدوار"
          description="تعديل صلاحيات المستخدمين"
          icon={Shield}
          action={() => window.dispatchEvent(new CustomEvent('openRoleManagement'))}
          color="green"
        />
        <QuickActionCard
          title="النسخ الاحتياطي"
          description="إنشاء نسخة احتياطية للنظام"
          icon={Archive}
          action={() => window.dispatchEvent(new CustomEvent('createBackup'))}
          color="purple"
        />
      </div>
    </div>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, action, color }) => {
  const colorClasses = {
    blue: 'border-blue-200 hover:border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    green: 'border-green-200 hover:border-green-400 bg-green-50 dark:bg-green-900/20',
    purple: 'border-purple-200 hover:border-purple-400 bg-purple-50 dark:bg-purple-900/20',
  };

  return (
    <button
      onClick={action}
      className={`w-full text-right p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-md ${colorClasses[color]} dark:border-gray-700`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-8 w-8 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </button>
  );
};

export default SuperAdminDashboard;

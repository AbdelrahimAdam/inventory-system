import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  PlusCircle,
  BarChart2,
  AlertCircle,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useFeatureFlag } from '../../utils/features';

interface Props {
  collapsed: boolean;
  onLinkClick: () => void;
}

const ManagerNav: React.FC<Props> = ({ collapsed, onLinkClick }) => {
  // Prepare feature flags safely
  const featureFlags = {
    'advanced-analytics': useFeatureFlag('advanced-analytics'),
    'admin-panel': useFeatureFlag('admin-panel'),
  };

  const navItems = [
    { path: '/manager/dashboard', icon: <LayoutDashboard />, label: 'لوحة القيادة' },
    { path: '/manager/users', icon: <Users />, label: 'المستخدمون' },
    { path: '/manager/inventory', icon: <Package />, label: 'المخزون' },
    { path: '/manager/inventory-report', icon: <ClipboardList />, label: 'تقرير المخزون' },
    { path: '/manager/add-item', icon: <PlusCircle />, label: 'إضافة عنصر' },
    { path: '/manager/reports', icon: <BarChart2 />, label: 'التقارير', feature: 'advanced-analytics' },
    { path: '/manager/alerts', icon: <AlertCircle />, label: 'التنبيهات' },
    { path: '/manager/settings', icon: <Settings />, label: 'الإعدادات' },
    { path: '/admin', icon: <ShieldCheck />, label: 'لوحة الإدارة', feature: 'admin-panel' },
  ];

  // Filter items using resolved feature flags
  const filteredItems = navItems.filter(
    item => !item.feature || featureFlags[item.feature]
  );

  return (
    <nav className="space-y-1" role="navigation" aria-label="قائمة المدير">
      {filteredItems.map(({ path, icon, label }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onLinkClick}
          aria-label={label}
          role="link"
          className={({ isActive }) =>
            `group relative flex items-center px-4 py-3 rounded-lg transition-all duration-300
            ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`
          }
        >
          {/* Optional active indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-blue-600 transition-opacity duration-300 opacity-0 group-[aria-current=page]:opacity-100" />

          {/* Icon with optional tooltip on collapsed */}
          <div className="relative flex items-center justify-center">
            <span className="text-xl transition-transform group-hover:scale-110">
              {icon}
            </span>

            {collapsed && (
              <span className="absolute right-full top-1/2 -translate-y-1/2 whitespace-nowrap text-sm bg-black text-white py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {label}
              </span>
            )}
          </div>

          {/* Label - hidden when collapsed */}
          {!collapsed && (
            <span className="ms-3 transition-opacity duration-300">{label}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default ManagerNav;

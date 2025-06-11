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
  ShieldCheck
} from 'lucide-react';
import { useFeatureFlag } from '../../utils/features';

interface Props {
  collapsed: boolean;
  onLinkClick: () => void;
}

const ManagerNav: React.FC<Props> = ({ collapsed, onLinkClick }) => {
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

  const filteredItems = navItems.filter(item => !item.feature || useFeatureFlag(item.feature));

  return (
    <nav className="space-y-1">
      {filteredItems.map(({ path, icon, label }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onLinkClick}
          className={({ isActive }) =>
            `group flex items-center px-4 py-3 rounded-lg transition-all duration-300 ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <span className="text-xl transition-transform group-hover:scale-110">{icon}</span>
          {!collapsed ? (
            <span className="ml-3 transition-opacity duration-300">{label}</span>
          ) : (
            <span className="ml-3 hidden group-hover:inline absolute right-full pr-3 text-sm bg-black text-white py-1 px-2 rounded shadow transition-opacity duration-300 opacity-0 group-hover:opacity-100">
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default ManagerNav;

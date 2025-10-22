import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  BarChart2,
  Settings,
  ScrollText,
  Briefcase,
  Truck,
  DollarSign,
} from 'lucide-react';

interface Props {
  collapsed: boolean;
  onLinkClick: () => void;
}

const BuyerNav: React.FC<Props> = ({ collapsed, onLinkClick }) => {
  const navItems = [
    { path: '/buyer/dashboard', icon: <LayoutDashboard />, label: 'لوحة التحكم' },
    { path: '/buyer/orders', icon: <ShoppingCart />, label: 'الطلبات' },
    { path: '/buyer/suppliers', icon: <Users />, label: 'الموردون' },
    { path: '/buyer/reports', icon: <BarChart2 />, label: 'التقارير' },
    { path: '/buyer/purchase-invoices', icon: <ScrollText />, label: 'فواتير الشراء' },
    { path: '/buyer/supplier-management', icon: <Briefcase />, label: 'إدارة الموردين' },
    { path: '/buyer/procurement', icon: <Truck />, label: 'عمليات التوريد' },
    { path: '/buyer/budget', icon: <DollarSign />, label: 'إدارة الميزانية' },
    { path: '/buyer/settings', icon: <Settings />, label: 'الإعدادات' },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map(({ path, icon, label }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onLinkClick}
          className={({ isActive }) =>
            `group flex items-center px-4 py-3 rounded-lg transition-all duration-300 ${
              isActive ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
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

export default BuyerNav;
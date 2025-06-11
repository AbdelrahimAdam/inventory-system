import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  KeyRound,
  User,
  ScrollText,
  Settings
} from 'lucide-react';
import { useFeatureFlag } from '../../utils/features';

interface AdminNavProps {
  collapsed?: boolean;
  onLinkClick?: () => void;
}

const AdminNav: React.FC<AdminNavProps> = ({ collapsed = false, onLinkClick }) => {
  const navItems = [
    { path: "/admin/dashboard", icon: <ShieldCheck />, label: "لوحة التحكم" },
    { path: "/admin/roles", icon: <KeyRound />, label: "الأدوار" },
    { path: "/admin/users", icon: <User />, label: "المستخدمون", feature: "user-management" },
    { path: "/admin/logs", icon: <ScrollText />, label: "السجلات", feature: "system-logs" },
    { path: "/admin/settings", icon: <Settings />, label: "الإعدادات" },
  ];

  const filteredItems = navItems.filter(item => !item.feature || useFeatureFlag(item.feature));

  return (
    <nav className="space-y-1 overflow-y-auto">
      {filteredItems.map(({ path, icon, label }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onLinkClick}
          className={({ isActive }) =>
            `group flex items-center px-3 py-2 rounded-lg transition-colors duration-300 ${
              isActive ? "bg-red-600 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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

export default AdminNav;

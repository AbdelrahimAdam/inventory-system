import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle,
  ScanLine,
  BarChart2,
  Settings,
} from 'lucide-react';
import { useFeatureFlag } from '../../utils/features';
import { motion } from 'framer-motion';

interface Props {
  collapsed: boolean;
  onLinkClick: () => void;
}

const WorkerNav: React.FC<Props> = ({ collapsed, onLinkClick }) => {
  const navItems = [
    {
      path: '/worker/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'لوحة القيادة',
    },
    {
      path: '/worker/tasks',
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'المهام',
    },
    {
      path: '/worker/scan',
      icon: <ScanLine className="w-5 h-5" />,
      label: 'المسح',
      feature: 'barcode-scanning',
    },
    {
      path: '/worker/reports',
      icon: <BarChart2 className="w-5 h-5" />,
      label: 'التقارير',
    },
    {
      path: '/worker/settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'الإعدادات',
    },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map(({ path, icon, label, feature }) => {
        if (feature && !useFeatureFlag(feature)) return null;

        return (
          <NavLink
            key={path}
            to={path}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `group relative flex items-center px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
              }`
            }
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2"
            >
              {icon}
            </motion.div>

            {!collapsed ? (
              <motion.span
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="ml-3"
              >
                {label}
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="ml-3 hidden group-hover:inline absolute right-full pr-3 text-sm bg-black text-white py-1 px-2 rounded shadow"
              >
                {label}
              </motion.span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default WorkerNav;

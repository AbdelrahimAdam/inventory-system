// src/components/sidebar/RoleNavigation.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlag } from '../../utils/features';
import { ROLES, Role, ROLE_CONFIG } from '../../utils/roles';
import {
  LayoutDashboard,
  PlusCircle,
  Boxes,
  Users,
  BarChart,
  ClipboardList,
  ScanLine,
  ShoppingCart,
  Building2,
  Package,
  FileText,
} from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  feature?: Parameters<typeof useFeatureFlag>[0];
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  [ROLES.MANAGER]: [
    { path: '/manager', icon: <LayoutDashboard className="w-5 h-5" />, label: 'لوحة القيادة' },
    { path: '/manager/add-item', icon: <PlusCircle className="w-5 h-5" />, label: 'إضافة منتج جديد' },
    { path: '/manager/inventory', icon: <Boxes className="w-5 h-5" />, label: 'عرض المخزون' },
    { path: '/manager/users', icon: <Users className="w-5 h-5" />, label: 'إدارة المستخدمين' },
    { path: '/manager/reports', icon: <BarChart className="w-5 h-5" />, label: 'التقارير', feature: 'advanced-analytics' },
  ],
  [ROLES.WORKER]: [
    { path: '/worker', icon: <ClipboardList className="w-5 h-5" />, label: 'المهام' },
    { path: '/worker/scan', icon: <ScanLine className="w-5 h-5" />, label: 'مسح العناصر', feature: 'barcode-scanning' },
    { path: '/worker/inventory', icon: <Boxes className="w-5 h-5" />, label: 'المخزون' },
  ],
  [ROLES.BUYER]: [
    { path: '/buyer', icon: <ShoppingCart className="w-5 h-5" />, label: 'الطلبات' },
    { path: '/buyer/suppliers', icon: <Building2 className="w-5 h-5" />, label: 'الموردون', feature: 'supplier-portal' },
  ],
  [ROLES.SUPPLIER]: [
    { path: '/supplier', icon: <Package className="w-5 h-5" />, label: 'المنتجات' },
    { path: '/supplier/orders', icon: <FileText className="w-5 h-5" />, label: 'الطلبات' },
  ],
};

const RoleNavigation: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role as Role;
  const routes = NAV_ITEMS[role] || [];
  const colorClass = ROLE_CONFIG[role]?.color || 'from-indigo-500 to-purple-600';

  const filteredRoutes = routes.filter(({ feature }) =>
    !feature || useFeatureFlag(feature)
  );

  return (
    <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-150px)] pr-2 text-right">
      {filteredRoutes.map(({ path, icon, label }) => (
        <NavLink
          key={path}
          to={path}
          end
          className={({ isActive }) =>
            `group flex items-center justify-end gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium text-sm
            ${
              isActive
                ? `bg-gradient-to-r ${colorClass} text-white shadow-md`
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`
          }
        >
          <span className="text-base">{label}</span>
          <span className="text-xl">{icon}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default RoleNavigation;

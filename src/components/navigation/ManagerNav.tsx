import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Box,
  Truck,
  Search,
  Archive,
  Printer,
  Plus,
  Download,
  Factory,
  Layers,
  TrendingUp,
  Activity,
  Eye,
  Trash2,
  ArrowLeftRight,
  ScrollText,
  GitBranch,
  Wrench,
  MapPin,
  Inbox,
  FileSearch,
} from 'lucide-react';
import { useFeatureFlag } from '../../utils/features';

interface Props {
  collapsed: boolean;
  onLinkClick: () => void;
  onCloseSidebar?: () => void; // for mobile
}

interface NavItem {
  id: string;
  path: string;
  icon: React.ReactNode;
  label: string;
  feature?: string;
  subItems?: NavItem[];
}

const ManagerNav: React.FC<Props> = ({ collapsed, onLinkClick, onCloseSidebar }) => {
  const navRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Feature flags
  const featureFlags = {
    'advanced-analytics': useFeatureFlag('advanced-analytics'),
    'admin-panel': useFeatureFlag('admin-panel'),
    'batch-operations': useFeatureFlag('batch-operations'), // Example for advanced features
    'stock-adjustment': useFeatureFlag('stock-adjustment'),
  };

  // Navigation items updated to match all Manager routes in app.tsx
  const navItems: NavItem[] = [
    // ✅ Dashboard
    {
      id: 'dashboard',
      path: '/manager/dashboard',
      icon: <LayoutDashboard size={24} />,
      label: 'لوحة التحكم',
    },

    // ✅ Users
    {
      id: 'users',
      path: '/manager/users',
      icon: <Users size={24} />,
      label: 'المستخدمون',
    },

    // ✅ Inventory Overview
    {
      id: 'inventory',
      path: '/manager/inventory',
      icon: <Package size={24} />,
      label: 'إدارة المخزون',
    },

    // ✅ Inventory Report
    {
      id: 'inventory_report',
      path: '/manager/inventory-report',
      icon: <FileSearch size={24} />,
      label: 'تقرير المخزون',
    },

    // Item Movements - ALWAYS VISIBLE
    {
      id: 'item_movements',
      path: '/manager/main-inventory/item-movements',
      icon: <Activity size={24} />,
      label: 'حركة الأصناف',
    },

    // Main Inventory Operations (expandable with all sub-routes)
    {
      id: 'main_inventory_ops',
      path: '/manager/main-inventory',
      icon: <Inbox size={24} />,
      label: 'عمليات المخزون الرئيسية',
      subItems: [
        { id: 'add_item', label: 'إضافة صنف', path: '/manager/main-inventory/add-item', icon: <Plus size={24} /> },
        { id: 'dispatch_factory', label: 'صرف إلى المصنع', path: '/manager/main-inventory/dispatch/dispatch-factory', icon: <Truck size={24} /> },
        { id: 'dispatch_external', label: 'صرف خارجي', path: '/manager/main-inventory/dispatch/dispatch-external', icon: <Truck size={24} /> },
        { id: 'search_edit', label: 'بحث وتعديل', path: '/manager/main-inventory/search-edit', icon: <Search size={24} /> },
        { id: 'view_stock', label: 'عرض المخزون', path: '/manager/main-inventory/view-stock', icon: <Eye size={24} /> },
        { id: 'delete_stock', label: 'حذف من المخزون', path: '/manager/main-inventory/delete-from-stock', icon: <Trash2 size={24} /> },
        { id: 'delete_factory', label: 'حذف من المصنع', path: '/manager/main-inventory/delete-from-factory', icon: <Trash2 size={24} /> },
        { id: 'delete_external', label: 'حذف خارجي', path: '/manager/main-inventory/delete-from-external', icon: <Trash2 size={24} /> },
        { id: 'transfer_print', label: 'نقل إلى الطباعة', path: '/manager/main-inventory/transfer-to-print', icon: <ArrowLeftRight size={24} /> },
        { id: 'factory_return', label: 'إرجاع المصنع', path: '/manager/main-inventory/factory-return', icon: <Factory size={24} /> },
        { id: 'invoices', label: 'نظام الفواتير', path: '/manager/main-inventory/invoices', icon: <ScrollText size={24} /> },
        { id: 'stock_adjust', label: 'تعديل المخزون', path: '/manager/main-inventory/stock-adjustment', icon: <Wrench size={24} />, feature: 'stock-adjustment' },
        { id: 'batch_ops', label: 'عمليات دفعة', path: '/manager/main-inventory/batch-operations', icon: <Layers size={24} />, feature: 'batch-operations' },
        { id: 'location_transfers', label: 'نقل المواقع', path: '/manager/main-inventory/location-transfers', icon: <MapPin size={24} /> },
      ],
    },

    // Accessories Management
    {
      id: 'accessories',
      path: '/manager/accessories',
      icon: <Archive size={24} />,
      label: 'إدارة الإكسسوارات',
      subItems: [
        { id: 'accessories_view_stock', label: 'عرض المخزون', path: '/manager/accessories/view-stock', icon: <Eye size={24} /> },
      ],
    },

    // Print Management
    {
      id: 'print',
      path: '/manager/print/manager',
      icon: <Printer size={24} />,
      label: 'إدارة المطبعة',
    },

    // Monofya Inventory
    {
      id: 'monofya',
      path: '/manager/monofya',
      icon: <Box size={24} />,
      label: 'مخزون المنوفية',
      subItems: [
        { id: 'monofya_add_item', label: 'إضافة صنف', path: '/manager/monofya/add-item', icon: <Plus size={24} /> },
        { id: 'monofya_view_stock', label: 'عرض المخزون', path: '/manager/monofya/view-stock', icon: <Eye size={24} /> },
      ],
    },

    // Reports
    { id: 'reports', path: '/manager/reports', icon: <BarChart2 size={24} />, label: 'التقارير', feature: 'advanced-analytics' },

    // Alerts
    { id: 'alerts', path: '/manager/alerts', icon: <AlertCircle size={24} />, label: 'التنبيهات' },

    // Settings
    { id: 'settings', path: '/manager/settings', icon: <Settings size={24} />, label: 'الإعدادات' },

    // Admin Panel (if applicable, though not in routes; retained for flag)
    { id: 'admin', path: '/manager/admin', icon: <ShieldCheck size={24} />, label: 'لوحة الإدارة', feature: 'admin-panel' },
  ];

  // Filter by feature flags - Recursive for subitems
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .map(item => {
        if (item.feature && !featureFlags[item.feature]) return null;
        if (item.subItems) {
          const filteredSubs = filterItems(item.subItems);
          return { ...item, subItems: filteredSubs };
        }
        return item;
      })
      .filter(Boolean) as NavItem[];
  };

  const filteredItems = useMemo(() => filterItems(navItems), [featureFlags]);

  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  const toggleSubMenu = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Close sidebar when clicking outside (for mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        onCloseSidebar?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCloseSidebar]);

  return (
    <nav 
      ref={navRef} 
      className="w-64 sm:w-64 bg-white dark:bg-gray-900 h-full border-l border-gray-200 dark:border-gray-700 flex flex-col" 
      role="navigation" 
      aria-label="المدير"
    >
      {/* Fixed header area */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">قائمة الخيارات</h2>
      </div>
      
      {/* Scrollable content area */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {filteredItems.map(({ id, path, icon, label, subItems }) => (
          <div key={id} className="mb-2 last:mb-0">
            {subItems && subItems.length > 0 ? (
              <>
                {/* Top-level with subItems */}
                <div
                  className={`group relative flex items-center px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer
                    bg-white dark:bg-gray-800 
                    text-gray-800 dark:text-gray-200 
                    shadow-md hover:shadow-lg
                    border border-gray-200 dark:border-gray-700
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    rounded-lg`}
                  onClick={() => toggleSubMenu(id)}
                  aria-expanded={!!expandedItems[id]}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') toggleSubMenu(id);
                  }}
                >
                  <span className="text-2xl transition-transform group-hover:scale-110 text-teal-600 dark:text-teal-400">{icon}</span>
                  {!collapsed && <span className="ms-3 font-bold text-lg">{label}</span>}
                  {!collapsed && (
                    <span className={`ms-auto transition-transform duration-300 ${expandedItems[id] ? 'rotate-180' : ''} text-gray-500 dark:text-gray-400`}>
                      ▼
                    </span>
                  )}
                </div>

                {/* Sub-items */}
                <AnimatePresence>
                  {expandedItems[id] && !collapsed && (
                    <motion.div
                      className="ms-6 mt-2 space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {subItems.map(subItem => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.path}
                          onClick={onLinkClick}
                          className={({ isActive }) =>
                            `group relative flex items-center px-4 py-2.5 rounded-lg transition-all duration-300
                            bg-gray-50 dark:bg-gray-800
                            border border-gray-200 dark:border-gray-700
                            shadow-md hover:shadow-lg
                            ${isActive 
                              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                            rounded-lg`
                          }
                        >
                          <span className="text-xl transition-transform group-hover:scale-110 text-teal-600 dark:text-teal-400">{subItem.icon}</span>
                          <span className="ms-3 text-base font-bold">{subItem.label}</span>
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              // ✅ Top-level clickable link (no subItems)
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `group relative flex items-center px-4 py-3 rounded-xl transition-all duration-300
                  bg-white dark:bg-gray-800 
                  text-gray-800 dark:text-gray-200 
                  shadow-md hover:shadow-lg
                  border border-gray-200 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  rounded-lg
                  ${isActive ? 'bg-teal-50 text-teal-700 border-teal-500' : ''}`
                }
                onClick={onLinkClick}
              >
                <span className="text-2xl transition-transform group-hover:scale-110 text-teal-600 dark:text-teal-400">{icon}</span>
                {!collapsed && <span className="ms-3 font-bold text-lg">{label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </div>

      {/* Fixed footer area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        نظام إدارة المخزون © {new Date().getFullYear()}
        </div>
      </div>
    </nav>
  );
};

export default ManagerNav;
// src/components/navigation/SuperAdminNav.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

// Import Lucide icons
import { 
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  Activity,
  FileText,
  Database,
  Monitor,
  AlertTriangle,
  Globe,
  Lock,
  BarChart3,
  Home,
  Archive,
  Package,
  Truck,
  Search,
  Eye,
  Trash2,
  ArrowLeftRight,
  Factory,
  ScrollText,
  GitBranch,
  Wrench,
  MapPin,
  Inbox,
  Bell,
  Printer,
  Briefcase,
  Hammer,
  Scan,
  HardDrive,
  DollarSign,
  ShoppingCart,
  Ship,
  Box,
  Server,
  Cpu,
  Network,
  Shield,
  Key,
  UserCheck,
  FileSearch,
  History,
  Download,
  Upload,
  Filter,
  PieChart,
  Plus,
  ClipboardList,
  Warehouse,
  Building,
  TrendingUp,
  PackageOpen,
  TruckIcon,
  CreditCard,
  Users as UsersIcon,
  FileBarChart,
  Target,
  Cog
} from 'lucide-react';

// Types based on Firebase schema
interface NavItem {
  id: string;
  path: string;
  icon: React.ReactNode;
  label: string;
  featureCode?: string;
  requiredPermission?: string;
  subItems?: NavItem[];
}

interface SuperAdminNavProps {
  collapsed?: boolean;
  onLinkClick?: () => void;
  onCloseSidebar?: () => void;
}

const SuperAdminNav: React.FC<SuperAdminNavProps> = ({ 
  collapsed = false, 
  onLinkClick, 
  onCloseSidebar 
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  
  // App configurable values
  const systemName = import.meta.env.VITE_APP_SYSTEM_NAME || 'نظام إدارة المخزون';
  const copyrightYear = new Date().getFullYear();
  const companyCopyright = import.meta.env.VITE_APP_COMPANY_COPYRIGHT || `نظام إدارة المخزون © ${copyrightYear}`;

  // Feature codes from Firebase custom claims and user features
  const FEATURE_CODES = {
    // System Administration
    SUPER_ADMIN_DASHBOARD: 'SUPERADMIN_DASHBOARD',
    USER_MANAGEMENT: 'USER_MANAGEMENT',
    ROLE_MANAGEMENT: 'ROLE_MANAGEMENT',
    SYSTEM_CONFIG: 'SYSTEM_CONFIG',
    SYSTEM_MONITORING: 'SYSTEM_MONITORING',
    DATABASE_MANAGEMENT: 'DATABASE_MANAGEMENT',
    BACKUP_RESTORE: 'BACKUP_RESTORE',
    
    // Security & Auditing
    SECURITY_LOGS: 'SECURITY_LOGS',
    AUDIT_LOGS: 'AUDIT_LOGS',
    
    // All Role Features
    MANAGER_DASHBOARD: 'MANAGER_DASHBOARD',
    WORKER_DASHBOARD: 'WORKER_DASHBOARD',
    BUYER_DASHBOARD: 'BUYER_DASHBOARD',
    SUPPLIER_DASHBOARD: 'SUPPLIER_DASHBOARD',
    
    // Inventory Management
    INVENTORY_MANAGEMENT: 'INVENTORY_MANAGEMENT',
    INVOICE_MANAGEMENT: 'INVOICE_MANAGEMENT',
    
    // Factory Operations
    FACTORY_OPERATIONS: 'FACTORY_OPERATIONS',
    
    // Accessory Management
    ACCESSORY_MANAGEMENT: 'ACCESSORY_MANAGEMENT',
    
    // Multi-location Inventory
    MONOFIA_INVENTORY: 'MONOFIA_INVENTORY',
    MATBAA_INVENTORY: 'MATBAA_INVENTORY'
  };

  // ✅ ULTIMATE SUPER_ADMIN NAVIGATION - Access to ALL user roles
  const navItems: NavItem[] = [
    // === SUPER ADMIN DASHBOARD ===
    {
      id: 'superadmin_dashboard',
      path: '/superadmin/dashboard',
      icon: <ShieldCheck size={20} />,
      label: 'لوحة المشرف العام',
      featureCode: FEATURE_CODES.SUPER_ADMIN_DASHBOARD,
      requiredPermission: 'view'
    },

    // === SYSTEM ADMINISTRATION ===
    {
      id: 'system_admin',
      path: '/superadmin/users',
      icon: <Settings size={20} />,
      label: 'إدارة النظام',
      featureCode: FEATURE_CODES.USER_MANAGEMENT,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'user_management',
          path: '/superadmin/users',
          icon: <Users size={18} />,
          label: 'إدارة المستخدمين',
          featureCode: FEATURE_CODES.USER_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'role_management',
          path: '/superadmin/roles',
          icon: <ShieldCheck size={18} />,
          label: 'إدارة الأدوار',
          featureCode: FEATURE_CODES.ROLE_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'system_monitoring',
          path: '/superadmin/monitoring',
          icon: <Activity size={18} />,
          label: 'مراقبة النظام',
          featureCode: FEATURE_CODES.SYSTEM_MONITORING,
          requiredPermission: 'view'
        },
        {
          id: 'audit_logs',
          path: '/superadmin/audit-logs',
          icon: <FileSearch size={18} />,
          label: 'سجلات التدقيق',
          featureCode: FEATURE_CODES.AUDIT_LOGS,
          requiredPermission: 'view'
        },
        {
          id: 'security_logs',
          path: '/superadmin/security-logs',
          icon: <Shield size={18} />,
          label: 'سجلات الأمان',
          featureCode: FEATURE_CODES.SECURITY_LOGS,
          requiredPermission: 'view'
        }
      ]
    },

    // === MANAGER DASHBOARD & FEATURES ===
    {
      id: 'manager_dashboard',
      path: '/manager/dashboard',
      icon: <ClipboardList size={20} />,
      label: 'لوحة المدير',
      featureCode: FEATURE_CODES.MANAGER_DASHBOARD,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'manager_main_dashboard',
          path: '/manager/dashboard',
          icon: <LayoutDashboard size={18} />,
          label: 'اللوحة الرئيسية',
          featureCode: FEATURE_CODES.MANAGER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'manager_inventory',
          path: '/manager/inventory',
          icon: <Package size={18} />,
          label: 'المخزون الرئيسي',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'add_item',
          path: '/manager/main-inventory/add-item',
          icon: <Plus size={18} />,
          label: 'إضافة صنف',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'create'
        },
        {
          id: 'view_stock',
          path: '/manager/main-inventory/view-stock',
          icon: <Eye size={18} />,
          label: 'عرض المخزون',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'search_edit',
          path: '/manager/main-inventory/search-edit',
          icon: <Search size={18} />,
          label: 'بحث وتعديل',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'invoices',
          path: '/manager/main-inventory/invoices',
          icon: <ScrollText size={18} />,
          label: 'الفواتير',
          featureCode: FEATURE_CODES.INVOICE_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'stock_adjustment',
          path: '/manager/main-inventory/stock-adjustment',
          icon: <Wrench size={18} />,
          label: 'تعديل المخزون',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'edit'
        },
        {
          id: 'manager_reports',
          path: '/manager/reports',
          icon: <BarChart3 size={18} />,
          label: 'تقارير المدير',
          featureCode: FEATURE_CODES.MANAGER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'manager_settings',
          path: '/manager/settings',
          icon: <Cog size={18} />,
          label: 'إعدادات المدير',
          featureCode: FEATURE_CODES.MANAGER_DASHBOARD,
          requiredPermission: 'view'
        }
      ]
    },

    // === WORKER DASHBOARD & FACTORY OPERATIONS ===
    {
      id: 'worker_dashboard',
      path: '/worker/dashboard',
      icon: <Factory size={20} />,
      label: 'لوحة العامل',
      featureCode: FEATURE_CODES.WORKER_DASHBOARD,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'worker_main_dashboard',
          path: '/worker/dashboard',
          icon: <LayoutDashboard size={18} />,
          label: 'اللوحة الرئيسية',
          featureCode: FEATURE_CODES.WORKER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'worker_tasks',
          path: '/worker/tasks',
          icon: <ClipboardList size={18} />,
          label: 'المهام',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'view'
        },
        {
          id: 'scan_operations',
          path: '/worker/scan',
          icon: <Scan size={18} />,
          label: 'المسح',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'view'
        },
        {
          id: 'factory_operations',
          path: '/worker/factory-operations',
          icon: <Settings size={18} />,
          label: 'عمليات المصنع',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'view'
        },
        {
          id: 'quality_control',
          path: '/worker/quality-control',
          icon: <Target size={18} />,
          label: 'مراقبة الجودة',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'view'
        },
        {
          id: 'production_tracking',
          path: '/worker/production-tracking',
          icon: <TrendingUp size={18} />,
          label: 'تتبع الإنتاج',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'view'
        },
        {
          id: 'maintenance',
          path: '/worker/maintenance',
          icon: <Wrench size={18} />,
          label: 'الصيانة',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'view'
        },
        {
          id: 'worker_reports',
          path: '/worker/reports',
          icon: <FileBarChart size={18} />,
          label: 'تقارير العامل',
          featureCode: FEATURE_CODES.WORKER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'worker_settings',
          path: '/worker/settings',
          icon: <Cog size={18} />,
          label: 'إعدادات العامل',
          featureCode: FEATURE_CODES.WORKER_DASHBOARD,
          requiredPermission: 'view'
        }
      ]
    },

    // === BUYER DASHBOARD & PROCUREMENT ===
    {
      id: 'buyer_dashboard',
      path: '/buyer/dashboard',
      icon: <ShoppingCart size={20} />,
      label: 'لوحة المشتري',
      featureCode: FEATURE_CODES.BUYER_DASHBOARD,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'buyer_main_dashboard',
          path: '/buyer/dashboard',
          icon: <LayoutDashboard size={18} />,
          label: 'اللوحة الرئيسية',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'buyer_orders',
          path: '/buyer/orders',
          icon: <ClipboardList size={18} />,
          label: 'الطلبات',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_management',
          path: '/buyer/supplier-management',
          icon: <UsersIcon size={18} />,
          label: 'إدارة الموردين',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'procurement',
          path: '/buyer/procurement',
          icon: <PackageOpen size={18} />,
          label: 'المشتريات',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'budget_management',
          path: '/buyer/budget-management',
          icon: <DollarSign size={18} />,
          label: 'إدارة الميزانية',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'purchase_invoices',
          path: '/buyer/purchase-invoices',
          icon: <FileText size={18} />,
          label: 'فواتير الشراء',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'buyer_reports',
          path: '/buyer/reports',
          icon: <FileBarChart size={18} />,
          label: 'تقارير المشتري',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'buyer_settings',
          path: '/buyer/settings',
          icon: <Cog size={18} />,
          label: 'إعدادات المشتري',
          featureCode: FEATURE_CODES.BUYER_DASHBOARD,
          requiredPermission: 'view'
        }
      ]
    },

    // === SUPPLIER DASHBOARD & SUPPLY CHAIN ===
    {
      id: 'supplier_dashboard',
      path: '/supplier/dashboard',
      icon: <TruckIcon size={20} />,
      label: 'لوحة المورد',
      featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'supplier_main_dashboard',
          path: '/supplier/dashboard',
          icon: <LayoutDashboard size={18} />,
          label: 'اللوحة الرئيسية',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_products',
          path: '/supplier/products',
          icon: <Package size={18} />,
          label: 'المنتجات',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_orders',
          path: '/supplier/orders',
          icon: <ClipboardList size={18} />,
          label: 'الطلبات',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_shipments',
          path: '/supplier/shipments',
          icon: <Truck size={18} />,
          label: 'الشحنات',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_invoices',
          path: '/supplier/invoices',
          icon: <FileText size={18} />,
          label: 'الفواتير',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_performance',
          path: '/supplier/performance',
          icon: <TrendingUp size={18} />,
          label: 'الأداء',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_reports',
          path: '/supplier/reports',
          icon: <FileBarChart size={18} />,
          label: 'تقارير المورد',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        },
        {
          id: 'supplier_settings',
          path: '/supplier/settings',
          icon: <Cog size={18} />,
          label: 'إعدادات المورد',
          featureCode: FEATURE_CODES.SUPPLIER_DASHBOARD,
          requiredPermission: 'view'
        }
      ]
    },

    // === ACCESSORIES & PRINT MANAGEMENT ===
    {
      id: 'accessories_print',
      path: '/manager/accessories',
      icon: <Box size={20} />,
      label: 'الإكسسوارات والمطبعة',
      featureCode: FEATURE_CODES.ACCESSORY_MANAGEMENT,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'accessory_management',
          path: '/manager/accessories',
          icon: <Box size={18} />,
          label: 'إدارة الإكسسوارات',
          featureCode: FEATURE_CODES.ACCESSORY_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'accessories_view_stock',
          path: '/manager/accessories/view-stock',
          icon: <Eye size={18} />,
          label: 'عرض مخزون الإكسسوارات',
          featureCode: FEATURE_CODES.ACCESSORY_MANAGEMENT,
          requiredPermission: 'view'
        },
        {
          id: 'print_manager',
          path: '/manager/print/manager',
          icon: <Printer size={18} />,
          label: 'إدارة المطبعة',
          featureCode: FEATURE_CODES.MATBAA_INVENTORY,
          requiredPermission: 'view'
        },
        {
          id: 'monofya_add_item',
          path: '/manager/monofya/add-item',
          icon: <Plus size={18} />,
          label: 'إضافة صنف منوفية',
          featureCode: FEATURE_CODES.MONOFIA_INVENTORY,
          requiredPermission: 'create'
        },
        {
          id: 'monofya_view_stock',
          path: '/manager/monofya/view-stock',
          icon: <Eye size={18} />,
          label: 'عرض مخزون منوفية',
          featureCode: FEATURE_CODES.MONOFIA_INVENTORY,
          requiredPermission: 'view'
        }
      ]
    },

    // === ADVANCED OPERATIONS ===
    {
      id: 'advanced_operations',
      path: '/manager/main-inventory/stock-adjustment',
      icon: <GitBranch size={20} />,
      label: 'العمليات المتقدمة',
      featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
      requiredPermission: 'view',
      subItems: [
        {
          id: 'batch_operations',
          path: '/manager/main-inventory/batch-operations',
          icon: <Package size={18} />,
          label: 'عمليات جماعية',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'edit'
        },
        {
          id: 'location_transfers',
          path: '/manager/main-inventory/location-transfers',
          icon: <Truck size={18} />,
          label: 'نقل بين المواقع',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'edit'
        },
        {
          id: 'dispatch_factory',
          path: '/manager/main-inventory/dispatch/dispatch-factory',
          icon: <Factory size={18} />,
          label: 'صرف للمصنع',
          featureCode: FEATURE_CODES.FACTORY_OPERATIONS,
          requiredPermission: 'edit'
        },
        {
          id: 'dispatch_external',
          path: '/manager/main-inventory/dispatch/dispatch-external',
          icon: <Truck size={18} />,
          label: 'صرف خارجي',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'edit'
        },
        {
          id: 'item_movements',
          path: '/manager/main-inventory/item-movements',
          icon: <ArrowLeftRight size={18} />,
          label: 'حركات الأصناف',
          featureCode: FEATURE_CODES.INVENTORY_MANAGEMENT,
          requiredPermission: 'view'
        }
      ]
    }
  ];

  // Filter items based on user permissions from Firebase custom claims
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .map(item => {
        // SUPER_ADMIN has access to everything - no filtering needed
        // This ensures SUPER_ADMIN can see all navigation items
        if (item.featureCode && !hasPermission(item.featureCode, item.requiredPermission || 'view')) {
          return null;
        }

        // Filter subitems recursively
        if (item.subItems) {
          const filteredSubs = filterItems(item.subItems);
          if (filteredSubs.length === 0) return null;
          return { ...item, subItems: filteredSubs };
        }

        return item;
      })
      .filter(Boolean) as NavItem[];
  };

  const filteredItems = useMemo(() => filterItems(navItems), [hasPermission]);

  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  // Auto-expand current section
  useEffect(() => {
    const currentPath = location.pathname;
    const currentSection = filteredItems.find(item => 
      currentPath.startsWith(item.path) || 
      item.subItems?.some(sub => currentPath.startsWith(sub.path))
    );

    if (currentSection) {
      setExpandedItems(prev => ({
        ...prev,
        [currentSection.id]: true
      }));
    }
  }, [location.pathname, filteredItems]);

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

  // Navigation item component
  const renderNavItem = (item: NavItem) => (
    <div key={item.id} className="mb-1 last:mb-0">
      {item.subItems && item.subItems.length > 0 ? (
        <>
          {/* Top-level with subItems */}
          <div
            className={`group flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer
              ${expandedItems[item.id] 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent'
              }
              border shadow-sm hover:shadow-md`}
            onClick={() => toggleSubMenu(item.id)}
            aria-expanded={!!expandedItems[item.id]}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') toggleSubMenu(item.id);
            }}
          >
            <span className={`transition-colors ${expandedItems[item.id] ? 'text-blue-600' : 'text-gray-500'}`}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="mr-2 font-medium text-sm flex-1">{item.label}</span>
                <span className={`transition-transform duration-200 text-xs ${expandedItems[item.id] ? 'rotate-180' : ''} text-gray-400`}>
                  ▼
                </span>
              </>
            )}
          </div>

          {/* Sub-items */}
          <AnimatePresence>
            {expandedItems[item.id] && !collapsed && (
              <motion.div
                className="mr-4 mt-1 space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {item.subItems.map(subItem => (
                  <NavLink
                    key={subItem.id}
                    to={subItem.path}
                    onClick={onLinkClick}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm
                      ${isActive 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600' 
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
                      }
                      border shadow-sm hover:shadow-md`
                    }
                  >
                    <span className="text-gray-400 mr-2">{subItem.icon}</span>
                    <span className="font-medium">{subItem.label}</span>
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        // Single-level navigation item
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg transition-all duration-200
            ${isActive 
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent'
            }
            border shadow-sm hover:shadow-md`
          }
          onClick={onLinkClick}
        >
          <span className={location.pathname === item.path ? 'text-blue-600' : 'text-gray-500'}>
            {item.icon}
          </span>
          {!collapsed && <span className="mr-2 font-medium text-sm">{item.label}</span>}
        </NavLink>
      )}
    </div>
  );

  return (
    <nav 
      ref={navRef} 
      className="w-64 bg-white dark:bg-gray-900 h-full border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-lg" 
      role="navigation" 
      aria-label="قائمة المشرف العام"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {!collapsed && (
              <span className="mr-2 text-lg font-bold text-gray-800 dark:text-white">
                {systemName}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center space-x-1 space-x-reverse">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">نشط</span>
            </div>
          )}
        </div>
        {!collapsed && user && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            <div>المستخدم: {user.name || user.full_name}</div>
            <div>الدور: {user.role || user.role_name}</div>
            <div className="text-green-600 font-medium mt-1">✓ وصول كامل للنظام</div>
          </div>
        )}
      </div>
      
      {/* Navigation Items */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-3 space-y-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {filteredItems.map(renderNavItem)}
        
        {/* System Status (only show when not collapsed) */}
        {!collapsed && (
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">حالة النظام</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">المستخدمون النشطون</span>
                <span className="text-green-600 font-medium">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">قاعدة البيانات</span>
                <span className="text-green-600 font-medium">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">النسخ الاحتياطي</span>
                <span className="text-green-600 font-medium">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الصلاحيات الكاملة</span>
                <span className="text-green-600 font-medium">✓</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {!collapsed ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {companyCopyright}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            ©{copyrightYear}
          </div>
        )}
      </div>
    </nav>
  );
};

export default SuperAdminNav;
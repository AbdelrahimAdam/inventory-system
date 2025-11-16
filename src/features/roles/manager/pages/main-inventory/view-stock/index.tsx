import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiRefreshCw, FiDownload, FiPrinter, FiFilter,
  FiChevronDown, FiChevronUp, FiX, FiEdit, FiTrash,
  FiArrowLeft, FiPlus, FiBox, FiPackage, FiUser, FiMapPin
} from 'react-icons/fi';
import { Input } from '../../../ui/Input';
import Checkbox from '../../../ui/Checkbox';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as Dialog from '@radix-ui/react-dialog';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, CheckCircle, XCircle, TrendingUp, TrendingDown, 
  BarChart3, Database, Package, Factory, Truck, 
  Users2, PackageCheck, Sun, Moon 
} from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { FiClock } from "react-icons/fi";

// Simple className helper
const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

// Types based on the PostgreSQL schema
type InventoryItem = {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  carton_quantity: number;
  items_per_carton: number;
  individual_items: number;
  total_quantity: number;
  remaining_quantity: number;
  supplier: string | null;
  location: string | null;
  cost_price: number | null;
  selling_price: number | null;
  min_stock_level: number;
  max_stock_level: number | null;
  notes: string | null;
  added_date: string;
  is_active: boolean;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

type MonofiaItem = {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  carton_quantity: number;
  items_per_carton: number;
  individual_items: number;
  total_quantity: number;
  remaining_quantity: number;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  entry_date: string;
  added_date: string;
  is_active: boolean;
  created_by: number;
  updated_at: string;
};

type MatbaaItem = {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  carton_quantity: number;
  items_per_carton: number;
  individual_items: number;
  total_quantity: number;
  remaining_quantity: number;
  supplier: string | null;
  notes: string | null;
  added_date: string;
  is_active: boolean;
  created_by: number;
  updated_at: string;
};

type AccessoryItem = {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  accessory_color: string;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  carton_quantity: number;
  items_per_carton: number;
  individual_items: number;
  pump_quantity: number;
  ring_quantity: number;
  cover_quantity: number;
  ribbon_quantity: number;
  sticker_quantity: number;
  tag_quantity: number;
  added_date: string;
  is_active: boolean;
  created_by: number;
  updated_at: string;
};

type TransferLog = {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  transfer_quantity: number;
  transfer_date: string;
  user_id: number;
  username: string;
  supplier: string | null;
  notes: string | null;
  source_location: string;
  destination_location: string;
  created_at: string;
};

type StockMovement = {
  id: number;
  uuid: string;
  inventory_item_id: number | null;
  accessory_item_id: number | null;
  monofia_item_id: number | null;
  matbaa_item_id: number | null;
  item_name: string;
  item_code: string;
  color: string | null;
  movement_type: 'ADDITION' | 'PURCHASE' | 'SALE' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT' | 'FACTORY_MOVEMENT';
  quantity_in: number;
  quantity_out: number;
  balance_after: number;
  source_location: string | null;
  destination_location: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  ip_address: string | null;
};

// UI Components
const Card = ({ className, children, ...props }) => (
  <div 
    className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden ${className}`}
    {...props}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className }) => (
  <div className={`p-4 border-b border-gray-200/50 dark:border-gray-600/50 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
    {children}
  </h2>
);

const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "default", className, loading, ...props }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`px-4 py-2 rounded-xl transition-all duration-300 font-semibold flex items-center gap-2 ${
      variant === "default"
        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
        : variant === "outline"
        ? "border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
        : variant === "red"
        ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
        : "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800"
    } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    {...props}
  >
    {loading && <FiRefreshCw className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

const DataTable = ({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = "لا توجد بيانات متاحة",
  onEdit,
  onDelete,
  showActions = false 
}) => (
  <div className="w-full max-h-[300px] overflow-y-auto font-tajawal rounded-xl">
    {isLoading ? (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-gray-500">جاري التحميل...</p>
      </div>
    ) : !data || data.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <Database className="w-12 h-12 opacity-50 mb-2" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    ) : (
      <table className="w-full text-right">
        <thead>
          <tr className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600">
            {columns.map((col) => (
              <th 
                key={col.accessorKey} 
                className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-b border-blue-200 dark:border-gray-600"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr 
              key={idx} 
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors"
            >
              {columns.map((col) => (
                <td 
                  key={col.accessorKey} 
                  className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  {col.accessorKey === 'actions' && showActions ? (
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => onEdit(row)}
                        className="p-1"
                      >
                        <FiEdit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="red"
                        onClick={() => onDelete(row)}
                        className="p-1"
                      >
                        <FiTrash className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    row[col.accessorKey] ?? "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const StatCard = ({ title, value, icon, color, trend, loading = false }) => (
  <motion.div
    className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300`}
    whileHover={{ y: -4, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-4 -mt-4"></div>
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold opacity-90">{title}</h3>
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-bold">جاري التحميل...</p>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold mb-2">{value?.toLocaleString() ?? "0"}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs opacity-90">
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </>
      )}
    </div>
  </motion.div>
);

// Enhanced navigation cards with correct routes
const navigationCards = [
  {
    title: "عرض المخزون",
    description: "عرض جميع الأصناف المتاحة في المخزون الرئيسي",
    icon: <FiBox className="text-2xl text-yellow-500" />,
    to: "/manager/main-inventory/view-stock",
    color: "from-yellow-500 to-amber-500"
  },
  {
    title: "إضافة صنف جديد",
    description: "إضافة أصناف جديدة إلى سجل المخزون",
    icon: <FiPlus className="text-2xl text-green-500" />,
    to: "/manager/main-inventory/add-item",
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "تقارير المصنع",
    description: "عرض تقارير صرف المصنع والتحليلات",
    icon: <BarChart3 className="text-2xl text-orange-500" />,
    to: "/manager/reports",
    color: "from-orange-500 to-red-500"
  },
  {
    title: "مخزون الإكسسوارات",
    description: "إدارة أصناف الإكسسوارات والمستلزمات",
    icon: <Package className="text-2xl text-purple-500" />,
    to: "/manager/accessories/view-stock",
    color: "from-purple-500 to-pink-500"
  },
];

// Enhanced management cards
const managementCards = [
  {
    icon: <PackageCheck size={32} className="text-blue-500" />,
    title: "إدارة المخزون",
    description: "راقب وحدّث حالة المنتجات داخل النظام بشكل كامل",
    to: "/manager/inventory",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Users2 size={32} className="text-green-500" />,
    title: "إدارة المستخدمين",
    description: "أضف أو عدّل صلاحيات الموظفين وسجلاتهم بسهولة",
    to: "/manager/users",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: <BarChart3 size={32} className="text-purple-500" />,
    title: "التقارير والتحليلات",
    description: "استعرض تقارير الأداء والمبيعات والمخزون المفصلة",
    to: "/manager/reports",
    color: "from-purple-500 to-pink-500"
  },
];

// Enhanced quick actions with correct routes
const quickActions = [
  {
    title: "البحث والتعديل",
    description: "ابحث عن الأصناف وقم بتعديلها بسرعة",
    icon: <FiSearch className="w-5 h-5" />,
    to: "/manager/main-inventory/search-edit",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
  },
  {
    title: "صرف للمصنع",
    description: "تسجيل صرف أصناف للمصنع بسهولة",
    icon: <Factory className="w-5 h-5" />,
    to: "/manager/main-inventory/dispatch/dispatch-factory",
    color: "bg-green-500/10 text-green-600 dark:text-green-400"
  },
  {
    title: "تحويل للمطبعة",
    description: "نقل أصناف إلى المطبعة بكفاءة",
    icon: <Package className="w-5 h-5" />,
    to: "/manager/main-inventory/transfer-to-print",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
  },
];

// Inventory Type Selector Component
const InventoryTypeSelector = ({ inventoryType, onInventoryTypeChange }) => {
  const inventoryTypes = [
    { value: 'main-inventory', label: 'المخزن الرئيسي', color: 'from-blue-500 to-blue-600' },
    { value: 'monofia', label: 'المنوفية', color: 'from-green-500 to-green-600' },
    { value: 'matbaa', label: 'المطبعة', color: 'from-purple-500 to-purple-600' },
    { value: 'accessories', label: 'الإكسسوارات', color: 'from-orange-500 to-orange-600' }
  ];

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        إدارة المخزون المتكامل
      </h3>
      <div className="flex flex-wrap gap-3">
        {inventoryTypes.map((type) => (
          <motion.button
            key={type.value}
            onClick={() => onInventoryTypeChange(type.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              inventoryType === type.value
                ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {type.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

function formatDate(dateStr) {
  if (!dateStr) return '-';

  try {
    if (/[٠-٩]/.test(dateStr)) {
      return dateStr;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const day = date.getDate();
    const month = arabicMonths[date.getMonth()];
    const year = date.getFullYear();

    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const toEasternArabic = (num) => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    };

    return `${toEasternArabic(day)} ${month} ${toEasternArabic(year)}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateStr);
    return dateStr;
  }
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventoryType, setInventoryType] = useState('main-inventory');
  const [items, setItems] = useState([]);
  const [transferLogs, setTransferLogs] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [filters, setFilters] = useState({
    item_name: '',
    item_code: '',
    color: '',
    supplier: '',
    from_date: '',
    to_date: '',
    location: '',
  });
  const [logFilters, setLogFilters] = useState({
    search: '',
    from_date: null,
    to_date: null,
    movement_type: '',
  });
  const [exportColumns, setExportColumns] = useState({
    item_name: true,
    item_code: true,
    color: true,
    carton_quantity: true,
    items_per_carton: true,
    individual_items: true,
    total_quantity: true,
    remaining_quantity: true,
    supplier: true,
    location: true,
    notes: true,
    added_date: true,
  });
  const [currentDate, setCurrentDate] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [transferForm, setTransferForm] = useState({
    quantity: '',
    notes: '',
    destination_location: 'MONOFIA',
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    quantity: '',
    operation: 'ADD',
    notes: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Show notification
  const showNotification = useCallback((msg, type = 'success') => {
    setNotif({ show: true, msg, type });
    setTimeout(() => setNotif({ show: false, msg: '', type: 'success' }), 3000);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  }, []);

  // Get API endpoints based on inventory type
  const getApiEndpoints = () => {
    switch (inventoryType) {
      case 'monofia':
        return {
          view: '/monofia-inventory',
          create: '/monofia-inventory',
          update: (id) => `/monofia-inventory/${id}`,
          delete: (id) => `/monofia-inventory/${id}`,
          export: '/monofia-inventory/export'
        };
      case 'matbaa':
        return {
          view: '/matbaa-inventory',
          create: '/matbaa-inventory',
          update: (id) => `/matbaa-inventory/${id}`,
          delete: (id) => `/matbaa-inventory/${id}`,
          export: '/matbaa-inventory/export'
        };
      case 'accessories':
        return {
          view: '/accessory-items',
          create: '/accessory-items',
          update: (id) => `/accessory-items/${id}`,
          delete: (id) => `/accessory-items/${id}`,
          export: '/accessory-items/export'
        };
      default: // main-inventory
        return {
          view: '/inventory-items',
          create: '/inventory-items',
          update: (id) => `/inventory-items/${id}`,
          delete: (id) => `/inventory-items/${id}`,
          export: '/inventory-items/export'
        };
    }
  };

  // Calculate statistics based on schema fields
  const calculateStats = useCallback((items) => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (item.total_quantity || 0), 0);
    const totalRemaining = items.reduce((sum, item) => sum + (item.remaining_quantity || 0), 0);
    const lowStockItems = items.filter(item => 
      (item.remaining_quantity || 0) < (item.min_stock_level || 10) && (item.remaining_quantity || 0) > 0
    ).length;
    const outOfStockItems = items.filter(item => (item.remaining_quantity || 0) === 0).length;
    const highStockItems = items.filter(item => 
      item.max_stock_level ? (item.remaining_quantity || 0) >= item.max_stock_level : (item.remaining_quantity || 0) >= 50
    ).length;

    return {
      totalItems,
      totalQuantity,
      totalRemaining,
      lowStockItems,
      outOfStockItems,
      highStockItems
    };
  }, []);

  useEffect(() => {
    if (!user) {
      showNotification('يجب تسجيل الدخول للوصول إلى هذه الصفحة', 'error');
      navigate('/login');
      return;
    }

    console.log('Current user:', user);
    fetchFilteredData();

    const now = new Date();
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const day = now.getDate();
    const month = arabicMonths[now.getMonth()];
    const year = now.getFullYear();
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const toEasternArabic = (num) => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    };
    setCurrentDate(`${toEasternArabic(day)} ${month} ${toEasternArabic(year)}`);
  }, [navigate, user, inventoryType]);

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const endpoints = getApiEndpoints();
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `${apiUrl}${endpoints.view}?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(data);
        setResultCount(data.length);
        setStats(calculateStats(data));

        if (data.length === 0) {
          showNotification('لم يتم العثور على نتائج.', 'error');
        }
      } else {
        const text = await response.text();
        console.error('Server response:', text);
        let errorData = { error: 'خطأ في الخادم' };
        if (text.trim().startsWith('{')) {
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
        }
        showNotification(`فشل في جلب البيانات: ${errorData.error || 'خطأ غير معروف'}`, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      showNotification(`فشل في جلب البيانات: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferLogs = async () => {
    setLogsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (logFilters.search) queryParams.append('search', logFilters.search);
      if (logFilters.from_date) queryParams.append('from_date', logFilters.from_date.toISOString());
      if (logFilters.to_date) queryParams.append('to_date', logFilters.to_date.toISOString());

      const response = await fetch(
        `${apiUrl}/location-transfers?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTransferLogs(data);
      } else {
        const text = await response.text();
        console.error('Server response for logs:', text);
        showNotification('فشل في جلب سجل التحويلات', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      showNotification(`فشل في جلب سجل التحويلات: ${errorMessage}`, 'error');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchStockMovements = async () => {
    setMovementsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (logFilters.search) queryParams.append('search', logFilters.search);
      if (logFilters.from_date) queryParams.append('from_date', logFilters.from_date.toISOString());
      if (logFilters.to_date) queryParams.append('to_date', logFilters.to_date.toISOString());
      if (logFilters.movement_type) queryParams.append('movement_type', logFilters.movement_type);

      const response = await fetch(
        `${apiUrl}/stock-movements?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStockMovements(data);
      } else {
        const text = await response.text();
        console.error('Server response for movements:', text);
        showNotification('فشل في جلب حركات المخزون', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      showNotification(`فشل في جلب حركات المخزون: ${errorMessage}`, 'error');
    } finally {
      setMovementsLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      item_name: '',
      item_code: '',
      color: '',
      supplier: '',
      from_date: '',
      to_date: '',
      location: '',
    });
    fetchFilteredData();
  };

  const resetLogFilters = () => {
    setLogFilters({
      search: '',
      from_date: null,
      to_date: null,
      movement_type: '',
    });
    if (showMovements) {
      fetchStockMovements();
    } else {
      fetchTransferLogs();
    }
  };

  const exportToExcel = () => {
    const columnsFull = [
      'item_name', 'item_code', 'color', 'carton_quantity', 'items_per_carton',
      'individual_items', 'total_quantity', 'remaining_quantity', 'supplier', 
      'location', 'notes', 'added_date'
    ];
    const columnsDisplay = [
      'اسم الصنف', 'الكود', 'اللون', 'عدد الكراتين', 'عدد في الكرتونة',
      'عدد القزاز الفردي', 'الكمية الإجمالية', 'الكمية المتبقية', 'المورد',
      'الموقع', 'ملاحظات', 'تاريخ الإضافة'
    ];

    const selectedCols = columnsFull.filter((col) => exportColumns[col]);
    if (!selectedCols.length) {
      showNotification('يرجى تحديد أعمدة للتصدير.', 'error');
      return;
    }
    const data = items.map((item) =>
      selectedCols.map((col) => {
        switch (col) {
          case 'item_name': return item.item_name;
          case 'item_code': return item.item_code;
          case 'color': return item.color || item.accessory_color || '-';
          case 'carton_quantity': return item.carton_quantity;
          case 'items_per_carton': return item.items_per_carton;
          case 'individual_items': return item.individual_items;
          case 'total_quantity': return item.total_quantity;
          case 'remaining_quantity': return item.remaining_quantity;
          case 'supplier': return item.supplier || '-';
          case 'location': return item.location || '-';
          case 'notes': return item.notes || '-';
          case 'added_date': return formatDate(item.added_date);
          default: return '';
        }
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([selectedCols.map((col) => columnsDisplay[columnsFull.indexOf(col)]), ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المخزون');
    XLSX.writeFile(wb, 'المخزون.xlsx');
    showNotification('تم التصدير بنجاح');
  };

  const exportLogsToExcel = () => {
    const columnsFull = showMovements ? [
      'item_name', 'item_code', 'color', 'movement_type', 'quantity_in', 
      'quantity_out', 'balance_after', 'source_location', 'destination_location',
      'notes', 'created_at'
    ] : [
      'item_name', 'item_code', 'color', 'transfer_quantity', 'transfer_date',
      'username', 'supplier', 'notes', 'source_location', 'destination_location'
    ];
    
    const columnsDisplay = showMovements ? [
      'اسم الصنف', 'الكود', 'اللون', 'نوع الحركة', 'الكمية الداخلة',
      'الكمية الخارجة', 'الرصيد بعد', 'المصدر', 'الوجهة',
      'ملاحظات', 'تاريخ الحركة'
    ] : [
      'اسم الصنف', 'الكود', 'اللون', 'الكمية المحولة', 'تاريخ التحويل',
      'المستخدم', 'المورد', 'ملاحظات', 'المصدر', 'الوجهة'
    ];

    const data = (showMovements ? stockMovements : transferLogs).map((log) =>
      columnsFull.map((col) => {
        switch (col) {
          case 'item_name': return log.item_name;
          case 'item_code': return log.item_code;
          case 'color': return log.color || '-';
          case 'movement_type': return getMovementTypeArabic(log.movement_type);
          case 'quantity_in': return log.quantity_in;
          case 'quantity_out': return log.quantity_out;
          case 'balance_after': return log.balance_after;
          case 'transfer_quantity': return log.transfer_quantity;
          case 'transfer_date': return formatDate(log.transfer_date);
          case 'username': return log.username;
          case 'supplier': return log.supplier || '-';
          case 'notes': return log.notes || '-';
          case 'source_location': return getLocationArabic(log.source_location || '');
          case 'destination_location': return getLocationArabic(log.destination_location || '');
          case 'created_at': return formatDate(log.created_at);
          default: return '';
        }
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([columnsDisplay, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, showMovements ? 'حركات_المخزون' : 'سجل_التحويلات');
    XLSX.writeFile(wb, showMovements ? 'حركات_المخزون.xlsx' : 'سجل_التحويلات.xlsx');
    showNotification('تم تصدير السجل بنجاح');
  };

  const getMovementTypeArabic = (type) => {
    const types = {
      'ADDITION': 'إضافة',
      'PURCHASE': 'شراء',
      'SALE': 'بيع',
      'RETURN': 'مرتجعات',
      'TRANSFER': 'تحويل',
      'ADJUSTMENT': 'تعديل',
      'FACTORY_MOVEMENT': 'حركة مصنع'
    };
    return types[type] || type;
  };

  const getLocationArabic = (location) => {
    const locations = {
      'MAIN_INVENTORY': 'المخزون الرئيسي',
      'MONOFIA': 'المنوفية',
      'MATBAA': 'المطبعة',
      'FACTORY': 'المصنع'
    };
    return locations[location] || location;
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditForm({
      item_name: item.item_name,
      item_code: item.item_code,
      color: item.color || item.accessory_color,
      carton_quantity: item.carton_quantity,
      items_per_carton: item.items_per_carton,
      individual_items: item.individual_items,
      supplier: item.supplier || '',
      location: item.location || '',
      notes: item.notes || '',
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level,
    });
    setEditModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  };

  const handleTransfer = (item) => {
    setSelectedItem(item);
    setTransferForm({
      quantity: '',
      notes: '',
      destination_location: 'MONOFIA',
    });
    setTransferModalOpen(true);
  };

  const handleAdjustment = (item) => {
    setSelectedItem(item);
    setAdjustmentForm({
      quantity: '',
      operation: 'ADD',
      notes: '',
    });
    setAdjustmentModalOpen(true);
  };

  const submitEdit = async () => {
    if (!selectedItem || !user) {
      showNotification('يجب تسجيل الدخول لتعديل الصنف', 'error');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const payload = {
        ...editForm,
        updated_by: user.id,
      };
      console.log('Submitting edit with payload:', payload);

      const endpoints = getApiEndpoints();
      const response = await fetch(
        `${apiUrl}${endpoints.update(selectedItem.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await fetchFilteredData();
        setEditModalOpen(false);
        setSelectedItem(null);
        setEditForm({});
        showNotification('تم تحديث الصنف بنجاح');
      } else {
        const text = await response.text();
        console.error('Server response:', text);
        let errorData = { error: 'فشل في تحديث الصنف' };
        if (text.trim().startsWith('{')) {
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
        }
        setError(errorData.error || 'فشل في تحديث الصنف');
        showNotification(errorData.error || 'فشل في تحديث الصنف', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    setError(null);
    try {
      const endpoints = getApiEndpoints();
      const response = await fetch(
        `${apiUrl}${endpoints.delete(selectedItem.id)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        await fetchFilteredData();
        setDeleteModalOpen(false);
        setSelectedItem(null);
        showNotification('تم حذف الصنف بنجاح');
      } else {
        const text = await response.text();
        console.error('Server response:', text);
        let errorData = { error: 'فشل في حذف الصنف' };
        if (text.trim().startsWith('{')) {
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
        }
        setError(errorData.error || 'فشل في حذف الصنف');
        showNotification(errorData.error || 'فشل في حذف الصنف', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const submitTransfer = async () => {
    if (!selectedItem || !user) {
      showNotification('يجب تسجيل الدخول لتحويل الصنف', 'error');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const quantity = parseInt(transferForm.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setError('الكمية يجب أن تكون أكبر من الصفر');
        showNotification('الكمية يجب أن تكون أكبر من الصفر', 'error');
        return;
      }
      if (quantity > selectedItem.remaining_quantity) {
        setError(`الكمية المطلوبة (${quantity}) أكبر من الكمية المتاحة (${selectedItem.remaining_quantity})`);
        showNotification(`الكمية المطلوبة (${quantity}) أكبر من الكمية المتاحة (${selectedItem.remaining_quantity})`, 'error');
        return;
      }

      const payload = {
        item_name: selectedItem.item_name,
        item_code: selectedItem.item_code,
        color: selectedItem.color || selectedItem.accessory_color,
        quantity: quantity,
        source_location: selectedItem.location || 'MAIN_INVENTORY',
        destination_location: transferForm.destination_location,
        user_id: user.id,
        notes: transferForm.notes || null,
        supplier: selectedItem.supplier,
      };
      console.log('Submitting transfer with payload:', payload);

      const response = await fetch(
        `${apiUrl}/transfer-between-locations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await fetchFilteredData();
        setTransferModalOpen(false);
        setSelectedItem(null);
        setTransferForm({
          quantity: '',
          notes: '',
          destination_location: 'MONOFIA',
        });
        showNotification(`تم التحويل إلى ${getLocationArabic(transferForm.destination_location)} بنجاح`);
        if (showLogs || showMovements) {
          fetchTransferLogs();
          fetchStockMovements();
        }
      } else {
        const text = await response.text();
        console.error('Server response:', text);
        let errorData = { error: 'فشل في عملية التحويل' };
        if (text.trim().startsWith('{')) {
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
        }
        setError(errorData.error || 'فشل في عملية التحويل');
        showNotification(errorData.error || 'فشل في عملية التحويل', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const submitAdjustment = async () => {
    if (!selectedItem || !user) {
      showNotification('يجب تسجيل الدخول لتعديل المخزون', 'error');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const quantity = parseInt(adjustmentForm.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setError('الكمية يجب أن تكون أكبر من الصفر');
        showNotification('الكمية يجب أن تكون أكبر من الصفر', 'error');
        return;
      }

      const payload = {
        p_item_id: selectedItem.id,
        p_quantity: quantity,
        p_operation: adjustmentForm.operation,
        p_user_id: user.id,
        notes: adjustmentForm.notes || null,
      };
      console.log('Submitting adjustment with payload:', payload);

      const response = await fetch(
        `${apiUrl}/adjust-stock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await fetchFilteredData();
        setAdjustmentModalOpen(false);
        setSelectedItem(null);
        setAdjustmentForm({
          quantity: '',
          operation: 'ADD',
          notes: '',
        });
        showNotification('تم تعديل المخزون بنجاح');
        if (showMovements) {
          fetchStockMovements();
        }
      } else {
        const text = await response.text();
        console.error('Server response:', text);
        let errorData = { error: 'فشل في تعديل المخزون' };
        if (text.trim().startsWith('{')) {
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
        }
        setError(errorData.error || 'فشل في تعديل المخزون');
        showNotification(errorData.error || 'فشل في تعديل المخزون', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStockLevelColor = (remaining) => {
    if (remaining === 0) return 'text-red-600 dark:text-red-400';
    if (remaining < 10) return 'text-amber-600 dark:text-amber-400';
    if (remaining < 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStockLevelBg = (remaining) => {
    if (remaining === 0) return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    if (remaining < 10) return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
    if (remaining < 50) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
    return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  };

  const StockLevelIndicator = ({ remaining, total }) => {
    const percentage = total > 0 ? (remaining / total) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1 shadow-inner">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            remaining === 0
              ? 'bg-red-500'
              : remaining < 10
              ? 'bg-amber-500'
              : remaining < 50
              ? 'bg-yellow-500'
              : 'bg-green-500'
          } shadow-md`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        ></div>
      </div>
    );
  };

  // Enhanced Dashboard Content Component
  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الأصناف"
          value={stats?.totalItems || 0}
          icon={<Package className="text-white w-6 h-6" />}
          color="from-blue-500 to-blue-600"
          trend={12}
          loading={loading}
        />
        <StatCard
          title="قيمة المخزون"
          value={stats?.totalQuantity || 0}
          icon={<BarChart3 className="text-white w-6 h-6" />}
          color="from-green-500 to-green-600"
          trend={8}
          loading={loading}
        />
        <StatCard
          title="أصناف منخفضة"
          value={stats?.lowStockItems || 0}
          icon={<TrendingDown className="text-white w-6 h-6" />}
          color="from-amber-500 to-amber-600"
          loading={loading}
        />
        <StatCard
          title="أصناف منتهية"
          value={stats?.outOfStockItems || 0}
          icon={<XCircle className="text-white w-6 h-6" />}
          color="from-red-500 to-red-600"
          loading={loading}
        />
      </div>

      {/* Management Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {managementCards.map((card, index) => (
          <Link to={card.to} key={index}>
            <motion.div
              className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg p-6 hover:shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-600/50"
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                {card.icon}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{card.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{card.description}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Current Inventory Table */}
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <PackageCheck className="w-5 h-5" />
              المخزون الحالي - {inventoryType === 'monofia' ? 'المنوفية' : 
               inventoryType === 'matbaa' ? 'المطبعة' : 
               inventoryType === 'accessories' ? 'الإكسسوارات' : 'المخزون الرئيسي'}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center" onClick={exportToExcel}>
                <FiDownload className="w-4 h-4 ml-2" />
                تصدير
              </Button>
              <Button variant="outline" className="flex items-center">
                <FiPrinter className="w-4 h-4 ml-2" />
                طباعة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={[
              { header: 'الصنف', accessorKey: 'item_name' },
              { header: 'الكود', accessorKey: 'item_code' },
              { header: 'اللون', accessorKey: 'color' },
              { header: 'الكمية المتاحة', accessorKey: 'remaining_quantity' },
              { header: 'الإجراءات', accessorKey: 'actions' },
            ]} 
            data={items.slice(0, 8).map(item => ({
              ...item,
              color: item.color || item.accessory_color || 'غير محدد',
              actions: 'actions'
            }))} 
            isLoading={loading}
            emptyMessage="لا توجد بيانات المخزون"
            showActions={true}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced Navigation Content Component
  const NavigationContent = () => (
    <div className="space-y-6">
      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {navigationCards.map((card, i) => (
          <Link
            key={i}
            to={card.to}
            className="block group"
          >
            <motion.div
              className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-6 border border-gray-200/50 dark:border-gray-600/50 h-full flex flex-col justify-between"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  {card.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>
            <Package className="w-5 h-5" />
            العمليات السريعة
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              to={action.to}
              className="block group"
            >
              <motion.div
                className={`p-4 rounded-xl border-2 border-gray-200/50 dark:border-gray-600/50 hover:border-transparent transition-all duration-300 transform hover:-translate-y-1 flex justify-between items-center min-h-[100px] group-hover:shadow-lg ${action.color}`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-right flex-1">
                  <h3 className="font-semibold flex items-center justify-end gap-2 text-sm mb-2">
                    {action.title}
                    {action.icon}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center text-gray-600 dark:text-gray-400">
          جارٍ التحقق من تسجيل الدخول...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 via-indigo-50/90 to-purple-100/90 dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-700/90 dir-rtl font-tajawal p-4 sm:p-6">
      {/* Notification */}
      <AnimatePresence>
        {notif.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={cn(
              'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] p-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center gap-3 max-w-md w-full mx-4 backdrop-blur-md border',
              notif.type === 'success' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600'
            )}
          >
            {notif.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-semibold">{notif.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/30">
              <Database className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
                {activeTab === "dashboard" ? 'لوحة التحكم الرئيسية' : 'مركز التنقل السريع'}
              </h1>
              <p className="text-lg opacity-90 mt-1">نظام إدارة المخزون المتكامل</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/30">
              <p className="text-sm opacity-90">المستخدم</p>
              <p className="font-semibold">{user?.name || "مدير النظام"}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveTab("dashboard")}
                variant={activeTab === "dashboard" ? "default" : "outline"}
                className="bg-white/20 hover:bg-white/30 border-white/30"
              >
                📊 لوحة التحكم
              </Button>
              <Button
                onClick={() => setActiveTab("navigation")}
                variant={activeTab === "navigation" ? "default" : "outline"}
                className="bg-white/20 hover:bg-white/30 border-white/30"
              >
                🚀 التنقل السريع
              </Button>
              <Button
                onClick={toggleDarkMode}
                variant="outline"
                className="bg-white/20 hover:bg-white/30 border-white/30"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Inventory Type Selector */}
      <InventoryTypeSelector 
        inventoryType={inventoryType} 
        onInventoryTypeChange={setInventoryType} 
      />

      {/* Render tabs */}
      {activeTab === "dashboard" ? (
        <DashboardContent />
      ) : (
        <NavigationContent />
      )}

      {/* Edit Modal */}
      <Dialog.Root open={editModalOpen} onOpenChange={setEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto dir-rtl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-md">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiEdit className="w-5 h-5" />
              تعديل الصنف
            </Dialog.Title>
            {error && (
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-xl mb-4 font-semibold shadow-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'اسم الصنف', key: 'item_name', type: 'text' },
                { label: 'الكود', key: 'item_code', type: 'text' },
                { label: 'اللون', key: 'color', type: 'text' },
                { label: 'عدد الكراتين', key: 'carton_quantity', type: 'number' },
                { label: 'عدد في الكرتونة', key: 'items_per_carton', type: 'number' },
                { label: 'عدد القزاز الفردي', key: 'individual_items', type: 'number' },
                { label: 'المورد', key: 'supplier', type: 'text' },
                { label: 'الموقع', key: 'location', type: 'text' },
                { label: 'الحد الأدنى للمخزون', key: 'min_stock_level', type: 'number' },
                { label: 'الحد الأقصى للمخزون', key: 'max_stock_level', type: 'number' },
                { label: 'ملاحظات', key: 'notes', type: 'textarea' },
              ].map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={editForm[field.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                      className="w-full p-3 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-right shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md"
                      rows={4}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={editForm[field.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                      className="w-full p-3 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-right shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close asChild>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold transform hover:scale-105"
                  disabled={actionLoading}
                >
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={submitEdit}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold flex items-center gap-2 transform hover:scale-105"
                disabled={actionLoading}
              >
                <Save className="w-4 h-4" />
                {actionLoading ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Modal */}
      <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md dir-rtl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-md">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-t-xl -mx-6 -mt-6 mb-6 text-center shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-center gap-3">
                <FiTrash className="w-6 h-6" />
                <Dialog.Title className="text-xl font-bold">
                  تأكيد الحذف
                </Dialog.Title>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl mb-4 shadow-md border border-red-200/50 dark:border-red-700/50 backdrop-blur-sm">
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">تحذير</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  هل أنت متأكد من حذف الصنف "{selectedItem?.item_name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>
              </div>

              {error && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-xl mb-4 font-semibold shadow-md">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold transform hover:scale-105"
                  disabled={actionLoading}
                >
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={submitDelete}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold flex items-center gap-2 transform hover:scale-105"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جارٍ الحذف...
                  </>
                ) : (
                  <>
                    <FiTrash className="w-4 h-4" />
                    تأكيد الحذف
                  </>
                )}
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
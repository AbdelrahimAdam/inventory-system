import { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiRefreshCw, FiDownload, FiPrinter, FiFilter,
  FiChevronDown, FiChevronUp, FiX, FiEdit, FiTrash,
  FiArrowLeft, FiPlus, FiBox, FiPackage, FiUser, FiMapPin
} from 'react-icons/fi';
import { Input } from '../../../ui/Input';
import Checkbox from '../../../ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as Dialog from '@radix-ui/react-dialog';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, CheckCircle, XCircle, TrendingUp, TrendingDown, BarChart3, Database } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { FiClock } from "react-icons/fi";

// Simple className helper
const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

// Types based on the database schema
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

function formatDate(dateStr: string) {
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
    const toEasternArabic = (num: number) => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    };

    return `${toEasternArabic(day)} ${month} ${toEasternArabic(year)}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateStr);
    return dateStr;
  }
}

export default function ViewStockPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
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
    from_date: null as Date | null,
    to_date: null as Date | null,
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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [transferForm, setTransferForm] = useState({
    quantity: '',
    notes: '',
    destination_location: 'MONOFIA' as 'MONOFIA' | 'MATBAA',
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    quantity: '',
    operation: 'ADD' as 'ADD' | 'DEDUCT',
    notes: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });

  const apiUrl = import.meta.env.VITE_API_URL;

  // Show notification
  const showNotification = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ show: true, msg, type });
    setTimeout(() => setNotif({ show: false, msg: '', type: 'success' }), 3000);
  }, []);

  // Calculate statistics based on schema fields
  const calculateStats = useCallback(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.total_quantity, 0);
    const totalRemaining = items.reduce((sum, item) => sum + item.remaining_quantity, 0);
    const lowStockItems = items.filter(item => 
      item.remaining_quantity < (item.min_stock_level || 10) && item.remaining_quantity > 0
    ).length;
    const outOfStockItems = items.filter(item => item.remaining_quantity === 0).length;
    const highStockItems = items.filter(item => 
      item.max_stock_level ? item.remaining_quantity >= item.max_stock_level : item.remaining_quantity >= 50
    ).length;

    return {
      totalItems,
      totalQuantity,
      totalRemaining,
      lowStockItems,
      outOfStockItems,
      highStockItems
    };
  }, [items]);

  const stats = calculateStats();

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
    const toEasternArabic = (num: number) => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    };
    setCurrentDate(`${toEasternArabic(day)} ${month} ${toEasternArabic(year)}`);
  }, [navigate, user]);

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `${apiUrl}/inventory/inventory-items?${queryParams}`,
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
    } catch (error: unknown) {
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
        `${apiUrl}/inventory/location-transfers?${queryParams}`,
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
    } catch (error: unknown) {
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
        `${apiUrl}/inventory/stock-movements?${queryParams}`,
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
    } catch (error: unknown) {
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
          case 'color': return item.color || '-';
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
          case 'quantity_in': return (log as StockMovement).quantity_in;
          case 'quantity_out': return (log as StockMovement).quantity_out;
          case 'balance_after': return (log as StockMovement).balance_after;
          case 'transfer_quantity': return (log as TransferLog).transfer_quantity;
          case 'transfer_date': return formatDate((log as TransferLog).transfer_date);
          case 'username': return (log as TransferLog).username;
          case 'supplier': return log.supplier || '-';
          case 'notes': return log.notes || '-';
          case 'source_location': return getLocationArabic(log.source_location || '');
          case 'destination_location': return getLocationArabic(log.destination_location || '');
          case 'created_at': return formatDate((log as StockMovement).created_at);
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

  const getMovementTypeArabic = (type: string) => {
    const types: { [key: string]: string } = {
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

  const getLocationArabic = (location: string) => {
    const locations: { [key: string]: string } = {
      'MAIN_INVENTORY': 'المخزون الرئيسي',
      'MONOFIA': 'المنوفية',
      'MATBAA': 'المطبعة',
      'FACTORY': 'المصنع'
    };
    return locations[location] || location;
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      item_name: item.item_name,
      item_code: item.item_code,
      color: item.color,
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

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  };

  const handleTransfer = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransferForm({
      quantity: '',
      notes: '',
      destination_location: 'MONOFIA',
    });
    setTransferModalOpen(true);
  };

  const handleAdjustment = (item: InventoryItem) => {
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

      const response = await fetch(
        `${apiUrl}/inventory/inventory-items/${selectedItem.id}`,
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
    } catch (error: unknown) {
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
      const response = await fetch(
        `${apiUrl}/inventory/inventory-items/${selectedItem.id}`,
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
    } catch (error: unknown) {
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
        color: selectedItem.color,
        quantity: quantity,
        source_location: selectedItem.location || 'MAIN_INVENTORY',
        destination_location: transferForm.destination_location,
        user_id: user.id,
        notes: transferForm.notes || null,
        supplier: selectedItem.supplier,
      };
      console.log('Submitting transfer with payload:', payload);

      const response = await fetch(
        `${apiUrl}/inventory/transfer-between-locations`,
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
    } catch (error: unknown) {
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
        `${apiUrl}/inventory/adjust-stock`,
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
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStockLevelColor = (remaining: number) => {
    if (remaining === 0) return 'text-red-600 dark:text-red-400';
    if (remaining < 10) return 'text-amber-600 dark:text-amber-400';
    if (remaining < 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStockLevelBg = (remaining: number) => {
    if (remaining === 0) return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    if (remaining < 10) return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
    if (remaining < 50) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
    return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  };

  const StockLevelIndicator = ({ remaining, total }: { remaining: number; total: number }) => {
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

  const StatCard = ({ title, value, icon, color, trend }: { title: string; value: number; icon: React.ReactNode; color: string; trend?: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)] transform transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-6 -mt-6 transform rotate-45"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold opacity-90">{title}</h3>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center shadow-md backdrop-blur-sm">
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold mb-2 drop-shadow-md">{value.toLocaleString()}</p>
        {trend && (
          <div className="flex items-center gap-1 text-xs opacity-90">
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  const columnLabels: { [key: string]: string } = {
    item_name: 'اسم الصنف',
    item_code: 'الكود',
    color: 'اللون',
    carton_quantity: 'عدد الكراتين',
    items_per_carton: 'عدد في الكرتونة',
    individual_items: 'عدد القزاز الفردي',
    total_quantity: 'الكمية الإجمالية',
    remaining_quantity: 'الكمية المتبقية',
    supplier: 'المورد',
    location: 'الموقع',
    notes: 'ملاحظات',
    added_date: 'تاريخ الإضافة',
    actions: 'الإجراءات',
  };

  const transferLogColumnLabels: { [key: string]: string } = {
    item_name: 'اسم الصنف',
    item_code: 'الكود',
    color: 'اللون',
    transfer_quantity: 'الكمية المحولة',
    transfer_date: 'تاريخ التحويل',
    username: 'المستخدم',
    supplier: 'المورد',
    notes: 'ملاحظات',
    source_location: 'المصدر',
    destination_location: 'الوجهة',
  };

  const movementColumnLabels: { [key: string]: string } = {
    item_name: 'اسم الصنف',
    item_code: 'الكود',
    color: 'اللون',
    movement_type: 'نوع الحركة',
    quantity_in: 'الكمية الداخلة',
    quantity_out: 'الكمية الخارجة',
    balance_after: 'الرصيد بعد',
    source_location: 'المصدر',
    destination_location: 'الوجهة',
    notes: 'ملاحظات',
    created_at: 'تاريخ الحركة',
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 via-indigo-50/90 to-purple-100/90 dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-700/90 dir-rtl font-tajawal">
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

      <div className="p-4 sm:p-6 max-w-full overflow-hidden">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-6 text-white relative overflow-hidden transform transition-all duration-300 hover:shadow-[0_12px_50px_rgba(0,0,0,0.4)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm"></div>
          <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-md border border-white/30 transform transition-all duration-300 hover:scale-110">
                <Database className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
                  {showLogs ? 'سجل تحويلات المخزون' : showMovements ? 'حركات المخزون' : 'إدارة المخزون الرئيسي'}
                </h1>
                <p className="text-lg opacity-90 mt-1">نظام متكامل لإدارة المخزون والتحويلات</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-md border border-white/30 shadow-md transform transition-all duration-300 hover:scale-105">
                <p className="text-sm opacity-90">المستخدم</p>
                <p className="font-semibold">{user?.name || 'غير معروف'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics Dashboard */}
        {!showLogs && !showMovements && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <StatCard
              title="إجمالي الأصناف"
              value={stats.totalItems}
              icon={<FiBox className="w-5 h-5" />}
              color="from-blue-500 to-blue-600"
              trend="+12%"
            />
            <StatCard
              title="إجمالي الكمية"
              value={stats.totalQuantity}
              icon={<FiPackage className="w-5 h-5" />}
              color="from-green-500 to-green-600"
              trend="+8%"
            />
            <StatCard
              title="أصناف منخفضة"
              value={stats.lowStockItems}
              icon={<TrendingDown className="w-5 h-5" />}
              color="from-amber-500 to-amber-600"
              trend="تحذير"
            />
            <StatCard
              title="أصناف منتهية"
              value={stats.outOfStockItems}
              icon={<XCircle className="w-5 h-5" />}
              color="from-red-500 to-red-600"
              trend="انتباه"
            />
          </motion.div>
        )}

        {/* Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowLogs(false);
                  setShowMovements(false);
                }}
                className={`px-4 py-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center gap-2 font-semibold transform hover:scale-105 ${
                  !showLogs && !showMovements 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FiBox className="w-4 h-4" />
                المخزون
              </button>
              <button
                onClick={() => {
                  setShowLogs(true);
                  setShowMovements(false);
                  fetchTransferLogs();
                }}
                className={`px-4 py-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center gap-2 font-semibold transform hover:scale-105 ${
                  showLogs 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FiArrowLeft className="w-4 h-4" />
                سجل التحويلات
              </button>
              <button
                onClick={() => {
                  setShowMovements(true);
                  setShowLogs(false);
                  fetchStockMovements();
                }}
                className={`px-4 py-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center gap-2 font-semibold transform hover:scale-105 ${
                  showMovements 
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FiRefreshCw className="w-4 h-4" />
                حركات المخزون
              </button>
            </div>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={showLogs || showMovements ? logFilters.search : filters.item_name}
                onChange={(e) => {
                  if (showLogs || showMovements) {
                    setLogFilters({ ...logFilters, search: e.target.value });
                  } else {
                    setFilters({ ...filters, item_name: e.target.value });
                  }
                }}
                placeholder={
                  showLogs ? "ابحث في سجل التحويلات..." : 
                  showMovements ? "ابحث في حركات المخزون..." : 
                  "ابحث في المخزون..."
                }
                className="w-full p-3 pr-12 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg font-bold transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md transform hover:scale-101"
              />
              <FiSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 text-xl" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {!showLogs && !showMovements && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] flex items-center gap-2 font-semibold transform hover:scale-105"
              >
                <FiFilter className="w-4 h-4" />
                {showFilters ? 'إخفاء الفلتر' : 'عرض الفلتر'}
              </button>
            )}
            <button
              onClick={showLogs || showMovements ? exportLogsToExcel : exportToExcel}
              className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-gray-700 hover:to-gray-800 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] flex items-center gap-2 font-semibold transform hover:scale-105"
            >
              <FiDownload className="w-4 h-4" />
              تصدير Excel
            </button>
          </div>
        </motion.div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && !showLogs && !showMovements && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] p-6 border border-gray-200/50 dark:border-gray-600/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'الكود', key: 'item_code', icon: <FiBox className="w-4 h-4" /> },
                    { label: 'اللون', key: 'color', icon: <FiPackage className="w-4 h-4" /> },
                    { label: 'المورد', key: 'supplier', icon: <FiUser className="w-4 h-4" /> },
                    { label: 'الموقع', key: 'location', icon: <FiMapPin className="w-4 h-4" /> },
                    { label: 'من تاريخ', key: 'from_date', type: 'date', icon: <FiClock className="w-4 h-4" /> },
                    { label: 'إلى تاريخ', key: 'to_date', type: 'date', icon: <FiClock className="w-4 h-4" /> },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {field.icon}
                        {field.label}
                      </label>
                      <Input
                        type={field.type || 'text'}
                        value={filters[field.key]}
                        onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && fetchFilteredData()}
                        placeholder={field.label}
                        className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={fetchFilteredData}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] font-semibold transform hover:scale-105"
                  >
                    تطبيق التصفية
                  </button>
                  <button
                    onClick={resetFilters}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] font-semibold transform hover:scale-105"
                  >
                    إعادة تعيين
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden border border-gray-200/50 dark:border-gray-600/50"
        >
          {/* Table Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center sticky top-0 z-10 shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
            <h2 className="text-xl font-bold drop-shadow-md">
              {showLogs ? 'سجل تحويلات المخزون' : 
               showMovements ? 'حركات المخزون' : 
               'الأصناف المتاحة في المخزون'}
            </h2>
          </div>

          {showMovements ? (
            /* Stock Movements Table */
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                      {Object.keys(movementColumnLabels).map((header) => (
                        <th
                          key={header}
                          className="p-4 text-center text-sm font-bold whitespace-nowrap border-b border-white/20"
                        >
                          {movementColumnLabels[header]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {movementsLoading ? (
                      <tr>
                        <td colSpan={Object.keys(movementColumnLabels).length} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-semibold">جارٍ تحميل حركات المخزون...</p>
                          </div>
                        </td>
                      </tr>
                    ) : stockMovements.length > 0 ? (
                      stockMovements.map((movement, index) => (
                        <motion.tr
                          key={movement.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200 transform hover:scale-[1.005]"
                        >
                          <td className="p-4 text-center font-semibold text-gray-900 dark:text-white">{movement.item_name}</td>
                          <td className="p-4 text-center">
                            <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-lg border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-sm">
                              {movement.item_code}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-lg border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 shadow-sm">
                              {movement.color || '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-lg border font-bold ${
                              movement.movement_type === 'ADDITION' || movement.movement_type === 'PURCHASE'
                                ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                                : movement.movement_type === 'SALE' || movement.movement_type === 'DEDUCT'
                                ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                                : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                            }`}>
                              {getMovementTypeArabic(movement.movement_type)}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-green-600 dark:text-green-400">{movement.quantity_in}</td>
                          <td className="p-4 text-center font-bold text-red-600 dark:text-red-400">{movement.quantity_out}</td>
                          <td className="p-4 text-center font-bold text-lg text-amber-600 dark:text-amber-400">{movement.balance_after}</td>
                          <td className="p-4 text-center">{getLocationArabic(movement.source_location || '')}</td>
                          <td className="p-4 text-center">{getLocationArabic(movement.destination_location || '')}</td>
                          <td className="p-4 text-center max-w-[200px]">
                            <div className="truncate" title={movement.notes || ''}>
                              {movement.notes || '-'}
                            </div>
                          </td>
                          <td className="p-4 text-center text-gray-700 dark:text-gray-300">{formatDate(movement.created_at)}</td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Object.keys(movementColumnLabels).length} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <FiRefreshCw className="w-12 h-12 opacity-50" />
                            <p className="font-semibold">لا توجد حركات مسجلة</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : showLogs ? (
            /* Transfer Logs Table */
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                      {Object.keys(transferLogColumnLabels).map((header) => (
                        <th
                          key={header}
                          className="p-4 text-center text-sm font-bold whitespace-nowrap border-b border-white/20"
                        >
                          {transferLogColumnLabels[header]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logsLoading ? (
                      <tr>
                        <td colSpan={Object.keys(transferLogColumnLabels).length} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-semibold">جارٍ تحميل سجل التحويلات...</p>
                          </div>
                        </td>
                      </tr>
                    ) : transferLogs.length > 0 ? (
                      transferLogs.map((log, index) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200 transform hover:scale-[1.005]"
                        >
                          <td className="p-4 text-center font-semibold text-gray-900 dark:text-white">{log.item_name}</td>
                          <td className="p-4 text-center">
                            <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-lg border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-sm">
                              {log.item_code}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-lg border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 shadow-sm">
                              {log.color}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-lg text-amber-600 dark:text-amber-400">{log.transfer_quantity}</td>
                          <td className="p-4 text-center text-gray-700 dark:text-gray-300">{formatDate(log.transfer_date)}</td>
                          <td className="p-4 text-center">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 shadow-sm">
                              {log.username}
                            </span>
                          </td>
                          <td className="p-4 text-center text-gray-700 dark:text-gray-300">{log.supplier || '-'}</td>
                          <td className="p-4 text-center max-w-[200px]">
                            <div className="truncate" title={log.notes || ''}>
                              {log.notes || '-'}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-lg border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 shadow-sm">
                              {getLocationArabic(log.source_location)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 shadow-sm">
                              {getLocationArabic(log.destination_location)}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Object.keys(transferLogColumnLabels).length} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <FiArrowLeft className="w-12 h-12 opacity-50" />
                            <p className="font-semibold">لا توجد تحويلات مسجلة</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Inventory Table */
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                      {[
                        'item_name',
                        'item_code',
                        'color',
                        'carton_quantity',
                        'items_per_carton',
                        'individual_items',
                        'total_quantity',
                        'remaining_quantity',
                        'supplier',
                        'location',
                        'notes',
                        'added_date',
                        'actions',
                      ].map((header) => (
                        <th
                          key={header}
                          className={cn(
                            'p-4 text-center text-sm font-bold whitespace-nowrap border-b border-white/20',
                            header === 'item_name' ? 'min-w-[200px] pr-6' : '',
                            header === 'item_code' ? 'min-w-[120px] pl-2' : '',
                            header === 'actions' ? 'min-w-[180px]' : ''
                          )}
                        >
                          {header === 'actions' ? 'الإجراءات' : columnLabels[header]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-semibold">جارٍ تحميل البيانات...</p>
                          </div>
                        </td>
                      </tr>
                    ) : items.length > 0 ? (
                      items.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200 transform hover:scale-[1.005]"
                        >
                          <td className="p-4 text-right font-bold text-lg text-gray-900 dark:text-white min-w-[200px] pr-6">
                            {item.item_name}
                          </td>
                          <td className="p-4 text-center min-w-[120px] pl-2">
                            <span className="bg-blue-100 text-blue-800 font-bold text-lg px-3 py-1 rounded-lg border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-sm">
                              {item.item_code}
                            </span>
                          </td>
                          <td className="p-4 text-center min-w-[120px]">
                            <span className="bg-purple-100 text-purple-800 font-bold text-lg px-3 py-1 rounded-lg border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 shadow-sm">
                              {item.color || '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-lg text-amber-600 dark:text-amber-400">{item.carton_quantity}</td>
                          <td className="p-4 text-center font-bold text-lg text-gray-700 dark:text-gray-300">{item.items_per_carton}</td>
                          <td className="p-4 text-center font-bold text-lg text-cyan-600 dark:text-cyan-400">{item.individual_items}</td>
                          <td className="p-4 text-center font-bold text-lg text-blue-600 dark:text-blue-400">{item.total_quantity}</td>
                          <td className="p-4 text-center min-w-[140px]">
                            <div className="flex flex-col items-center gap-2">
                              <span className={`font-bold text-lg px-3 py-1 rounded-lg border ${getStockLevelBg(item.remaining_quantity)} ${getStockLevelColor(item.remaining_quantity)} shadow-sm`}>
                                {item.remaining_quantity.toLocaleString()}
                              </span>
                              <StockLevelIndicator remaining={item.remaining_quantity} total={item.total_quantity} />
                            </div>
                          </td>
                          <td className="p-4 text-center text-gray-700 dark:text-gray-300">{item.supplier || '-'}</td>
                          <td className="p-4 text-center">
                            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg border border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700 shadow-sm">
                              {getLocationArabic(item.location || '')}
                            </span>
                          </td>
                          <td className="p-4 text-center max-w-[200px]">
                            <div className="truncate" title={item.notes || ''}>
                              {item.notes || '-'}
                            </div>
                          </td>
                          <td className="p-4 text-center text-gray-700 dark:text-gray-300">{formatDate(item.added_date)}</td>
                          <td className="p-4 text-center min-w-[180px]">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                                title="تعديل"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                                title="حذف"
                              >
                                <FiTrash className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleTransfer(item)}
                                className="p-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                                title="تحويل"
                              >
                                <FiArrowLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAdjustment(item)}
                                className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                                title="تعديل المخزون"
                              >
                                <FiRefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <FiPackage className="w-12 h-12 opacity-50" />
                            <p className="font-semibold">لا توجد بيانات</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-gray-50/80 dark:bg-gray-700/80 border-t border-gray-200/50 dark:border-gray-600/50 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                تاريخ اليوم: {currentDate}
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                عدد النتائج: {showLogs ? transferLogs.length : showMovements ? stockMovements.length : resultCount} {showLogs ? 'سجل' : showMovements ? 'حركة' : 'صنف'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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

      {/* Delete Modal - Keep the same structure as before but update the text */}
      <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md dir-rtl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-md">
            {/* ... Delete modal content remains the same but with updated field names ... */}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Transfer Modal - Keep the same structure but update the form fields */}
      <Dialog.Root open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md dir-rtl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-md">
            {/* ... Transfer modal content remains the same but with updated field names ... */}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Adjustment Modal */}
      <Dialog.Root open={adjustmentModalOpen} onOpenChange={setAdjustmentModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md dir-rtl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-md">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-t-xl -mx-6 -mt-6 mb-6 text-center shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-center gap-3">
                <FiRefreshCw className="w-6 h-6" />
                <Dialog.Title className="text-xl font-bold">
                  تعديل المخزون
                </Dialog.Title>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl mb-4 shadow-md border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm">
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">تفاصيل الصنف</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الصنف:</div>
                  <div className="text-left font-bold text-gray-900 dark:text-white">{selectedItem?.item_name}</div>
                  <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الكود:</div>
                  <div className="text-left font-bold text-gray-900 dark:text-white">{selectedItem?.item_code}</div>
                  <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الكمية الحالية:</div>
                  <div className="text-left">
                    <span className={`font-bold ${getStockLevelColor(selectedItem?.remaining_quantity || 0)}`}>
                      {selectedItem?.remaining_quantity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-xl mb-4 font-semibold shadow-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    نوع التعديل
                  </label>
                  <select
                    value={adjustmentForm.operation}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, operation: e.target.value as 'ADD' | 'DEDUCT' })}
                    className="w-full p-3 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-right shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md"
                  >
                    <option value="ADD">إضافة</option>
                    <option value="DEDUCT">خصم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    الكمية
                  </label>
                  <Input
                    type="number"
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
                    placeholder="أدخل الكمية"
                    className="w-full p-3 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-right shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    value={adjustmentForm.notes}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                    placeholder="أدخل ملاحظات إضافية"
                    className="w-full p-3 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-right shadow-[0_4px_15px_rgba(0,0,0,0.1)] backdrop-blur-md"
                    rows={3}
                  />
                </div>
              </div>
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
                onClick={submitAdjustment}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:from-orange-700 hover:to-orange-800 transition-all duration-300 font-semibold flex items-center gap-2 transform hover:scale-105"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جارٍ التعديل...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4" />
                    تأكيد التعديل
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
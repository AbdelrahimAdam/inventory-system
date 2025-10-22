import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiSearch, 
  FiRefreshCw, 
  FiChevronLeft, 
  FiFilter, 
  FiChevronDown, 
  FiChevronUp, 
  FiPlus, 
  FiTrash2, 
  FiEdit, 
  FiX, 
  FiArrowRight,
  FiDownload,
  FiPackage,
  FiBox,
  FiUser,
  FiMapPin,
  FiClock
} from 'react-icons/fi';
import { Input } from '../../../ui/Input';
import Checkbox from '../../../ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Save, CheckCircle, XCircle, TrendingUp, TrendingDown, BarChart3, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "@/context/AuthContext";

// Simple className helper
const cn = (...classes) => classes.filter(Boolean).join(' ');

type AccessoryItem = {
  id: number;
  "الصنف": string;
  "الكود": string;
  "لون_الاكسسوار": string;
  "المورد": string;
  "مكان_الصنف": string;
  "ملاحظات": string;
  "عدد_الكراتين": number;
  "عدد_في_الكرتونة": number;
  "عدد_الاكسسوار_الفردي": number;
  "بمب": number | null;
  "حلق": number | null;
  "غطاء": number | null;
  "شرائط": number | null;
  "استيكرات": number | null;
  "علامات": number | null;
  "كمية_الاكسسوار": number;
  "تاريخ_الإضافة": string;
};

type DispatchLog = {
  id: number;
  "ACCESSORY_ID": number;
  "الصنف": string;
  "الكود": string;
  "اللون": string;
  "الوجهه": string;
  "المصدر": string;
  "اجمالي_المصروف": number;
  "بمب_مصروف": number;
  "حلق_مصروف": number;
  "غطاء_مصروف": number;
  "شرائط_مصروف": number;
  "استيكرات_مصروف": number;
  "علامات_مصروف": number;
  "تاريخ_الصرف": string;
  "ملاحظات": string;
  "المستخدم": string;
};

interface FormData {
  "الصنف": string;
  "الكود": string;
  "لون_الاكسسوار": string;
  "المورد": string;
  "مكان_الصنف": string;
  "ملاحظات": string;
  "عدد_الكراتين": string;
  "عدد_في_الكرتونة": string;
  "عدد_الاكسسوار_الفردي": string;
  "بمب": string;
  "حلق": string;
  "غطاء": string;
  "شرائط": string;
  "استيكرات": string;
  "علامات": string;
  "كمية_الاكسسوار": string;
}

interface DispatchValues {
  "اجمالي_المصروف": number;
  "بمب_مصروف": number;
  "حلق_مصروف": number;
  "غطاء_مصروف": number;
  "شرائط_مصروف": number;
  "استيكرات_مصروف": number;
  "علامات_مصروف": number;
  "ملاحظات": string;
  "الوجهه": string;
}

interface ReturnValues {
  "بمب": number;
  "حلق": number;
  "غطاء": number;
  "شرائط": number;
  "استيكرات": number;
  "علامات": number;
  "ملاحظات": string;
}

// Helper function to format dates in Arabic
const formatToArabicDate = (dateString) => {
  const date = new Date(dateString);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    numberingSystem: 'arab'
  };
  return date.toLocaleDateString('ar-EG', options);
};

export default function ViewAccessoriesStock() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<AccessoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AccessoryItem[]>([]);
  const [logRows, setLogRows] = useState<DispatchLog[]>([]);
  const [filteredLogRows, setFilteredLogRows] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [filters, setFilters] = useState({
    "الصنف": '',
    "الكود": '',
    "لون_الاكسسوار": '',
  });
  const [logSearchText, setLogSearchText] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [exportColumns, setExportColumns] = useState({
    "كمية_الاكسسوار": true,
    "عدد_الاكسسوار_الفردي": true,
    "عدد_في_الكرتونة": true,
    "عدد_الكراتين": true,
    "ملاحظات": true,
    "مكان_الصنف": true,
    "المورد": true,
    "لون_الاكسسوار": true,
    "الكود": true,
    "بمب": true,
    "حلق": true,
    "غطاء": true,
    "شرائط": true,
    "استيكرات": true,
    "علامات": true,
    "الصنف": true,
    "تاريخ_الإضافة": true,
    "الوجهه": true,
  });
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AccessoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<AccessoryItem | null>(null);
  const [formData, setFormData] = useState<FormData>({
    "الصنف": '',
    "الكود": '',
    "لون_الاكسسوار": '',
    "المورد": '',
    "مكان_الصنف": '',
    "ملاحظات": '',
    "عدد_الكراتين": '',
    "عدد_في_الكرتونة": '',
    "عدد_الاكسسوار_الفردي": '',
    "بمب": '',
    "حلق": '',
    "غطاء": '',
    "شرائط": '',
    "استيكرات": '',
    "علامات": '',
    "كمية_الاكسسوار": '0',
  });
  const [editValues, setEditValues] = useState<FormData>({
    "الصنف": '',
    "الكود": '',
    "لون_الاكسسوار": '',
    "المورد": '',
    "مكان_الصنف": '',
    "ملاحظات": '',
    "عدد_الكراتين": '',
    "عدد_في_الكرتونة": '',
    "عدد_الاكسسوار_الفردي": '',
    "بمب": '',
    "حلق": '',
    "غطاء": '',
    "شرائط": '',
    "استيكرات": '',
    "علامات": '',
    "كمية_الاكسسوار": '0',
  });
  const [dispatchValues, setDispatchValues] = useState<DispatchValues>({
    "اجمالي_المصروف": 0,
    "بمب_مصروف": 0,
    "حلق_مصروف": 0,
    "غطاء_مصروف": 0,
    "شرائط_مصروف": 0,
    "استيكرات_مصروف": 0,
    "علامات_مصروف": 0,
    "ملاحظات": '',
    "الوجهه": 'صرف مصنع',
  });
  const [returnValues, setReturnValues] = useState<ReturnValues>({
    "بمب": 0,
    "حلق": 0,
    "غطاء": 0,
    "شرائط": 0,
    "استيكرات": 0,
    "علامات": 0,
    "ملاحظات": '',
  });
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' });
  const [treeSearchText, setTreeSearchText] = useState('');
  const [filteredTreeItems, setFilteredTreeItems] = useState<AccessoryItem[]>([]);

  const inputRefs = {
    "الصنف": useRef(null),
    "الكود": useRef(null),
    "لون_الاكسسوار": useRef(null),
    "عدد_الكراتين": useRef(null),
    "عدد_في_الكرتونة": useRef(null),
    "عدد_الاكسسوار_الفردي": useRef(null),
    "المورد": useRef(null),
    "مكان_الصنف": useRef(null),
    "ملاحظات": useRef(null),
    "بمب": useRef(null),
    "حلق": useRef(null),
    "غطاء": useRef(null),
    "شرائط": useRef(null),
    "استيكرات": useRef(null),
    "علامات": useRef(null),
    "اجمالي_المصروف": useRef(null),
    "بمب_مصروف": useRef(null),
    "حلق_مصروف": useRef(null),
    "غطاء_مصروف": useRef(null),
    "شرائط_مصروف": useRef(null),
    "استيكرات_مصروف": useRef(null),
    "علامات_مصروف": useRef(null),
    "الوجهه": useRef(null),
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.1.209:3001/api/v1";

  // Calculate statistics
  const calculateStats = useCallback(() => {
    const totalItems = items.length;
    const totalAccessories = items.reduce((sum, item) => sum + item["كمية_الاكسسوار"], 0);
    const lowStockItems = items.filter(item => item["كمية_الاكسسوار"] < 10 && item["كمية_الاكسسوار"] > 0).length;
    const outOfStockItems = items.filter(item => item["كمية_الاكسسوار"] === 0).length;
    const totalCartons = items.reduce((sum, item) => sum + item["عدد_الكراتين"], 0);

    return {
      totalItems,
      totalAccessories,
      lowStockItems,
      outOfStockItems,
      totalCartons
    };
  }, [items]);

  const stats = calculateStats();

  // StatCard Component
  const StatCard = ({ title, value, icon, color, trend }: { title: string; value: number; icon: React.ReactNode; color: string; trend?: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white relative overflow-hidden shadow-lg`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-3 -mt-3"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold opacity-90">{title}</h3>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
        <p className="text-xl font-bold mb-1">{value.toLocaleString()}</p>
        {trend && (
          <div className="flex items-center gap-1 text-xs opacity-90">
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  // DetailItem Component
  const DetailItem = ({ icon, label, value, valueColor, isImportant = false }: { icon: React.ReactNode; label: string; value: string | number; valueColor?: string; isImportant?: boolean }) => (
    <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-gray-700/80 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">{label}</p>
        <p className={`font-bold truncate ${isImportant ? 'text-lg' : 'text-base'} ${valueColor || 'text-gray-900 dark:text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );

  // Normalize Arabic numbers to standard numbers
  const normalizeArabicNumber = (value: string) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return value.replace(/[٠-٩]/g, (d) => String(arabicNumbers.indexOf(d)));
  };

  // Show notification
  const showNotification = useCallback((msg: string, type = 'success') => {
    setNotif({ show: true, msg, type });
    setTimeout(() => setNotif({ show: false, msg: '', type: 'success' }), 5000);
  }, []);

  // Fetch stock data
  const fetchData = useCallback(async () => {
    if (!token) {
      showNotification('رمز الدخول غير متوفر، يرجى تسجيل الدخول', 'error');
      logout();
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/manager/accessories`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          showNotification('جلسة منتهية، يرجى تسجيل الدخول مجددًا', 'error');
          logout();
          navigate('/login');
          return;
        }
        throw new Error(errorData.message || `خطأ في جلب البيانات: ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "فشل في جلب البيانات");

      // Calculate كمية_الاكسسوار for each item
      const updatedItems = data.data.map((item: AccessoryItem) => ({
        ...item,
        "كمية_الاكسسوار": (item["عدد_الكراتين"] * item["عدد_في_الكرتونة"]) + item["عدد_الاكسسوار_الفردي"],
      }));

      setItems(updatedItems);
      setFilteredItems(updatedItems);
      setFilteredTreeItems(updatedItems);
      setResultCount(updatedItems.length);
      if (updatedItems.length === 0) {
        showNotification('لم يتم العثور على نتائج.', 'error');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "حدث خطأ غير متوقع");
      showNotification(err.message || "حدث خطأ غير متوقع", 'error');
      setItems([]);
      setFilteredItems([]);
      setFilteredTreeItems([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, showNotification, token, logout, navigate]);

  // Fetch dispatch logs
  const fetchLogData = useCallback(async () => {
    if (!token) {
      showNotification('رمز الدخول غير متوفر، يرجى تسجيل الدخول', 'error');
      logout();
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/manager/accessories/dispatch-logs`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          showNotification('جلسة منتهية، يرجى تسجيل الدخول مجددًا', 'error');
          logout();
          navigate('/login');
          return;
        }
        throw new Error(errorData.message || `خطأ في جلب سجل الصرف: ${res.status}`);
      }
      const data = await res.json();
      setLogRows(data.data || []);
      setFilteredLogRows(data.data || []);
    } catch (error) {
      console.error('Error fetching dispatch logs:', error);
      showNotification(error.message || 'فشل في تحميل سجل الصرف', 'error');
    }
  }, [API_BASE_URL, showNotification, token, logout, navigate]);

  // Initial data fetch and date/time update
  useEffect(() => {
    fetchData();
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour12: true, timeZone: 'Africa/Cairo' }));
      setCurrentDate(formatToArabicDate(now.toISOString()));
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter items based on search criteria
  useEffect(() => {
    let filtered = [...items];
    if (filters["الصنف"] || filters["الكود"] || filters["لون_الاكسسوار"]) {
      filtered = filtered.filter(item =>
        (!filters["الصنف"] || item["الصنف"].toLowerCase().includes(filters["الصنف"].toLowerCase())) &&
        (!filters["الكود"] || item["الكود"].toLowerCase().includes(filters["الكود"].toLowerCase())) &&
        (!filters["لون_الاكسسوار"] || item["لون_الاكسسوار"].toLowerCase().includes(filters["لون_الاكسسوار"].toLowerCase()))
      );
    }
    setFilteredItems(filtered);
    setResultCount(filtered.length);
  }, [filters, items]);

  // Filter tree items in dialog
  useEffect(() => {
    let filtered = [...items];
    if (treeSearchText) {
      const search = treeSearchText.trim().toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(search))
      );
    }
    setFilteredTreeItems(filtered);
  }, [treeSearchText, items]);

  // Filter dispatch logs
  useEffect(() => {
    let filtered = [...logRows];
    if (logSearchText) {
      const search = logSearchText.trim().toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(search))
      );
    }
    if (fromDate) {
      filtered = filtered.filter(row => new Date(row["تاريخ_الصرف"]) >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(row => new Date(row["تاريخ_الصرف"]) <= toDate);
    }
    setFilteredLogRows(filtered);
  }, [logSearchText, fromDate, toDate, logRows]);

  // Open delete confirmation dialog
  const confirmDelete = (item: AccessoryItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  // Delete item
  const handleDelete = async () => {
    if (!token || !itemToDelete) {
      showNotification('رمز الدخول غير متوفر أو لم يتم تحديد صنف، يرجى تسجيل الدخول', 'error');
      logout();
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/manager/accessories/${encodeURIComponent(itemToDelete["الكود"])}/${encodeURIComponent(itemToDelete["لون_الاكسسوار"])}/${encodeURIComponent(itemToDelete["الصنف"])}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          showNotification('جلسة منتهية، يرجى تسجيل الدخول مجددًا', 'error');
          logout();
          navigate('/login');
          return;
        }
        throw new Error(data.message || 'فشل في الحذف');
      }
      showNotification('تم حذف الصنف بنجاح');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      showNotification(error.message || 'فشل في حذف الصنف', 'error');
    }
  };

  // Update total quantity in add/edit form
  const updateTotalQuantity = useCallback((form: FormData) => {
    const cartons = parseInt(normalizeArabicNumber(form["عدد_الكراتين"])) || 0;
    const perCarton = parseInt(normalizeArabicNumber(form["عدد_في_الكرتونة"])) || 0;
    const individual = parseInt(normalizeArabicNumber(form["عدد_الاكسسوار_الفردي"])) || 0;
    const total = cartons * perCarton + individual;

    // Calculate sum of accessory quantities
    const accessorySum = 
      (parseInt(normalizeArabicNumber(form["بمب"])) || 0) +
      (parseInt(normalizeArabicNumber(form["حلق"])) || 0) +
      (parseInt(normalizeArabicNumber(form["غطاء"])) || 0) +
      (parseInt(normalizeArabicNumber(form["شرائط"])) || 0) +
      (parseInt(normalizeArabicNumber(form["استيكرات"])) || 0) +
      (parseInt(normalizeArabicNumber(form["علامات"])) || 0);

    // If accessory sum doesn't match total, adjust the quantities proportionally
    if (accessorySum !== total && total > 0) {
      const ratio = total / accessorySum;
      
      return {
        ...form,
        "كمية_الاكسسوار": total.toString(),
        "بمب": Math.round((parseInt(normalizeArabicNumber(form["بمب"])) || 0) * ratio).toString(),
        "حلق": Math.round((parseInt(normalizeArabicNumber(form["حلق"])) || 0) * ratio).toString(),
        "غطاء": Math.round((parseInt(normalizeArabicNumber(form["غطاء"])) || 0) * ratio).toString(),
        "شرائط": Math.round((parseInt(normalizeArabicNumber(form["شرائط"])) || 0) * ratio).toString(),
        "استيكرات": Math.round((parseInt(normalizeArabicNumber(form["استيكرات"])) || 0) * ratio).toString(),
        "علامات": Math.round((parseInt(normalizeArabicNumber(form["علامات"])) || 0) * ratio).toString(),
      };
    }

    return { ...form, "كمية_الاكسسوار": total.toString() };
  }, []);

  // Handle input change for add/edit form
  const handleInputChange = (field: string, value: string, setForm: React.Dispatch<React.SetStateAction<FormData>>) => {
    setForm(prev => {
      const updatedForm = { ...prev, [field]: value };
      if (['عدد_الكراتين', 'عدد_في_الكرتونة', 'عدد_الاكسسوار_الفردي'].includes(field)) {
        return updateTotalQuantity(updatedForm);
      }
      return updatedForm;
    });
  };

  // Clear form fields
  const clearFields = (setForm: React.Dispatch<React.SetStateAction<FormData>>) => {
    setForm({
      "الصنف": '',
      "الكود": '',
      "لون_الاكسسوار": '',
      "المورد": '',
      "مكان_الصنف": '',
      "ملاحظات": '',
      "عدد_الكراتين": '',
      "عدد_في_الكرتونة": '',
      "عدد_الاكسسوار_الفردي": '',
      "بمب": '',
      "حلق": '',
      "غطاء": '',
      "شرائط": '',
      "استيكرات": '',
      "علامات": '',
      "كمية_الاكسسوار": '0',
    });
  };

  // Save accessory (upsert)
  const saveAccessory = async (clearAfterSave: boolean, isEdit: boolean, form: FormData) => {
    if (!token) {
      showNotification('رمز الدخول غير متوفر، يرجى تسجيل الدخول', 'error');
      logout();
      navigate('/login');
      return;
    }

    if (!form["الصنف"] || !form["الكود"] || !form["لون_الاكسسوار"]) {
      showNotification('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    try {
      const payload = {
        "الصنف": form["الصنف"].trim(),
        "الكود": form["الكود"].trim(),
        "لون_الاكسسوار": form["لون_الاكسسوار"].trim(),
        "المورد": form["المورد"].trim() || null,
        "مكان_الصنف": form["مكان_الصنف"].trim() || null,
        "ملاحظات": form["ملاحظات"].trim() || null,
        "عدد_الكراتين": parseInt(normalizeArabicNumber(form["عدد_الكراتين"])) || 0,
        "عدد_في_الكرتونة": parseInt(normalizeArabicNumber(form["عدد_في_الكرتونة"])) || 0,
        "عدد_الاكسسوار_الفردي": parseInt(normalizeArabicNumber(form["عدد_الاكسسوار_الفردي"])) || 0,
        "بمب": parseInt(normalizeArabicNumber(form["بمب"])) || 0,
        "حلق": parseInt(normalizeArabicNumber(form["حلق"])) || 0,
        "غطاء": parseInt(normalizeArabicNumber(form["غطاء"])) || 0,
        "شرائط": parseInt(normalizeArabicNumber(form["شرائط"])) || 0,
        "استيكرات": parseInt(normalizeArabicNumber(form["استيكرات"])) || 0,
        "علامات": parseInt(normalizeArabicNumber(form["علامات"])) || 0,
        "كمية_الاكسسوار": parseInt(normalizeArabicNumber(form["كمية_الاكسسوار"])) || 0,
      };
      console.log('Sending payload:', JSON.stringify(payload, null, 2));
      const res = await fetch(`${API_BASE_URL}/manager/accessories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        console.error('Response error:', responseData);
        if (res.status === 401) {
          showNotification('جلسة منتهية، يرجى تسجيل الدخول مجددًا', 'error');
          logout();
          navigate('/login');
          return;
        }
        throw new Error(responseData.message || `فشل في الحفظ: ${res.status}`);
      }
      if (!responseData.success) {
        console.error('Response not successful:', responseData);
        throw new Error(responseData.message || 'فشل في الحفظ');
      }
      showNotification('تم حفظ الصنف بنجاح');
      fetchData();
      if (clearAfterSave) {
        clearFields(isEdit ? setEditValues : setFormData);
      } else {
        if (isEdit) setEditDialogOpen(false);
        else setAddItemDialogOpen(false);
        clearFields(isEdit ? setEditValues : setFormData);
      }
    } catch (error) {
      console.error('Error saving accessory:', error);
      showNotification(error.message || 'فشل في حفظ الصنف', 'error');
    }
  };

  // Open edit dialog
  const openEditDialog = (item: AccessoryItem) => {
    setSelectedItem(item);
    setEditValues({
      "الصنف": item["الصنف"],
      "الكود": item["الكود"],
      "لون_الاكسسوار": item["لون_الاكسسوار"],
      "المورد": item["المورد"] || '',
      "مكان_الصنف": item["مكان_الصنف"] || '',
      "ملاحظات": item["ملاحظات"] || '',
      "عدد_الكراتين": item["عدد_الكراتين"].toString(),
      "عدد_في_الكرتونة": item["عدد_في_الكرتونة"].toString(),
      "عدد_الاكسسوار_الفردي": item["عدد_الاكسسوار_الفردي"].toString(),
      "بمب": item["بمب"]?.toString() || '',
      "حلق": item["حلق"]?.toString() || '',
      "غطاء": item["غطاء"]?.toString() || '',
      "شرائط": item["شرائط"]?.toString() || '',
      "استيكرات": item["استيكرات"]?.toString() || '',
      "علامات": item["علامات"]?.toString() || '',
      "كمية_الاكسسوار": item["كمية_الاكسسوار"].toString(),
    });
    setEditDialogOpen(true);
  };

  // Fill form from tree row
  const fillFormFromTree = (item: AccessoryItem, isEdit: boolean) => {
    const values = {
      "الصنف": item["الصنف"],
      "الكود": item["الكود"],
      "لون_الاكسسوار": item["لون_الاكسسوار"],
      "المورد": item["المورد"] || '',
      "مكان_الصنف": item["مكان_الصنف"] || '',
      "ملاحظات": item["ملاحظات"] || '',
      "عدد_الكراتين": item["عدد_الكراتين"].toString(),
      "عدد_في_الكرتونة": item["عدد_في_الكرتونة"].toString(),
      "عدد_الاكسسوار_الفردي": item["عدد_الاكسسوار_الفردي"].toString(),
      "بمب": item["بمب"]?.toString() || '',
      "حلق": item["حلق"]?.toString() || '',
      "غطاء": item["غطاء"]?.toString() || '',
      "شرائط": item["شرائط"]?.toString() || '',
      "استيكرات": item["استيكرات"]?.toString() || '',
      "علامات": item["علامات"]?.toString() || '',
      "كمية_الاكسسوار": item["كمية_الاكسسوار"].toString(),
    };
    if (isEdit) {
      setEditValues(values);
    } else {
      setFormData(values);
    }
  };

  // Calculate quantity (show alert)
  const calculateQuantity = (form: FormData) => {
    const cartons = parseInt(normalizeArabicNumber(form["عدد_الكراتين"])) || 0;
    const perCarton = parseInt(normalizeArabicNumber(form["عدد_في_الكرتونة"])) || 0;
    const individual = parseInt(normalizeArabicNumber(form["عدد_الاكسسوار_الفردي"])) || 0;
    const total = cartons * perCarton + individual;
    alert(`الكمية الإجمالية: ${total}`);
  };

  // Handle key down for form submission
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callback();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      "الصنف": '',
      "الكود": '',
      "لون_الاكسسوار": '',
    });
    setFromDate(null);
    setToDate(null);
    setLogSearchText('');
    fetchData();
  }; 

  // Dispatch handlers
  const openDispatchDialog = (item) => {
    setSelectedItem(item);
    setDispatchValues({
      "اجمالي_المصروف": 0,
      "بمب_مصروف": 0,
      "حلق_مصروف": 0,
      "غطاء_مصروف": 0,
      "شرائط_مصروف": 0,
      "استيكرات_مصروف": 0,
      "علامات_مصروف": 0,
      "ملاحظات": '',
      "الوجهه": 'صرف مصنع',
    });
    setDispatchDialogOpen(true);
  };

  const handleDispatchChange = (field, value) => {
    setDispatchValues((prev) => ({
      ...prev,
      [field]: typeof value === 'string' ? value.trim() : value,
    }));
  };

  const handleDispatchSubmit = async () => {
    if (!token) {
      showNotification('رمز الدخول غير متوفر، يرجى تسجيل الدخول', 'error');
      logout();
      navigate('/login');
      return;
    }

    if (!selectedItem) {
      showNotification('الرجاء اختيار صنف للصرف', 'error');
      return;
    }
    if (dispatchValues["اجمالي_المصروف"] <= 0) {
      showNotification('الكمية يجب أن تكون أكبر من الصفر', 'error');
      return;
    }

    // Validate dispatched amounts against available quantities
    const fields = ["بمب", "حلق", "غطاء", "شرائط", "استيكرات", "علامات"];
    for (const field of fields) {
      const dispatched = dispatchValues[`${field}_مصروف`] || 0;
      const available = selectedItem[field] || 0;
      if (dispatched > available) {
        showNotification(`الكمية المصروفة من ${field} (${dispatched}) أكبر من المتوفر (${available})`, 'error');
        return;
      }
    }

    try {
      const payload = {
        accessory_id: selectedItem.id,
        "الصنف": selectedItem["الصنف"],
        "الكود": selectedItem["الكود"],
        "اللون": selectedItem["لون_الاكسسوار"],
        "الوجهه": dispatchValues["الوجهه"]?.trim() || 'صرف مصنع',
        "المصدر": "المخزون",
        "اجمالي_المصروف": dispatchValues["اجمالي_المصروف"],
        "بمب_مصروف": dispatchValues["بمب_مصروف"],
        "حلق_مصروف": dispatchValues["حلق_مصروف"],
        "غطاء_مصروف": dispatchValues["غطاء_مصروف"],
        "شرائط_مصروف": dispatchValues["شرائط_مصروف"],
        "استيكرات_مصروف": dispatchValues["استيكرات_مصروف"],
        "علامات_مصروف": dispatchValues["علامات_مصروف"],
        "ملاحظات": dispatchValues["ملاحظات"] || null,
        "المستخدم": 'غير معروف',
      };
      
      console.log('Dispatching payload:', payload);
      
      const res = await fetch(`${API_BASE_URL}/manager/accessories/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const responseData = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          showNotification('جلسة منتهية، يرجى تسجيل الدخول مجددًا', 'error');
          logout();
          navigate('/login');
          return;
        }
        throw new Error(responseData.message || `فشل في الصرف: ${res.status}`);
      }
      
      showNotification('تم صرف الإكسسوار بنجاح');
      setDispatchDialogOpen(false);
      setSelectedItem(null);
      fetchData();
      if (showLog) fetchLogData();
    } catch (error) {
      console.error('Error dispatching item:', error);
      showNotification(error.message || 'حدث خطأ أثناء الصرف', 'error');
    }
  };

  // Return handlers
  const openReturnDialog = (item: AccessoryItem) => {
    setSelectedItem(item);
    setReturnValues({
      "بمب": 0,
      "حلق": 0,
      "غطاء": 0,
      "شرائط": 0,
      "استيكرات": 0,
      "علامات": 0,
      "ملاحظات": '',
    });
    setReturnDialogOpen(true);
  };

  const handleReturnChange = (field: string, value: string | number) => {
    setReturnValues((prev) => ({
      ...prev,
      [field]: typeof value === 'string' ? value.trim() : value,
    }));
  };

  const handleReturnSubmit = async () => {
    if (!token) {
      showNotification('رمز الدخول غير متوفر، يرجى تسجيل الدخول', 'error');
      logout();
      navigate('/login');
      return;
    }

    if (!selectedItem) {
      showNotification('الرجاء اختيار صنف للمرتجع', 'error');
      return;
    }
    try {
      // First check if the item exists in dispatch logs
      const checkRes = await fetch(`${API_BASE_URL}/manager/accessories/check-dispatch?الكود=${encodeURIComponent(selectedItem["الكود"])}&الصنف=${encodeURIComponent(selectedItem["الصنف"])}&اللون=${encodeURIComponent(selectedItem["لون_الاكسسوار"])}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!checkRes.ok) {
        throw new Error('فشل في التحقق من سجل الصرف');
      }
      
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        showNotification('هذا الصنف غير موجود في سجل الصرف، لا يمكن استرجاعه', 'error');
        return;
      }

      const payload = {
        accessory_id: selectedItem.id,
        "الصنف": selectedItem["الصنف"],
        "الكود": selectedItem["الكود"],
        "اللون": selectedItem["لون_الاكسسوار"],
        "بمب": returnValues["بمب"],
        "حلق": returnValues["حلق"],
        "غطاء": returnValues["غطاء"],
        "شرائط": returnValues["شرائط"],
        "استيكرات": returnValues["استيكرات"],
        "علامات": returnValues["علامات"],
        "ملاحظات": returnValues["ملاحظات"] || null,
      };
      const res = await fetch(`${API_BASE_URL}/manager/accessories/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          showNotification('جلسة منتهية، يرجى تسجيل الدخول مجددًا', 'error');
          logout();
          navigate('/login');
          return;
        }
        throw new Error(responseData.message || `فشل في تسجيل المرتجع: ${res.status}`);
      }
      showNotification('تم تسجيل المرتجع بنجاح');
      setReturnDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error('Error returning item:', error);
      showNotification(error.message || 'حدث خطأ أثناء تسجيل المرتجع', 'error');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const columnsFull = [
      "الصنف", "الكود", "لون_الاكسسوار", "عدد_الكراتين", "عدد_في_الكرتونة",
      "عدد_الاكسسوار_الفردي", "كمية_الاكسسوار", "المورد", "مكان_الصنف", "ملاحظات", "تاريخ_الإضافة",
      "بمب", "حلق", "غطاء", "شرائط", "استيكرات", "علامات"
    ];
    
    const columnsDisplay = [
      'الصنف', 'الكود', 'اللون', 'الكراتين', 'في الكرتونة',
      'الفردي', 'كمية الاكسسوار', 'المورد', 'المكان', 'ملاحظات', 'تاريخ الإضافة',
      'بمب', 'حلق', 'غطاء', 'شرائط', 'استيكرات', 'علامات'
    ];

    const dataToExport = showLog ? filteredLogRows : filteredItems;
    const selectedCols = columnsFull.filter((col) => exportColumns[col]);
    if (!selectedCols.length) {
      showNotification('يرجى تحديد أعمدة للتصدير.', 'error');
      return;
    }

    const data = dataToExport.map((item) =>
      selectedCols.map((col) => {
        switch (col) {
          case "الصنف": return item["الصنف"];
          case "الكود": return item["الكود"];
          case "لون_الاكسسوار": return item["لون_الاكسسوار"];
          case "عدد_الكراتين": return item["عدد_الكراتين"];
          case "عدد_في_الكرتونة": return item["عدد_في_الكرتونة"];
          case "عدد_الاكسسوار_الفردي": return item["عدد_الاكسسوار_الفردي"];
          case "كمية_الاكسسوار": return item["كمية_الاكسسوار"];
          case "المورد": return item["المورد"];
          case "مكان_الصنف": return item["مكان_الصنف"];
          case "ملاحظات": return item["ملاحظات"];
          case "تاريخ_الإضافة": return item["تاريخ_الإضافة"] ? formatToArabicDate(item["تاريخ_الإضافة"]) : '-';
          case "بمب": return item["بمب"];
          case "حلق": return item["حلق"];
          case "غطاء": return item["غطاء"];
          case "شرائط": return item["شرائط"];
          case "استيكرات": return item["استيكرات"];
          case "علامات": return item["علامات"];
          case "اجمالي_المصروف": return item["اجمالي_المصروف"];
          case "بمب_مصروف": return item["بمب_مصروف"];
          case "حلق_مصروف": return item["حلق_مصروف"];
          case "غطاء_مصروف": return item["غطاء_مصروف"];
          case "شرائط_مصروف": return item["شرائط_مصروف"];
          case "استيكرات_مصروف": return item["استيكرات_مصروف"];
          case "علامات_مصروف": return item["علامات_مصروف"];
          case "تاريخ_الصرف": return formatToArabicDate(item["تاريخ_الصرف"]);
          case "المستخدم": return item["المستخدم"];
          case "الوجهه": return item["الوجهه"];
          case "المصدر": return item["المصدر"];
          default: return '';
        }
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([selectedCols.map((col) => columnsDisplay[columnsFull.indexOf(col)]), ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, showLog ? 'سجل_الصرف' : 'مخزن_الإكسسوار');
    XLSX.writeFile(wb, showLog ? 'سجل_الصرف.xlsx' : 'مخزن_الإكسسوار.xlsx');
  };

  // Truncate notes for mobile view
  const truncateNotes = (notes: string | null, maxLength = 20) => {
    if (!notes) return '-';
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  const columnLabels = {
    "الصنف": 'الصنف',
    "الكود": 'الكود',
    "لون_الاكسسوار": 'اللون',
    "المورد": 'المورد',
    "مكان_الصنف": 'المكان',
    "ملاحظات": 'ملاحظات',
    "عدد_الكراتين": 'الكراتين',
    "عدد_في_الكرتونة": 'في الكرتونة',
    "عدد_الاكسسوار_الفردي": 'فردي',
    "بمب": 'بمب',
    "حلق": 'حلق',
    "غطاء": 'غطاء',
    "شرائط": 'شرائط',
    "استيكرات": 'استيكرات',
    "علامات": 'علامات',
    "كمية_الاكسسوار": 'كمية الاكسسوار',
    "تاريخ_الإضافة": 'تاريخ الإضافة',
    actions: 'الإجراءات',
  };

  const logColumnLabels = {
    "الصنف": 'الصنف',
    "الكود": 'الكود',
    "اللون": 'اللون',
    "الوجهه": 'الوجهة',
    "المصدر": 'المصدر',
    "اجمالي_المصروف": 'إجمالي المصروف',
    "بمب_مصروف": 'بمب مصروف',
    "حلق_مصروف": 'حلق مصروف',
    "غطاء_مصروف": 'غطاء مصروف',
    "شرائط_مصروف": 'شرائط مصروف',
    "استيكرات_مصروف": 'استيكرات مصروف',
    "علامات_مصروف": 'علامات مصروف',
    "تاريخ_الصرف": 'تاريخ الصرف',
    "المستخدم": 'المستخدم',
    "ملاحظات": 'ملاحظات',
  };

  const columnOrder = [
    "الصنف",
    "الكود",
    "لون_الاكسسوار",
    "المورد",
    "مكان_الصنف",
    "ملاحظات",
    "عدد_الكراتين",
    "عدد_في_الكرتونة",
    "عدد_الاكسسوار_الفردي",
    "بمب",
    "حلق",
    "غطاء",
    "شرائط",
    "استيكرات",
    "علامات",
    "كمية_الاكسسوار",
    "تاريخ_الإضافة",
    'actions',
  ];

  const mobileColumns = [
    "الصنف",
    "الكود",
    "لون_الاكسسوار",
    "كمية_الاكسسوار",
    "ملاحظات",
    'actions',
  ];

  const mobileLogColumns = [
    "الصنف",
    "الكود",
    "اللون",
    "الوجهه",
    "اجمالي_المصروف",
    "تاريخ_الصرف",
    "ملاحظات",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-100/80 dark:from-gray-900/90 dark:via-gray-800 dark:to-gray-700/90 dir-rtl font-tajawal">
      {/* Notification */}
      <AnimatePresence>
        {notif.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={cn(
              'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md w-full mx-4 backdrop-blur-sm border',
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
                  {showLog ? 'سجل صرف الإكسسوارات' : 'مخزن الإكسسوارات'}
                </h1>
                <p className="text-lg opacity-90 mt-1">نظام متكامل لإدارة الإكسسوارات والتحويلات</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/30">
                <p className="text-sm opacity-90">الوقت الحالي</p>
                <p className="font-semibold">{currentTime}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/30">
                <p className="text-sm opacity-90">تاريخ اليوم</p>
                <p className="font-semibold">{currentDate}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics Dashboard */}
        {!showLog && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <StatCard
              title="إجمالي الأصناف"
              value={stats.totalItems}
              icon={<FiBox className="w-5 h-5" />}
              color="from-blue-500 to-blue-600"
              trend="+12%"
            />
            <StatCard
              title="إجمالي الإكسسوارات"
              value={stats.totalAccessories}
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
            <button
              onClick={() => {
                setShowLog(!showLog);
                if (!showLog) fetchLogData();
              }}
              className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
            >
              <FiClock className="w-4 h-4" />
              {showLog ? 'عرض المخزون' : 'عرض سجل الصرف'}
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={showLog ? logSearchText : filters["الصنف"]}
                onChange={(e) => showLog 
                  ? setLogSearchText(e.target.value)
                  : setFilters({ ...filters, "الصنف": e.target.value })
                }
                placeholder={showLog ? "ابحث في سجل الصرف..." : "ابحث في المخزون..."}
                className="w-full p-3 pr-12 bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg font-bold transition-all duration-300 backdrop-blur-sm"
              />
              <FiSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 text-xl" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {!showLog && (
              <>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
                >
                  <FiFilter className="w-4 h-4" />
                  {showFilters ? 'إخفاء الفلتر' : 'عرض الفلتر'}
                </button>
                <button
                  onClick={() => setAddItemDialogOpen(true)}
                  className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
                >
                  <FiPlus className="w-4 h-4" />
                  إضافة صنف
                </button>
              </>
            )}
            <button
              onClick={exportToExcel}
              className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <FiDownload className="w-4 h-4" />
              تصدير Excel
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <FiRefreshCw className="w-4 h-4" />
              تحديث
            </button>
          </div>
        </motion.div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && !showLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] p-6 border border-gray-200/50 dark:border-gray-600/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: 'الكود', key: "الكود", icon: <FiBox className="w-4 h-4" /> },
                    { label: 'اللون', key: "لون_الاكسسوار", icon: <FiPackage className="w-4 h-4" /> },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {field.icon}
                        {field.label}
                      </label>
                      <Input
                        type="text"
                        value={filters[field.key]}
                        onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                        placeholder={field.label}
                        className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={fetchData}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                  >
                    تطبيق التصفية
                  </button>
                  <button
                    onClick={resetFilters}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
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
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden border border-gray-200/50 dark:border-gray-600/50"
        >
          {/* Table Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center sticky top-0 z-10">
            <h2 className="text-xl font-bold">
              {showLog ? 'سجل صرف الإكسسوارات' : 'الأصناف المتاحة في المخزون'}
            </h2>
          </div>

          {showLog ? (
            /* Transfer Logs Table */
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
                      {Object.keys(logColumnLabels).map((header) => (
                        <th
                          key={header}
                          className="p-4 text-center text-sm font-bold whitespace-nowrap border-b border-white/20"
                        >
                          {logColumnLabels[header]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLogRows.length > 0 ? (
                      filteredLogRows.map((row, index) => (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200"
                        >
                          {Object.keys(logColumnLabels).map((col) => (
                            <td
                              key={col}
                              className={cn(
                                'p-4 text-center text-sm font-bold',
                                col === "الصنف" || col === "ملاحظات" ? 'text-right' : '',
                                col === "ملاحظات" ? 'max-w-[150px] truncate' : ''
                              )}
                              title={col === "ملاحظات" ? row["ملاحظات"] : undefined}
                            >
                              {col === "تاريخ_الصرف" ? formatToArabicDate(row["تاريخ_الصرف"]) : row[col] ?? '-'}
                            </td>
                          ))}
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Object.keys(logColumnLabels).length} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <FiPackage className="w-12 h-12 opacity-50" />
                            <p className="font-semibold">لا توجد بيانات في سجل الصرف</p>
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
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                      {columnOrder.map((key) => (
                        <th
                          key={key}
                          className={cn(
                            'p-4 text-center text-sm font-bold whitespace-nowrap border-b border-white/20',
                            key === "الصنف" ? 'min-w-[200px] pr-6' : '',
                            key === "الكود" ? 'min-w-[120px] pl-2' : '',
                            key === "actions" ? 'min-w-[150px]' : ''
                          )}
                        >
                          {key === 'actions' ? 'الإجراءات' : columnLabels[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={columnOrder.length} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-semibold">جارٍ تحميل البيانات...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length > 0 ? (
                      filteredItems.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200"
                        >
                          {columnOrder.map((col) => (
                            <td
                              key={col}
                              className={cn(
                                'p-4 text-center text-sm font-bold',
                                col === "الصنف" || col === "ملاحظات" ? 'text-right' : '',
                                col === "ملاحظات" ? 'max-w-[150px] truncate' : ''
                              )}
                              title={col === "ملاحظات" ? item["ملاحظات"] : undefined}
                            >
                              {col === 'actions' ? (
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => openDispatchDialog(item)}
                                    className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                    title="صرف"
                                  >
                                    <FiArrowRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openReturnDialog(item)}
                                    className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                    title="مرتجع"
                                  >
                                    <FiArrowRight className="w-4 h-4 rotate-180" />
                                  </button>
                                  <button
                                    onClick={() => openEditDialog(item)}
                                    className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                    title="تعديل"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => confirmDelete(item)}
                                    className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                    title="حذف"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : col === "تاريخ_الإضافة" ? (
                                formatToArabicDate(item["تاريخ_الإضافة"])
                              ) : (
                                item[col] ?? '-'
                              )}
                            </td>
                          ))}
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columnOrder.length} className="p-8 text-center">
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
          <div className="p-4 bg-gray-50/80 dark:bg-gray-700/50 border-t border-gray-200/50 dark:border-gray-600/50">
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                عدد النتائج: {showLog ? filteredLogRows.length : resultCount} {showLog ? 'سجل' : 'صنف'}
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                آخر تحديث: {currentTime}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Item Dialog */}
      {addItemDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
              <h2 className="text-2xl font-bold">إضافة صنف جديد</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 flex-1 overflow-hidden">
              {/* Form Section */}
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'اسم الصنف', key: "الصنف", icon: <FiPackage className="w-4 h-4" /> },
                    { label: 'الكود', key: "الكود", icon: <FiBox className="w-4 h-4" /> },
                    { label: 'اللون', key: "لون_الاكسسوار", icon: <FiBox className="w-4 h-4" /> },
                    { label: 'المورد', key: "المورد", icon: <FiUser className="w-4 h-4" /> },
                    { label: 'المكان', key: "مكان_الصنف", icon: <FiMapPin className="w-4 h-4" /> },
                    { label: 'عدد الكراتين', key: "عدد_الكراتين", type: 'number', icon: <FiPackage className="w-4 h-4" /> },
                    { label: 'عدد في الكرتونة', key: "عدد_في_الكرتونة", type: 'number', icon: <FiBox className="w-4 h-4" /> },
                    { label: 'عدد الاكسسوار الفردي', key: "عدد_الاكسسوار_الفردي", type: 'number', icon: <FiBox className="w-4 h-4" /> },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {field.icon}
                        {field.label}
                      </label>
                      <Input
                        type={field.type || 'text'}
                        value={formData[field.key]}
                        onChange={(e) => handleInputChange(field.key, e.target.value, setFormData)}
                        placeholder={field.label}
                        className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'بمب', key: "بمب", type: 'number' },
                    { label: 'حلق', key: "حلق", type: 'number' },
                    { label: 'غطاء', key: "غطاء", type: 'number' },
                    { label: 'شرائط', key: "شرائط", type: 'number' },
                    { label: 'استيكرات', key: "استيكرات", type: 'number' },
                    { label: 'علامات', key: "علامات", type: 'number' },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white">
                        {field.label}
                      </label>
                      <Input
                        type={field.type || 'text'}
                        value={formData[field.key]}
                        onChange={(e) => handleInputChange(field.key, e.target.value, setFormData)}
                        placeholder={field.label}
                        className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiEdit className="w-4 h-4" />
                    ملاحظات
                  </label>
                  <textarea
                    value={formData["ملاحظات"]}
                    onChange={(e) => handleInputChange("ملاحظات", e.target.value, setFormData)}
                    placeholder="أدخل ملاحظات"
                    className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white">
                    كمية الاكسسوار الإجمالية
                  </label>
                  <Input
                    type="text"
                    value={formData["كمية_الاكسسوار"]}
                    disabled
                    className="p-3 text-right text-sm font-bold bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Tree View Section */}
              <div className="flex flex-col h-full overflow-hidden border-l border-gray-200 dark:border-gray-700 pl-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">البيانات الحالية</h3>
                <div className="relative mb-4">
                  <Input
                    type="text"
                    value={treeSearchText}
                    onChange={(e) => setTreeSearchText(e.target.value)}
                    placeholder="ابحث في الأصناف..."
                    className="p-3 pr-10 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                  />
                  <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                  {filteredTreeItems.length > 0 ? (
                    filteredTreeItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 transition-colors"
                        onClick={() => fillFormFromTree(item, false)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">{item["الصنف"]}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{item["الكود"]} - {item["لون_الاكسسوار"]}</p>
                          </div>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm font-bold">
                            {item["كمية_الاكسسوار"]}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      لا توجد أصناف
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => calculateQuantity(formData)}
                  className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-semibold"
                >
                  احسب الكمية
                </button>
                <button
                  onClick={() => saveAccessory(true, false, formData)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold"
                >
                  حفظ وإضافة آخر
                </button>
                <button
                  onClick={() => saveAccessory(false, false, formData)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button
                  onClick={() => {
                    setAddItemDialogOpen(false);
                    clearFields(setFormData);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold flex items-center gap-2"
                >
                  <FiX className="w-4 h-4" />
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* Edit Item Dialog */}
      {editDialogOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <FiEdit className="w-6 h-6" />
                <h2 className="text-2xl font-bold">تعديل الصنف</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 flex-1 overflow-hidden">
              {/* Form Section */}
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'اسم الصنف', key: "الصنف", icon: <FiPackage className="w-4 h-4" /> },
                    { label: 'الكود', key: "الكود", icon: <FiBox className="w-4 h-4" /> },
                    { label: 'اللون', key: "لون_الاكسسوار", icon: <FiBox className="w-4 h-4" /> },
                    { label: 'المورد', key: "المورد", icon: <FiUser className="w-4 h-4" /> },
                    { label: 'المكان', key: "مكان_الصنف", icon: <FiMapPin className="w-4 h-4" /> },
                    { label: 'عدد الكراتين', key: "عدد_الكراتين", type: 'number', icon: <FiPackage className="w-4 h-4" /> },
                    { label: 'عدد في الكرتونة', key: "عدد_في_الكرتونة", type: 'number', icon: <FiBox className="w-4 h-4" /> },
                    { label: 'عدد الاكسسوار الفردي', key: "عدد_الاكسسوار_الفردي", type: 'number', icon: <FiBox className="w-4 h-4" /> },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {field.icon}
                        {field.label}
                      </label>
                      <Input
                        type={field.type || 'text'}
                        value={editValues[field.key]}
                        onChange={(e) => handleInputChange(field.key, e.target.value, setEditValues)}
                        placeholder={field.label}
                        className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'بمب', key: "بمب", type: 'number' },
                    { label: 'حلق', key: "حلق", type: 'number' },
                    { label: 'غطاء', key: "غطاء", type: 'number' },
                    { label: 'شرائط', key: "شرائط", type: 'number' },
                    { label: 'استيكرات', key: "استيكرات", type: 'number' },
                    { label: 'علامات', key: "علامات", type: 'number' },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white">
                        {field.label}
                      </label>
                      <Input
                        type={field.type || 'text'}
                        value={editValues[field.key]}
                        onChange={(e) => handleInputChange(field.key, e.target.value, setEditValues)}
                        placeholder={field.label}
                        className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiEdit className="w-4 h-4" />
                    ملاحظات
                  </label>
                  <textarea
                    value={editValues["ملاحظات"]}
                    onChange={(e) => handleInputChange("ملاحظات", e.target.value, setEditValues)}
                    placeholder="أدخل ملاحظات"
                    className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white">
                    كمية الاكسسوار الإجمالية
                  </label>
                  <Input
                    type="text"
                    value={editValues["كمية_الاكسسوار"]}
                    disabled
                    className="p-3 text-right text-sm font-bold bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Item Preview Section */}
              <div className="flex flex-col h-full overflow-hidden border-l border-gray-200 dark:border-gray-700 pl-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">معاينة الصنف</h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem 
                      icon={<FiPackage className="w-4 h-4" />} 
                      label="الصنف" 
                      value={selectedItem["الصنف"]} 
                    />
                    <DetailItem 
                      icon={<FiBox className="w-4 h-4" />} 
                      label="الكود" 
                      value={selectedItem["الكود"]}
                      valueColor="text-blue-600 dark:text-blue-400"
                    />
                    <DetailItem 
                      icon={<FiBox className="w-4 h-4" />} 
                      label="اللون" 
                      value={selectedItem["لون_الاكسسوار"]} 
                    />
                    <DetailItem 
                      icon={<TrendingDown className="w-4 h-4" />} 
                      label="الكمية الحالية" 
                      value={selectedItem["كمية_الاكسسوار"].toLocaleString()}
                      valueColor="text-green-600 dark:text-green-400"
                      isImportant={true}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">الأصناف المشابهة</h4>
                  {filteredTreeItems.filter(item => item.id !== selectedItem.id).slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 transition-colors"
                      onClick={() => fillFormFromTree(item, true)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{item["الصنف"]}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item["الكود"]} - {item["لون_الاكسسوار"]}</p>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-sm font-bold">
                          {item["كمية_الاكسسوار"]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => calculateQuantity(editValues)}
                  className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-semibold"
                >
                  احسب الكمية
                </button>
                <button
                  onClick={() => saveAccessory(false, true, editValues)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </button>
                <button
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedItem(null);
                    clearFields(setEditValues);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold flex items-center gap-2"
                >
                  <FiX className="w-4 h-4" />
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Dialog */}
      {dispatchDialogOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <FiArrowRight className="w-6 h-6" />
                <h2 className="text-2xl font-bold">صرف إكسسوار</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Selected Item Info */}
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-blue-200 dark:border-blue-600">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <FiPackage className="w-5 h-5" />
                  معلومات الصنف المحدد
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem 
                    icon={<FiPackage className="w-4 h-4" />} 
                    label="الصنف" 
                    value={selectedItem["الصنف"]} 
                  />
                  <DetailItem 
                    icon={<FiBox className="w-4 h-4" />} 
                    label="الكود" 
                    value={selectedItem["الكود"]}
                    valueColor="text-blue-600 dark:text-blue-400"
                  />
                  <DetailItem 
                    icon={<FiBox className="w-4 h-4" />} 
                    label="اللون" 
                    value={selectedItem["لون_الاكسسوار"]} 
                  />
                  <DetailItem 
                    icon={<TrendingDown className="w-4 h-4" />} 
                    label="الكمية المتاحة" 
                    value={selectedItem["كمية_الاكسسوار"].toLocaleString()}
                    valueColor="text-green-600 dark:text-green-400"
                    isImportant={true}
                  />
                </div>
              </div>

              {/* Dispatch Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FiPackage className="w-4 h-4 text-orange-500" />
                      إجمالي الكمية المصروفة
                    </label>
                    <Input
                      type="number"
                      value={dispatchValues["اجمالي_المصروف"]}
                      onChange={(e) => handleDispatchChange("اجمالي_المصروف", parseInt(normalizeArabicNumber(e.target.value)) || 0)}
                      placeholder="أدخل الكمية الإجمالية"
                      className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FiMapPin className="w-4 h-4 text-green-500" />
                      الوجهة
                    </label>
                    <select
                      value={dispatchValues["الوجهه"]}
                      onChange={(e) => handleDispatchChange("الوجهه", e.target.value)}
                      className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                    >
                      <option value="صرف مصنع">صرف مصنع</option>
                      <option value="صرف خارجي">صرف خارجي</option>
                      <option value="مخزون_المنوفية">مخزون المنوفية</option>
                      <option value="مخزون_المطبعة">مخزون المطبعة</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-amber-200 dark:border-amber-600">
                  <h4 className="text-md font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    تفاصيل الصرف
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'بمب', key: "بمب_مصروف", available: selectedItem["بمب"] || 0 },
                      { label: 'حلق', key: "حلق_مصروف", available: selectedItem["حلق"] || 0 },
                      { label: 'غطاء', key: "غطاء_مصروف", available: selectedItem["غطاء"] || 0 },
                      { label: 'شرائط', key: "شرائط_مصروف", available: selectedItem["شرائط"] || 0 },
                      { label: 'استيكرات', key: "استيكرات_مصروف", available: selectedItem["استيكرات"] || 0 },
                      { label: 'علامات', key: "علامات_مصروف", available: selectedItem["علامات"] || 0 },
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {field.label} (متوفر: {field.available})
                        </label>
                        <Input
                          type="number"
                          value={dispatchValues[field.key]}
                          onChange={(e) => handleDispatchChange(field.key, parseInt(normalizeArabicNumber(e.target.value)) || 0)}
                          placeholder="0"
                          className="p-2 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-lg border-2 border-amber-200 dark:border-amber-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiEdit className="w-4 h-4 text-gray-500" />
                    ملاحظات الصرف
                  </label>
                  <textarea
                    value={dispatchValues["ملاحظات"]}
                    onChange={(e) => handleDispatchChange("ملاحظات", e.target.value)}
                    placeholder="أدخل ملاحظات الصرف (اختياري)"
                    className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 resize-none"
                    rows={3}
                  />
                </div>

                {/* Summary Card */}
                {dispatchValues["اجمالي_المصروف"] > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-green-200 dark:border-green-600">
                    <h4 className="text-md font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      ملخص الصرف
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الكمية المصروفة:</div>
                      <div className="text-left font-bold text-green-600 dark:text-green-400">
                        {dispatchValues["اجمالي_المصروف"].toLocaleString()} قطعة
                      </div>
                      <div className="text-right font-semibold text-gray-600 dark:text-gray-300">المتبقي بعد الصرف:</div>
                      <div className="text-left font-bold text-blue-600 dark:text-blue-400">
                        {(selectedItem["كمية_الاكسسوار"] - dispatchValues["اجمالي_المصروف"]).toLocaleString()} قطعة
                      </div>
                      <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الوجهة:</div>
                      <div className="text-left font-bold text-purple-600 dark:text-purple-400">
                        {dispatchValues["الوجهه"]}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={handleDispatchSubmit}
                  disabled={dispatchValues["اجمالي_المصروف"] <= 0}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <FiArrowRight className="w-5 h-5" />
                  تأكيد الصرف
                </button>
                <button
                  onClick={() => setDispatchDialogOpen(false)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold flex items-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Dialog */}
      {returnDialogOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <FiArrowRight className="w-6 h-6 rotate-180" />
                <h2 className="text-2xl font-bold">مرتجع إكسسوار</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Selected Item Info */}
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-blue-200 dark:border-blue-600">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <FiPackage className="w-5 h-5" />
                  معلومات الصنف المحدد
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem 
                    icon={<FiPackage className="w-4 h-4" />} 
                    label="الصنف" 
                    value={selectedItem["الصنف"]} 
                  />
                  <DetailItem 
                    icon={<FiBox className="w-4 h-4" />} 
                    label="الكود" 
                    value={selectedItem["الكود"]}
                    valueColor="text-blue-600 dark:text-blue-400"
                  />
                  <DetailItem 
                    icon={<FiBox className="w-4 h-4" />} 
                    label="اللون" 
                    value={selectedItem["لون_الاكسسوار"]} 
                  />
                  <DetailItem 
                    icon={<TrendingDown className="w-4 h-4" />} 
                    label="الكمية الحالية" 
                    value={selectedItem["كمية_الاكسسوار"].toLocaleString()}
                    valueColor="text-green-600 dark:text-green-400"
                    isImportant={true}
                  />
                </div>
              </div>

              {/* Return Form */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-purple-200 dark:border-purple-600">
                  <h4 className="text-md font-bold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    تفاصيل المرتجع
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'بمب', key: "بمب" },
                      { label: 'حلق', key: "حلق" },
                      { label: 'غطاء', key: "غطاء" },
                      { label: 'شرائط', key: "شرائط" },
                      { label: 'استيكرات', key: "استيكرات" },
                      { label: 'علامات', key: "علامات" },
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {field.label}
                        </label>
                        <Input
                          type="number"
                          value={returnValues[field.key]}
                          onChange={(e) => handleReturnChange(field.key, parseInt(normalizeArabicNumber(e.target.value)) || 0)}
                          placeholder="0"
                          className="p-2 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-lg border-2 border-purple-200 dark:border-purple-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiEdit className="w-4 h-4 text-gray-500" />
                    ملاحظات المرتجع
                  </label>
                  <textarea
                    value={returnValues["ملاحظات"]}
                    onChange={(e) => handleReturnChange("ملاحظات", e.target.value)}
                    placeholder="أدخل ملاحظات المرتجع (اختياري)"
                    className="p-3 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 resize-none"
                    rows={3}
                  />
                </div>

                {/* Summary Card */}
                {(returnValues["بمب"] > 0 || returnValues["حلق"] > 0 || returnValues["غطاء"] > 0 || returnValues["شرائط"] > 0 || returnValues["استيكرات"] > 0 || returnValues["علامات"] > 0) && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-green-200 dark:border-green-600">
                    <h4 className="text-md font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      ملخص المرتجع
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-right font-semibold text-gray-600 dark:text-gray-300">إجمالي الكمية المسترجعة:</div>
                      <div className="text-left font-bold text-green-600 dark:text-green-400">
                        {(
                          returnValues["بمب"] + 
                          returnValues["حلق"] + 
                          returnValues["غطاء"] + 
                          returnValues["شرائط"] + 
                          returnValues["استيكرات"] + 
                          returnValues["علامات"]
                        ).toLocaleString()} قطعة
                      </div>
                      <div className="text-right font-semibold text-gray-600 dark:text-gray-300">المجموع بعد الاسترجاع:</div>
                      <div className="text-left font-bold text-blue-600 dark:text-blue-400">
                        {(
                          selectedItem["كمية_الاكسسوار"] + 
                          returnValues["بمب"] + 
                          returnValues["حلق"] + 
                          returnValues["غطاء"] + 
                          returnValues["شرائط"] + 
                          returnValues["استيكرات"] + 
                          returnValues["علامات"]
                        ).toLocaleString()} قطعة
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={handleReturnSubmit}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <FiArrowRight className="w-5 h-5 rotate-180" />
                  تسجيل المرتجع
                </button>
                <button
                  onClick={() => setReturnDialogOpen(false)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold flex items-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 text-center rounded-t-2xl">
              <div className="flex items-center justify-center gap-3">
                <FiTrash2 className="w-6 h-6" />
                <h2 className="text-2xl font-bold">تأكيد الحذف</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  هل أنت متأكد من الحذف؟
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  سيتم حذف الصنف <span className="font-bold text-blue-600 dark:text-blue-400">{itemToDelete["الصنف"]}</span> بشكل نهائي
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الكود:</div>
                  <div className="text-left font-bold text-gray-900 dark:text-white">{itemToDelete["الكود"]}</div>
                  <div className="text-right font-semibold text-gray-600 dark:text-gray-300">اللون:</div>
                  <div className="text-left font-bold text-gray-900 dark:text-white">{itemToDelete["لون_الاكسسوار"] || '-'}</div>
                  <div className="text-right font-semibold text-gray-600 dark:text-gray-300">الكمية الحالية:</div>
                  <div className="text-left font-bold text-red-600 dark:text-red-400">{itemToDelete["كمية_الاكسسوار"].toLocaleString()}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <FiTrash2 className="w-5 h-5" />
                  تأكيد الحذف
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
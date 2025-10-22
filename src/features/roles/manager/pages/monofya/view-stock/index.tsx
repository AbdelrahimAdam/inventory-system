import { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiRefreshCw, FiDownload, FiPrinter, FiChevronLeft, FiFilter, FiChevronDown, FiChevronUp, FiPlus, FiTrash2, FiEdit, FiX, FiArrowRight, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { Input } from '../../../ui/Input';
import Checkbox from '../../../ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Save, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

// Simple className helper
const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

type StockItem = {
  id: number;
  "الصنف": string;
  "الكود": string;
  "اللون": string;
  "عدد_الكراتين": number;
  "عدد_في_الكرتونة": number;
  "عدد_القزاز_الفردي": number;
  "الكمية_المتبقية": number;
  "المورد"?: string;
  "مكان_الصنف"?: string;
  "ملاحظات"?: string;
  "تاريخ_الاضافه"?: string;
};

type TransferLog = {
  "الصنف": string;
  "الكود": string;
  "اللون": string;
  "الكمية_المحوّلة": number;
  "تاريخ_التحويل": string;
  "المستخدم": string;
  "ملاحظات"?: string | null;
  "المورد"?: string | null;
  "المصدر": string;
  "الوجهة": string;
};

interface FormData {
  "الصنف": string;
  "الكود": string;
  "اللون": string;
  "عدد_الكراتين": string;
  "عدد_في_الكرتونة": string;
  "عدد_القزاز_الفردي": string;
  "المورد": string;
  "ملاحظات": string;
  "الكمية_المتبقية": string;
}

interface TransferValues {
  "الكمية_المحوّلة": number;
  "مكان_الصنف": string;
  "المورد": string;
  "ملاحظات": string;
}

// Helper function to format dates in Arabic
const formatToArabicDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    numberingSystem: 'arab'
  };
  return date.toLocaleDateString('ar-EG', options);
};

export default function ViewMonofyaStock() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StockItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
  const [logRows, setLogRows] = useState<TransferLog[]>([]);
  const [filteredLogRows, setFilteredLogRows] = useState<TransferLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [filters, setFilters] = useState({
    "الصنف": '',
    "الكود": '',
    "اللون": '',
  });
  const [logSearchText, setLogSearchText] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [exportColumns, setExportColumns] = useState({
    "الصنف": true,
    "الكود": true,
    "اللون": true,
    "عدد_الكراتين": true,
    "عدد_في_الكرتونة": true,
    "عدد_القزاز_الفردي": true,
    "الكمية_المتبقية": true,
    "المورد": true,
    "مكان_الصنف": true,
    "ملاحظات": true,
    "تاريخ_الاضافه": true,
  });
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState<FormData>({
    "الصنف": '',
    "الكود": '',
    "اللون": '',
    "عدد_الكراتين": '',
    "عدد_في_الكرتونة": '',
    "عدد_القزاز_الفردي": '',
    "المورد": '',
    "ملاحظات": '',
    "الكمية_المتبقية": '0',
  });
  const [editValues, setEditValues] = useState<FormData>({
    "الصنف": '',
    "الكود": '',
    "اللون": '',
    "عدد_الكراتين": '',
    "عدد_في_الكرتونة": '',
    "عدد_القزاز_الفردي": '',
    "المورد": '',
    "ملاحظات": '',
    "الكمية_المتبقية": '0',
  });
  const [transferValues, setTransferValues] = useState<TransferValues>({
    "الكمية_المحوّلة": 0,
    "مكان_الصنف": '',
    "المورد": '',
    "ملاحظات": '',
  });
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });

  const inputRefs = {
    "الصنف": useRef<HTMLInputElement>(null),
    "الكود": useRef<HTMLInputElement>(null),
    "اللون": useRef<HTMLInputElement>(null),
    "عدد_الكراتين": useRef<HTMLInputElement>(null),
    "عدد_في_الكرتونة": useRef<HTMLInputElement>(null),
    "عدد_القزاز_الفردي": useRef<HTMLInputElement>(null),
    "المورد": useRef<HTMLInputElement>(null),
    "ملاحظات": useRef<HTMLInputElement>(null),
    "الكمية_المحوّلة": useRef<HTMLInputElement>(null),
    "مكان_الصنف": useRef<HTMLInputElement>(null),
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.1.247:3001/api/v1";

  // Normalize Arabic numbers to standard numbers
  const normalizeArabicNumber = (value: string) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return value.replace(/[٠-٩]/g, (d) => {
      return String(arabicNumbers.indexOf(d));
    });
  };

  // Show notification
  const showNotification = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ show: true, msg, type });
    setTimeout(() => setNotif({ show: false, msg: '', type: 'success' }), 3000);
  }, []);

  // Fetch stock data
  const fetchFilteredData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters["الصنف"]) params.append("name", filters["الصنف"]);
      if (filters["الكود"]) params.append("code", filters["الكود"]);
      if (filters["اللون"]) params.append("color", filters["اللون"]);

      const url = `${API_BASE_URL}/manager/monofya/search?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`خطأ في جلب البيانات: ${res.status}`);

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("الخادم لم يرجع بيانات JSON صحيحة: " + text.substring(0, 200));
      }

      const data: { success: boolean; data: StockItem[]; message?: string } = await res.json();
      if (!data.success) throw new Error(data.message || "فشل في جلب البيانات");

      setItems(data.data);
      setFilteredItems(data.data);
      setResultCount(data.data.length);
      if (data.data.length === 0) {
        showNotification('لم يتم العثور على نتائج.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ غير متوقع");
      setItems([]);
      setFilteredItems([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, filters, showNotification]);

  // Fetch transfer logs
  const fetchLogData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/manager/monofya/transfer-log`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`خطأ في جلب سجل التحويلات: ${res.status}`);
      const data = await res.json();
      setLogRows(data.data || []);
      setFilteredLogRows(data.data || []);
    } catch (error) {
      console.error('Error fetching transfer logs:', error);
      showNotification('فشل في تحميل سجل التحويلات', 'error');
    }
  }, [API_BASE_URL, showNotification]);

  // Initial data fetch and date/time update
  useEffect(() => {
    fetchFilteredData();
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour12: true, timeZone: 'Africa/Cairo' }));
      setCurrentDate(formatToArabicDate(now.toISOString()));
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, [fetchFilteredData]);

  // Filter items based on search criteria
  useEffect(() => {
    let filtered = [...items];
    if (filters["الصنف"] || filters["الكود"] || filters["اللون"]) {
      filtered = filtered.filter(item =>
        (!filters["الصنف"] || item["الصنف"].toLowerCase().includes(filters["الصنف"].toLowerCase())) &&
        (!filters["الكود"] || item["الكود"].toLowerCase().includes(filters["الكود"].toLowerCase())) &&
        (!filters["اللون"] || item["اللون"].toLowerCase().includes(filters["اللون"].toLowerCase()))
      );
    }
    setFilteredItems(filtered);
    setResultCount(filtered.length);
  }, [filters, items]);

  // Filter transfer logs
  useEffect(() => {
    let filtered = [...logRows];
    if (logSearchText) {
      const search = logSearchText.trim().toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(search))
      );
    }
    if (fromDate) {
      filtered = filtered.filter(row => new Date(row["تاريخ_التحويل"]) >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(row => new Date(row["تاريخ_التحويل"]) <= toDate);
    }
    setFilteredLogRows(filtered);
  }, [logSearchText, fromDate, toDate, logRows]);

// Delete item with confirmation
const handleDelete = async (item: StockItem) => {
  const confirmDelete = window.confirm(
    `⚠️ هل أنت متأكد أنك تريد حذف هذا الصنف؟\n\nالصنف: ${item["الصنف"]}\nالكود: ${item["الكود"]}\nاللون: ${item["اللون"]}\n\nهذا الإجراء لا يمكن التراجع عنه!`
  );

  if (!confirmDelete) {
    showNotification("تم إلغاء الحذف", "info");
    return;
  }

  try {
    await fetch(
      `${API_BASE_URL}/manager/monofya/${encodeURIComponent(item["الكود"])}/${encodeURIComponent(item["اللون"])}/${encodeURIComponent(item["الصنف"])}`,
      { method: "DELETE" }
    );

    showNotification("✅ تم حذف الصنف بنجاح");
    fetchFilteredData();
  } catch (error) {
    console.error("Error deleting item:", error);
    showNotification("❌ فشل في حذف الصنف", "error");
  }
};


 // Update total quantity in add/edit form
  const updateTotalQuantity = useCallback((form: FormData) => {
    const cartons = parseInt(normalizeArabicNumber(form["عدد_الكراتين"])) || 0;
    const perCarton = parseInt(normalizeArabicNumber(form["عدد_في_الكرتونة"])) || 0;
    const individual = parseInt(normalizeArabicNumber(form["عدد_القزاز_الفردي"])) || 0;
    const total = cartons * perCarton + individual;
    return { ...form, "الكمية_المتبقية": total.toString() };
  }, []);

  // Handle input change for add/edit form
  const handleInputChange = (
    field: keyof FormData,
    value: string,
    setForm: React.Dispatch<React.SetStateAction<FormData>>
  ) => {
    setForm(prev => {
      const updatedForm = { ...prev, [field]: value };
      if (['عدد_الكراتين', 'عدد_في_الكرتونة', 'عدد_القزاز_الفردي'].includes(field)) {
        return updateTotalQuantity(updatedForm);
      }
      return updatedForm;
    });
  };

  // Clear form fields
  const clearFields = () => {
    setFormData({
      "الصنف": '',
      "الكود": '',
      "اللون": '',
      "عدد_الكراتين": '',
      "عدد_في_الكرتونة": '',
      "عدد_القزاز_الفردي": '',
      "المورد": '',
      "ملاحظات": '',
      "الكمية_المتبقية": '0',
    });
  };

  // Save new product
  const saveProduct = async (clearAfterSave: boolean) => {
    if (!formData["الصنف"] || !formData["الكود"] || !formData["اللون"] || !formData["عدد_في_الكرتونة"]) {
      showNotification('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    try {
      const payload = {
        "الصنف": formData["الصنف"].trim(),
        "الكود": formData["الكود"].trim(),
        "اللون": formData["اللون"].trim(),
        "عدد_الكراتين": parseInt(normalizeArabicNumber(formData["عدد_الكراتين"])) || 0,
        "عدد_في_الكرتونة": parseInt(normalizeArabicNumber(formData["عدد_في_الكرتونة"])) || 0,
        "عدد_القزاز_الفردي": parseInt(normalizeArabicNumber(formData["عدد_القزاز_الفردي"])) || 0,
        "المورد": formData["المورد"].trim() || null,
        "ملاحظات": formData["ملاحظات"].trim() || null,
      };
      await fetch(`${API_BASE_URL}/manager/monofya`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showNotification('تم إضافة الصنف بنجاح');
      if (clearAfterSave) {
        clearFields();
      } else {
        setAddItemDialogOpen(false);
        clearFields();
      }
      fetchFilteredData();
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('فشل في إضافة الصنف', 'error');
    }
  };

// Open edit dialog
const openEditDialog = (item: StockItem) => {
  setSelectedItem(item); // احتفظ بالصف الأصلي كامل

  setEditValues({
    "الصنف": item["الصنف"]?.toString() || "",
    "الكود": item["الكود"]?.toString() || "",
    "اللون": item["اللون"]?.toString() || "",
    "عدد_الكراتين": item["عدد_الكراتين"]?.toString() || "0",
    "عدد_في_الكرتونة": item["عدد_في_الكرتونة"]?.toString() || "0",
    "عدد_القزاز_الفردي": item["عدد_القزاز_الفردي"]?.toString() || "0",
    "المورد": item["المورد"]?.toString() || "",
    "ملاحظات": item["ملاحظات"]?.toString() || "",
    "الكمية_المتبقية": item["الكمية_المتبقية"]?.toString() || "0",
  });

  setEditDialogOpen(true);
};

// Save edited product
const saveEditedProduct = async () => {
  if (!selectedItem) return;

  // استخراج الحقول الأساسية
  const الصنف = editValues["الصنف"]?.trim();
  const الكود = editValues["الكود"]?.trim();
  const اللون = editValues["اللون"]?.trim();

  // معالجة الرقم
  const عدد_في_الكرتونة = parseInt(normalizeArabicNumber(editValues["عدد_في_الكرتونة"] || "0"), 10);

  // التحقق من الحقول المطلوبة
  if (!الصنف || !الكود || !اللون || isNaN(عدد_في_الكرتونة) || عدد_في_الكرتونة <= 0) {
    showNotification("⚠️ الرجاء إدخال الصنف، الكود، اللون وعدد في الكرتونة بشكل صحيح", "error");
    return;
  }

  try {
    // تجهيز البيانات
    const payload: any = {
      "الصنف": الصنف,
      "الكود": الكود,
      "اللون": اللون,
      "عدد_في_الكرتونة": عدد_في_الكرتونة,
      "عدد_الكراتين": parseInt(normalizeArabicNumber(editValues["عدد_الكراتين"] || "0"), 10),
      "عدد_القزاز_الفردي": parseInt(normalizeArabicNumber(editValues["عدد_القزاز_الفردي"] || "0"), 10),
    };

    // الحقول الاختيارية
    if (editValues["المورد"]?.trim()) payload["المورد"] = editValues["المورد"].trim();
    if (editValues["ملاحظات"]?.trim()) payload["ملاحظات"] = editValues["ملاحظات"].trim();

    // استدعاء API
    const url = `${API_BASE_URL}/manager/monofya/${encodeURIComponent(selectedItem["الكود"])}/${encodeURIComponent(selectedItem["اللون"])}/${encodeURIComponent(selectedItem["الصنف"])}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Backend error:", errText);
      throw new Error(errText);
    }

    // نجاح العملية
    showNotification("✅ تم تعديل الصنف بنجاح");
    setEditDialogOpen(false);
    setSelectedItem(null);
    fetchFilteredData();
  } catch (error) {
    console.error("Error editing product:", error);
    showNotification("❌ فشل في تعديل الصنف", "error");
  }
};

  // Transfer handlers
  const openTransferDialog = (item: StockItem) => {
    if (!item.id) {
      showNotification('معرف الصنف غير موجود', 'error');
      return;
    }
    setSelectedItem(item);
    setTransferValues({
      "الكمية_المحوّلة": 0,
      "مكان_الصنف": item["مكان_الصنف"]?.trim() || '',
      "المورد": item["المورد"]?.trim() || '',
      "ملاحظات": item["ملاحظات"]?.trim() || '',
    });
    setTransferDialogOpen(true);
  };

  const handleTransferChange = (field: keyof TransferValues, value: string | number) => {
    setTransferValues((prev) => ({
      ...prev,
      [field]: typeof value === 'string' ? value.trim() : value,
    }));
  };

  const handleTransferSubmit = async () => {
    if (!selectedItem) {
      showNotification('الرجاء اختيار صنف للتحويل', 'error');
      return;
    }
    if (!selectedItem.id) {
      showNotification('معرف الصنف غير موجود', 'error');
      return;
    }
    if (transferValues["الكمية_المحوّلة"] <= 0) {
      showNotification('الكمية يجب أن تكون أكبر من الصفر', 'error');
      return;
    }
    if (transferValues["الكمية_المحوّلة"] > selectedItem["الكمية_المتبقية"]) {
      showNotification(
        `الكمية المطلوبة (${transferValues["الكمية_المحوّلة"]}) أكبر من الكمية المتاحة (${selectedItem["الكمية_المتبقية"]})`,
        'error'
      );
      return;
    }
    try {
      const payload = {
        id: selectedItem.id,
        code: selectedItem["الكود"].trim(),
        color: selectedItem["اللون"].trim(),
        name: selectedItem["الصنف"].trim(),
        quantity: transferValues["الكمية_المحوّلة"],
        "مكان_الصنف": transferValues["مكان_الصنف"] || null,
        "المورد": transferValues["المورد"] || null,
        "ملاحظات": transferValues["ملاحظات"] || null,
        "المستخدم": 'غير معروف',
      };
      await fetch(`${API_BASE_URL}/manager/monofya/transfer-to-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showNotification('تم التحويل إلى المخزون بنجاح');
      setTransferDialogOpen(false);
      setSelectedItem(null);
      fetchFilteredData();
      if (showLog) fetchLogData();
    } catch (error) {
      console.error('Error transferring item:', error);
      showNotification('حدث خطأ أثناء التحويل', 'error');
    }
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
      "اللون": '',
    });
    setFromDate(null);
    setToDate(null);
    setLogSearchText('');
    fetchFilteredData();
  };

  // Export to Excel
  const exportToExcel = () => {
    const columnsFull = [
      "الصنف", "الكود", "اللون", "عدد_الكراتين", "عدد_في_الكرتونة",
      "عدد_القزاز_الفردي", "الكمية_المتبقية", "المورد", "مكان_الصنف", "ملاحظات", "تاريخ_الاضافه"
    ];
    
    const columnsDisplay = [
      'الصنف', 'الكود', 'اللون', 'الكراتين', 'في الكرتونة',
      'الفردي', 'المتبقي', 'المورد', 'المكان', 'ملاحظات', 'تاريخ الإضافة'
    ];

    const dataToExport = showLog ? filteredLogRows : filteredItems;
    const selectedCols = columnsFull.filter((col) => exportColumns[col as keyof typeof exportColumns]);
    if (!selectedCols.length) {
      showNotification('يرجى تحديد أعمدة للتصدير.', 'error');
      return;
    }

    const data = dataToExport.map((item: any) =>
      selectedCols.map((col) => {
        switch (col) {
          case "الصنف": return item["الصنف"];
          case "الكود": return item["الكود"];
          case "اللون": return item["اللون"];
          case "عدد_الكراتين": return item["عدد_الكراتين"];
          case "عدد_في_الكرتونة": return item["عدد_في_الكرتونة"];
          case "عدد_القزاز_الفردي": return item["عدد_القزاز_الفردي"];
          case "الكمية_المتبقية": return item["الكمية_المتبقية"];
          case "المورد": return item["المورد"];
          case "مكان_الصنف": return item["مكان_الصنف"];
          case "ملاحظات": return item["ملاحظات"];
          case "تاريخ_الاضافه": return item["تاريخ_الاضافه"] ? formatToArabicDate(item["تاريخ_الاضافه"]) : '-';
          case "الكمية_المحوّلة": return item["الكمية_المحوّلة"];
          case "تاريخ_التحويل": return formatToArabicDate(item["تاريخ_التحويل"]);
          case "المستخدم": return item["المستخدم"];
          case "المصدر": return item["المصدر"];
          case "الوجهة": return item["الوجهة"];
          default: return '';
        }
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([selectedCols.map((col) => {
      if (col === "الكمية_المحوّلة") return 'الكمية المحولة';
      if (col === "تاريخ_التحويل") return 'تاريخ التحويل';
      if (col === "المستخدم") return 'المستخدم';
      if (col === "المصدر") return 'المصدر';
      if (col === "الوجهة") return 'الوجهة';
      return columnsDisplay[columnsFull.indexOf(col)];
    }), ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, showLog ? 'سجل_التحويلات' : 'مخزون_المنوفية');
    XLSX.writeFile(wb, showLog ? 'سجل_التحويلات.xlsx' : 'مخزون_المنوفية.xlsx');
  };

  // Print data
  const printData = () => {
    if (!filteredItems.length && !showLog) {
      showNotification('لا توجد بيانات للطباعة.', 'error');
      return;
    }
    if (!filteredLogRows.length && showLog) {
      showNotification('لا توجد بيانات للطباعة.', 'error');
      return;
    }

    const columnsPrint = showLog
      ? ['الصنف', 'الكود', 'اللون', 'الكمية المحولة', 'تاريخ التحويل', 'المستخدم', 'المورد', 'المصدر', 'الوجهة', 'ملاحظات']
      : ['الصنف', 'الكود', 'اللون', 'الكراتين', 'في الكرتونة', 'الفردي', 'المتبقي', 'المورد', 'المكان', 'ملاحظات'];

    const text = (showLog ? filteredLogRows : filteredItems).map((item: any) =>
      columnsPrint.map((col) => {
        switch (col) {
          case 'الصنف': return item["الصنف"];
          case 'الكود': return item["الكود"];
          case 'اللون': return item["اللون"];
          case 'الكراتين': return item["عدد_الكراتين"];
          case 'في الكرتونة': return item["عدد_في_الكرتونة"];
          case 'الفردي': return item["عدد_القزاز_الفردي"];
          case 'المتبقي': return item["الكمية_المتبقية"];
          case 'المورد': return item["المورد"];
          case 'المكان': return item["مكان_الصنف"];
          case 'ملاحظات': return item["ملاحظات"];
          case 'الكمية المحولة': return item["الكمية_المحوّلة"];
          case 'تاريخ التحويل': return formatToArabicDate(item["تاريخ_التحويل"]);
          case 'المستخدم': return item["المستخدم"];
          case 'المصدر': return item["المصدر"];
          case 'الوجهة': return item["الوجهة"];
          default: return '';
        }
      }).join('\t')
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = showLog ? 'سجل_التحويلات.txt' : 'مخزون_المنوفية.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Selection handler
  const toggleSelection = (item: StockItem) => {
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const selectAllItems = () => {
    if (selectedItem) {
      setSelectedItem(null);
    } else {
      showNotification('يمكن تحديد صنف واحد فقط للتحويل', 'error');
    }
  };

  // Truncate notes for mobile view
  const truncateNotes = (notes: string | undefined, maxLength: number = 30) => {
    if (!notes) return '-';
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  const columnLabels: { [key: string]: string } = {
    select: 'تحديد',
    "الصنف": 'الصنف',
    "الكود": 'الكود',
    "اللون": 'اللون',
    "عدد_الكراتين": 'الكراتين',
    "عدد_في_الكرتونة": 'في الكرتونة',
    "عدد_القزاز_الفردي": 'الفردي',
    "الكمية_المتبقية": 'المتبقي',
    "المورد": 'المورد',
    "مكان_الصنف": 'المكان',
    "ملاحظات": 'ملاحظات',
    "تاريخ_الاضافه": 'تاريخ الإضافة',
    actions: 'الإجراءات',
  };

  const logColumnLabels: { [key: string]: string } = {
    "الصنف": 'الصنف',
    "الكود": 'الكود',
    "اللون": 'اللون',
    "الكمية_المحوّلة": 'الكمية المحولة',
    "تاريخ_التحويل": 'تاريخ التحويل',
    "المستخدم": 'المستخدم',
    "ملاحظات": 'ملاحظات',
    "المورد": 'المورد',
    "المصدر": 'المصدر',
    "الوجهة": 'الوجهة',
  };

  const columnOrder = [
    'select',
    "الصنف",
    "الكود",
    "اللون",
    "عدد_الكراتين",
    "عدد_في_الكرتونة",
    "عدد_القزاز_الفردي",
    "الكمية_المتبقية",
    "المورد",
    "مكان_الصنف",
    "ملاحظات",
    "تاريخ_الاضافه",
    'actions',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-gray-100/80 dark:from-gray-900/90 dark:to-gray-800/90 dir-rtl font-['Tajawal',sans-serif]">
      {/* Notification */}
      {notif.show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={cn(
            'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] p-4 rounded-lg shadow-lg flex items-center gap-2 max-w-md w-full mx-4',
            notif.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          )}
        >
          {notif.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span>{notif.msg}</span>
        </motion.div>
      )}

      <div className="p-4 sm:p-6">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-4">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1 text-sm bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <FiChevronLeft size={16} /> رجوع
                </button>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {showLog ? 'سجل تحويلات المنوفية' : 'مخزون المنوفية'}
                </h1>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                تاريخ اليوم: {currentDate} | توقيت القاهرة: {currentTime}
              </span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  setShowLog(!showLog);
                  if (!showLog) fetchLogData();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base transition-colors duration-200"
              >
                {showLog ? 'عرض المخزون' : 'عرض سجل التحويلات'}
              </button>
              {!showLog && (
                <button
                  onClick={() => setAddItemDialogOpen(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                  <FiPlus />
                  إضافة صنف
                </button>
              )}
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
              >
                <FiDownload />
                خيارات التصدير
                {showExportOptions ? <FiChevronUp className="w-4 h-4 mr-1" /> : <FiChevronDown className="w-4 h-4 mr-1" />}
              </button>
              <button
                onClick={printData}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
              >
                <FiPrinter />
                طباعة
              </button>
            </div>
          </div>

          {/* Filter Section */}
          {!showLog ? (
            <div className="mb-4">
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiFilter className="w-5 h-5 ml-2" />
                  {showFilters ? 'إخفاء الفلتر' : 'عرض الفلتر'}
                </button>
                <button
                  onClick={fetchFilteredData}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiSearch className="w-5 h-5 ml-2" />
                  تطبيق التصفية
                </button>
                <button
                  onClick={resetFilters}
                  className="flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-xl shadow-[0_4px_12px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.4)] hover:bg-orange-600 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiRefreshCw className="w-5 h-5 ml-2" />
                  إعادة تحميل الكل
                </button>
              </div>
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 transition-all duration-300">
                  {[
                    { label: 'الصنف', key: "الصنف" },
                    { label: 'الكود', key: "الكود" },
                    { label: 'اللون', key: "اللون" },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </label>
                      <Input
                        type="text"
                        value={filters[field.key as keyof typeof filters]}
                        onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && fetchFilteredData()}
                        placeholder={field.label}
                        className="p-2 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-lg border border-gray-200/50 dark:border-gray-600/50"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={logSearchText}
                  onChange={(e) => setLogSearchText(e.target.value)}
                  placeholder="ابحث في سجل التحويلات..."
                  className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-sm sm:text-base"
                />
                <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <DatePicker
                  selected={fromDate}
                  onChange={(date: Date) => setFromDate(date)}
                  placeholderText="من تاريخ"
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
                />
                <DatePicker
                  selected={toDate}
                  onChange={(date: Date) => setToDate(date)}
                  placeholderText="إلى تاريخ"
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
                />
              </div>
            </div>
          )}

          {/* Export Options */}
          {showExportOptions && (
            <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-4 mt-4 transition-all duration-300">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 text-right">
                حدد الأعمدة للتصدير
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { key: "الصنف", label: 'الصنف' },
                  { key: "الكود", label: 'الكود' },
                  { key: "اللون", label: 'اللون' },
                  { key: "عدد_الكراتين", label: 'الكراتين' },
                  { key: "عدد_في_الكرتونة", label: 'في الكرتونة' },
                  { key: "عدد_القزاز_الفردي", label: 'الفردي' },
                  { key: "الكمية_المتبقية", label: 'المتبقي' },
                  { key: "المورد", label: 'المورد' },
                  { key: "مكان_الصنف", label: 'المكان' },
                  { key: "ملاحظات", label: 'ملاحظات' },
                  { key: "تاريخ_الاضافه", label: 'تاريخ الإضافة' },
                ].map((col) => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={exportColumns[col.key as keyof typeof exportColumns]}
                      onCheckedChange={(checked) =>
                        setExportColumns({ ...exportColumns, [col.key]: checked })
                      }
                      className="border-gray-300 dark:border-gray-600"
                    />
                    <label className="text-sm text-gray-900 dark:text-white">
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={exportToExcel}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-xl shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_16px_rgba(22,163,74,0.4)] hover:bg-green-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiDownload className="w-5 h-5 ml-2" />
                  تصدير إلى Excel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
          {!showLog ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                  <table className="w-full border border-gray-300 dark:border-gray-600 border-collapse font-['Tajawal',sans-serif]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-blue-600 dark:bg-blue-800 shadow-sm">
                        {columnOrder.map((key) => (
                          <th
                            key={key}
                            className={cn(
                              'border border-gray-300 dark:border-gray-600 p-3 text-center text-white text-sm font-bold whitespace-nowrap',
                              key === "الصنف" ? 'w-64 min-w-[16rem]' : 'w-auto',
                              key === "ملاحظات" ? 'max-w-[200px]' : ''
                            )}
                          >
                            {key === 'select' ? (
                              <div className="flex items-center justify-center">
                                <button onClick={selectAllItems} className="text-white">
                                  {selectedItem ? (
                                    <FiCheckSquare className="w-5 h-5" />
                                  ) : (
                                    <FiSquare className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            ) : key === 'actions' ? (
                              'الإجراءات'
                            ) : (
                              columnLabels[key]
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={columnOrder.length} className="border border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
                            جارٍ تحميل البيانات...
                          </td>
                        </tr>
                      ) : filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-100/90 dark:hover:bg-gray-700/90 transition-colors duration-150"
                          >
                            {columnOrder.map((col) => (
                              <td
                                key={col}
                                className={cn(
                                  'border border-gray-300 dark:border-gray-600 p-3 text-center text-gray-900 dark:text-white',
                                  col === "الصنف" || col === "ملاحظات" ? 'text-right' : '',
                                  col === "ملاحظات" ? 'max-w-[200px] truncate' : ''
                                )}
                                title={col === "ملاحظات" ? item["ملاحظات"] : undefined}
                              >
                                {col === 'select' ? (
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItem?.id === item.id}
                                      onChange={() => toggleSelection(item)}
                                    />
                                  </div>
                                ) : col === 'actions' ? (
                                  <div className="flex justify-center gap-2">
                                    <button
                                      className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                                      title="تحويل"
                                      onClick={() => openTransferDialog(item)}
                                    >
                                      <FiArrowRight className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                                      title="تعديل"
                                      onClick={() => openEditDialog(item)}
                                    >
                                      <FiEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                                      title="حذف"
                                      onClick={() => handleDelete(item)}
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : col === "تاريخ_الاضافه" ? (
                                  item["تاريخ_الاضافه"] ? formatToArabicDate(item["تاريخ_الاضافه"]) : '-'
                                ) : (
                                  item[col as keyof StockItem] ?? '-'
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnOrder.length} className="border border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
                            لا توجد بيانات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3 p-3">
                {loading ? (
                  <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    جارٍ تحميل البيانات...
                  </div>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 bg-white/90 dark:bg-gray-700/90 hover:bg-gray-100/90 dark:hover:bg-gray-600/90 transition-colors duration-150 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedItem?.id === item.id}
                            onChange={() => toggleSelection(item)}
                            className="ml-2"
                          />
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{item["الصنف"]}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                            title="تحويل"
                            onClick={() => openTransferDialog(item)}
                          >
                            <FiArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                            title="تعديل"
                            onClick={() => openEditDialog(item)}
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                            title="حذف"
                            onClick={() => handleDelete(item)}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {columnOrder.map((col) => (
                          col !== "الصنف" && col !== 'select' && col !== 'actions' && (
                            <div key={col} className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white">{columnLabels[col]}:</span>
                              <span>
                                {col === "تاريخ_الاضافه" ? (
                                  item["تاريخ_الاضافه"] ? formatToArabicDate(item["تاريخ_الاضافه"]) : '-'
                                ) : col === "ملاحظات" ? (
                                  truncateNotes(item["ملاحظات"])
                                ) : (
                                  item[col as keyof StockItem] ?? '-'
                                )}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                    لا توجد بيانات
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden lg:block">
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                <table className="w-full border border-gray-300 dark:border-gray-600 border-collapse font-['Tajawal',sans-serif]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-blue-600 dark:bg-blue-800 shadow-sm">
                      {Object.keys(logColumnLabels).map((key) => (
                        <th
                          key={key}
                          className={cn(
                            'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-white text-sm font-bold',
                            key === "الصنف" || key === "ملاحظات" || key === "الكود" ? 'min-w-[200px]' : 'min-w-[100px]'
                          )}
                        >
                          {logColumnLabels[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogRows.length > 0 ? (
                      filteredLogRows.map((row, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-100/90 dark:hover:bg-gray-700/90 transition-colors duration-150"
                        >
                          {Object.keys(logColumnLabels).map((col) => (
                            <td
                              key={col}
                              className={cn(
                                'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white',
                                col === "الصنف" || col === "ملاحظات" ? 'text-right' : ''
                              )}
                            >
                              {col === "تاريخ_التحويل" ? formatToArabicDate(row[col]) : row[col as keyof TransferLog] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={Object.keys(logColumnLabels).length}
                          className="border border-gray-300 dark:border-gray-600 p-4 text-center text-gray-500 dark:text-gray-400"
                        >
                          لا توجد بيانات
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mobile Log Cards */}
          {showLog && (
            <div className="lg:hidden space-y-4 p-4">
              {filteredLogRows.length > 0 ? (
                filteredLogRows.map((row, index) => (
                  <div
                    key={index}
                    className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 bg-white/90 dark:bg-gray-700/90 hover:bg-gray-100/90 dark:hover:bg-gray-600/90 transition-colors duration-150 shadow-sm"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      {Object.keys(logColumnLabels).map((col) => (
                        <div key={col} className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{logColumnLabels[col]}:</span>
                          <span>
                            {col === "تاريخ_التحويل" ? formatToArabicDate(row[col]) : row[col as keyof TransferLog] ?? '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                  لا توجد بيانات
                </div>
              )}
            </div>
          )}

          <div className="p-4 text-right text-sm font-semibold text-gray-900 dark:text-white border-t border-gray-200/50 dark:border-gray-700/50">
            عدد النتائج: {showLog ? filteredLogRows.length : resultCount} سجل
          </div>
        </div>

        {/* Add Item Dialog */}
        {addItemDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md my-8 mx-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة صنف جديد</h2>
                <button
                  onClick={() => {
                    setAddItemDialogOpen(false);
                    clearFields();
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'اسم الصنف', key: "الصنف", ref: inputRefs["الصنف"], required: true },
                    { label: 'الكود', key: "الكود", ref: inputRefs["الكود"], required: true },
                    { label: 'اللون', key: "اللون", ref: inputRefs["اللون"], required: true },
                    { label: 'عدد الكراتين', key: "عدد_الكراتين", ref: inputRefs["عدد_الكراتين"], type: 'number' },
                    { label: 'عدد في الكرتونة', key: "عدد_في_الكرتونة", ref: inputRefs["عدد_في_الكرتونة"], type: 'number', required: true },
                    { label: 'عدد القزاز الفردي', key: "عدد_القزاز_الفردي", ref: inputRefs["عدد_القزاز_الفردي"], type: 'number' },
                    { label: 'المورد', key: "المورد", ref: inputRefs["المورد"] },
                    { label: 'ملاحظات', key: "ملاحظات", ref: inputRefs["ملاحظات"] },
                    { label: 'الكمية الإجمالية', key: "الكمية_المتبقية", disabled: true },
                  ].map(field => (
                    <div key={field.key} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 mr-1">*</span>}
                      </label>
                      <input
                        ref={field.ref}
                        type={field.type || 'text'}
                        value={formData[field.key as keyof FormData]}
                        onChange={(e) => handleInputChange(field.key as keyof FormData, e.target.value, setFormData)}
                        onKeyDown={(e) => handleKeyDown(e, () => saveProduct(true))}
                        disabled={field.disabled}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-2xl">
                <button
                  onClick={() => saveProduct(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm transition-colors duration-200 order-2 sm:order-1"
                >
                  <Save className="w-4 h-4" />
                  حفظ وإضافة أخرى
                </button>
                <button
                  onClick={() => saveProduct(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm transition-colors duration-200 order-1 sm:order-2 mb-2 sm:mb-0"
                >
                  <Save className="w-4 h-4" />
                  حفظ وإغلاق
                </button>
                <button
                  onClick={() => {
                    setAddItemDialogOpen(false);
                    clearFields();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm transition-colors duration-200 order-3"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Dialog */}
        {editDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">تعديل الصنف</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: 'اسم الصنف', key: "الصنف", ref: inputRefs["الصنف"] },
                  { label: 'الكود', key: "الكود", ref: inputRefs["الكود"] },
                  { label: 'اللون', key: "اللون", ref: inputRefs["اللون"] },
                  { label: 'عدد الكراتين', key: "عدد_الكراتين", ref: inputRefs["عدد_الكراتين"], type: 'number' },
                  { label: 'عدد في الكرتونة', key: "عدد_في_الكرتونة", ref: inputRefs["عدد_في_الكرتونة"], type: 'number' },
                  { label: 'عدد القزاز الفردي', key: "عدد_القزاز_الفردي", ref: inputRefs["عدد_القزاز_الفردي"], type: 'number' },
                  { label: 'المورد', key: "المورد", ref: inputRefs["المورد"] },
                  { label: 'ملاحظات', key: "ملاحظات", ref: inputRefs["ملاحظات"] },
                  { label: 'الكمية الإجمالية', key: "الكمية_المتبقية", disabled: true },
                ].map(field => (
                  <div key={field.key} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</label>
                    <input
                      ref={field.ref}
                      type={field.type || 'text'}
                      value={editValues[field.key as keyof FormData]}
                      onChange={(e) => handleInputChange(field.key as keyof FormData, e.target.value, setEditValues)}
                      onKeyDown={(e) => handleKeyDown(e, saveEditedProduct)}
                      disabled={field.disabled}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6">
                <button
                  onClick={saveEditedProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                  <Save className="w-4 h-4" />
                  حفظ التعديل
                </button>
                <button
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base transition-colors duration-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Dialog */}
        {transferDialogOpen && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">تحويل الصنف إلى المخزون</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">اسم الصنف</label>
                  <input
                    type="text"
                    value={selectedItem["الصنف"]}
                    disabled
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الكمية المتاحة</label>
                  <input
                    type="number"
                    value={selectedItem["الكمية_المتبقية"]}
                    disabled
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الكمية المحولة</label>
                  <input
                    ref={inputRefs["الكمية_المحوّلة"]}
                    type="number"
                    value={transferValues["الكمية_المحوّلة"]}
                    onChange={(e) => handleTransferChange("الكمية_المحوّلة", parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">مكان الصنف</label>
                  <input
                    ref={inputRefs["مكان_الصنف"]}
                    type="text"
                    value={transferValues["مكان_الصنف"]}
                    onChange={(e) => handleTransferChange("مكان_الصنف", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">المورد</label>
                  <input
                    ref={inputRefs["المورد"]}
                    type="text"
                    value={transferValues["المورد"]}
                    onChange={(e) => handleTransferChange("المورد", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ملاحظات</label>
                  <input
                    ref={inputRefs["ملاحظات"]}
                    type="text"
                    value={transferValues["ملاحظات"]}
                    onChange={(e) => handleTransferChange("ملاحظات", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6">
                <button
                  onClick={handleTransferSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                  <FiArrowRight className="w-4 h-4" />
                  تحويل
                </button>
                <button
                  onClick={() => {
                    setTransferDialogOpen(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base transition-colors duration-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
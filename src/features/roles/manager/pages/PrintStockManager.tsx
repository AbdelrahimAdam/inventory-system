import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiSearch, FiDownload, FiArrowRight, FiCheckSquare, FiSquare, FiPlus, FiTrash2, FiEdit, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Save, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// Simple className helper
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

// API configuration
const API_BASE = 'http://localhost:3001/api/v1/manager/print';

// Interfaces
interface ArabicItem {
  id: number;
  الصنف: string;
  الكود: string;
  اللون: string;
  عدد_الكراتين: number;
  عدد_في_الكرتونة: number;
  عدد_القزاز_الفردي: number;
  الكمية_المتبقية: number;
  المورد: string | null;
  ملاحظات: string | null;
  تاريخ_الاضافه: string;
  created_by: number | null;
}

interface TransferLog {
  الصنف: string;
  الكود: string;
  اللون: string;
  الكمية_المحوّلة: number;
  تاريخ_التحويل: string;
  المستخدم: string;
  ملاحظات: string | null;
  المورد: string | null;
  المصدر: string;
  الوجهة: string;
}

interface FormData {
  name: string;
  code: string;
  color: string;
  cartons: string;
  perCarton: string;
  individual: string;
  supplier: string;
  notes: string;
  total: string;
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

// Component
const PrintStockManager = () => {
  const [rows, setRows] = useState<ArabicItem[]>([]);
  const [filteredRows, setFilteredRows] = useState<ArabicItem[]>([]);
  const [logRows, setLogRows] = useState<TransferLog[]>([]);
  const [filteredLogRows, setFilteredLogRows] = useState<TransferLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [logSearchText, setLogSearchText] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [transferValues, setTransferValues] = useState({
    الكمية_المحوّلة: 0,
    مكان_الصنف: '',
    المورد: '',
    ملاحظات: '',
  });
  const [editValues, setEditValues] = useState<FormData>({
    name: '',
    code: '',
    color: '',
    cartons: '',
    perCarton: '',
    individual: '',
    supplier: '',
    notes: '',
    total: '0',
  });
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    color: '',
    cartons: '',
    perCarton: '',
    individual: '',
    supplier: '',
    notes: '',
    total: '0',
  });
  const [selectedItem, setSelectedItem] = useState<ArabicItem | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [currentUser] = useState('غير معروف');
  const [currentDate, setCurrentDate] = useState('');

  const inputRefs = {
    name: useRef<HTMLInputElement>(null),
    code: useRef<HTMLInputElement>(null),
    color: useRef<HTMLInputElement>(null),
    cartons: useRef<HTMLInputElement>(null),
    perCarton: useRef<HTMLInputElement>(null),
    individual: useRef<HTMLInputElement>(null),
    supplier: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLInputElement>(null),
    transferQuantity: useRef<HTMLInputElement>(null),
    transferLocation: useRef<HTMLInputElement>(null),
    transferSupplier: useRef<HTMLInputElement>(null),
    transferNotes: useRef<HTMLInputElement>(null),
  };

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

  // Fetch print stock data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}`);
      setRows(data.data || []);
      setFilteredRows(data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('فشل في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Fetch transfer logs
  const fetchLogData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/transfer-log`);
      setLogRows(data.data || []);
      setFilteredLogRows(data.data || []);
    } catch (error) {
      console.error('Error fetching transfer logs:', error);
      showNotification('فشل في تحميل سجل التحويلات', 'error');
    }
  }, [showNotification]);

  // Initial data fetch and date update
  useEffect(() => {
    fetchData();
    const updateDate = () => {
      const now = new Date();
      setCurrentDate(formatToArabicDate(now.toISOString()));
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter rows based on search and filter criteria
  useEffect(() => {
    let filtered = [...rows];
    if (searchText) {
      const search = searchText.trim().toLowerCase();
      filtered = filtered.filter(row =>
        filterBy === 'all'
          ? Object.values(row).some(val => String(val).toLowerCase().includes(search))
          : String(row[filterBy as keyof ArabicItem]).toLowerCase().includes(search)
      );
    }
    setFilteredRows(filtered);
  }, [searchText, filterBy, rows]);

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
      filtered = filtered.filter(row => new Date(row.تاريخ_التحويل) >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(row => new Date(row.تاريخ_التحويل) <= toDate);
    }
    setFilteredLogRows(filtered);
  }, [logSearchText, fromDate, toDate, logRows]);

  // Delete item
  const handleDelete = async (row: ArabicItem) => {
    try {
      await axios.delete(`${API_BASE}/${encodeURIComponent(row.الكود)}/${encodeURIComponent(row.اللون)}/${encodeURIComponent(row.الصنف)}`);
      showNotification('تم حذف الصنف بنجاح');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      showNotification('فشل في حذف الصنف', 'error');
    }
  };

  // Update total quantity in add/edit form
  const updateTotalQuantity = useCallback((form: FormData) => {
    const cartons = parseInt(normalizeArabicNumber(form.cartons)) || 0;
    const perCarton = parseInt(normalizeArabicNumber(form.perCarton)) || 0;
    const individual = parseInt(normalizeArabicNumber(form.individual)) || 0;
    const total = cartons * perCarton + individual;
    return { ...form, total: total.toString() };
  }, []);

  // Handle input change for add/edit form
  const handleInputChange = (
    field: keyof FormData,
    value: string,
    setForm: React.Dispatch<React.SetStateAction<FormData>>
  ) => {
    setForm(prev => {
      const updatedForm = { ...prev, [field]: value };
      if (['cartons', 'perCarton', 'individual'].includes(field)) {
        return updateTotalQuantity(updatedForm);
      }
      return updatedForm;
    });
  };

  // Clear form fields
  const clearFields = () => {
    setFormData({
      name: '',
      code: '',
      color: '',
      cartons: '',
      perCarton: '',
      individual: '',
      supplier: '',
      notes: '',
      total: '0',
    });
  };

  // Save new product
  const saveProduct = async (clearAfterSave: boolean) => {
    if (!formData.name || !formData.code || !formData.color || !formData.perCarton) {
      showNotification('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    try {
      const payload = {
        الصنف: formData.name.trim(),
        الكود: formData.code.trim(),
        اللون: formData.color.trim(),
        عدد_الكراتين: parseInt(normalizeArabicNumber(formData.cartons)) || 0,
        عدد_في_الكرتونة: parseInt(normalizeArabicNumber(formData.perCarton)) || 0,
        عدد_القزاز_الفردي: parseInt(normalizeArabicNumber(formData.individual)) || 0,
        المورد: formData.supplier.trim() || null,
        ملاحظات: formData.notes.trim() || null,
        created_by: parseInt(currentUser) || null,
      };
      await axios.post(`${API_BASE}`, payload);
      showNotification('تم إضافة الصنف بنجاح');
      if (clearAfterSave) {
        clearFields();
      } else {
        setAddItemDialogOpen(false);
        clearFields();
      }
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('فشل في إضافة الصنف', 'error');
    }
  };

  // Open edit dialog
  const openEditDialog = (item: ArabicItem) => {
    setSelectedItem(item);
    setEditValues({
      name: item.الصنف,
      code: item.الكود,
      color: item.اللون,
      cartons: item.عدد_الكراتين.toString(),
      perCarton: item.عدد_في_الكرتونة.toString(),
      individual: item.عدد_القزاز_الفردي.toString(),
      supplier: item.المورد || '',
      notes: item.ملاحظات || '',
      total: item.الكمية_المتبقية.toString(),
    });
    setEditDialogOpen(true);
  };

  // Save edited product
  const saveEditedProduct = async () => {
    if (!editValues.name || !editValues.code || !editValues.color || !editValues.perCarton) {
      showNotification('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    if (!selectedItem) {
      showNotification('لم يتم تحديد صنف للتعديل', 'error');
      return;
    }
    try {
      const payload = {
        الصنف: editValues.name.trim(),
        الكود: editValues.code.trim(),
        اللون: editValues.color.trim(),
        عدد_الكراتين: parseInt(normalizeArabicNumber(editValues.cartons)) || 0,
        عدد_في_الكرتونة: parseInt(normalizeArabicNumber(editValues.perCarton)) || 0,
        عدد_القزاز_الفردي: parseInt(normalizeArabicNumber(editValues.individual)) || 0,
        المورد: editValues.supplier.trim() || null,
        ملاحظات: editValues.notes.trim() || null,
      };
      await axios.put(
        `${API_BASE}/${encodeURIComponent(selectedItem.الكود)}/${encodeURIComponent(selectedItem.اللون)}/${encodeURIComponent(selectedItem.الصنف)}`,
        payload
      );
      showNotification('تم تعديل الصنف بنجاح');
      setEditDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error('Error editing product:', error);
      showNotification('فشل في تعديل الصنف', 'error');
    }
  };

  // Transfer handlers
  const openTransferDialog = (item: ArabicItem) => {
    if (!item.id) {
      showNotification('معرف الصنف غير موجود', 'error');
      return;
    }
    setSelectedItem(item);
    setTransferValues({
      الكمية_المحوّلة: 0,
      مكان_الصنف: '',
      المورد: item.المورد?.trim() || '',
      ملاحظات: item.ملاحظات?.trim() || '',
    });
    setTransferDialogOpen(true);
  };

  const handleTransferChange = (field: string, value: string | number) => {
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
    if (transferValues.الكمية_المحوّلة <= 0) {
      showNotification('الكمية يجب أن تكون أكبر من الصفر', 'error');
      return;
    }
    if (transferValues.الكمية_المحوّلة > selectedItem.الكمية_المتبقية) {
      showNotification(
        `الكمية المطلوبة (${transferValues.الكمية_المحوّلة}) أكبر من الكمية المتاحة (${selectedItem.الكمية_المتبقية})`,
        'error'
      );
      return;
    }
    try {
      const payload = {
        id: selectedItem.id,
        code: selectedItem.الكود.trim(),
        color: selectedItem.اللون.trim(),
        name: selectedItem.الصنف.trim(),
        quantity: transferValues.الكمية_المحوّلة,
        مكان_الصنف: transferValues.مكان_الصنف || null,
        المورد: transferValues.المورد || null,
        ملاحظات: transferValues.ملاحظات || null,
        المستخدم: currentUser.trim(),
        created_by: selectedItem.created_by || parseInt(currentUser) || null,
      };
      await axios.post(`${API_BASE}/transfer-to-inventory`, payload);
      showNotification('تم التحويل إلى المخزون بنجاح');
      setTransferDialogOpen(false);
      setSelectedItem(null);
      fetchData();
      if (showLog) fetchLogData();
    } catch (error) {
      console.error('Error transferring item:', error);
      const errorMsg = (error as any).response?.data?.error || 'حدث خطأ أثناء التحويل';
      showNotification(errorMsg, 'error');
    }
  };

  // Handle key down for form submission
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callback();
    }
  };

  // Export to Excel
  const handleExport = () => {
    const dataToExport = showLog ? filteredLogRows : filteredRows;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, showLog ? 'سجل_التحويلات' : 'مخزون_المطبعة');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, showLog ? 'سجل_التحويلات.xlsx' : 'مخزون_المطبعة.xlsx');
  };

  // Selection handler
  const toggleSelection = (item: ArabicItem) => {
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

  const columnLabels: { [key: string]: string } = {
    select: 'تحديد',
    الصنف: 'اسم الصنف',
    الكود: 'الكود',
    اللون: 'اللون',
    عدد_الكراتين: 'عدد الكراتين',
    عدد_في_الكرتونة: 'عدد في الكرتونة',
    عدد_القزاز_الفردي: 'عدد القزاز الفردي',
    الكمية_المتبقية: 'الكمية المتبقية',
    المورد: 'المورد',
    ملاحظات: 'ملاحظات',
    تاريخ_الاضافه: 'تاريخ الإضافة',
    actions: 'الإجراءات',
  };

  const logColumnLabels: { [key: string]: string } = {
    الصنف: 'اسم الصنف',
    الكود: 'الكود',
    اللون: 'اللون',
    الكمية_المحوّلة: 'الكمية المحولة',
    تاريخ_التحويل: 'تاريخ التحويل',
    المستخدم: 'المستخدم',
    ملاحظات: 'ملاحظات',
    المورد: 'المورد',
    المصدر: 'المصدر',
    الوجهة: 'الوجهة',
  };

  const columnOrder = [
    'select',
    'الصنف',
    'الكود',
    'اللون',
    'عدد_الكراتين',
    'عدد_في_الكرتونة',
    'عدد_القزاز_الفردي',
    'الكمية_المتبقية',
    'المورد',
    'ملاحظات',
    'تاريخ_الاضافه',
    'actions',
  ];

  const filterOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'الصنف', label: 'اسم الصنف' },
    { value: 'الكود', label: 'الكود' },
    { value: 'اللون', label: 'اللون' },
    { value: 'المورد', label: 'المورد' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-gray-100/80 dark:from-gray-900/90 dark:to-gray-800/90 font-['Tajawal',sans-serif] dir-rtl overflow-x-hidden">
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

      {/* Header Section */}
      <div className="p-4 sm:p-6 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-col items-center sm:items-start">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {showLog ? 'سجل تحويلات المخزون' : 'إدارة مخزون المطبعة'}
            </h1>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              تاريخ اليوم: {currentDate}
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
              onClick={handleExport}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
            >
              <FiDownload />
              تصدير إلى Excel
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        {!showLog ? (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ابحث في المخزون..."
                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              />
              <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="w-32 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                value={logSearchText}
                onChange={(e) => setLogSearchText(e.target.value)}
                placeholder="ابحث في سجل التحويلات..."
                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
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

        {/* Stock Table and Mobile Cards */}
        {!showLog ? (
          <>
            <div className="hidden lg:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-gray-600 border-collapse font-['Tajawal',sans-serif]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-blue-600 dark:bg-blue-800 shadow-sm">
                      {columnOrder.map((key) => (
                        <th
                          key={key}
                          className={cn(
                            'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-white text-sm font-bold',
                            key === 'الصنف' || key === 'ملاحظات' || key === 'الكود' ? 'min-w-[200px]' : 'min-w-[100px]'
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
                    {Array.isArray(filteredRows) && filteredRows.length > 0 ? (
                      filteredRows.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-100/90 dark:hover:bg-gray-700/90 transition-colors duration-150"
                        >
                          {columnOrder.map((col) => (
                            <td
                              key={col}
                              className={cn(
                                'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white',
                                col === 'الصنف' || col === 'ملاحظات' ? 'text-right' : ''
                              )}
                            >
                              {col === 'select' ? (
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedItem?.id === row.id}
                                    onChange={() => toggleSelection(row)}
                                  />
                                </div>
                              ) : col === 'actions' ? (
                                <div className="flex justify-center gap-2">
                                  <button
                                    className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                                    title="تحويل"
                                    onClick={() => openTransferDialog(row)}
                                  >
                                    <FiArrowRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                                    title="تعديل"
                                    onClick={() => openEditDialog(row)}
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                                    title="حذف"
                                    onClick={() => handleDelete(row)}
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : col === 'تاريخ_الاضافه' ? (
                                formatToArabicDate(row[col])
                              ) : (
                                row[col as keyof ArabicItem]
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={columnOrder.length}
                          className="border border-gray-300 dark:border-gray-600 p-4 text-center text-gray-500 dark:text-gray-400"
                        >
                          {loading ? 'جار التحميل...' : 'لا توجد بيانات'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:hidden space-y-4 p-2">
              {Array.isArray(filteredRows) && filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 bg-white/90 dark:bg-gray-700/90 hover:bg-gray-100/90 dark:hover:bg-gray-600/90 transition-colors duration-150 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItem?.id === row.id}
                          onChange={() => toggleSelection(row)}
                          className="ml-2"
                        />
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{row.الصنف}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                          title="تحويل"
                          onClick={() => openTransferDialog(row)}
                        >
                          <FiArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                          title="تعديل"
                          onClick={() => openEditDialog(row)}
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                          title="حذف"
                          onClick={() => handleDelete(row)}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      {Object.keys(columnLabels).map((col) => (
                        col !== 'الصنف' && col !== 'select' && col !== 'actions' && (
                          <div key={col} className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">{columnLabels[col]}:</span>
                            <span>
                              {col === 'تاريخ_الاضافه' ? formatToArabicDate(row[col]) : row[col as keyof ArabicItem]}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                  {loading ? 'جار التحميل...' : 'لا توجد بيانات'}
                </div>
              )}
            </div>

            <div className="p-4 text-right text-sm font-semibold text-gray-900 dark:text-white border-t border-gray-200/50 dark:border-gray-700/50">
              عدد النتائج: {filteredRows.length} سجل
            </div>
          </>
        ) : (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-gray-600 border-collapse font-['Tajawal',sans-serif]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-blue-600 dark:bg-blue-800 shadow-sm">
                      {Object.keys(logColumnLabels).map((key) => (
                        <th
                          key={key}
                          className={cn(
                            'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-white text-sm font-bold',
                            key === 'الصنف' || key === 'ملاحظات' || key === 'الكود' ? 'min-w-[200px]' : 'min-w-[100px]'
                          )}
                        >
                          {logColumnLabels[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filteredLogRows) && filteredLogRows.length > 0 ? (
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
                                col === 'الصنف' || col === 'ملاحظات' ? 'text-right' : ''
                              )}
                            >
                              {col === 'تاريخ_التحويل' ? formatToArabicDate(row[col]) : row[col as keyof TransferLog]}
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

            <div className="lg:hidden space-y-4 p-4">
              {Array.isArray(filteredLogRows) && filteredLogRows.length > 0 ? (
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
                            {col === 'تاريخ_التحويل' ? formatToArabicDate(row[col]) : row[col as keyof TransferLog]}
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

            <div className="p-4 text-right text-sm font-semibold text-gray-900 dark:text-white border-t border-gray-200/50 dark:border-gray-700/50">
              عدد النتائج: {filteredLogRows.length} سجل
            </div>
          </div>
        )}

        {/* Add Item Dialog */}
        {addItemDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md my-8 mx-auto">
              {/* Header */}
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
              
              {/* Form Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'اسم الصنف', key: 'name', ref: inputRefs.name, required: true },
                    { label: 'الكود', key: 'code', ref: inputRefs.code, required: true },
                    { label: 'اللون', key: 'color', ref: inputRefs.color, required: true },
                    { label: 'عدد الكراتين', key: 'cartons', ref: inputRefs.cartons, type: 'number' },
                    { label: 'عدد في الكرتونة', key: 'perCarton', ref: inputRefs.perCarton, type: 'number', required: true },
                    { label: 'عدد القزاز الفردي', key: 'individual', ref: inputRefs.individual, type: 'number' },
                    { label: 'المورد', key: 'supplier', ref: inputRefs.supplier },
                    { label: 'ملاحظات', key: 'notes', ref: inputRefs.notes },
                    { label: 'الكمية الإجمالية', key: 'total', disabled: true },
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
              
              {/* Footer with Buttons */}
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
                  { label: 'اسم الصنف', key: 'name', ref: inputRefs.name },
                  { label: 'الكود', key: 'code', ref: inputRefs.code },
                  { label: 'اللون', key: 'color', ref: inputRefs.color },
                  { label: 'عدد الكراتين', key: 'cartons', ref: inputRefs.cartons, type: 'number' },
                  { label: 'عدد في الكرتونة', key: 'perCarton', ref: inputRefs.perCarton, type: 'number' },
                  { label: 'عدد القزاز الفردي', key: 'individual', ref: inputRefs.individual, type: 'number' },
                  { label: 'المورد', key: 'supplier', ref: inputRefs.supplier },
                  { label: 'ملاحظات', key: 'notes', ref: inputRefs.notes },
                  { label: 'الكمية الإجمالية', key: 'total', disabled: true },
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
                    value={selectedItem.الصنف}
                    disabled
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الكمية المتاحة</label>
                  <input
                    type="number"
                    value={selectedItem.الكمية_المتبقية}
                    disabled
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الكمية المحولة</label>
                  <input
                    ref={inputRefs.transferQuantity}
                    type="number"
                    value={transferValues.الكمية_المحوّلة}
                    onChange={(e) => handleTransferChange('الكمية_المحوّلة', parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">مكان الصنف</label>
                  <input
                    ref={inputRefs.transferLocation}
                    type="text"
                    value={transferValues.مكان_الصنف}
                    onChange={(e) => handleTransferChange('مكان_الصنف', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">المورد</label>
                  <input
                    ref={inputRefs.transferSupplier}
                    type="text"
                    value={transferValues.المورد}
                    onChange={(e) => handleTransferChange('المورد', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ملاحظات</label>
                  <input
                    ref={inputRefs.transferNotes}
                    type="text"
                    value={transferValues.ملاحظات}
                    onChange={(e) => handleTransferChange('ملاحظات', e.target.value)}
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
};

export default PrintStockManager;
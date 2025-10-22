import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Plus, Upload, Download, Moon, Sun, Search, RefreshCw, Printer, X, Save, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from "@/lib/api";

// Memoized Input component to prevent unnecessary re-renders
const Input = memo(({ placeholder, value, onChange, type = 'text', className = '', name, onKeyDown, inputRef, ...props }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      ref={inputRef}
      onKeyDown={onKeyDown}
      className={`p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';

// Memoized Button component
const Button = memo(({ children, onClick, variant = 'default', className = '', disabled = false, type = 'button' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
    green: 'bg-green-600 text-white hover:bg-green-700',
    gray: 'bg-gray-600 text-white hover:bg-gray-700',
    red: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

// Memoized Checkbox component
const Checkbox = memo(({ checked, onCheckedChange, className = '', label }) => {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <span className="text-sm text-gray-900 dark:text-white whitespace-nowrap">{label}</span>
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

// Separate FilterSection component with local state
const FilterSection = memo(({ 
  filters, 
  exportColumns, 
  setExportColumns, 
  onApply, 
  onReset, 
  currentTime, 
  toggleDarkMode, 
  darkMode, 
  isLoading, 
  onExportToExcel, 
  onPrint, 
  onAdd,
  inventoryType,
  onInventoryTypeChange 
}) => {
  const initialFilters = {
    item_name: '',
    item_code: '',
    color: '',
    supplier: '',
    from_date: '',
    to_date: '',
  };
  const [localFilters, setLocalFilters] = useState(filters);
  const inputRefs = useRef({});

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleLocalReset = () => {
    setLocalFilters(initialFilters);
    onReset();
  };

  const handleFilterKeyDown = useCallback((e, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fieldNames = ['item_name', 'item_code', 'color', 'supplier', 'from_date', 'to_date'];
      const currentIndex = fieldNames.indexOf(fieldName);
      if (currentIndex < fieldNames.length - 1) {
        const nextField = fieldNames[currentIndex + 1];
        if (inputRefs.current[nextField]) {
          inputRefs.current[nextField].focus();
        }
      } else {
        handleApply();
      }
    }
  }, [handleApply]);

  const filterFields = [
    { label: 'الصنف', key: 'item_name' },
    { label: 'الكود', key: 'item_code' },
    { label: 'اللون', key: 'color' },
    { label: 'المورد', key: 'supplier' },
    { label: 'من تاريخ', key: 'from_date', type: 'date' },
    { label: 'إلى تاريخ', key: 'to_date', type: 'date' },
  ];

  const exportCheckboxes = [
    { key: 'item_name', label: 'الصنف' },
    { key: 'item_code', label: 'الكود' },
    { key: 'color', label: 'اللون' },
    { key: 'carton_quantity', label: 'الكراتين' },
    { key: 'items_per_carton', label: 'في الكرتونة' },
    { key: 'individual_items', label: 'الفردي' },
    { key: 'supplier', label: 'المورد' },
    { key: 'location', label: 'المكان' },
    { key: 'notes', label: 'ملاحظات' },
    { key: 'added_date', label: 'التاريخ' },
    { key: 'total_quantity', label: 'المضافة' },
    { key: 'remaining_quantity', label: 'المتبقية' },
  ];

  const inventoryTypes = [
    { value: 'MAIN_INVENTORY', label: 'المخزن الرئيسي' },
    { value: 'MONOFIA', label: 'المنوفية' },
    { value: 'MATBAA', label: 'المطبعة' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          عرض المخزون والتصفية
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm sm:text-base text-blue-600 dark:text-blue-400">
            توقيت القاهرة: {currentTime}
          </span>
          <Button variant="ghost" onClick={toggleDarkMode} className="p-2">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Inventory Type Selector */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          نوع المخزون:
        </label>
        <div className="flex flex-wrap gap-2">
          {inventoryTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onInventoryTypeChange(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inventoryType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {filterFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                {field.label}
              </label>
              <Input
                type={field.type || 'text'}
                value={localFilters[field.key]}
                onChange={handleFilterChange}
                name={field.key}
                onKeyDown={(e) => handleFilterKeyDown(e, field.key)}
                inputRef={(el) => (inputRefs.current[field.key] = el)}
                placeholder={field.label}
                className="w-full p-2"
              />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            حدد الأعمدة للتصدير
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {exportCheckboxes.map(({ key, label }) => (
              <Checkbox
                key={key}
                checked={exportColumns[key]}
                onCheckedChange={(checked) =>
                  setExportColumns({ ...exportColumns, [key]: checked })
                }
                label={label}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6 flex-wrap">
          <Button onClick={handleApply} className="flex items-center" disabled={isLoading}>
            <Search className="w-4 h-4 ml-2" />
            {isLoading ? 'جاري التحميل...' : 'تطبيق التصفية'}
          </Button>
          <Button onClick={handleLocalReset} variant="outline" className="flex items-center">
            <RefreshCw className="w-4 h-4 ml-2" />
            إعادة تحميل الكل
          </Button>
          <Button onClick={onExportToExcel} variant="green" className="flex items-center">
            <Download className="w-4 h-4 ml-2" />
            تصدير إلى Excel
          </Button>
          <Button onClick={onPrint} variant="gray" className="flex items-center">
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
          <Button onClick={onAdd} className="flex items-center">
            <Plus className="w-4 h-4 ml-2" />
            إضافة صنف
          </Button>
        </div>
      </div>
    </div>
  );
});

FilterSection.displayName = 'FilterSection';

// Separate AddItemModal component with local state
const AddItemModal = memo(({ isOpen, onClose, initialItem, onSave, inventoryType }) => {
  if (!isOpen) return null;

  const defaultNewItem = {
    item_name: '',
    item_code: '',
    color: '',
    carton_quantity: '',
    items_per_carton: '',
    individual_items: '',
    supplier: '',
    location: inventoryType === 'MATBAA' ? 'MATBAA' : inventoryType === 'MONOFIA' ? 'MONOFIA' : 'MAIN_INVENTORY',
    notes: '',
    total_quantity: '0',
    remaining_quantity: '0'
  };

  const [localNewItem, setLocalNewItem] = useState(initialItem || defaultNewItem);
  const inputRefs = useRef({});

  useEffect(() => {
    setLocalNewItem(initialItem || defaultNewItem);
  }, [initialItem, inventoryType]);

  const normalizeArabicNumber = (numStr) => {
    if (!numStr) return '';
    const arabicToEnglish = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return numStr.replace(/[٠-٩]/g, char => arabicToEnglish[char] || char);
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setLocalNewItem(prev => {
      const newItem = { ...prev, [name]: value };
      if (['carton_quantity', 'items_per_carton', 'individual_items'].includes(name)) {
        const cartons = parseInt(normalizeArabicNumber(newItem.carton_quantity)) || 0;
        const perCarton = parseInt(normalizeArabicNumber(newItem.items_per_carton)) || 0;
        const individual = parseInt(normalizeArabicNumber(newItem.individual_items)) || 0;
        const total = cartons * perCarton + individual;
        newItem.total_quantity = total.toString();
        newItem.remaining_quantity = total.toString();
      }
      return newItem;
    });
  }, []);

  const handleKeyDown = useCallback((e, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fieldNames = ['item_name', 'item_code', 'color', 'carton_quantity', 'items_per_carton', 'individual_items', 'supplier', 'location', 'notes'];
      const currentIndex = fieldNames.indexOf(fieldName);
      if (currentIndex < fieldNames.length - 1) {
        const nextField = fieldNames[currentIndex + 1];
        if (inputRefs.current[nextField]) {
          inputRefs.current[nextField].focus();
        }
      } else {
        onSave(localNewItem, false);
      }
    }
  }, [localNewItem, onSave]);

  const getEndpoint = () => {
    switch (inventoryType) {
      case 'MONOFIA': return '/monofia-inventory';
      case 'MATBAA': return '/matbaa-inventory';
      default: return '/main-inventory';
    }
  };

  const formFields = [
    { label: 'الصنف', name: 'item_name', required: true },
    { label: 'الكود', name: 'item_code', required: true },
    { label: 'اللون', name: 'color', required: true },
    { label: 'عدد الكراتين', name: 'carton_quantity', type: 'number', required: true },
    { label: 'عدد في الكرتونة', name: 'items_per_carton', type: 'number', required: true },
    { label: 'عدد القزاز الفردي', name: 'individual_items', type: 'number' },
    { label: 'المورد', name: 'supplier' },
    ...(inventoryType !== 'MATBAA' ? [{ label: 'مكان الصنف', name: 'location' }] : []),
    { label: 'ملاحظات', name: 'notes', isTextarea: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10">
          <h2 className="text-lg sm:text-xl font-bold">
            {initialItem ? 'تعديل الصنف' : 'إضافة صنف جديد'} - {inventoryType === 'MONOFIA' ? 'المنوفية' : inventoryType === 'MATBAA' ? 'المطبعة' : 'المخزن الرئيسي'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(localNewItem, false); }} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {formFields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label className="block text-sm font-medium">{field.label} {field.required ? '*' : ''}</label>
              {field.isTextarea ? (
                <textarea
                  name={field.name}
                  value={localNewItem[field.name]}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, field.name)}
                  ref={(el) => (inputRefs.current[field.name] = el)}
                  className="p-2 sm:p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full h-20 text-sm"
                />
              ) : (
                <Input
                  type={field.type || 'text'}
                  name={field.name}
                  value={localNewItem[field.name]}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, field.name)}
                  inputRef={(el) => (inputRefs.current[field.name] = el)}
                  placeholder={field.label}
                  required={field.required}
                  className="p-2 sm:p-3 text-sm"
                />
              )}
            </div>
          ))}
        </form>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-center">
              <span className="text-sm font-medium text-gray-900 dark:text-white">الكمية الإجمالية: </span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">{localNewItem.total_quantity}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-center">
              <span className="text-sm font-medium text-gray-900 dark:text-white">المتبقية: </span>
              <span className="text-base font-bold text-green-600 dark:text-green-400">{localNewItem.remaining_quantity}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <Button type="submit" onClick={() => onSave(localNewItem, false)} className="flex-1 py-2 text-sm">
              <Save className="w-4 h-4 ml-2" />
              حفظ
            </Button>
            <Button 
              type="button" 
              onClick={() => onSave(localNewItem, true)}
              variant="green" 
              className="flex-1 py-2 text-sm"
            >
              <CheckCircle className="w-4 h-4 ml-2" />
              حفظ وإغلاق
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 py-2 text-sm"
            >
              <XCircle className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

AddItemModal.displayName = 'AddItemModal';

// Delete Confirmation Modal
const DeleteModal = memo(({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          تأكيد الحذف
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          هل أنت متأكد من حذف الصنف "{itemName}"؟ هذا الإجراء لا يمكن التراجع عنه.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="red" onClick={onConfirm}>
            <Trash2 className="w-4 h-4 ml-2" />
            حذف
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
});

DeleteModal.displayName = 'DeleteModal';

const ViewStockPage = () => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    item_name: '',
    item_code: '',
    color: '',
    supplier: '',
    from_date: '',
    to_date: '',
  });
  const [exportColumns, setExportColumns] = useState({
    item_name: true,
    item_code: true,
    color: true,
    carton_quantity: true,
    items_per_carton: true,
    individual_items: true,
    supplier: true,
    location: true,
    notes: true,
    added_date: true,
    total_quantity: true,
    remaining_quantity: true,
  });
  const [currentTime, setCurrentTime] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryType, setInventoryType] = useState('MAIN_INVENTORY');

  useEffect(() => {
    fetchFilteredData(filters);
    const updateClock = () => {
      const now = new Date().toLocaleTimeString('en-US', {
        hour12: true,
        timeZone: 'Africa/Cairo',
      });
      setCurrentTime(now);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [inventoryType]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  }, []);

  const getApiEndpoint = () => {
    switch (inventoryType) {
      case 'MONOFIA': return '/monofia-inventory';
      case 'MATBAA': return '/matbaa-inventory';
      default: return '/main-inventory';
    }
  };

  const fetchFilteredData = useCallback(async (currentFilters) => {
    setIsLoading(true);
    try {
      const endpoint = getApiEndpoint();
      const response = await api.get(`${endpoint}/view-stock`, {
        params: currentFilters,
      });
      
      console.log("API Response:", response.data);
      
      const data = response.data;
      let safeItems = [];
      
      if (Array.isArray(data)) {
        safeItems = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) {
          safeItems = data.items;
        } else if (Array.isArray(data.data)) {
          safeItems = data.data;
        } else if (Array.isArray(data.stock)) {
          safeItems = data.stock;
        } else if (Array.isArray(data.results)) {
          safeItems = data.results;
        } else {
          const values = Object.values(data);
          if (values.length > 0 && Array.isArray(values[0])) {
            safeItems = values[0];
          }
        }
      }
      
      console.log("Extracted items:", safeItems);
      
      setItems(safeItems);
      setResultCount(safeItems.length);
      
      if (safeItems.length === 0) {
        alert("لم يتم العثور على نتائج.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("فشل في جلب البيانات.");
      setItems([]);
      setResultCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [inventoryType]);

  const handleApplyFilters = useCallback((localFilters) => {
    setFilters(localFilters);
    fetchFilteredData(localFilters);
  }, [fetchFilteredData]);

  const handleResetFilters = useCallback(() => {
    const initial = {
      item_name: '',
      item_code: '',
      color: '',
      supplier: '',
      from_date: '',
      to_date: '',
    };
    setFilters(initial);
    fetchFilteredData(initial);
  }, [fetchFilteredData]);

  const handleInventoryTypeChange = useCallback((type) => {
    setInventoryType(type);
    handleResetFilters();
  }, [handleResetFilters]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const exportToExcel = async () => {
    const selectedCols = Object.keys(exportColumns).filter(col => exportColumns[col]);
    if (!selectedCols.length) {
      alert("يرجى تحديد أعمدة للتصدير.");
      return;
    }
    try {
      const endpoint = getApiEndpoint();
      const response = await api.post(
        `${endpoint}/export`,
        { columns: selectedCols, filters },
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `المخزون_${inventoryType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("خطأ في التصدير.");
    }
  };

  const printData = () => {
    if (!items.length) {
      alert('لا توجد بيانات للطباعة.');
      return;
    }
    window.print();
  };

  const handleRowSelect = useCallback((item) => {
    setSelectedItem({
      id: item.id,
      item_name: item.item_name,
      item_code: item.item_code,
      color: item.color || '',
      carton_quantity: item.carton_quantity?.toString() || '0',
      items_per_carton: item.items_per_carton?.toString() || '0',
      individual_items: item.individual_items?.toString() || '0',
      supplier: item.supplier || '',
      location: item.location || (inventoryType === 'MATBAA' ? 'MATBAA' : inventoryType === 'MONOFIA' ? 'MONOFIA' : 'MAIN_INVENTORY'),
      notes: item.notes || '',
      total_quantity: item.total_quantity?.toString() || '0',
      remaining_quantity: item.remaining_quantity?.toString() || '0'
    });
    setShowAddModal(true);
  }, [inventoryType]);

  const handleDeleteClick = useCallback((item, e) => {
    e.stopPropagation();
    setItemToDelete(item);
    setShowDeleteModal(true);
  }, []);

  const normalizeArabicNumber = (numStr) => {
    if (!numStr) return '';
    const arabicToEnglish = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return numStr.replace(/[٠-٩]/g, char => arabicToEnglish[char] || char);
  };

  const saveProduct = async (itemData, closeAfter = false) => {
    const { 
      item_name, 
      item_code, 
      color, 
      carton_quantity, 
      items_per_carton, 
      individual_items, 
      supplier, 
      location, 
      notes 
    } = itemData;
    
    if (!item_name || !item_code || !color || !carton_quantity || !items_per_carton) {
      alert('يجب إدخال جميع الحقول الإلزامية.');
      return;
    }

    try {
      const cartonsNum = parseInt(normalizeArabicNumber(carton_quantity)) || 0;
      const perCartonNum = parseInt(normalizeArabicNumber(items_per_carton));
      const individualNum = parseInt(normalizeArabicNumber(individual_items)) || 0;
      const totalQuantity = cartonsNum * perCartonNum + individualNum;
      
      const payload = {
        item_name,
        item_code,
        color,
        carton_quantity: cartonsNum,
        items_per_carton: perCartonNum,
        individual_items: individualNum,
        total_quantity: totalQuantity,
        remaining_quantity: totalQuantity,
        supplier: supplier || null,
        location: location || (inventoryType === 'MATBAA' ? 'MATBAA' : inventoryType === 'MONOFIA' ? 'MONOFIA' : 'MAIN_INVENTORY'),
        notes: notes || null,
      };
      
      const endpoint = getApiEndpoint();
      
      if (selectedItem?.id) {
        // Update existing item
        await api.put(`${endpoint}/${selectedItem.id}`, payload);
      } else {
        // Create new item
        await api.post(endpoint, payload);
      }

      alert("تم حفظ الصنف بنجاح!");
      
      if (closeAfter) {
        setShowAddModal(false);
        setSelectedItem(null);
      } else {
        setSelectedItem(null);
      }
      
      fetchFilteredData(filters);
      
    } catch (error) {
      console.error('Save error:', error);
      alert("خطأ في حفظ الصنف.");
    }
  };

  const deleteProduct = async () => {
    if (!itemToDelete) return;

    try {
      const endpoint = getApiEndpoint();
      await api.delete(`${endpoint}/${itemToDelete.id}`);
      
      alert("تم حذف الصنف بنجاح!");
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchFilteredData(filters);
    } catch (error) {
      console.error('Delete error:', error);
      alert("خطأ في حذف الصنف.");
    }
  };

  const tableColumns = [
    { key: 'item_name', label: 'الصنف' },
    { key: 'item_code', label: 'الكود' },
    { key: 'color', label: 'اللون' },
    { key: 'carton_quantity', label: 'الكراتين' },
    { key: 'items_per_carton', label: 'في الكرتونة' },
    { key: 'individual_items', label: 'الفردي' },
    { key: 'supplier', label: 'المورد' },
    ...(inventoryType !== 'MATBAA' ? [{ key: 'location', label: 'المكان' }] : []),
    { key: 'notes', label: 'ملاحظات' },
    { key: 'added_date', label: 'التاريخ' },
    { key: 'total_quantity', label: 'المضافة' },
    { key: 'remaining_quantity', label: 'المتبقية' },
    { key: 'actions', label: 'الإجراءات' },
  ];

  return (
    <div dir="rtl" className="min-h-screen p-4 sm:p-6 bg-white dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <FilterSection 
        filters={filters}
        exportColumns={exportColumns}
        setExportColumns={setExportColumns}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        currentTime={currentTime}
        toggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
        isLoading={isLoading}
        onExportToExcel={exportToExcel}
        onPrint={printData}
        onAdd={() => {
          setSelectedItem(null);
          setShowAddModal(true);
        }}
        inventoryType={inventoryType}
        onInventoryTypeChange={handleInventoryTypeChange}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-blue-600 dark:bg-blue-800 text-white">
                  <tr>
                    {tableColumns.map(({ key, label }) => (
                      <th
                        key={key}
                        className="p-4 text-center font-bold whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(items) && items.length > 0 ? (
                    items.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => handleRowSelect(item)}
                      >
                        <td className="p-4 text-center">{item.item_name}</td>
                        <td className="p-4 text-center">{item.item_code}</td>
                        <td className="p-4 text-center">{item.color || '-'}</td>
                        <td className="p-4 text-center">{item.carton_quantity}</td>
                        <td className="p-4 text-center">{item.items_per_carton}</td>
                        <td className="p-4 text-center">{item.individual_items}</td>
                        <td className="p-4 text-center">{item.supplier || '-'}</td>
                        {inventoryType !== 'MATBAA' && (
                          <td className="p-4 text-center">{item.location || '-'}</td>
                        )}
                        <td className="p-4 text-center">{item.notes || '-'}</td>
                        <td className="p-4 text-center">{formatDate(item.added_date)}</td>
                        <td className="p-4 text-center">{item.total_quantity}</td>
                        <td className="p-4 text-center">{item.remaining_quantity}</td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              onClick={() => handleRowSelect(item)}
                              className="p-1"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="red"
                              onClick={(e) => handleDeleteClick(item, e)}
                              className="p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tableColumns.length} className="p-4 text-center">لا توجد بيانات</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden p-4">
              <div className="grid grid-cols-1 gap-3">
                {Array.isArray(items) && items.length > 0 ? (
                  items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg">{item.item_name}</h3>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleRowSelect(item)}
                              className="p-1"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="red"
                              onClick={(e) => handleDeleteClick(item, e)}
                              className="p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.item_code} - {item.color || 'لا يوجد لون'}</p>
                      </div>
                      
                      <div className="p-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">الكراتين:</span> {item.carton_quantity}
                        </div>
                        <div>
                          <span className="font-medium">في الكرتونة:</span> {item.items_per_carton}
                        </div>
                        <div>
                          <span className="font-medium">الفردي:</span> {item.individual_items}
                        </div>
                        <div>
                          <span className="font-medium">المورد:</span> {item.supplier || '-'}
                        </div>
                        {inventoryType !== 'MATBAA' && (
                          <div>
                            <span className="font-medium">المكان:</span> {item.location || '-'}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">التاريخ:</span> {formatDate(item.added_date)}
                        </div>
                        <div>
                          <span className="font-medium">المضافة:</span> {item.total_quantity}
                        </div>
                        <div>
                          <span className="font-medium">المتبقية:</span> {item.remaining_quantity}
                        </div>
                      </div>
                      
                      {item.notes && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                          <span className="font-medium">ملاحظات:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">لا توجد بيانات</div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="p-4 text-right text-sm font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700">
          عدد النتائج: {resultCount} سجل
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddItemModal 
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setSelectedItem(null);
            }}
            initialItem={selectedItem}
            onSave={saveProduct}
            inventoryType={inventoryType}
          />
        )}
        
        {showDeleteModal && (
          <DeleteModal 
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}
            onConfirm={deleteProduct}
            itemName={itemToDelete?.item_name}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewStockPage;
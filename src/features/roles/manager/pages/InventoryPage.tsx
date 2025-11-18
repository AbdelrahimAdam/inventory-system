import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Plus,
  Download,
  Moon,
  Sun,
  Search,
  RefreshCw,
  Printer,
  X,
  Save,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Package,
  Database,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  PackageCheck,
  MapPin,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar as LucideCalendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
//  ClassName helper
// ─────────────────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ─────────────────────────────────────────────────────────────────────────────
//  UI Components - Responsive & Consistent Typography
// ─────────────────────────────────────────────────────────────────────────────
const Card = ({ className, children, ...props }) => (
  <div
    className={cn(
      "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
const CardHeader = ({ children, className }) => (
  <div className={cn("p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700", className)}>
    {children}
  </div>
);
const CardTitle = ({ children }) => (
  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
    {children}
  </h2>
);
const CardContent = ({ children, className }) => (
  <div className={cn("p-4 sm:p-5", className)}>
    {children}
  </div>
);
const Button = ({ onClick, children, variant = "default", className, loading, ...props }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={cn(
      "px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl transition-all duration-300 font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 text-sm sm:text-base min-h-[44px]",
      variant === "default" && "bg-purple-600 text-white hover:bg-purple-700",
      variant === "outline" && "border-2 border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20",
      variant === "red" && "bg-red-600 text-white hover:bg-red-700",
      variant === "green" && "bg-emerald-600 text-white hover:bg-emerald-700",
      variant === "blue" && "bg-blue-600 text-white hover:bg-blue-700",
      loading && 'opacity-70 cursor-not-allowed',
      className
    )}
    {...props}
  >
    {loading && <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />}
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Input - Responsive & Consistent
// ─────────────────────────────────────────────────────────────────────────────
const Input = memo(({
  placeholder,
  value,
  onChange,
  type = 'text',
  className = '',
  name,
  onKeyDown,
  inputRef,
  icon,
  ...props
}) => {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-purple-600 z-10">
          {React.cloneElement(icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        ref={inputRef}
        onKeyDown={onKeyDown}
        className={cn(
          "p-3 sm:p-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full focus:border-purple-600 focus:ring-4 focus:ring-purple-600/20 transition-all duration-300 text-base font-medium placeholder-gray-400 dark:placeholder-gray-500",
          icon && "pr-10 sm:pr-12",
          className
        )}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';

// ─────────────────────────────────────────────────────────────────────────────
//  Checkbox - Responsive
// ─────────────────────────────────────────────────────────────────────────────
const Checkbox = memo(({ checked, onCheckedChange, className = '', label }) => {
  return (
    <label className={cn("flex items-center gap-2 sm:gap-3 cursor-pointer group p-2 sm:p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium", className)}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-purple-500 dark:focus:ring-purple-600 focus:ring-2 opacity-0 absolute"
        />
        <div className={cn(
          "w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-inner",
          checked
            ? 'bg-purple-600 border-purple-600 shadow-lg'
            : 'bg-white border-gray-400 dark:bg-gray-700 dark:border-gray-500 group-hover:border-purple-500'
        )}>
          {checked && (
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-gray-900 dark:text-white select-none">
        {label}
      </span>
    </label>
  );
});
Checkbox.displayName = 'Checkbox';

// ─────────────────────────────────────────────────────────────────────────────
//  StatCard - Responsive
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, loading = false }) => (
  <motion.div
    className={cn(
      "rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col justify-between h-24 sm:h-28",
      color
    )}
    whileHover={{ y: -4, scale: 1.03 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex items-center justify-between">
      <h3 className="text-sm sm:text-base font-bold opacity-90">{title}</h3>
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
        {React.cloneElement(icon, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
      </div>
    </div>
    {loading ? (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base sm:text-lg font-bold">...</p>
      </div>
    ) : (
      <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{value?.toLocaleString() ?? "0"}</p>
    )}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  FilterSection - Fully Responsive
// ─────────────────────────────────────────────────────────────────────────────
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
  isExpanded,
  onToggle
}: any) => {
  const initialFilters = { item_name: '', item_code: '', color: '', supplier: '', location: '', from_date: '', to_date: '' };
  const [localFilters, setLocalFilters] = useState(filters);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => setLocalFilters(filters), [filters]);
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  }, []);
  const handleApply = () => onApply(localFilters);
  const handleLocalReset = () => { setLocalFilters(initialFilters); onReset(); };
  const handleFilterKeyDown = useCallback((e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fields = ['item_name', 'item_code', 'color', 'supplier', 'location', 'from_date', 'to_date'];
      const idx = fields.indexOf(fieldName);
      if (idx < fields.length - 1) {
        inputRefs.current[fields[idx + 1]]?.focus();
      } else {
        handleApply();
      }
    }
  }, [handleApply]);
  const filterFields = [
    { label: 'الصنف', key: 'item_name', icon: <Package /> },
    { label: 'الكود', key: 'item_code', icon: <Database /> },
    { label: 'اللون', key: 'color', icon: <div className="w-5 h-5 rounded-full bg-purple-600" /> },
    { label: 'المورد', key: 'supplier', icon: <Users /> },
    { label: 'مكان الصنف', key: 'location', icon: <MapPin /> },
    { label: 'من تاريخ', key: 'from_date', type: 'date', icon: <LucideCalendar /> },
    { label: 'إلى تاريخ', key: 'to_date', type: 'date', icon: <LucideCalendar /> },
  ];
  const exportCheckboxes = [
    { key: 'item_name', label: 'الصنف' },
    { key: 'item_code', label: 'الكود' },
    { key: 'color', label: 'اللون' },
    { key: 'cartons_count', label: 'الكراتين' },
    { key: 'bottles_per_carton', label: 'في الكرتونة' },
    { key: 'single_bottles', label: 'الفردي' },
    { key: 'supplier', label: 'المورد' },
    { key: 'location', label: 'مكان الصنف' },
    { key: 'notes', label: 'ملاحظات' },
    { key: 'createdAt', label: 'التاريخ' },
    { key: 'added_quantity', label: 'المضافة' },
    { key: 'remaining_quantity', label: 'المتبقية' },
  ];
  return (
    <Card className="mb-4">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <Button onClick={onToggle} variant="outline" className="w-full sm:w-auto text-sm sm:text-base py-2 px-3 sm:px-4">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            {isExpanded ? 'إخفاء الفلتر' : 'عرض الفلتر'}
            {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-purple-300 dark:border-purple-700 text-center flex-1 sm:flex-initial">
              <p className="text-sm sm:text-base font-bold text-purple-800 dark:text-purple-300">{currentTime}</p>
            </div>
            <Button onClick={toggleDarkMode} variant="outline" className="p-2 sm:p-3 rounded-xl">
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 sm:space-y-5 border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filterFields.map(f => (
                    <div key={f.key} className="flex flex-col gap-1.5 sm:gap-2">
                      <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{f.label}</label>
                      <Input
                        type={f.type || 'text'}
                        value={localFilters[f.key]}
                        onChange={handleFilterChange}
                        name={f.key}
                        onKeyDown={(e: any) => handleFilterKeyDown(e, f.key)}
                        inputRef={el => (inputRefs.current[f.key] = el)}
                        placeholder={f.label}
                        icon={f.icon}
                      />
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" /> أعمدة التصدير
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
                    {exportCheckboxes.map(({ key, label }) => (
                      <Checkbox
                        key={key}
                        checked={exportColumns[key]}
                        onCheckedChange={checked => setExportColumns({ ...exportColumns, [key]: checked })}
                        label={label}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button onClick={handleApply} disabled={isLoading} className="flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" /> {isLoading ? 'جاري...' : 'تطبيق'}
                  </Button>
                  <Button onClick={handleLocalReset} variant="outline" className="flex-1 sm:flex-initial">
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /> إعادة
                  </Button>
                  <Button onClick={onExportToExcel} variant="green" disabled={isLoading} className="flex-1 sm:flex-initial">
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" /> تصدير
                  </Button>
                  <Button onClick={onPrint} variant="outline" className="flex-1 sm:flex-initial">
                    <Printer className="w-4 h-4 sm:w-5 sm:h-5" /> طباعة
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
});
FilterSection.displayName = 'FilterSection';

// ─────────────────────────────────────────────────────────────────────────────
//  AddItemModal - Responsive Modal
// ─────────────────────────────────────────────────────────────────────────────
const AddItemModal = memo(({ isOpen, onClose, initialItem, onSave, inventoryType }: any) => {
  if (!isOpen) return null;
  const defaultItem = {
    item_name: '', item_code: '', color: '', carton_quantity: '', items_per_carton: '', individual_items: '',
    supplier: '', location: '', notes: '', total_quantity: '0', remaining_quantity: '0'
  };
  const [localItem, setLocalItem] = useState(initialItem || defaultItem);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => setLocalItem(initialItem || defaultItem), [initialItem, inventoryType]);
  const normalizeArabic = (s: string) => s.replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString());
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalItem(prev => {
      const updated = { ...prev, [name]: value };
      if (['carton_quantity', 'items_per_carton', 'individual_items'].includes(name)) {
        const c = parseInt(normalizeArabic(updated.carton_quantity)) || 0;
        const p = parseInt(normalizeArabic(updated.items_per_carton)) || 0;
        const i = parseInt(normalizeArabic(updated.individual_items)) || 0;
        const total = c * p + i;
        updated.total_quantity = total.toString();
        updated.remaining_quantity = total.toString();
      }
      return updated;
    });
  }, []);
  const handleKeyDown = useCallback((e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fields = ['item_name', 'item_code', 'color', 'carton_quantity', 'items_per_carton', 'individual_items', 'supplier', 'location', 'notes'];
      const idx = fields.indexOf(field);
      if (idx < fields.length - 1) inputRefs.current[fields[idx + 1]]?.focus();
      else handleSave(false);
    }
  }, []);
  const handleSave = async (closeAfter = false) => {
    setSaving(true);
    try {
      await onSave(localItem, closeAfter);
      if (closeAfter) onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };
  const getLabel = (t: string) => ({ 'main-inventory': 'المخزن الرئيسي', monofia: 'المنوفية', matbaa: 'المطبعة' }[t] || t);
  const fields = [
    { label: 'الصنف', name: 'item_name', required: true, icon: <Package /> },
    { label: 'الكود', name: 'item_code', required: true, icon: <Database /> },
    { label: 'اللون', name: 'color', required: true, icon: <div className="w-5 h-5 rounded-full bg-purple-600" /> },
    { label: 'عدد الكراتين', name: 'carton_quantity', type: 'number', required: true, icon: <PackageCheck /> },
    { label: 'عدد في الكرتونة', name: 'items_per_carton', type: 'number', required: true, icon: <Package /> },
    { label: 'عدد القزاز الفردي', name: 'individual_items', type: 'number', icon: <div className="w-5 h-5 text-xs">Num</div> },
    { label: 'المورد', name: 'supplier', icon: <Users /> },
    { label: 'مكان الصنف', name: 'location', icon: <MapPin /> },
    { label: 'ملاحظات', name: 'notes', isTextarea: true, icon: <div className="w-5 h-5 text-xs">Note</div> },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl max-h-[95vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10 rounded-t-2xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-7 sm:h-8 bg-purple-600 rounded-full"></div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {initialItem ? 'تعديل الصنف' : 'إضافة صنف جديد'} - {getLabel(inventoryType)}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
          {fields.map(f => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                {React.cloneElement(f.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })} {f.label} {f.required && <span className="text-red-600">*</span>}
              </label>
              {f.isTextarea ? (
                <textarea
                  name={f.name}
                  value={localItem[f.name]}
                  onChange={handleChange}
                  onKeyDown={e => handleKeyDown(e, f.name)}
                  ref={el => (inputRefs.current[f.name] = el)}
                  className="p-3 sm:p-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full h-20 sm:h-24 text-base font-medium focus:border-purple-600 focus:ring-4 focus:ring-purple-600/20 resize-none transition-all duration-300"
                  placeholder={f.label}
                />
              ) : (
                <Input
                  type={f.type || 'text'}
                  name={f.name}
                  value={localItem[f.name]}
                  onChange={handleChange}
                  onKeyDown={e => handleKeyDown(e, f.name)}
                  inputRef={el => (inputRefs.current[f.name] = el)}
                  placeholder={f.label}
                  required={f.required}
                  icon={React.cloneElement(f.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
                />
              )}
            </div>
          ))}
        </form>
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 sm:p-4 rounded-xl text-center border border-purple-300 dark:border-purple-700">
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block">الإجمالية</span>
              <span className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-400">{localItem.total_quantity}</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 sm:p-4 rounded-xl text-center border border-emerald-300 dark:border-emerald-700">
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block">المتبقية</span>
              <span className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{localItem.remaining_quantity}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Button onClick={() => handleSave(false)} loading={saving} className="w-full">
              <Save className="w-4 h-4 sm:w-5 sm:h-5" /> {saving ? 'جاري...' : 'حفظ'}
            </Button>
            <Button onClick={() => handleSave(true)} variant="green" loading={saving} className="w-full">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> {saving ? 'جاري...' : 'حفظ وإغلاق'}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> إلغاء
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
AddItemModal.displayName = 'AddItemModal';

// ─────────────────────────────────────────────────────────────────────────────
//  DeleteModal - Responsive
// ─────────────────────────────────────────────────────────────────────────────
const DeleteModal = memo(({ isOpen, onClose, onConfirm, itemName, loading }: any) => {
  if (!isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">تأكيد الحذف</h3>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-5 sm:mb-6 leading-relaxed text-sm sm:text-base">
          هل أنت متأكد من حذف الصنف <span className="font-bold text-gray-900 dark:text-white">"{itemName}"</span>؟ هذا الإجراء لا يمكن التراجع عنه.
        </p>
        <div className="flex gap-2 sm:gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} className="text-sm sm:text-base py-2 px-4">إلغاء</Button>
          <Button variant="red" onClick={onConfirm} loading={loading} className="text-sm sm:text-base py-2 px-4 gap-2">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /> {loading ? 'جاري...' : 'حذف'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
});
DeleteModal.displayName = 'DeleteModal';

// ─────────────────────────────────────────────────────────────────────────────
//  DataTable - Responsive Table
// ─────────────────────────────────────────────────────────────────────────────
const DataTable = ({ columns, data, isLoading, emptyMessage, onEdit, onDelete, showActions = false }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
    {isLoading ? (
      <div className="flex flex-col items-center justify-center py-10 sm:py-12">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-base sm:text-lg font-medium text-gray-600">جاري التحميل...</p>
      </div>
    ) : !data || data.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-gray-500">
        <Database className="w-12 h-12 sm:w-16 sm:h-16 opacity-50 mb-3" />
        <p className="text-base sm:text-lg font-medium">{emptyMessage}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-right border-collapse">
          <thead>
            <tr className="bg-purple-600 text-white">
              {columns.map((col) => (
                <th key={col.accessorKey} className="px-3 py-3 sm:px-5 sm:py-4 text-sm sm:text-base font-bold border-b-2 border-purple-700">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <motion.tr
                key={row.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all duration-200 group"
              >
                {columns.map((col) => (
                  <td
                    key={col.accessorKey}
                    className={cn(
                      "px-3 py-3 sm:px-5 sm:py-4 text-sm sm:text-base font-medium transition-all duration-200 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10",
                      col.accessorKey === 'actions' && "text-center"
                    )}
                  >
                    {col.accessorKey === 'actions' && showActions ? (
                      <div className="flex gap-1 sm:gap-2 justify-center">
                        <button onClick={() => onEdit(row)} className="p-1.5 sm:p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md">
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={(e) => onDelete(row, e)} className="p-1.5 sm:p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md">
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    ) : col.accessorKey === 'remaining_quantity' ? (
                      <div className={cn(
                        "px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-center font-bold text-white text-xs sm:text-base",
                        row[col.accessorKey] === 0 ? 'bg-red-600' :
                        row[col.accessorKey] < 10 ? 'bg-amber-600' :
                        'bg-emerald-600'
                      )}>
                        {row[col.accessorKey]}
                      </div>
                    ) : (
                      <div className="truncate max-w-xs">{row[col.accessorKey] ?? "-"}</div>
                    )}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Success Notification
// ─────────────────────────────────────────────────────────────────────────────
const SuccessNotification = ({ message, isVisible, onClose }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.8 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 backdrop-blur-md border border-emerald-500 text-sm sm:text-lg font-bold"
      >
        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
        <span>{message}</span>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component - FULL WIDTH (NO MARGINS)
// ─────────────────────────────────────────────────────────────────────────────
const ViewStockPage = () => {
  const [items, setItems] = useState([]);
  const [formattedItems, setFormattedItems] = useState([]);
  const [filters, setFilters] = useState({ item_name: '', item_code: '', color: '', supplier: '', location: '', from_date: '', to_date: '' });
  const [exportColumns, setExportColumns] = useState({
    item_name: true, item_code: true, color: true, cartons_count: true, bottles_per_carton: true, single_bottles: true,
    supplier: true, location: true, notes: true, createdAt: true, added_quantity: true, remaining_quantity: true
  });
  const [currentTime, setCurrentTime] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryType, setInventoryType] = useState('main-inventory');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState({ totalItems: 0, totalQuantity: 0, lowStockItems: 0, outOfStockItems: 0 });
  const warehouseIdMap = { 'main-inventory': 'main-inventory', monofia: 'monofia', matbaa: 'matbaa' };
  const inventoryTypes = [
    { value: 'main-inventory', label: 'المخزن الرئيسي', color: 'bg-purple-600' },
    { value: 'monofia', label: 'المنوفية', color: 'bg-emerald-600' },
    { value: 'matbaa', label: 'المطبعة', color: 'bg-orange-600' }
  ];
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  const calculateStats = useCallback((items) => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (item.added_quantity || 0), 0);
    const lowStockItems = items.filter(item => (item.remaining_quantity || 0) < 10 && (item.remaining_quantity || 0) > 0).length;
    const outOfStockItems = items.filter(item => (item.remaining_quantity || 0) === 0).length;
    return { totalItems, totalQuantity, lowStockItems, outOfStockItems };
  }, []);

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date().toLocaleTimeString('en-US', { hour12: true, timeZone: 'Africa/Cairo' });
      setCurrentTime(now);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body { background: white !important; color: black !important; }
        .shadow-xl, .backdrop-blur, .rounded-2xl { display: none !important; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: right; }
        th { background: #f0f0f0; font-weight: bold; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    let date;
    if (timestamp.toDate) date = timestamp.toDate();
    else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
    else date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    const formatted = items.map(item => ({
      ...item,
      color: item.color || 'غير محدد',
      createdAt: formatDate(item.createdAt),
    }));
    setFormattedItems(formatted);
  }, [items]);

  // Firestore listener
  useEffect(() => {
    const warehouseId = warehouseIdMap[inventoryType];
    const col = collection(db, 'warehouseItems');
    const constraints = [where('warehouseId', '==', warehouseId)];
    if (filters.from_date || filters.to_date) {
      if (filters.from_date) constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(filters.from_date))));
      if (filters.to_date) {
        const end = new Date(filters.to_date);
        end.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(end)));
      }
    } else if (filters.item_name) {
      constraints.push(where('item_name', '>=', filters.item_name));
      constraints.push(where('item_name', '<=', filters.item_name + '\uf8ff'));
    } else {
      if (filters.item_code) constraints.push(where('item_code', '==', filters.item_code));
      if (filters.color) constraints.push(where('color', '==', filters.color));
      if (filters.supplier) constraints.push(where('supplier', '==', filters.supplier));
      if (filters.location) constraints.push(where('location', '==', filters.location));
    }
    const q = query(col, ...constraints, orderBy('createdAt', 'desc'));
    setIsLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setResultCount(data.length);
      setStats(calculateStats(data));
      setIsLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      alert('فشل تحميل البيانات');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [filters, inventoryType, calculateStats]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  }, []);

  const handleApplyFilters = useCallback((localFilters) => setFilters(localFilters), []);
  const handleResetFilters = useCallback(() => setFilters({ item_name: '', item_code: '', color: '', supplier: '', location: '', from_date: '', to_date: '' }), []);
  const handleInventoryTypeChange = useCallback((type) => { setInventoryType(type); handleResetFilters(); }, [handleResetFilters]);

  const exportToExcel = async () => {
    const selected = Object.keys(exportColumns).filter(k => exportColumns[k]);
    if (!selected.length) return alert('اختر أعمدة للتصدير');
    const columnsDisplay = {
      item_name: 'الصنف', item_code: 'الكود', color: 'اللون', cartons_count: 'الكراتين',
      bottles_per_carton: 'في الكرتونة', single_bottles: 'الفردي', supplier: 'المورد',
      location: 'مكان الصنف', notes: 'ملاحظات', createdAt: 'التاريخ',
      added_quantity: 'المضافة', remaining_quantity: 'المتبقية'
    };
    const data = formattedItems.map(item => {
      const row = {};
      selected.forEach(col => {
        row[columnsDisplay[col]] = item[col] || '-';
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المخزون');
    XLSX.writeFile(workbook, `${inventoryType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccessMessage('تم التصدير بنجاح!');
  };

  const printData = () => {
    if (!formattedItems.length) return alert('لا توجد بيانات');
    window.print();
  };

  const handleRowSelect = useCallback((item) => {
    setSelectedItem({
      id: item.id, item_name: item.item_name, item_code: item.item_code, color: item.color || '',
      carton_quantity: item.cartons_count?.toString() || '0', items_per_carton: item.bottles_per_carton?.toString() || '0',
      individual_items: item.single_bottles?.toString() || '0', supplier: item.supplier || '',
      location: item.location || '', notes: item.notes || '',
      total_quantity: item.added_quantity?.toString() || '0', remaining_quantity: item.remaining_quantity?.toString() || '0'
    });
    setShowAddModal(true);
  }, []);

  const handleDeleteClick = useCallback((item, e) => {
    e.stopPropagation();
    setItemToDelete(item);
    setShowDeleteModal(true);
  }, []);

  const normalizeArabicNumber = (s) => s.replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString());

  const saveProduct = async (itemData, closeAfter = false) => {
    const { item_name, item_code, color, carton_quantity, items_per_carton, individual_items, supplier, location, notes } = itemData;
    if (!item_name || !item_code || !color || !carton_quantity || !items_per_carton) {
      return alert('املأ الحقول الإلزامية');
    }
    const cartons = parseInt(normalizeArabicNumber(carton_quantity)) || 0;
    const perCarton = parseInt(normalizeArabicNumber(items_per_carton)) || 0;
    const singles = parseInt(normalizeArabicNumber(individual_items)) || 0;
    const total = cartons * perCarton + singles;
    try {
      const warehouseId = warehouseIdMap[inventoryType];
      const existingQuery = query(
        collection(db, 'warehouseItems'),
        where('warehouseId', '==', warehouseId),
        where('item_name', '==', item_name.trim()),
        where('item_code', '==', item_code.trim()),
        where('color', '==', color.trim())
      );
      const snapshot = await getDocs(existingQuery);
      if (!snapshot.empty && !selectedItem?.id) {
        const docRef = snapshot.docs[0];
        const existing = docRef.data();
        const payload = {
          cartons_count: existing.cartons_count + cartons,
          bottles_per_carton: perCarton,
          single_bottles: singles,
          added_quantity: existing.added_quantity + total,
          remaining_quantity: existing.remaining_quantity + total,
          supplier: supplier?.trim() || existing.supplier,
          location: location?.trim() || existing.location,
          notes: notes?.trim() || existing.notes,
          updatedAt: Timestamp.now()
        };
        await updateDoc(doc(db, 'warehouseItems', docRef.id), payload);
        showSuccessMessage('تم تحديث الصنف');
      } else {
        const payload = {
          warehouseId, item_name: item_name.trim(), item_code: item_code.trim(), color: color.trim(),
          cartons_count: cartons, bottles_per_carton: perCarton, single_bottles: singles,
          added_quantity: total, remaining_quantity: total,
          supplier: supplier?.trim() || null, location: location?.trim() || null, notes: notes?.trim() || null,
          createdAt: selectedItem?.id ? undefined : Timestamp.now(), updatedAt: Timestamp.now()
        };
        if (selectedItem?.id) {
          await updateDoc(doc(db, 'warehouseItems', selectedItem.id), payload);
          showSuccessMessage('تم التعديل');
        } else {
          await addDoc(collection(db, 'warehouseItems'), payload);
          showSuccessMessage('تم الإضافة');
        }
      }
      if (closeAfter) { setShowAddModal(false); setSelectedItem(null); }
      else setSelectedItem(null);
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  };

  const deleteProduct = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'warehouseItems', itemToDelete.id));
      setShowDeleteModal(false); setItemToDelete(null);
      showSuccessMessage('تم الحذف');
    } catch (err) {
      alert('خطأ: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const tableColumns = [
    { header: 'الصنف', accessorKey: 'item_name' },
    { header: 'الكود', accessorKey: 'item_code' },
    { header: 'اللون', accessorKey: 'color' },
    { header: 'الكراتين', accessorKey: 'cartons_count' },
    { header: 'في الكرتونة', accessorKey: 'bottles_per_carton' },
    { header: 'الفردي', accessorKey: 'single_bottles' },
    { header: 'المضافة', accessorKey: 'added_quantity' },
    { header: 'المتبقية', accessorKey: 'remaining_quantity' },
    { header: 'المورد', accessorKey: 'supplier' },
    { header: 'مكان الصنف', accessorKey: 'location' },
    { header: 'ملاحظات', accessorKey: 'notes' },
    { header: 'التاريخ', accessorKey: 'createdAt' },
    { header: 'الإجراءات', accessorKey: 'actions' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 overflow-auto">
      <SuccessNotification message={successMessage} isVisible={showSuccess} onClose={() => setShowSuccess(false)} />

      {/* FULL WIDTH CONTAINER – NO max-w-7xl */}
      <div className="w-full mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
                <Database className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">نظام إدارة المخزون</h1>
                <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 mt-1">عرض المخزون والتصفية</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Inventory Type & Add Button */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" /> إدارة المخزون
                </h3>
                <div className="flex flex-wrap gap-2">
                  {inventoryTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      onClick={() => handleInventoryTypeChange(type.value)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className={cn(
                        "px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-bold transition-all duration-300 shadow-md text-sm sm:text-base",
                        inventoryType === type.value
                          ? `${type.color} text-white shadow-lg`
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      )}
                    >
                      {type.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Button onClick={() => { setSelectedItem(null); setShowAddModal(true); }} className="w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-3 px-4 sm:px-6">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة صنف جديد
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="إجمالي الأصناف" value={stats.totalItems} icon={<Package />} color="bg-purple-600" loading={isLoading} />
          <StatCard title="الكمية الإجمالية" value={stats.totalQuantity} icon={<BarChart3 />} color="bg-emerald-600" loading={isLoading} />
          <StatCard title="أصناف منخفضة" value={stats.lowStockItems} icon={<TrendingDown />} color="bg-amber-600" loading={isLoading} />
          <StatCard title="أصناف منتهية" value={stats.outOfStockItems} icon={<XCircle />} color="bg-red-600" loading={isLoading} />
        </div>

        {/* Filter */}
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
          isExpanded={isFilterExpanded}
          onToggle={() => setIsFilterExpanded(!isFilterExpanded)}
        />

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
                <CardTitle>
                  <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  المخزون الحالي - {inventoryType === 'monofia' ? 'المنوفية' : inventoryType === 'matbaa' ? 'المطبعة' : 'المخزون الرئيسي'}
                </CardTitle>
                <div className="bg-purple-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg text-sm sm:text-base font-bold">
                  عدد النتائج: {resultCount} سجل
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={tableColumns}
                data={formattedItems}
                isLoading={isLoading}
                emptyMessage="لا توجد بيانات"
                showActions={true}
                onEdit={handleRowSelect}
                onDelete={handleDeleteClick}
              />
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddItemModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSelectedItem(null); }} initialItem={selectedItem} onSave={saveProduct} inventoryType={inventoryType} />
        )}
        {showDeleteModal && (
          <DeleteModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setItemToDelete(null); }} onConfirm={deleteProduct} itemName={itemToDelete?.item_name} loading={deleteLoading} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewStockPage;

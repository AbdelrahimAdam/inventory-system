import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, CheckCircle, XCircle, Search, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTable, Column } from 'react-table';
import axios from 'axios';

interface ArabicItem {
  الصنف: string;
  الكود: string;
  اللون: string;
  عدد_الكراتين: number;
  عدد_في_الكرتونة: number;
  عدد_القزاز_الفردي: number;
  الكمية_المتبقية?: number;
  المورد?: string | null;
  مكان_الصنف?: string | null;
  ملاحظات?: string | null;
  تاريخ_الاضافه?: string;
  تاريخ_الإدخال?: string;
}

interface Item {
  name: string;
  code: string;
  color: string;
  cartons: number;
  perCarton: number;
  individual: number;
  total: number;
  supplier?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt?: string;
}

interface AddItemPageProps {
  isMonofya?: boolean;
  isSidebarCollapsed: boolean;
}

const normalizeArabicNumber = (numStr: string): string => {
  const arabicToEnglish = new Map([
    ['٠', '0'],
    ['١', '1'],
    ['٢', '2'],
    ['٣', '3'],
    ['٤', '4'],
    ['٥', '5'],
    ['٦', '6'],
    ['٧', '7'],
    ['٨', '8'],
    ['٩', '9'],
  ]);
  return numStr.replace(/[٠-٩]/g, (char) => arabicToEnglish.get(char) || char);
};

// Map Arabic backend keys to UI Item type
const mapFromArabic = (item: ArabicItem, isMonofya: boolean): Item => ({
  name: item["الصنف"],
  code: item["الكود"],
  color: item["اللون"],
  cartons: item["عدد_الكراتين"],
  perCarton: item["عدد_في_الكرتونة"],
  individual: item["عدد_القزاز_الفردي"],
  total: isMonofya
    ? item["الكمية_المتبقية"] ?? (item["عدد_الكراتين"] * item["عدد_في_الكرتونة"] + item["عدد_القزاز_الفردي"])
    : item["عدد_الكراتين"] * item["عدد_في_الكرتونة"] + item["عدد_القزاز_الفردي"],
  supplier: item["المورد"] ?? '',
  location: item["مكان_الصنف"] ?? '',
  notes: item["ملاحظات"] ?? '',
  createdAt: item["تاريخ_الاضافه"] || item["تاريخ_الإدخال"] || '',
});

const AddItemPage: React.FC<AddItemPageProps> = ({ isMonofya = false, isSidebarCollapsed }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '',
    cartons: '',
    perCarton: '',
    individual: '',
    supplier: '',
    location: '',
    notes: '',
    total: '0',
  });
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'form' | 'table'>('form');

  const API_URL = import.meta.env.VITE_API_URL;
  const dateColumn = isMonofya ? 'تاريخ_الإدخال' : 'تاريخ_الاضافه';

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateTotalQuantity = useCallback(() => {
    try {
      const cartons = parseInt(normalizeArabicNumber(formData.cartons)) || 0;
      const perCarton = parseInt(normalizeArabicNumber(formData.perCarton)) || 0;
      const individual = parseInt(normalizeArabicNumber(formData.individual)) || 0;
      const total = cartons * perCarton + individual;
      setFormData((prev) => ({ ...prev, total: total.toString() }));
    } catch {
      setFormData((prev) => ({ ...prev, total: '0' }));
    }
  }, [formData.cartons, formData.perCarton, formData.individual]);

  // Search items every time name/code/color changes
  useEffect(() => {
    if (formData.name && formData.code && formData.color) {
      searchItems(formData.name, formData.code, formData.color);
    }
    // eslint-disable-next-line
  }, [formData.name, formData.code, formData.color]);

  // Backend search (use Arabic keys in body)
  const searchItems = useCallback(
    async (name = '', code = '', color = '') => {
      setIsLoading(true);
      try {
        // Use /manager/main-inventory/search for all inventory
        const params = new URLSearchParams();
        if (name) params.append('name', name || searchQuery || '%');
        if (code) params.append('code', code || searchQuery || '%');
        if (color) params.append('color', color || searchQuery || '%');
        // Filter fallback
        const url = `${API_URL}/manager/main-inventory/search?${params.toString()}`;
        const response = await axios.get(url);
        setItems(
          (Array.isArray(response.data) ? response.data : []).map((item: ArabicItem) => mapFromArabic(item, isMonofya))
        );
      } catch (err: any) {
        toast.error('حدث خطأ أثناء البحث', { description: err.message });
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, API_URL, isMonofya]
  );

  useEffect(() => {
    searchItems();
    // eslint-disable-next-line
  }, [searchItems]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (['cartons', 'perCarton', 'individual'].includes(field)) {
      updateTotalQuantity();
    }
  };

  const handleRowSelect = (row: Item) => {
    setFormData({
      name: row.name,
      code: row.code,
      color: row.color,
      cartons: row.cartons.toString(),
      perCarton: row.perCarton.toString(),
      individual: row.individual.toString(),
      total: row.total.toString(),
      supplier: row.supplier || '',
      location: row.location || '',
      notes: row.notes || '',
    });
    if (isMobileView) setActiveTab('form');
  };

  const clearFields = () => {
    setFormData({
      name: '',
      code: '',
      color: '',
      cartons: '',
      perCarton: '',
      individual: '',
      supplier: '',
      location: '',
      notes: '',
      total: '0',
    });
    setSearchQuery('');
    searchItems();
  };

  const saveProduct = async (closeAfter: boolean) => {
    const { name, code, color, cartons, perCarton, individual, supplier, location, notes } = formData;
    if (!name || !code || !color) {
      toast.error('يجب إدخال الصنف والكود واللون.');
      return;
    }
    try {
      const cartonsNum = parseInt(normalizeArabicNumber(cartons)) || 0;
      const perCartonNum = parseInt(normalizeArabicNumber(perCarton));
      const individualNum = parseInt(normalizeArabicNumber(individual)) || 0;
      const now = new Date().toISOString().split('T')[0];

      if (!perCartonNum) {
        toast.error('عدد في الكرتونة مطلوب عند إضافة صنف جديد.');
        return;
      }

      const payload: any = {
        "الصنف": name,
        "الكود": code,
        "اللون": color,
        "عدد_الكراتين": cartonsNum,
        "عدد_في_الكرتونة": perCartonNum,
        "عدد_القزاز_الفردي": individualNum,
        "المورد": supplier || null,
        "مكان_الصنف": location || null,
        "ملاحظات": notes || null,
        "تاريخ_الاضافه": now
      };

      await axios.post(`${API_URL}/manager/main-inventory/`, payload);

      toast.success(
        isMonofya ? 'تم حفظ الصنف في مخزون المنوفية بنجاح.' : 'تم حفظ الصنف بنجاح.'
      );

      if (closeAfter) navigate(-1);
      else clearFields();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحفظ', { description: err.message });
    }
  };

  const columns: Column<Item>[] = useMemo(
    () => [
      { Header: 'الصنف', accessor: 'name', width: 200 },
      { Header: 'الكود', accessor: 'code', width: 120 },
      { Header: 'اللون', accessor: 'color', width: 120 },
      { Header: 'عدد الكراتين', accessor: 'cartons', width: 120 },
      { Header: 'عدد في الكرتونة', accessor: 'perCarton', width: 120 },
      { Header: 'عدد القزاز الفردي', accessor: 'individual', width: 120 },
      { Header: isMonofya ? 'الكمية المتبقية' : 'الكمية الإجمالية', accessor: 'total', width: 120 },
    ],
    [isMonofya]
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
    columns,
    data: items,
  });

  const fields = [
    { label: 'اسم الصنف', key: 'name', type: 'text', width: 'w-full' },
    { label: 'الكود', key: 'code', type: 'text', width: 'w-full' },
    { label: 'اللون', key: 'color', type: 'text', width: 'w-full' },
    { label: 'عدد الكراتين', key: 'cartons', type: 'number', width: 'w-full' },
    { label: 'عدد في الكرتونة', key: 'perCarton', type: 'number', width: 'w-full' },
    { label: 'عدد القزاز الفردي', key: 'individual', type: 'number', width: 'w-full' },
    { label: 'المورد', key: 'supplier', type: 'text', width: 'w-full', optional: true },
    { label: 'مكان الصنف', key: 'location', type: 'text', width: 'w-full', optional: true },
    { label: 'ملاحظات', key: 'notes', type: 'text', width: 'w-full', optional: true },
    { label: isMonofya ? 'الكمية المتبقية' : 'الكمية المضافة', key: 'total', type: 'label', width: 'w-full', readonly: true },
  ];

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      if (index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (event.key === 'ArrowUp' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white font-['Tajawal',sans-serif] flex flex-col p-3 sm:p-4" dir="rtl">
      {/* Header with navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-3 flex justify-between items-center">
        {isMobileView && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              النموذج
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              الجدول
            </button>
          </div>
        )}

        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-lg ml-auto"
        >
          <ChevronLeft size={16} /> رجوع
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 max-w-[1920px] mx-auto w-full">
        {/* Form Panel */}
        {(activeTab === 'form' || !isMobileView) && (
          <motion.div
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-y-auto ${isMobileView ? 'w-full' : 'md:w-72 lg:w-80'} max-h-[calc(100vh-7rem)]`}
            initial={{ opacity: 0, x: isMobileView ? -20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-bold mb-4 text-center border-b pb-2">نموذج إضافة صنف</h2>
            {/* Form */}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.key} className="flex flex-col">
                  <label className="text-sm font-semibold mb-1 pr-2 flex items-center">
                    {field.label}
                    {field.optional && <span className="text-xs text-gray-500 mr-1">(اختياري)</span>}
                  </label>
                  {field.type === 'text' || field.type === 'number' ? (
                    <input
                      type={field.type}
                      inputMode={field.type === 'number' ? 'numeric' : 'text'}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      ref={(el) => (inputRefs.current[index] = el)}
                      readOnly={field.readonly}
                      className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${field.width} text-center text-sm ${
                        field.readonly ? 'cursor-not-allowed opacity-60' : ''
                      }`}
                      placeholder={`أدخل ${field.label}`}
                    />
                  ) : (
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formData.total}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Buttons */}
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => saveProduct(false)}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg shadow text-xs sm:text-sm"
              >
                <Save size={14} /> حفظ
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => saveProduct(true)}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg shadow text-xs sm:text-sm"
              >
                <CheckCircle size={14} /> حفظ وإغلاق
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearFields}
                className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg shadow text-xs sm:text-sm"
              >
                <XCircle size={14} /> إلغاء
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Table Panel */}
        {(activeTab === 'table' || !isMobileView) && (
          <motion.div
            className={`flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-hidden ${isMobileView ? 'w-full' : ''} max-h-[calc(100vh-7rem)]`}
            initial={{ opacity: 0, x: isMobileView ? 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Search */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchItems();
                  }}
                  className="w-full p-2 pr-8 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm"
                  placeholder="ابحث بالاسم، الكود أو اللون"
                />
                <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {/* Table for Desktop */}
            <div className="hidden md:block overflow-auto h-[calc(100vh-12rem)]">
              <div className="min-w-full">
                <table
                  {...getTableProps()}
                  className="w-full text-right bg-white dark:bg-gray-800"
                >
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                    {headerGroups.map((headerGroup) => (
                      <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map((column) => (
                          <th
                            {...column.getHeaderProps()}
                            className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center bg-gray-100 dark:bg-gray-700"
                            style={{ minWidth: column.width }}
                          >
                            {column.render('Header')}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={columns.length} className="p-3 text-center text-gray-500 text-sm">
                          جاري التحميل...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="p-3 text-center text-gray-500 text-sm">
                          لا توجد بيانات
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        prepareRow(row);
                        return (
                          <tr
                            {...row.getRowProps()}
                            onClick={() => handleRowSelect(row.original)}
                            className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            {row.cells.map((cell) => (
                              <td
                                {...cell.getCellProps()}
                                className="p-2 text-center text-sm"
                              >
                                {cell.render('Cell')}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* List for Mobile */}
            <div className="md:hidden space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {isLoading ? (
                <div className="text-center text-gray-500 text-sm py-4">جاري التحميل...</div>
              ) : items.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">لا توجد بيانات</div>
              ) : (
                items.map((item, index) => (
                  <motion.div
                    key={index}
                    onClick={() => handleRowSelect(item)}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-semibold">الصنف:</span> {item.name}</div>
                      <div><span className="font-semibold">الكود:</span> {item.code}</div>
                      <div><span className="font-semibold">اللون:</span> {item.color}</div>
                      <div><span className="font-semibold">الكراتين:</span> {item.cartons}</div>
                      <div><span className="font-semibold">في الكرتونة:</span> {item.perCarton}</div>
                      <div><span className="font-semibold">الفردي:</span> {item.individual}</div>
                      <div className="col-span-2 text-center mt-1">
                        <span className="font-semibold">{isMonofya ? 'المتبقية:' : 'الإجمالي:'}</span> {item.total}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AddItemPage;
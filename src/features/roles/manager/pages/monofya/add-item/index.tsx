import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Save, CheckCircle, XCircle, Search, ChevronLeft } from "lucide-react";

type ArabicMonofyaItem = {
  id?: number;
  name?: string | null;
  code?: string | null;
  color?: string | null;
  cartons?: number;
  per_carton?: number;
  individual?: number;
  remaining_quantity?: number;
  supplier?: string | null;
  location?: string | null;
  notes?: string | null;
  date_added?: string | null;
  created_at?: string | null;
  added_quantity?: number;
  created_by?: string | null;
};

type Item = {
  id?: number;
  name: string;
  code: string;
  color: string;
  cartons: number;
  perCarton: number;
  individual: number;
  total: number;
  supplier?: string;
  location?: string;
  notes?: string;
  createdAt?: string;
};

function normalizeArabicNumber(input: string) {
  const arabicNums = "٠١٢٣٤٥٦٧٨٩";
  const engNums = "0123456789";
  return input
    .split("")
    .map((ch) => {
      const idx = arabicNums.indexOf(ch);
      return idx >= 0 ? engNums[idx] : ch;
    })
    .join("");
}

function mapFromArabic(item: ArabicMonofyaItem): Item {
  const mappedItem: Item = {
    id: item.id ?? 0,
    name: item.name ?? "",
    code: item.code ?? "",
    color: item.color ?? "",
    cartons: item.cartons ?? 0,
    perCarton: item.per_carton ?? 0,
    individual: item.individual ?? 0,
    total: item.remaining_quantity ?? (item.cartons ?? 0) * (item.per_carton ?? 0) + (item.individual ?? 0),
    supplier: item.supplier ?? "",
    location: item.location ?? "",
    notes: item.notes ?? "",
    createdAt: item.date_added || item.created_at || "",
  };
  return mappedItem;
}

export default function AddMonofyaItemForm({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    color: "",
    cartons: "",
    perCarton: "",
    individual: "",
    supplier: "",
    location: "",
    notes: "",
  });
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'form' | 'table'>('form');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.1.247:3001/api/v1";

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      const cartons = parseInt(normalizeArabicNumber(form.cartons)) || 0;
      const perCarton = parseInt(normalizeArabicNumber(form.perCarton)) || 0;
      const individual = parseInt(normalizeArabicNumber(form.individual)) || 0;
      setTotalQuantity(cartons * perCarton + individual);
    } catch {
      setTotalQuantity(0);
    }
  }, [form.cartons, form.perCarton, form.individual]);

  const searchItems = useCallback(async (name = '', code = '', color = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (name) params.append("name", name || searchQuery || "%");
      if (code) params.append("code", code || searchQuery || "%");
      if (color) params.append("color", color || searchQuery || "%");

      const url = `${API_BASE_URL}/manager/monofya/search?${params.toString()}`;
      console.log("Fetching URL:", url);

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Fetch error:", res.status, res.statusText, text.substring(0, 200));
        throw new Error(`فشل في جلب البيانات: ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Unexpected response, not JSON:", contentType, text.substring(0, 200));
        throw new Error("الخادم لم يرجع بيانات JSON صحيحة");
      }

      const response: { success: boolean; data: unknown; message?: string } = await res.json();
      console.log("Received data:", response);

      if (!response.success) {
        console.error("Backend error:", response);
        throw new Error(response.message || "فشل في جلب البيانات من الخادم");
      }

      const dataArray = Array.isArray(response.data) ? response.data : [];
      console.log("Processed items:", dataArray.length, dataArray);

      setItems(dataArray.map(mapFromArabic));
    } catch (e: any) {
      console.error("Search error:", e);
      setError(e.message || "خطأ غير معروف أثناء البحث");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, API_BASE_URL]);

  useEffect(() => {
    console.log("Initial fetch of items");
    searchItems();
  }, []);

  useEffect(() => {
    if (form.name && form.code && form.color) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        console.log("Search triggered by form or searchQuery change:", { searchQuery, form });
        searchItems(form.name, form.code, form.color);
      }, 500);
    }
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [form.name, form.code, form.color, searchQuery, searchItems]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleRowSelect(item: Item) {
    setForm({
      name: item.name || "",
      code: item.code || "",
      color: item.color || "",
      cartons: (item.cartons || 0).toString(),
      perCarton: (item.perCarton || 0).toString(),
      individual: (item.individual || 0).toString(),
      supplier: item.supplier || "",
      location: item.location || "",
      notes: item.notes || "",
    });
    if (isMobileView) setActiveTab('form');
  }

  function clearFields() {
    setForm({
      name: "",
      code: "",
      color: "",
      cartons: "",
      perCarton: "",
      individual: "",
      supplier: "",
      location: "",
      notes: "",
    });
    setTotalQuantity(0);
    setError(null);
    setSuccess(null);
    setSearchQuery("");
    searchItems();
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      if (index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (event.key === 'ArrowUp' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  async function saveProduct(closeAfter = false) {
    setError(null);
    setSuccess(null);

    try {
      if (!form.name || !form.code || !form.color) {
        setError("يجب إدخال الصنف والكود واللون.");
        return;
      }

      // Fixed: All numeric fields now properly fall back to 0
      const cartons = parseInt(normalizeArabicNumber(form.cartons)) || 0;
      const perCarton = parseInt(normalizeArabicNumber(form.perCarton)) || 0;
      const individual = parseInt(normalizeArabicNumber(form.individual)) || 0;

      if (perCarton <= 0) {
        setError("عدد في الكرتونة يجب أن يكون رقمًا صحيحًا أكبر من الصفر.");
        return;
      }

      setLoading(true);

      // Fixed: All string fields are trimmed and empty strings are sent as empty strings
      const itemData = {
        الصنف: form.name.trim(),
        الكود: form.code.trim(),
        اللون: form.color.trim(),
        عدد_الكراتين: cartons,
        عدد_في_الكرتونة: perCarton,
        عدد_القزاز_الفردي: individual,
        المورد: form.supplier.trim() || "",
        مكان_الصنف: form.location.trim() || "",
        ملاحظات: form.notes.trim() || "",
      };

      console.log("جاري الإرسال إلى:", `${API_BASE_URL}/manager/monofya`);
      console.log("بيانات الإرسال:", itemData);

      const res = await fetch(`${API_BASE_URL}/manager/monofya`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(itemData),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("خطأ في الحفظ:", res.status, res.statusText, text);
        throw new Error(`فشل في حفظ الصنف: ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("الرد غير متوقع بعد الحفظ:", contentType, text);
        if (res.ok) {
          setSuccess("تم حفظ الصنف في مخزون المنوفية بنجاح.");
          searchItems();
          if (closeAfter && onClose) setTimeout(() => onClose(), 1000);
          else setTimeout(() => clearFields(), 1000);
          return;
        }
        throw new Error("الخادم لم يرجع بيانات JSON صحيحة بعد الحفظ");
      }

      const response = await res.json();
      console.log("تم الحفظ بنجاح:", response);

      if (!response.success) {
        throw new Error(response.message || "فشل في حفظ الصنف");
      }

      setSuccess("تم حفظ الصنف في مخزون المنوفية بنجاح.");

      setTimeout(() => {
        searchItems();
      }, 500);

      if (closeAfter && onClose) {
        setTimeout(() => onClose(), 1000);
      } else {
        setTimeout(() => clearFields(), 1000);
      }
    } catch (e: any) {
      console.error("خطأ في الحفظ:", e);
      setError(e.message || "خطأ غير معروف أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { label: 'اسم الصنف', name: 'name', type: 'text', width: 'w-full', required: true },
    { label: 'الكود', name: 'code', type: 'text', width: 'w-full', required: true },
    { label: 'اللون', name: 'color', type: 'text', width: 'w-full', required: true },
    { label: 'عدد الكراتين', name: 'cartons', type: 'number', width: 'w-full', required: true },
    { label: 'عدد في الكرتونة', name: 'perCarton', type: 'number', width: 'w-full', required: true },
    { label: 'عدد القزاز الفردي', name: 'individual', type: 'number', width: 'w-full', required: false },
    { label: 'المورد', name: 'supplier', type: 'text', width: 'w-full', required: false },
    { label: 'مكان الصنف', name: 'location', type: 'text', width: 'w-full', required: false },
    { label: 'ملاحظات', name: 'notes', type: 'text', width: 'w-full', required: false },
  ];

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
          onClick={() => onClose ? onClose() : window.history.back()}
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
            
            {error && (
              <div className="mb-4 p-3 bg-red-200 text-red-800 rounded text-sm" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-200 text-green-800 rounded text-sm" role="alert">
                {success}
              </div>
            )}
            
            {/* Form */}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.name} className="flex flex-col">
                  <label className="text-sm font-semibold mb-1 pr-2 flex items-center">
                    {field.label}
                    {!field.required && <span className="text-xs text-gray-500 mr-1">(اختياري)</span>}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    inputMode={field.type === 'number' ? 'numeric' : 'text'}
                    value={(form as any)[field.name]}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    ref={(el) => (inputRefs.current[index] = el)}
                    className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${field.width} text-center text-sm`}
                    placeholder={`أدخل ${field.label}`}
                    required={field.required}
                  />
                </div>
              ))}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1 pr-2">الكمية المضافة</label>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                  {totalQuantity}
                </div>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => saveProduct(false)}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg shadow text-xs sm:text-sm disabled:opacity-50"
              >
                <Save size={14} /> {loading ? "جاري الحفظ..." : "حفظ"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => saveProduct(true)}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg shadow text-xs sm:text-sm disabled:opacity-50"
              >
                <CheckCircle size={14} /> {loading ? "جاري الحفظ..." : "حفظ وإغلاق"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearFields}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg shadow text-xs sm:text-sm disabled:opacity-50"
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
                <table className="w-full text-right bg-white dark:bg-gray-800">
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[120px]">الصنف</th>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[80px]">الكود</th>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[80px]">اللون</th>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[80px]">الكراتين</th>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[80px]">في الكرتونة</th>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[80px]">الفردي</th>
                      <th className="p-2 text-sm font-bold border-b border-gray-200 dark:border-gray-600 text-center min-w-[80px]">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-3 text-center text-gray-500 text-sm">
                          جاري التحميل...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-3 text-center text-gray-500 text-sm">
                          لا توجد بيانات
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr
                          key={index}
                          onClick={() => handleRowSelect(item)}
                          className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <td className="p-2 text-center text-sm truncate max-w-[120px]" title={item.name}>
                            {item.name}
                          </td>
                          <td className="p-2 text-center text-sm">{item.code}</td>
                          <td className="p-2 text-center text-sm">{item.color}</td>
                          <td className="p-2 text-center text-sm">{item.cartons}</td>
                          <td className="p-2 text-center text-sm">{item.perCarton}</td>
                          <td className="p-2 text-center text-sm">{item.individual}</td>
                          <td className="p-2 text-center text-sm font-bold">{item.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* List for Mobile */}
            <div className="md:hidden space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {loading ? (
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
                        <span className="font-semibold">المتبقي:</span> {item.total}
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
}
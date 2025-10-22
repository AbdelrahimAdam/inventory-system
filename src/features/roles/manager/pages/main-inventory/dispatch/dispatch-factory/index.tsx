import { useState, useEffect } from "react";
import { 
  Search, Refresh, Inventory, Factory, TrendingDown, 
  QrCode2, Palette, LocalShipping, Warning 
} from "@mui/icons-material";
import { FiBox, FiPackage, FiAlertTriangle } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router-dom";

// API base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

// Types based on the database schema
interface InventoryItem {
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
  added_date: string;
  is_active: boolean;
}

interface FactoryDispatchData {
  inventory_item_id: number;
  quantity_dispensed: number;
  packaging_quantity?: number;
  finishing_quantity?: number;
  shipping_quantity?: number;
  breakage_quantity?: number;
  shortage_reason?: string;
  notes?: string;
  created_by: number;
}

interface FactoryMovement {
  id: number;
  uuid: string;
  inventory_item_id: number;
  quantity_dispensed: number;
  packaging_quantity: number;
  finishing_quantity: number;
  shipping_quantity: number;
  breakage_quantity: number;
  shortage_reason: string | null;
  notes: string | null;
  created_by: number;
  movement_date: string;
  created_at: string;
}

export default function FactoryDispatchPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dispatchData, setDispatchData] = useState<FactoryDispatchData>({
    inventory_item_id: 0,
    quantity_dispensed: 0,
    packaging_quantity: 0,
    finishing_quantity: 0,
    shipping_quantity: 0,
    breakage_quantity: 0,
    shortage_reason: "",
    notes: "",
    created_by: 0
  });
  const [currentTime, setCurrentTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [recentDispatches, setRecentDispatches] = useState<FactoryMovement[]>([]);
  const [showBreakageFields, setShowBreakageFields] = useState(false);

  const factoryName = "مصنع البران";

  useEffect(() => {
    loadItems();
    loadRecentDispatches();
    const updateClock = () => {
      const now = new Date().toLocaleTimeString("ar-EG", {
        hour12: true,
        timeZone: "Africa/Cairo",
      });
      setCurrentTime(now);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/inventory-items?is_active=true&location=MAIN_INVENTORY`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "خطأ في استجابة الخادم" }));
        throw new Error(errorData.error || `فشل في تحميل الأصناف: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setError("لا توجد أصناف متاحة في المخزون الرئيسي.");
        setItems([]);
        setFilteredItems([]);
        return;
      }
      
      setItems(data);
      setFilteredItems(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف في الاتصال";
      setError(`فشل في تحميل الأصناف: ${errorMessage}`);
      console.error("Error loading items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentDispatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/factory-movements?limit=5&order_by=created_at&order=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentDispatches(data);
      }
    } catch (error) {
      console.error("Error loading recent dispatches:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) {
      setFilteredItems(items);
    } else {
      setFilteredItems(
        items.filter(
          (item) =>
            item.item_name.toLowerCase().includes(lowerQuery) ||
            item.item_code.toLowerCase().includes(lowerQuery) ||
            (item.color && item.color.toLowerCase().includes(lowerQuery))
        )
      );
    }
  };

  const handleSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setDispatchData({
      inventory_item_id: item.id,
      quantity_dispensed: 0,
      packaging_quantity: 0,
      finishing_quantity: 0,
      shipping_quantity: 0,
      breakage_quantity: 0,
      shortage_reason: "",
      notes: "",
      created_by: 1 // This should come from auth context
    });
    setQuantityError(null);
    setShowBreakageFields(false);
    setDetailDialogOpen(true);
  };

  const validateAndConfirmDispatch = () => {
    if (!selectedItem) {
      setError("يرجى اختيار صنف من الجدول");
      return;
    }
    
    const qty = dispatchData.quantity_dispensed;
    if (isNaN(qty) || qty <= 0) {
      setQuantityError("الرجاء إدخال عدد صحيح موجب للكمية المصروفة");
      return;
    }
    
    if (qty > selectedItem.remaining_quantity) {
      setQuantityError(`الكمية المصروفة (${qty}) أكبر من الكمية المتبقية (${selectedItem.remaining_quantity})`);
      return;
    }

    // Validate breakage quantities
    const totalProcessed = (dispatchData.packaging_quantity || 0) + 
                          (dispatchData.finishing_quantity || 0) + 
                          (dispatchData.shipping_quantity || 0) + 
                          (dispatchData.breakage_quantity || 0);
    
    if (totalProcessed > qty) {
      setQuantityError(`إجمالي الكميات المعالجة (${totalProcessed}) أكبر من الكمية المصروفة (${qty})`);
      return;
    }

    setConfirmDialogOpen(true);
  };

  const saveDispatch = async () => {
    if (!selectedItem) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/factory-movements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dispatchData),
      });
      
      const responseData = await response.json();
      if (response.ok) {
        setError(null);
        setSelectedItem(null);
        setDispatchData({
          inventory_item_id: 0,
          quantity_dispensed: 0,
          packaging_quantity: 0,
          finishing_quantity: 0,
          shipping_quantity: 0,
          breakage_quantity: 0,
          shortage_reason: "",
          notes: "",
          created_by: 0
        });
        setDetailDialogOpen(false);
        setConfirmDialogOpen(false);
        
        // Reload data
        await loadItems();
        await loadRecentDispatches();
        
        // Show success message
        setError("تم صرف الصنف للمصنع بنجاح");
        setTimeout(() => setError(null), 3000);
      } else {
        throw new Error(responseData.error || `فشل في تسجيل الصرف: ${response.status}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      setError(`فشل في تسجيل الصرف: ${errorMessage}`);
      console.error("Dispatch error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemColor = (remaining: number) => {
    if (remaining === 0) return "bg-gradient-to-r from-red-500 to-red-600";
    if (remaining < 10) return "bg-gradient-to-r from-amber-500 to-amber-600";
    return "bg-gradient-to-r from-green-500 to-green-600";
  };

  const getStockLevelColor = (remaining: number) => {
    if (remaining === 0) return "text-red-600";
    if (remaining < 5) return "text-amber-600";
    if (remaining < 10) return "text-yellow-600";
    return "text-green-600";
  };

  const getStockLevelBg = (remaining: number) => {
    if (remaining === 0) return "bg-red-50 border-red-200 dark:bg-red-900/20";
    if (remaining < 5) return "bg-amber-50 border-amber-200 dark:bg-amber-900/20";
    if (remaining < 10) return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20";
    return "bg-green-50 border-green-200 dark:bg-green-900/20";
  };

  const totalItems = items.length;
  const lowStockItems = items.filter((item) => item.remaining_quantity < 10 && item.remaining_quantity > 0).length;
  const outOfStockItems = items.filter((item) => item.remaining_quantity === 0).length;
  const totalCartons = items.reduce((sum, item) => sum + item.carton_quantity, 0);
  const totalRemaining = items.reduce((sum, item) => sum + item.remaining_quantity, 0);

  const DetailItem = ({ icon, label, value, valueColor, isImportant = false }: any) => (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">{label}</p>
        <p
          className={`font-bold truncate ${isImportant ? "text-lg" : "text-base"} ${
            valueColor ? valueColor : "text-gray-900 dark:text-white"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  const StockLevelIndicator = ({ remaining, total }: { remaining: number; total: number }) => {
    const percentage = total > 0 ? (remaining / total) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
        <div
          className={`h-2 rounded-full ${
            remaining === 0
              ? "bg-red-500"
              : remaining < 5
              ? "bg-amber-500"
              : remaining < 10
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        ></div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 font-tajawal text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Factory className="text-3xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg">صرف المصنع</h1>
              <p className="text-lg font-semibold opacity-90">نظام إدارة صرف الأصناف للمصنع</p>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            <div className="bg-white/20 rounded-xl px-6 py-2 flex items-center gap-2 backdrop-blur-sm border border-white/30">
              <Factory className="text-xl" />
              <span className="text-lg font-semibold">{factoryName}</span>
            </div>
            <button
              onClick={loadItems}
              disabled={isLoading}
              className="bg-white/20 rounded-xl px-6 py-2 flex items-center gap-2 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/50 transition backdrop-blur-sm border border-white/30"
            >
              <Refresh className={`text-xl ${isLoading ? "animate-spin" : ""}`} />
              <span className="text-lg font-semibold">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistical Dashboard */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-4 -mt-4"></div>
          <div className="relative">
            <h3 className="text-sm font-semibold opacity-90">إجمالي الأصناف</h3>
            <p className="text-3xl font-bold mt-2">{totalItems}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-4 -mt-4"></div>
          <div className="relative">
            <h3 className="text-sm font-semibold opacity-90">أصناف منخفضة المخزون</h3>
            <p className="text-3xl font-bold mt-2">{lowStockItems}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-4 -mt-4"></div>
          <div className="relative">
            <h3 className="text-sm font-semibold opacity-90">أصناف منتهية</h3>
            <p className="text-3xl font-bold mt-2">{outOfStockItems}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-4 -mt-4"></div>
          <div className="relative">
            <h3 className="text-sm font-semibold opacity-90">إجمالي الكمية</h3>
            <p className="text-3xl font-bold mt-2">{totalRemaining.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Recent Dispatches */}
      {recentDispatches.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
            <LocalShipping className="text-2xl" />
            آخر عمليات الصرف
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDispatches.slice(0, 3).map((dispatch) => (
              <div key={dispatch.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-blue-200 dark:border-blue-600">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {items.find(item => item.id === dispatch.inventory_item_id)?.item_code || 'غير معروف'}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(dispatch.movement_date)}</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {dispatch.quantity_dispensed.toLocaleString()} قطعة
                </div>
                {dispatch.breakage_quantity > 0 && (
                  <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                    <Warning className="text-sm" />
                    <span>كسر: {dispatch.breakage_quantity}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Info Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <p className="text-base font-bold text-gray-600 dark:text-gray-300">
            الوقت الحالي: <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">{currentTime}</span>
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>متوفر</span>
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span>منخفض</span>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>منتهي</span>
          </div>
        </div>

        {error && (
          <div className={`mb-4 font-bold text-lg rounded-xl p-4 shadow-md ${
            error.includes("نجاح") 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
              : "bg-gradient-to-r from-red-500 to-red-600 text-white"
          }`}>
            {error}
          </div>
        )}

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="🔍 ابحث بالصنف، الكود أو اللون..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full p-4 pr-12 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg font-bold transition-all duration-300"
            disabled={isLoading}
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 text-2xl" />
        </div>

        {selectedItem && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200 dark:border-blue-600">
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
              <Inventory className="text-2xl" />
              الصنف المحدد للصرف
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <DetailItem icon={<Inventory className="text-xl" />} label="الصنف" value={selectedItem.item_name} />
              <DetailItem icon={<QrCode2 className="text-xl" />} label="الكود" value={selectedItem.item_code} valueColor="text-blue-600 dark:text-blue-400" />
              <DetailItem icon={<Palette className="text-xl" />} label="اللون" value={selectedItem.color || "غير محدد"} />
              <DetailItem
                icon={<TrendingDown className="text-xl" />}
                label="الكمية المتبقية"
                value={selectedItem.remaining_quantity.toLocaleString()}
                valueColor={getStockLevelColor(selectedItem.remaining_quantity)}
                isImportant={true}
              />
            </div>
            <div className="mt-3">
              <StockLevelIndicator remaining={selectedItem.remaining_quantity} total={selectedItem.total_quantity} />
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-200 dark:border-gray-700">
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center sticky top-0 z-10">
          <h2 className="text-xl font-bold">الأصناف المتاحة للصرف</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-12 w-12 text-blue-500" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
              </svg>
              <p className="text-lg font-bold text-gray-600 dark:text-gray-300">جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                      {["الصنف", "الكود", "اللون", "الكراتين", "في الكرتونة", "الفردي", "الإجمالي", "المتبقي", "الحالة", "الإجراءات"].map((header) => (
                        <th
                          key={header}
                          className={`p-3 text-center text-sm font-bold ${
                            header === "الصنف" ? "pr-6" : header === "الكود" ? "pl-2" : ""
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          selectedItem?.id === item.id ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"
                        }`}
                      >
                        <td className="p-3 text-right font-bold text-lg text-gray-900 dark:text-white min-w-[200px] pr-6">
                          {item.item_name}
                        </td>
                        <td className="p-3 text-center min-w-[120px] pl-2">
                          <span className="bg-blue-100 text-blue-800 font-bold text-lg px-3 py-1 rounded-lg border border-blue-300 inline-block">
                            {item.item_code}
                          </span>
                        </td>
                        <td className="p-3 text-center min-w-[120px]">
                          <span className="bg-purple-100 text-purple-800 font-bold text-lg px-3 py-1 rounded-lg border border-purple-300">
                            {item.color || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-lg text-amber-600">{item.carton_quantity}</td>
                        <td className="p-3 text-center font-bold text-lg text-gray-700 dark:text-gray-300">{item.items_per_carton}</td>
                        <td className="p-3 text-center font-bold text-lg text-cyan-600">{item.individual_items}</td>
                        <td className="p-3 text-center font-bold text-lg text-blue-600">{item.total_quantity}</td>
                        <td className="p-3 text-center min-w-[140px]">
                          <span
                            className={`font-bold text-lg px-3 py-1 rounded-lg border ${getStockLevelBg(item.remaining_quantity)} ${getStockLevelColor(item.remaining_quantity)}`}
                          >
                            {item.remaining_quantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-center min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                item.remaining_quantity === 0
                                  ? "bg-red-500"
                                  : item.remaining_quantity < 5
                                  ? "bg-amber-500"
                                  : item.remaining_quantity < 10
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            ></div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {item.remaining_quantity === 0
                                ? "منتهي"
                                : item.remaining_quantity < 5
                                ? "منخفض"
                                : item.remaining_quantity < 10
                                ? "تحذير"
                                : "جيد"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center min-w-[150px]">
                          <button
                            onClick={() => handleSelect(item)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg px-4 py-2 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            <Inventory className="inline mr-2" />
                            اختيار
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl shadow-md p-4 ${getItemColor(item.remaining_quantity)} text-white relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative grid grid-cols-2 gap-3">
                    <DetailItem icon={<Inventory className="text-xl" />} label="الصنف" value={item.item_name} />
                    <DetailItem icon={<QrCode2 className="text-xl" />} label="الكود" value={item.item_code} />
                    <DetailItem icon={<Palette className="text-xl" />} label="اللون" value={item.color || "-"} />
                    <DetailItem icon={<TrendingDown className="text-xl" />} label="المتبقي" value={item.remaining_quantity.toLocaleString()} />
                    <DetailItem icon={<Factory className="text-xl" />} label="الكراتين" value={item.carton_quantity.toString()} />
                    <DetailItem icon={<Inventory className="text-xl" />} label="الفردي" value={item.individual_items.toString()} />
                  </div>
                  <div className="relative mt-3 flex justify-center">
                    <button
                      onClick={() => handleSelect(item)}
                      className="bg-white/20 backdrop-blur-sm text-white font-bold rounded-lg px-6 py-2 hover:bg-white/30 transition border border-white/30"
                    >
                      <Inventory className="inline mr-2" />
                      اختيار للصرف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dispatch Dialog */}
      <div
        className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${
          detailDialogOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 transform transition-transform duration-300 scale-95">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center justify-center gap-4">
              <Factory className="text-3xl" />
              <h2 className="text-2xl font-bold">صرف صنف للمصنع</h2>
            </div>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {selectedItem && (
              <>
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2 border-b border-blue-200 dark:border-blue-600 pb-3">
                  <Inventory className="text-2xl" />
                  معلومات الصنف المحدد
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <DetailItem icon={<Inventory className="text-xl" />} label="الصنف" value={selectedItem.item_name} />
                  <DetailItem icon={<QrCode2 className="text-xl" />} label="الكود" value={selectedItem.item_code} valueColor="text-blue-600 dark:text-blue-400" />
                  <DetailItem icon={<Palette className="text-xl" />} label="اللون" value={selectedItem.color || "غير محدد"} />
                  <DetailItem
                    icon={<TrendingDown className="text-xl" />}
                    label="الكمية المتبقية"
                    value={selectedItem.remaining_quantity.toLocaleString()}
                    valueColor={getStockLevelColor(selectedItem.remaining_quantity)}
                    isImportant={true}
                  />
                  <DetailItem icon={<Factory className="text-xl" />} label="عدد الكراتين" value={selectedItem.carton_quantity.toString()} />
                  <DetailItem icon={<Inventory className="text-xl" />} label="الفردي المتبقي" value={selectedItem.individual_items.toString()} />
                </div>

                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200 dark:border-blue-600">
                  <StockLevelIndicator remaining={selectedItem.remaining_quantity} total={selectedItem.total_quantity} />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>منخفض</span>
                    <span>جيد</span>
                    <span>{selectedItem.total_quantity}+</span>
                  </div>
                </div>

                <hr className="my-6 border-gray-200 dark:border-gray-700" />

                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2 border-b border-blue-200 dark:border-blue-600 pb-3">
                  <TrendingDown className="text-2xl" />
                  بيانات الصرف
                </h3>
                {quantityError && (
                  <div className="mb-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg rounded-xl p-4 shadow-md">
                    {quantityError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-base font-bold text-gray-600 dark:text-gray-200 mb-2">
                      الكمية المصروفة
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={dispatchData.quantity_dispensed}
                        onChange={(e) => {
                          setDispatchData({...dispatchData, quantity_dispensed: parseInt(e.target.value) || 0});
                          setQuantityError(null);
                        }}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg font-bold transition-all"
                        disabled={isSubmitting}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">قطعة</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-bold text-gray-600 dark:text-gray-200 mb-2">
                      ملاحظات الصرف
                    </label>
                    <input
                      type="text"
                      value={dispatchData.notes || ''}
                      onChange={(e) => setDispatchData({...dispatchData, notes: e.target.value})}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg font-bold transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Breakage and Processing Fields */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowBreakageFields(!showBreakageFields)}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-3"
                  >
                    <FiAlertTriangle />
                    {showBreakageFields ? 'إخفاء تفاصيل المعالجة' : 'إضافة تفاصيل المعالجة والكسر'}
                  </button>
                  
                  {showBreakageFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-amber-200 dark:border-amber-600">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 dark:text-gray-200 mb-1">
                          التغليف
                        </label>
                        <input
                          type="number"
                          value={dispatchData.packaging_quantity || 0}
                          onChange={(e) => setDispatchData({...dispatchData, packaging_quantity: parseInt(e.target.value) || 0})}
                          className="w-full p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 dark:text-gray-200 mb-1">
                          التشطيب
                        </label>
                        <input
                          type="number"
                          value={dispatchData.finishing_quantity || 0}
                          onChange={(e) => setDispatchData({...dispatchData, finishing_quantity: parseInt(e.target.value) || 0})}
                          className="w-full p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 dark:text-gray-200 mb-1">
                          الشحن
                        </label>
                        <input
                          type="number"
                          value={dispatchData.shipping_quantity || 0}
                          onChange={(e) => setDispatchData({...dispatchData, shipping_quantity: parseInt(e.target.value) || 0})}
                          className="w-full p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 dark:text-gray-200 mb-1">
                          الكسر
                        </label>
                        <input
                          type="number"
                          value={dispatchData.breakage_quantity || 0}
                          onChange={(e) => setDispatchData({...dispatchData, breakage_quantity: parseInt(e.target.value) || 0})}
                          className="w-full p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-600 dark:text-gray-200 mb-1">
                          سبب النقص
                        </label>
                        <input
                          type="text"
                          value={dispatchData.shortage_reason || ''}
                          onChange={(e) => setDispatchData({...dispatchData, shortage_reason: e.target.value})}
                          className="w-full p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                          placeholder="سبب النقص إن وجد"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200 dark:border-blue-600">
                  <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Factory className="text-2xl" />
                    معلومات المصنع
                  </h4>
                  <DetailItem icon={<Factory className="text-xl" />} label="اسم المصنع" value={factoryName} />
                </div>
              </>
            )}
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-b-2xl flex justify-end gap-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setDetailDialogOpen(false)}
              className="px-6 py-3 text-lg font-bold border-2 border-gray-400 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200"
            >
              إلغاء
            </button>
            <button
              onClick={validateAndConfirmDispatch}
              disabled={!dispatchData.quantity_dispensed || isSubmitting}
              className="px-6 py-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
                  </svg>
                  جاري الصرف...
                </>
              ) : (
                <>
                  <FiBox size={20} />
                  تأكيد الصرف
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <div
        className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${
          confirmDialogOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-transform duration-300 scale-95">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl text-center">
            <h2 className="text-xl font-bold">تأكيد صرف الصنف</h2>
          </div>
          <div className="p-4">
            {selectedItem && (
              <>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 text-center">
                  هل أنت متأكد من صرف {dispatchData.quantity_dispensed} من الصنف: {selectedItem.item_name} - {selectedItem.item_code}؟
                </p>
                <div className="flex justify-center mb-4">
                  <QRCodeCanvas 
                    value={`${selectedItem.item_code}-${dispatchData.quantity_dispensed}-${new Date().toISOString()}`} 
                    size={128} 
                    className="rounded-lg border-2 border-blue-200 dark:border-blue-600 shadow-md"
                    bgColor="#ffffff"
                    fgColor="#1e40af"
                  />
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200 dark:border-blue-600">
                  <DetailItem
                    icon={<TrendingDown className="text-xl" />}
                    label="الكمية المتبقية بعد الصرف"
                    value={(selectedItem.remaining_quantity - dispatchData.quantity_dispensed).toLocaleString()}
                    valueColor={selectedItem.remaining_quantity - dispatchData.quantity_dispensed <= 0 ? "text-red-600" : "text-green-600"}
                    isImportant={true}
                  />
                </div>
              </>
            )}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-b-2xl flex justify-end gap-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setConfirmDialogOpen(false)}
              className="px-6 py-3 text-lg font-bold border-2 border-gray-400 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200"
            >
              إلغاء
            </button>
            <button
              onClick={saveDispatch}
              disabled={isSubmitting}
              className="px-6 py-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <FiBox size={20} />
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { FiSearch, FiDollarSign, FiX } from 'react-icons/fi';
import Input from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Item {
  id: string;
  name: string;
  code: string;
  color: string | null;
  cartons: number;
  per_carton: number;
  individual: number;
  remaining: number;
}
export default function ExternalDispatchPage() {
  const navigate = useNavigate(); // just get the navigate function
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customer, setCustomer] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    loadItems();

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
  }, []);

  const loadItems = async () => {
    try {
      const response = await fetch('/api/main-inventory/dispatch/dispatch-external');
      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          alert('لا توجد أصناف متاحة في المخزون.');
          navigate('/main-inventory'); // navigate safely here
          return;
        }
        setItems(data);
        setFilteredItems(data);
      } else {
        const errorData = await response.json();
        alert(`فشل في تحميل الأصناف: ${errorData.error || 'خطأ غير معروف'}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      alert(`فشل في تحميل الأصناف: ${errorMessage}`);
    }
  };
}


  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) {
      setFilteredItems(items);
    } else {
      setFilteredItems(
        items.filter(
          (item) =>
            item.name.toLowerCase().includes(lowerQuery) ||
            item.code.toLowerCase().includes(lowerQuery) ||
            (item.color && item.color.toLowerCase().includes(lowerQuery))
        )
      );
    }
  };

  const handleSelect = (item: Item) => {
    setSelectedItem(item);
    setQuantity('');
    setCustomer('');
    setPrice('');
    setCost('');
    setNotes('');
  };

  const saveDispatch = async () => {
    if (!selectedItem) {
      alert('يرجى اختيار صنف من الجدول');
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('الرجاء إدخال عدد صحيح موجب للكمية');
      return;
    }
    if (qty > selectedItem.remaining) {
      alert(`الكمية المصروفة (${qty}) أكبر من الكمية المتبقية (${selectedItem.remaining})`);
      return;
    }
    const priceNum = parseFloat(price);
    const costNum = parseFloat(cost);
    if (isNaN(priceNum) || isNaN(costNum)) {
      alert('الرجاء إدخال أرقام صحيحة لسعر البيع والتكلفة');
      return;
    }
    const profit = (priceNum - costNum) * qty;
    if (!confirm(`هل أنت متأكد من صرف ${qty} من الصنف: ${selectedItem.name} - ${selectedItem.code}؟\n\nالربح المتوقع: ${profit.toFixed(2)} جنيه`)) {
      return;
    }
    try {
      const response = await fetch('/api/main-inventory/dispatch/dispatch-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          qty,
          customer: customer.trim(),
          price: priceNum,
          cost: costNum,
          notes: notes.trim(),
        }),
      });
      const responseData = await response.json();
      if (response.ok) {
        alert(`تم صرف ${qty} من الصنف بنجاح\nالكمية المتبقية: ${responseData.remaining}\nالربح: ${profit.toFixed(2)} جنيه`);
        setSelectedItem(null);
        setQuantity('');
        setCustomer('');
        setPrice('');
        setCost('');
        setNotes('');
        await loadItems();
      } else {
        alert(`فشل في تسجيل الصرف: ${responseData.error || 'خطأ غير معروف'}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      alert(`فشل في تسجيل الصرف: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-gray-800 dark:from-yellow-200/90 dark:to-gray-900/90 dir-rtl">
      <div className="p-4 sm:p-6">
        {/* Static Header Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              صرف خارجي
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base text-blue-600 dark:text-blue-400">
                توقيت القاهرة: {currentTime}
              </span>
              <button
                onClick={() => router.push('/main-inventory')}
                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-xl shadow-sm hover:bg-red-700 text-sm sm:text-base"
              >
                <FiX className="w-5 h-5 ml-2" />
                إلغاء
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="relative flex items-center bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" size={20} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="بحث..."
                className="bg-transparent border-none focus:ring-0 text-base text-gray-900 dark:text-white pr-10 pl-4 py-2.5 rounded-lg w-full"
                style={{ direction: 'rtl' }}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Table Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden mb-4">
          <div className="hidden lg:block">
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-600 dark:bg-blue-800">
                    {['الصنف', 'الكود', 'اللون', 'الكراتين', 'الفردي'].map((header) => (
                      <th
                        key={header}
                        className="border border-gray-300 dark:border-gray-600 p-4 text-center text-white text-lg font-bold whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-gray-300 dark:border-gray-600',
                        selectedItem?.id === item.id
                          ? 'bg-gray-100/90 dark:bg-gray-700/90'
                          : 'hover:bg-gray-100/90 dark:hover:bg-gray-700/90'
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      <td className="p-4 text-center">{item.name}</td>
                      <td className="p-4 text-center">{item.code}</td>
                      <td className="p-4 text-center">{item.color || '-'}</td>
                      <td className="p-4 text-center">{item.cartons}</td>
                      <td className="p-4 text-center">{item.individual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:hidden space-y-4 p-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'border rounded-lg p-4 bg-white/80 dark:bg-gray-800/80',
                  selectedItem?.id === item.id
                    ? 'bg-gray-100/90 dark:bg-gray-700/90'
                    : 'hover:bg-gray-100/90 dark:hover:bg-gray-700/90'
                )}
                onClick={() => handleSelect(item)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium text-gray-900 dark:text-white">الصنف:</span> {item.name}</div>
                  <div><span className="font-medium text-gray-900 dark:text-white">الكود:</span> {item.code}</div>
                  <div><span className="font-medium text-gray-900 dark:text-white">اللون:</span> {item.color || '-'}</div>
                  <div><span className="font-medium text-gray-900 dark:text-white">الكراتين:</span> {item.cartons}</div>
                  <div><span className="font-medium text-gray-900 dark:text-white">الفردي:</span> {item.individual}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Item Info */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg p-4 sm:p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-right">
            معلومات الصنف المحدد
          </h2>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {selectedItem
              ? `الكمية المتبقية: ${selectedItem.remaining} (كراتين: ${selectedItem.cartons}، فردي: ${selectedItem.individual})`
              : 'لم يتم اختيار صنف'}
          </p>
        </div>

        {/* Dispatch Form */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-right">
            بيانات الصرف الخارجي
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'عدد القزاز المصروفة:', value: quantity, onChange: setQuantity, type: 'number', placeholder: 'عدد القزاز المصروفة' },
              { label: 'اسم الزبون:', value: customer, onChange: setCustomer, type: 'text', placeholder: 'اسم الزبون' },
              { label: 'سعر البيع (للقزازة):', value: price, onChange: setPrice, type: 'number', placeholder: 'سعر البيع' },
              { label: 'التكلفة (للقزازة):', value: cost, onChange: setCost, type: 'number', placeholder: 'التكلفة' },
              { label: 'ملاحظات:', value: notes, onChange: setNotes, type: 'text', placeholder: 'ملاحظات الصرف' },
            ].map((field, index) => (
              <div key={field.label} className="flex items-center gap-2">
                <Input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  className="p-2 text-right text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextIndex = index + 1;
                      if (nextIndex < 5) {
                        document.querySelectorAll('.dispatch-input')[nextIndex]?.focus();
                      } else {
                        saveDispatch();
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevIndex = index - 1;
                      if (prevIndex >= 0) {
                        document.querySelectorAll('.dispatch-input')[prevIndex]?.focus();
                      }
                    }
                  }}
                  className="dispatch-input"
                />
                <label className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {field.label}
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={saveDispatch}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 text-sm sm:text-base"
            >
              <FiDollarSign className="w-5 h-5 ml-2" />
              صرف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
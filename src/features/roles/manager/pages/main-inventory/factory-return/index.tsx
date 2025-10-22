
'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiArrowLeftCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Item {
  name: string;
  code: string;
  color: string | null;
  cartons: number;
  per_carton: number;
  individual: number;
  remaining: number;
}

export default function FactoryReturnPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState('');
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
      const response = await fetch('/api/main-inventory/factory-return');
      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          alert('لا توجد أصناف متاحة في المخزون.');
          router.push('/main-inventory');
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
    setNotes('');
  };

  const clearFields = () => {
    setSelectedItem(null);
    setQuantity('');
    setNotes('');
  };

  const returnToStock = async (closeAfter: boolean) => {
    if (!selectedItem) {
      alert('يرجى اختيار صنف من الجدول');
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('الرجاء إدخال عدد صحيح موجب للكمية');
      return;
    }
    try {
      const response = await fetch('/api/main-inventory/factory-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedItem.name,
          code: selectedItem.code,
          color: selectedItem.color,
          quantity: qty,
          notes: notes.trim() || null,
        }),
      });
      const responseData = await response.json();
      if (response.ok) {
        alert('تم إرجاع الكمية وتحديث المخزون وخصمها من صرف المصنع بنجاح.');
        clearFields();
        await loadItems();
        if (closeAfter) {
          router.push('/main-inventory');
        }
      } else {
        alert(`فشل في تسجيل المرتجع: ${responseData.error || 'خطأ غير معروف'}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      alert(`فشل في تسجيل المرتجع: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-gray-800 dark:from-yellow-200/90 dark:to-gray-900/90 dir-rtl flex">
      <div className="flex-1 p-4 sm:p-6 lg:pr-[300px]">
        <div className="max-w-4xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              مرتجع المصنع
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-right">
                  بيانات المرتجع
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'اسم الصنف', value: selectedItem?.name || '', readOnly: true },
                    { label: 'الكود', value: selectedItem?.code || '', readOnly: true },
                    { label: 'اللون', value: selectedItem?.color || '', readOnly: true },
                    { label: 'الكمية المرتجعة', value: quantity, onChange: setQuantity, type: 'number', placeholder: 'عدد القزاز المرتجعة' },
                    { label: 'ملاحظات', value: notes, onChange: setNotes, type: 'text', placeholder: 'ملاحظات المرتجع' },
                  ].map((field, index) => (
                    <div key={field.label} className="flex items-center gap-2">
                      <Input
                        type={field.type || 'text'}
                        value={field.value}
                        onChange={(e) => field.onChange?.(e.target.value)}
                        placeholder={field.placeholder}
                        readOnly={field.readOnly}
                        className="p-2 text-right text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg dispatch-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            const nextIndex = index + 1;
                            if (nextIndex < 5) {
                              document.querySelectorAll('.dispatch-input')[nextIndex]?.focus();
                            } else {
                              returnToStock(false);
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const prevIndex = index - 1;
                            if (prevIndex >= 0) {
                              document.querySelectorAll('.dispatch-input')[prevIndex]?.focus();
                            }
                          }
                        }}
                      />
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}:
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => returnToStock(false)}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 text-sm sm:text-base"
                  >
                    <FiArrowLeftCircle className="w-5 h-5 ml-2" />
                    إرجاع
                  </button>
                  <button
                    onClick={() => returnToStock(true)}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-xl shadow-sm hover:bg-green-700 text-sm sm:text-base"
                  >
                    <FiCheckCircle className="w-5 h-5 ml-2" />
                    إرجاع وإغلاق
                  </button>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="space-y-4">
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
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/50 dark:bg-gray-700/50">
                      {['الكمية المتبقية', 'الكراتين', 'في الكرتونة', 'الفردي', 'اللون', 'الكود', 'الصنف'].map((header) => (
                        <th key={header} className="p-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={`${item.name}-${item.code}-${item.color}`}
                        className={cn(
                          'border-b',
                          selectedItem?.name === item.name && selectedItem?.code === item.code && selectedItem?.color === item.color
                            ? 'bg-gray-100/90 dark:bg-gray-700/90'
                            : 'hover:bg-gray-100/90 dark:hover:bg-gray-700/90'
                        )}
                        onClick={() => handleSelect(item)}
                      >
                        <td className="p-3 text-right">{item.remaining}</td>
                        <td className="p-3 text-right">{item.cartons}</td>
                        <td className="p-3 text-right">{item.per_carton}</td>
                        <td className="p-3 text-right">{item.individual}</td>
                        <td className="p-3 text-right">{item.color || '-'}</td>
                        <td className="p-3 text-right">{item.code}</td>
                        <td className="p-3 text-right">{item.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden space-y-4">
                {filteredItems.map((item) => (
                  <div
                    key={`${item.name}-${item.code}-${item.color}`}
                    className={cn(
                      'border rounded-lg p-4 bg-white/80 dark:bg-gray-800/80',
                      selectedItem?.name === item.name && selectedItem?.code === item.code && selectedItem?.color === item.color
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
                      <div><span className="font-medium text-gray-900 dark:text-white">في الكرتونة:</span> {item.per_carton}</div>
                      <div><span className="font-medium text-gray-900 dark:text-white">الفردي:</span> {item.individual}</div>
                      <div><span className="font-medium text-gray-900 dark:text-white">المتبقية:</span> {item.remaining}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

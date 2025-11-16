// src/app/factory-return/page.tsx
import { useState, useEffect } from 'react';
import { FiSearch, FiArrowLeftCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { Input } from '@manager-ui/Input';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom'; 
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirestore } from '../../firebase/config';


interface Item {
  id: string;
  name: string;
  code: string;
  color: string | null;
  cartons_count: number;
  bottles_per_carton: number;
  single_bottles: number;
  remaining_quantity: number;
  warehouseId: string;
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
  const [isLoading, setIsLoading] = useState(false);

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
      setIsLoading(true);
      const warehouseItemsRef = collection(db, 'warehouseItems');
      const q = query(
        warehouseItemsRef,
        where('warehouseId', '==', 'main-inventory'),
        where('remaining_quantity', '>', 0),
        orderBy('remaining_quantity', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const itemsData: Item[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          itemsData.push({
            id: doc.id,
            name: data.name || '',
            code: data.code || '',
            color: data.color || null,
            cartons_count: data.cartons_count || 0,
            bottles_per_carton: data.bottles_per_carton || 0,
            single_bottles: data.single_bottles || 0,
            remaining_quantity: data.remaining_quantity || 0,
            warehouseId: data.warehouseId || 'main-inventory'
          });
        });

        if (itemsData.length === 0) {
          alert('لا توجد أصناف متاحة في المخزون.');
          router.push('/main-inventory');
          return;
        }

        setItems(itemsData);
        setFilteredItems(itemsData);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error: any) {
      console.error('Error loading items:', error);
      alert(`فشل في تحميل الأصناف: ${error.message || 'خطأ غير معروف'}`);
      setIsLoading(false);
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
    if (qty > selectedItem.remaining_quantity) {
      alert('الكمية المرتجعة أكبر من الكمية المتاحة في المخزون');
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the upsertItem function to add the returned quantity back to inventory
      const upsertItem = httpsCallable(functions, 'upsertItem');
      const result = await upsertItem({
        warehouseId: selectedItem.warehouseId,
        name: selectedItem.name,
        code: selectedItem.code,
        color: selectedItem.color || '',
        cartonsAdded: 0, // We're adding individual bottles, not cartons
        bottlesPerCarton: selectedItem.bottles_per_carton,
        singleBottles: qty, // Add the returned quantity as individual bottles
        notes: `مرتجع مصنع: ${notes.trim()}`,
        supplier: '', // Keep existing supplier
        location: '', // Keep existing location
        docId: selectedItem.id // Update existing item
      });

      if (result.data.success) {
        // Create a movement record for the factory return
        const createMovement = httpsCallable(functions, 'createFactoryReturnMovement');
        await createMovement({
          warehouseItemId: selectedItem.id,
          itemName: selectedItem.name,
          itemCode: selectedItem.code,
          itemColor: selectedItem.color,
          returnedQuantity: qty,
          notes: notes.trim() || 'مرتجع مصنع',
          previousQuantity: selectedItem.remaining_quantity,
          newQuantity: selectedItem.remaining_quantity + qty
        });

        alert('تم إرجاع الكمية وتحديث المخزون بنجاح.');
        clearFields();
        if (closeAfter) {
          router.push('/main-inventory');
        }
      } else {
        alert(`فشل في تسجيل المرتجع: ${result.data.message || 'خطأ غير معروف'}`);
      }
    } catch (error: any) {
      console.error('Return to stock error:', error);
      alert(`فشل في تسجيل المرتجع: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setIsLoading(false);
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
                disabled={isLoading}
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
                        disabled={isLoading}
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
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <FiArrowLeftCircle className="w-5 h-5 ml-2" />
                    {isLoading ? 'جاري المعالجة...' : 'إرجاع'}
                  </button>
                  <button
                    onClick={() => returnToStock(true)}
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-xl shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <FiCheckCircle className="w-5 h-5 ml-2" />
                    {isLoading ? 'جاري المعالجة...' : 'إرجاع وإغلاق'}
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
                  disabled={isLoading}
                  className="bg-transparent border-none focus:ring-0 text-base text-gray-900 dark:text-white pr-10 pl-4 py-2.5 rounded-lg w-full"
                  style={{ direction: 'rtl' }}
                />
              </div>
              
              {isLoading && items.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
                </div>
              ) : (
                <>
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
                            key={item.id}
                            className={cn(
                              'border-b cursor-pointer',
                              selectedItem?.id === item.id
                                ? 'bg-gray-100/90 dark:bg-gray-700/90'
                                : 'hover:bg-gray-100/90 dark:hover:bg-gray-700/90'
                            )}
                            onClick={() => handleSelect(item)}
                          >
                            <td className="p-3 text-right">{item.remaining_quantity}</td>
                            <td className="p-3 text-right">{item.cartons_count}</td>
                            <td className="p-3 text-right">{item.bottles_per_carton}</td>
                            <td className="p-3 text-right">{item.single_bottles}</td>
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
                        key={item.id}
                        className={cn(
                          'border rounded-lg p-4 bg-white/80 dark:bg-gray-800/80 cursor-pointer',
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
                          <div><span className="font-medium text-gray-900 dark:text-white">الكراتين:</span> {item.cartons_count}</div>
                          <div><span className="font-medium text-gray-900 dark:text-white">في الكرتونة:</span> {item.bottles_per_carton}</div>
                          <div><span className="font-medium text-gray-900 dark:text-white">الفردي:</span> {item.single_bottles}</div>
                          <div><span className="font-medium text-gray-900 dark:text-white">المتبقية:</span> {item.remaining_quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
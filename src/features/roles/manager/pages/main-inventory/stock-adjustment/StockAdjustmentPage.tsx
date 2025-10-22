// src/features/roles/manager/pages/main-inventory/stock-adjustment/StockAdjustmentPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface InventoryItem {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  remaining_quantity: number;
  location: string;
  supplier: string;
  min_stock_level: number;
  max_stock_level: number;
  is_active: boolean;
}

interface StockAdjustmentForm {
  inventory_item_id: number;
  adjustment_type: 'ADD' | 'DEDUCT' | 'REVERSE_ADD' | 'REVERSE_DEDUCT';
  quantity: number;
  reason: string;
  notes: string;
  reference_number?: string;
}

interface AdjustmentHistory {
  id: number;
  item_name: string;
  item_code: string;
  adjustment_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_by: string;
  created_at: string;
  notes: string;
}

const StockAdjustmentPage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewAdjustment, setPreviewAdjustment] = useState<{
    type: string;
    quantity: number;
    current: number;
    new: number;
  } | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<StockAdjustmentForm>();

  const adjustmentType = watch('adjustment_type');
  const quantity = watch('quantity');
  const itemId = watch('inventory_item_id');

  // Fetch inventory items
  const fetchInventoryItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/inventory/items', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل عناصر المخزون');
      }

      const data = await response.json();
      setInventoryItems(data.items || []);

      await logSecurityEvent('STOCK_ADJUSTMENT_VIEW', 'تم عرض صفحة تعديل المخزون', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('STOCK_ADJUSTMENT_VIEW', `فشل عرض تعديل المخزون: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]);

  // Filter items based on search and active status
  useEffect(() => {
    let filtered = inventoryItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!showInactive) {
      filtered = filtered.filter(item => item.is_active);
    }

    setFilteredItems(filtered);
  }, [inventoryItems, searchTerm, showInactive]);

  // Update selected item when item ID changes
  useEffect(() => {
    if (itemId) {
      const item = inventoryItems.find(i => i.id === parseInt(itemId.toString()));
      setSelectedItem(item || null);
    } else {
      setSelectedItem(null);
    }
  }, [itemId, inventoryItems]);

  // Calculate preview adjustment
  useEffect(() => {
    if (selectedItem && quantity && adjustmentType) {
      const currentQty = selectedItem.remaining_quantity;
      let newQty = currentQty;

      switch (adjustmentType) {
        case 'ADD':
          newQty = currentQty + quantity;
          break;
        case 'DEDUCT':
          newQty = currentQty - quantity;
          break;
        case 'REVERSE_ADD':
          newQty = currentQty - quantity;
          break;
        case 'REVERSE_DEDUCT':
          newQty = currentQty + quantity;
          break;
      }

      setPreviewAdjustment({
        type: getAdjustmentTypeLabel(adjustmentType),
        quantity,
        current: currentQty,
        new: newQty
      });
    } else {
      setPreviewAdjustment(null);
    }
  }, [selectedItem, quantity, adjustmentType]);

  const logSecurityEvent = async (eventType: string, description: string, success: boolean) => {
    try {
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          event_type: eventType,
          event_description: description,
          success,
          severity: success ? 'INFO' : 'ERROR',
          details: { component: 'StockAdjustment' }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const getAdjustmentTypeLabel = (type: string): string => {
    switch (type) {
      case 'ADD': return 'إضافة';
      case 'DEDUCT': return 'خصم';
      case 'REVERSE_ADD': return 'تراجع إضافة';
      case 'REVERSE_DEDUCT': return 'تراجع خصم';
      default: return type;
    }
  };

  const getAdjustmentTypeColor = (type: string): string => {
    switch (type) {
      case 'ADD':
      case 'REVERSE_DEDUCT':
        return 'text-green-600 dark:text-green-400';
      case 'DEDUCT':
      case 'REVERSE_ADD':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const validateAdjustment = (data: StockAdjustmentForm): string | null => {
    if (!selectedItem) return 'يرجى اختيار عنصر من المخزون';

    const currentQty = selectedItem.remaining_quantity;

    if (data.adjustment_type === 'DEDUCT' && currentQty < data.quantity) {
      return `الكمية المتاحة غير كافية. المتاح: ${currentQty}، المطلوب: ${data.quantity}`;
    }

    if (data.adjustment_type === 'REVERSE_ADD' && currentQty < data.quantity) {
      return `الكمية المتاحة غير كافية للتراجع. المتاح: ${currentQty}، المطلوب: ${data.quantity}`;
    }

    if (data.quantity <= 0) {
      return 'الكمية يجب أن تكون أكبر من الصفر';
    }

    return null;
  };

  const onSubmit = async (data: StockAdjustmentForm) => {
    try {
      const validationError = validateAdjustment(data);
      if (validationError) {
        setError(validationError);
        return;
      }

      setAdjusting(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/inventory/adjust-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          item_id: data.inventory_item_id,
          quantity: data.quantity,
          operation: data.adjustment_type,
          reason: data.reason,
          notes: data.notes,
          reference_number: data.reference_number,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تعديل المخزون');
      }

      const result = await response.json();

      // Update local state
      setInventoryItems(prev => prev.map(item =>
        item.id === data.inventory_item_id
          ? { ...item, remaining_quantity: result.new_quantity }
          : item
      ));

      setSuccess(`تم تعديل المخزون بنجاح. الكمية الجديدة: ${result.new_quantity}`);
      reset();

      // Log security event
      await logSecurityEvent(
        'STOCK_ADJUSTMENT',
        `تم تعديل مخزون ${selectedItem?.item_name}: ${getAdjustmentTypeLabel(data.adjustment_type)} ${data.quantity} وحدة`,
        true
      );

      // Refresh items to get updated quantities
      fetchInventoryItems();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تعديل المخزون');
      await logSecurityEvent(
        'STOCK_ADJUSTMENT',
        `فشل تعديل المخزون: ${err.message}`,
        false
      );
    } finally {
      setAdjusting(false);
    }
  };

  const fetchAdjustmentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/adjustment-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل سجل التعديلات');
      }

      const data = await response.json();
      setAdjustmentHistory(data.history || []);
      setShowHistory(true);

      await logSecurityEvent('ADJUSTMENT_HISTORY_VIEW', 'تم عرض سجل تعديلات المخزون', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل السجل');
      await logSecurityEvent('ADJUSTMENT_HISTORY_VIEW', `فشل عرض سجل التعديلات: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const getStockLevelColor = (quantity: number, min: number, max: number): string => {
    if (quantity === 0) return 'text-red-600 dark:text-red-400';
    if (quantity < min) return 'text-amber-600 dark:text-amber-400';
    if (quantity > max) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStockLevelBadge = (quantity: number, min: number, max: number) => {
    if (quantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
          نفذ المخزون
        </span>
      );
    }
    if (quantity < min) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          أقل من الحد الأدنى
        </span>
      );
    }
    if (quantity > max) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          فوق الحد الأقصى
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
        طبيعي
      </span>
    );
  };

  const renderAdjustmentHistory = () => {
    if (!showHistory) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              سجل تعديلات المخزون
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {adjustmentHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">لا توجد تعديلات مسجلة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">العنصر</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">نوع التعديل</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">السابق</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">الجديد</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">السبب</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">المستخدم</th>
                      <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustmentHistory.map((history) => (
                      <tr key={history.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3">
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">{history.item_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{history.item_code}</div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`font-medium ${getAdjustmentTypeColor(history.adjustment_type)}`}>
                            {getAdjustmentTypeLabel(history.adjustment_type)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`font-medium ${getAdjustmentTypeColor(history.adjustment_type)}`}>
                            {history.quantity}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{history.previous_quantity}</td>
                        <td className="py-3 font-medium text-gray-900 dark:text-white">{history.new_quantity}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{history.reason}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{history.created_by}</td>
                        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(history.created_at).toLocaleDateString('ar-EG')}
                          <br />
                          {new Date(history.created_at).toLocaleTimeString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                تعديل المخزون
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                إدارة وتعديل كميات المخزون مع التتبع الكامل للتغييرات
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button
                onClick={fetchAdjustmentHistory}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                سجل التعديلات
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Adjustment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                نموذج تعديل المخزون
              </h2>

              {/* Error/Success Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{success}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    اختر العنصر المراد تعديله *
                  </label>
                  <select
                    {...register('inventory_item_id', { required: 'اختيار العنصر مطلوب' })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  >
                    <option value="">اختر عنصر من المخزون</option>
                    {filteredItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} - {item.item_code} ({item.remaining_quantity} متاح)
                      </option>
                    ))}
                  </select>
                  {errors.inventory_item_id && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.inventory_item_id.message}</p>
                  )}
                </div>

                {/* Selected Item Details */}
                {selectedItem && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">تفاصيل العنصر المحدد</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الكمية الحالية:</span>
                        <span className={`font-semibold mr-2 ${getStockLevelColor(
                          selectedItem.remaining_quantity,
                          selectedItem.min_stock_level,
                          selectedItem.max_stock_level
                        )}`}>
                          {selectedItem.remaining_quantity}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الحالة:</span>
                        <span className="mr-2">
                          {getStockLevelBadge(
                            selectedItem.remaining_quantity,
                            selectedItem.min_stock_level,
                            selectedItem.max_stock_level
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الحد الأدنى:</span>
                        <span className="font-medium mr-2">{selectedItem.min_stock_level}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الحد الأقصى:</span>
                        <span className="font-medium mr-2">{selectedItem.max_stock_level}</span>
                      </div>
                      {selectedItem.location && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">الموقع:</span>
                          <span className="font-medium mr-2">{selectedItem.location}</span>
                        </div>
                      )}
                      {selectedItem.supplier && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">المورد:</span>
                          <span className="font-medium mr-2">{selectedItem.supplier}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Adjustment Type and Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      نوع التعديل *
                    </label>
                    <select
                      {...register('adjustment_type', { required: 'نوع التعديل مطلوب' })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    >
                      <option value="">اختر نوع التعديل</option>
                      <option value="ADD">إضافة إلى المخزون</option>
                      <option value="DEDUCT">خصم من المخزون</option>
                      <option value="REVERSE_ADD">تراجع عن إضافة سابقة</option>
                      <option value="REVERSE_DEDUCT">تراجع عن خصم سابق</option>
                    </select>
                    {errors.adjustment_type && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.adjustment_type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      الكمية *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      {...register('quantity', { 
                        required: 'الكمية مطلوبة',
                        min: { value: 1, message: 'الكمية يجب أن تكون 1 على الأقل' }
                      })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                      placeholder="أدخل الكمية"
                    />
                    {errors.quantity && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.quantity.message}</p>
                    )}
                  </div>
                </div>

                {/* Preview Adjustment */}
                {previewAdjustment && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">معاينة التعديل</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold">{previewAdjustment.current}</div>
                        <div className="text-blue-500 dark:text-blue-300">الحالي</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold ${getAdjustmentTypeColor(adjustmentType)}`}>
                          {previewAdjustment.type} {previewAdjustment.quantity}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">التعديل</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 dark:text-green-400 font-semibold">{previewAdjustment.new}</div>
                        <div className="text-green-500 dark:text-green-300">الجديد</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason and Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    سبب التعديل *
                  </label>
                  <select
                    {...register('reason', { required: 'سبب التعديل مطلوب' })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  >
                    <option value="">اختر سبب التعديل</option>
                    <option value="INVENTORY_COUNT">جرد مخزون</option>
                    <option value="DAMAGED_GOODS">بضائع تالفة</option>
                    <option value="RETURNED_GOODS">بضائع مرتجعة</option>
                    <option value="PURCHASE_ORDER">أمر شراء</option>
                    <option value="SALES_ORDER">أمر بيع</option>
                    <option value="STOCK_TRANSFER">تحويل مخزون</option>
                    <option value="QUALITY_CONTROL">مراقبة الجودة</option>
                    <option value="SYSTEM_CORRECTION">تصحيح نظام</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                  {errors.reason && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.reason.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    ملاحظات إضافية
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    placeholder="أدخل أي ملاحظات إضافية حول التعديل..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    رقم المرجع (اختياري)
                  </label>
                  <input
                    type="text"
                    {...register('reference_number')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    placeholder="مثال: PO-12345, INV-67890"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={adjusting || !selectedItem}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {adjusting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التعديل...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      تأكيد التعديل
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Quick Actions and Info */}
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">البحث والتصفية</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    بحث سريع
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث بالاسم أو الكود..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showInactive"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="showInactive" className="text-sm text-gray-700 dark:text-gray-300">
                    إظهار العناصر غير النشطة
                  </label>
                </div>
              </div>
            </div>

            {/* Adjustment Types Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">دليل أنواع التعديل</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">إضافة إلى المخزون</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">لإضافة كميات جديدة للمخزون</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">خصم من المخزون</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">لخصم كميات من المخزون</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">تراجع عن إضافة</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">لتراجع عن إضافة سابقة</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">تراجع عن خصم</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">لتراجع عن خصم سابق</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">إحصائيات سريعة</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إجمالي العناصر:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{inventoryItems.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">العناصر النشطة:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {inventoryItems.filter(item => item.is_active).length}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">نتيجة البحث:</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{filteredItems.length}</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-right">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    تنبيه أمان
                  </h4>
                  <p className="text-amber-700 dark:text-amber-400 text-sm">
                    جميع تعديلات المخزون مسجلة ومراقبة. تأكد من صحة البيانات قبل التأكيد.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Adjustment History Modal */}
        {renderAdjustmentHistory()}
      </div>
    </div>
  );
};

export default StockAdjustmentPage;
// src/features/roles/worker/pages/FactoryOperationsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface FactoryDispatch {
  id: number;
  uuid: string;
  invoice_number: string;
  recipient: string;
  dispatch_type: 'GLASS_ONLY' | 'GLASS_WITH_ACCESSORIES';
  total_amount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes: string;
  created_by: number;
  created_at: string;
  items: FactoryDispatchItem[];
}

interface FactoryDispatchItem {
  id: number;
  uuid: string;
  inventory_item_id: number;
  accessory_item_id: number | null;
  item_name: string;
  item_code: string;
  color: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  unit_type: string;
  notes: string;
  inventory_stock: number;
  accessory_stock?: {
    individual_items: number;
    pump_quantity: number;
    ring_quantity: number;
    cover_quantity: number;
    ribbon_quantity: number;
    sticker_quantity: number;
    tag_quantity: number;
  };
}

interface InventoryItem {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  remaining_quantity: number;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
}

interface AccessoryItem {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  accessory_color: string;
  individual_items: number;
  pump_quantity: number;
  ring_quantity: number;
  cover_quantity: number;
  ribbon_quantity: number;
  sticker_quantity: number;
  tag_quantity: number;
  is_active: boolean;
}

interface DispatchFormData {
  recipient: string;
  dispatch_type: 'GLASS_ONLY' | 'GLASS_WITH_ACCESSORIES';
  items: Array<{
    inventory_item_id: number;
    accessory_item_id: number | null;
    quantity: number;
    unit_price: number;
    notes: string;
  }>;
  notes: string;
}

interface ReturnFormData {
  return_type: 'GLASS_ONLY' | 'GLASS_WITH_ACCESSORIES';
  notes: string;
}

const FactoryOperationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'returns' | 'history'>('dispatch');
  const [dispatches, setDispatches] = useState<FactoryDispatch[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [accessoryItems, setAccessoryItems] = useState<AccessoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDispatch, setSelectedDispatch] = useState<FactoryDispatch | null>(null);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { register: registerDispatch, handleSubmit: handleSubmitDispatch, reset: resetDispatch, watch: watchDispatch, setValue: setDispatchValue, formState: { errors: errorsDispatch } } = useForm<DispatchFormData>();
  const { register: registerReturn, handleSubmit: handleSubmitReturn, reset: resetReturn, formState: { errors: errorsReturn } } = useForm<ReturnFormData>();

  const dispatchType = watchDispatch('dispatch_type');
  const dispatchItems = watchDispatch('items') || [];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [dispatchesResponse, inventoryResponse, accessoriesResponse] = await Promise.all([
        fetch('/api/factory/dispatches', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/inventory/items', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/accessory/items', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!dispatchesResponse.ok) {
        throw new Error('فشل في تحميل تحويلات المصنع');
      }

      const dispatchesData = await dispatchesResponse.json();
      setDispatches(dispatchesData.dispatches || []);

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventoryItems(inventoryData.items || []);
      }

      if (accessoriesResponse.ok) {
        const accessoriesData = await accessoriesResponse.json();
        setAccessoryItems(accessoriesData.items || []);
      }

      await logSecurityEvent('FACTORY_OPERATIONS_VIEW', 'عرض عمليات المصنع', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('FACTORY_OPERATIONS_VIEW', `فشل عرض عمليات المصنع: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          details: { component: 'FactoryOperations', tab: activeTab }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const handleCreateDispatch = () => {
    setShowDispatchForm(true);
    resetDispatch({
      recipient: '',
      dispatch_type: 'GLASS_ONLY',
      notes: '',
      items: []
    });
  };

  const handleAddDispatchItem = () => {
    const newItems = [...dispatchItems, {
      inventory_item_id: 0,
      accessory_item_id: null,
      quantity: 1,
      unit_price: 0,
      notes: ''
    }];
    setDispatchValue('items', newItems);
  };

  const handleRemoveDispatchItem = (index: number) => {
    const newItems = dispatchItems.filter((_, i) => i !== index);
    setDispatchValue('items', newItems);
  };

  const handleDispatchItemChange = (index: number, field: string, value: any) => {
    const newItems = [...dispatchItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-set unit price based on selected inventory item
    if (field === 'inventory_item_id' && value) {
      const selectedItem = inventoryItems.find(item => item.id === value);
      if (selectedItem) {
        newItems[index].unit_price = selectedItem.cost_price || 0;
      }
    }
    
    setDispatchValue('items', newItems);
  };

  const validateDispatch = (data: DispatchFormData): string | null => {
    if (!data.recipient?.trim()) {
      return 'اسم المستلم مطلوب';
    }

    if (data.items.length === 0) {
      return 'يجب إضافة عنصر واحد على الأقل للتحويل';
    }

    for (const item of data.items) {
      if (!item.inventory_item_id) {
        return 'يجب اختيار عنصر المخزون لكل بند';
      }

      if (item.quantity <= 0) {
        return 'الكمية يجب أن تكون أكبر من الصفر';
      }

      // Check stock availability
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventory_item_id);
      if (inventoryItem && inventoryItem.remaining_quantity < item.quantity) {
        return `الكمية غير متوفرة للعنصر ${inventoryItem.item_name}. المتاح: ${inventoryItem.remaining_quantity}`;
      }

      // Check accessory availability if GLASS_WITH_ACCESSORIES
      if (data.dispatch_type === 'GLASS_WITH_ACCESSORIES' && item.accessory_item_id) {
        const accessoryItem = accessoryItems.find(acc => acc.id === item.accessory_item_id);
        if (accessoryItem) {
          if (accessoryItem.individual_items < item.quantity) {
            return `القطع الفردية غير كافية للملحق ${accessoryItem.item_name}. المتاح: ${accessoryItem.individual_items}`;
          }
          if (accessoryItem.pump_quantity < item.quantity) {
            return `الطرمبات غير كافية للملحق ${accessoryItem.item_name}. المتاح: ${accessoryItem.pump_quantity}`;
          }
        }
      }
    }

    return null;
  };

  const onSubmitDispatch = async (data: DispatchFormData) => {
    try {
      const validationError = validateDispatch(data);
      if (validationError) {
        setError(validationError);
        return;
      }

      setProcessing(true);
      setError('');
      setSuccess('');

      const dispatchData = {
        recipient: data.recipient,
        dispatch_type: data.dispatch_type,
        details: data.items.map(item => ({
          inventory_item_id: item.inventory_item_id,
          accessory_item_id: item.accessory_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes
        })),
        notes: data.notes,
        user_id: await getCurrentUserId()
      };

      const response = await fetch('/api/factory/dispatches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(dispatchData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إنشاء تحويل المصنع');
      }

      const result = await response.json();

      setSuccess(`تم إنشاء تحويل المصنع ${result.invoice_number} بنجاح`);
      setShowDispatchForm(false);
      resetDispatch();
      fetchData(); // Refresh data

      await logSecurityEvent(
        'FACTORY_DISPATCH_CREATE',
        `تم إنشاء تحويل مصنع: ${result.invoice_number} - ${data.dispatch_type}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء تحويل المصنع');
      await logSecurityEvent(
        'FACTORY_DISPATCH_CREATE',
        `فشل إنشاء تحويل مصنع: ${err.message}`,
        false
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessReturn = async (dispatch: FactoryDispatch) => {
    setSelectedDispatch(dispatch);
    setShowReturnForm(true);
    resetReturn({
      return_type: 'GLASS_ONLY',
      notes: ''
    });
  };

  const onSubmitReturn = async (data: ReturnFormData) => {
    if (!selectedDispatch) return;

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/factory/dispatches/${selectedDispatch.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          return_type: data.return_type,
          notes: data.notes,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في معالجة المرتجع');
      }

      const result = await response.json();

      setSuccess(`تم معالجة مرتجع المصنع ${result.return_invoice_number} بنجاح`);
      setShowReturnForm(false);
      setSelectedDispatch(null);
      fetchData(); // Refresh data

      await logSecurityEvent(
        'FACTORY_RETURN_PROCESS',
        `تم معالجة مرتجع مصنع: ${result.return_invoice_number} - ${data.return_type}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء معالجة المرتجع');
      await logSecurityEvent(
        'FACTORY_RETURN_PROCESS',
        `فشل معالجة مرتجع مصنع: ${err.message}`,
        false
      );
    } finally {
      setProcessing(false);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const getDispatchTypeLabel = (type: string): string => {
    switch (type) {
      case 'GLASS_ONLY': return 'زجاج فقط';
      case 'GLASS_WITH_ACCESSORIES': return 'زجاج مع ملحقات';
      default: return type;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'DRAFT': return 'مسودة';
      case 'SUBMITTED': return 'مقدمة';
      case 'APPROVED': return 'معتمدة';
      case 'REJECTED': return 'مرفوضة';
      case 'COMPLETED': return 'مكتملة';
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const canProcessReturn = (dispatch: FactoryDispatch): boolean => {
    // Only completed dispatches can be returned
    return dispatch.status === 'COMPLETED';
  };

  const filteredDispatches = dispatches.filter(dispatch => {
    const matchesSearch = dispatch.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.recipient.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = (!dateRange.start || new Date(dispatch.created_at) >= new Date(dateRange.start)) &&
                       (!dateRange.end || new Date(dispatch.created_at) <= new Date(dateRange.end));
    
    return matchesSearch && matchesDate;
  });

  const renderDispatchForm = () => {
    if (!showDispatchForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              تحويل جديد إلى المصنع
            </h3>
            <button
              onClick={() => setShowDispatchForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmitDispatch(onSubmitDispatch)} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  المستلم *
                </label>
                <input
                  type="text"
                  {...registerDispatch('recipient', { required: 'اسم المستلم مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل اسم المستلم في المصنع"
                />
                {errorsDispatch.recipient && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsDispatch.recipient.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  نوع التحويل *
                </label>
                <select
                  {...registerDispatch('dispatch_type', { required: 'نوع التحويل مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="GLASS_ONLY">زجاج فقط</option>
                  <option value="GLASS_WITH_ACCESSORIES">زجاج مع ملحقات</option>
                </select>
                {errorsDispatch.dispatch_type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsDispatch.dispatch_type.message}
                  </p>
                )}
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white text-right">عناصر التحويل</h4>
                <button
                  type="button"
                  onClick={handleAddDispatchItem}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة عنصر
                </button>
              </div>

              {dispatchItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">لم تتم إضافة أي عناصر بعد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dispatchItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900 dark:text-white text-right">عنصر #{index + 1}</h5>
                        <button
                          type="button"
                          onClick={() => handleRemoveDispatchItem(index)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            عنصر المخزون *
                          </label>
                          <select
                            value={item.inventory_item_id}
                            onChange={(e) => handleDispatchItemChange(index, 'inventory_item_id', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          >
                            <option value={0}>اختر العنصر</option>
                            {inventoryItems.filter(invItem => invItem.is_active && invItem.remaining_quantity > 0).map(invItem => (
                              <option key={invItem.id} value={invItem.id}>
                                {invItem.item_name} - {invItem.item_code} ({invItem.remaining_quantity} متاح)
                              </option>
                            ))}
                          </select>
                        </div>

                        {dispatchType === 'GLASS_WITH_ACCESSORIES' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                              الملحقات
                            </label>
                            <select
                              value={item.accessory_item_id || 0}
                              onChange={(e) => handleDispatchItemChange(index, 'accessory_item_id', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                            >
                              <option value={0}>اختر الملحقات (اختياري)</option>
                              {accessoryItems.filter(accItem => accItem.is_active).map(accItem => (
                                <option key={accItem.id} value={accItem.id}>
                                  {accItem.item_name} - {accItem.item_code}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            الكمية *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleDispatchItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            سعر الوحدة
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleDispatchItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                          ملاحظات
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleDispatchItemChange(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          placeholder="ملاحظات حول العنصر"
                        />
                      </div>

                      {item.inventory_item_id > 0 && item.quantity > 0 && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400 text-right">
                          الإجمالي: {(item.quantity * item.unit_price).toLocaleString('ar-EG')} ر.س
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                ملاحظات عامة
              </label>
              <textarea
                {...registerDispatch('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                placeholder="أدخل أي ملاحظات حول التحويل..."
              />
            </div>

            {dispatchItems.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-blue-900 dark:text-blue-300 font-medium text-right">الإجمالي:</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {dispatchItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0).toLocaleString('ar-EG')} ر.س
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDispatchForm(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={processing || dispatchItems.length === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء التحويل'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderReturnForm = () => {
    if (!showReturnForm || !selectedDispatch) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              معالجة مرتجع المصنع
            </h3>
            <button
              onClick={() => setShowReturnForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmitReturn(onSubmitReturn)} className="p-6">
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-right">التحويل الأصلي</p>
              <p className="font-medium text-gray-900 dark:text-white text-right">{selectedDispatch.invoice_number}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-right">المستلم: {selectedDispatch.recipient}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  نوع المرتجع *
                </label>
                <select
                  {...registerReturn('return_type', { required: 'نوع المرتجع مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="GLASS_ONLY">زجاج فقط</option>
                  <option value="GLASS_WITH_ACCESSORIES">زجاج مع ملحقات</option>
                </select>
                {errorsReturn.return_type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsReturn.return_type.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  ملاحظات
                </label>
                <textarea
                  {...registerReturn('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="ملاحظات حول المرتجع..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowReturnForm(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  'معالجة المرتجع'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل عمليات المصنع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-right">
            عمليات المصنع
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة تحويلات ومرتجعات المصنع
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 space-x-reverse px-6">
              {[
                { id: 'dispatch', name: 'تحويلات المصنع', icon: '🚚' },
                { id: 'returns', name: 'المرتجعات', icon: '↩️' },
                { id: 'history', name: 'السجل', icon: '📋' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="ml-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Actions Bar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-6">
              <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:max-w-xs">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                    placeholder="بحث برقم التحويل أو اسم المستلم..."
                  />
                </div>

                {/* Date Range */}
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {activeTab === 'dispatch' && (
                <button
                  onClick={handleCreateDispatch}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm w-full lg:w-auto justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  تحويل جديد
                </button>
              )}
            </div>

            {/* Content */}
            {activeTab === 'dispatch' && (
              <div className="overflow-x-auto">
                {filteredDispatches.filter(d => d.status !== 'COMPLETED').length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد تحويلات</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على تحويلات مطابقة لمعايير البحث.</p>
                    <button
                      onClick={handleCreateDispatch}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                    >
                      إنشاء أول تحويل
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">رقم التحويل</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المستلم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">النوع</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredDispatches.filter(d => d.status !== 'COMPLETED').map((dispatch) => (
                        <tr key={dispatch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">{dispatch.invoice_number}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{dispatch.recipient}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {getDispatchTypeLabel(dispatch.dispatch_type)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(dispatch.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-left font-medium text-green-600 dark:text-green-400">
                              {dispatch.total_amount.toLocaleString('ar-EG')} ر.س
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispatch.status)}`}>
                              {getStatusLabel(dispatch.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {canProcessReturn(dispatch) && (
                                <button
                                  onClick={() => handleProcessReturn(dispatch)}
                                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-xs font-medium"
                                >
                                  معالجة مرتجع
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="overflow-x-auto">
                {filteredDispatches.filter(d => d.status === 'COMPLETED').length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد مرتجعات</h3>
                    <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على مرتجعات مطابقة لمعايير البحث.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">رقم التحويل</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المستلم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">النوع</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">تاريخ الإرجاع</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredDispatches.filter(d => d.status === 'COMPLETED').map((dispatch) => (
                        <tr key={dispatch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">{dispatch.invoice_number}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{dispatch.recipient}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {getDispatchTypeLabel(dispatch.dispatch_type)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(dispatch.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-left font-medium text-green-600 dark:text-green-400">
                              {dispatch.total_amount.toLocaleString('ar-EG')} ر.س
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispatch.status)}`}>
                              {getStatusLabel(dispatch.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="overflow-x-auto">
                {filteredDispatches.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد سجلات</h3>
                    <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على سجلات مطابقة لمعايير البحث.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">رقم التحويل</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المستلم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">النوع</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredDispatches.map((dispatch) => (
                        <tr key={dispatch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">{dispatch.invoice_number}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{dispatch.recipient}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {getDispatchTypeLabel(dispatch.dispatch_type)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(dispatch.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-left font-medium text-green-600 dark:text-green-400">
                              {dispatch.total_amount.toLocaleString('ar-EG')} ر.س
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispatch.status)}`}>
                              {getStatusLabel(dispatch.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderDispatchForm()}
      {renderReturnForm()}
    </div>
  );
};

export default FactoryOperationsPage;
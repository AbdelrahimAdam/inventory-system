// src/features/roles/manager/pages/accessories/AccessoryManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface AccessoryItem {
  id: number;
  uuid: string;
  item_name: string;
  item_code: string;
  accessory_color: string;
  supplier: string;
  location: string;
  notes: string;
  carton_quantity: number;
  items_per_carton: number;
  individual_items: number;
  pump_quantity: number;
  ring_quantity: number;
  cover_quantity: number;
  ribbon_quantity: number;
  sticker_quantity: number;
  tag_quantity: number;
  added_date: string;
  is_active: boolean;
  created_by: number;
  total_quantity?: number;
}

interface AccessoryFormData {
  item_name: string;
  item_code: string;
  accessory_color: string;
  supplier: string;
  location: string;
  notes: string;
  carton_quantity: number;
  items_per_carton: number;
  individual_items: number;
  pump_quantity: number;
  ring_quantity: number;
  cover_quantity: number;
  ribbon_quantity: number;
  sticker_quantity: number;
  tag_quantity: number;
}

interface StockMovement {
  id: number;
  item_name: string;
  item_code: string;
  movement_type: string;
  quantity_in: number;
  quantity_out: number;
  balance_after: number;
  created_at: string;
  notes: string;
}

const AccessoryManagementPage: React.FC = () => {
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);
  const [filteredAccessories, setFilteredAccessories] = useState<AccessoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editingItem, setEditingItem] = useState<AccessoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [showMovements, setShowMovements] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AccessoryFormData>();

  // Fetch accessories from API
  const fetchAccessories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/accessories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الملحقات');
      }

      const data = await response.json();
      setAccessories(data.accessories || []);

      // Log security event
      await logSecurityEvent('ACCESSORY_VIEW', 'تم عرض قائمة الملحقات', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('ACCESSORY_VIEW', `فشل عرض الملحقات: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  // Filter accessories based on search and active status
  useEffect(() => {
    let filtered = accessories;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.accessory_color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter(item => item.is_active);
    }

    // Calculate total quantity for each item
    filtered = filtered.map(item => ({
      ...item,
      total_quantity: calculateTotalQuantity(item)
    }));

    setFilteredAccessories(filtered);
  }, [accessories, searchTerm, showInactive]);

  const calculateTotalQuantity = (item: AccessoryItem): number => {
    return (item.carton_quantity * item.items_per_carton) + item.individual_items;
  };

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
          details: { component: 'AccessoryManagement' }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
    reset({
      item_name: '',
      item_code: '',
      accessory_color: '',
      supplier: '',
      location: '',
      notes: '',
      carton_quantity: 0,
      items_per_carton: 0,
      individual_items: 0,
      pump_quantity: 0,
      ring_quantity: 0,
      cover_quantity: 0,
      ribbon_quantity: 0,
      sticker_quantity: 0,
      tag_quantity: 0
    });
  };

  const handleEdit = (item: AccessoryItem) => {
    setEditingItem(item);
    setShowForm(true);
    reset({
      item_name: item.item_name,
      item_code: item.item_code,
      accessory_color: item.accessory_color || '',
      supplier: item.supplier || '',
      location: item.location || '',
      notes: item.notes || '',
      carton_quantity: item.carton_quantity,
      items_per_carton: item.items_per_carton,
      individual_items: item.individual_items,
      pump_quantity: item.pump_quantity,
      ring_quantity: item.ring_quantity,
      cover_quantity: item.cover_quantity,
      ribbon_quantity: item.ribbon_quantity,
      sticker_quantity: item.sticker_quantity,
      tag_quantity: item.tag_quantity
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setShowForm(false);
    reset();
  };

  const onSubmit = async (data: AccessoryFormData) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingItem 
        ? `/api/accessories/${editingItem.uuid}`
        : '/api/accessories';
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          created_by: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في حفظ البيانات');
      }

      const result = await response.json();
      
      if (editingItem) {
        // Update existing item
        setAccessories(prev => prev.map(item =>
          item.uuid === editingItem.uuid
            ? { ...item, ...data, updated_at: new Date().toISOString() }
            : item
        ));
        setSuccess(`تم تحديث الملحق ${data.item_name} بنجاح`);
      } else {
        // Add new item
        setAccessories(prev => [...prev, result.accessory]);
        setSuccess(`تم إضافة الملحق ${data.item_name} بنجاح`);
      }

      setShowForm(false);
      setEditingItem(null);
      reset();

      // Log security event
      await logSecurityEvent(
        editingItem ? 'ACCESSORY_UPDATE' : 'ACCESSORY_CREATE',
        `${editingItem ? 'تم تحديث' : 'تم إنشاء'} ملحق: ${data.item_name}`,
        true
      );
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
      await logSecurityEvent(
        editingItem ? 'ACCESSORY_UPDATE' : 'ACCESSORY_CREATE',
        `فشل ${editingItem ? 'تحديث' : 'إنشاء'} ملحق: ${err.message}`,
        false
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: AccessoryItem) => {
    try {
      setError('');
      
      const response = await fetch(`/api/accessories/${item.uuid}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          is_active: !item.is_active
        })
      });

      if (!response.ok) {
        throw new Error('فشل في تغيير حالة الملحق');
      }

      // Update local state
      setAccessories(prev => prev.map(acc =>
        acc.uuid === item.uuid
          ? { ...acc, is_active: !item.is_active }
          : acc
      ));

      setSuccess(`تم ${item.is_active ? 'تعطيل' : 'تفعيل'} الملحق ${item.item_name} بنجاح`);
      
      await logSecurityEvent(
        'ACCESSORY_UPDATE',
        `تم ${item.is_active ? 'تعطيل' : 'تفعيل'} ملحق: ${item.item_name}`,
        true
      );
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تغيير الحالة');
      await logSecurityEvent(
        'ACCESSORY_UPDATE',
        `فشل ${item.is_active ? 'تعطيل' : 'تفعيل'} ملحق: ${err.message}`,
        false
      );
    }
  };

  const handleViewMovements = async (itemId: number) => {
    try {
      if (showMovements === itemId) {
        setShowMovements(null);
        return;
      }

      const response = await fetch(`/api/accessories/${itemId}/movements`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل حركات المخزون');
      }

      const data = await response.json();
      setStockMovements(data.movements || []);
      setShowMovements(itemId);

      await logSecurityEvent('STOCK_MOVEMENT_VIEW', 'تم عرض حركات مخزون الملحق', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الحركات');
      await logSecurityEvent('STOCK_MOVEMENT_VIEW', `فشل عرض حركات المخزون: ${err.message}`, false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const response = await fetch('/api/accessories/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تصدير البيانات');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessories-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('تم تصدير البيانات بنجاح');
      
      await logSecurityEvent('DATA_EXPORT', 'تم تصدير بيانات الملحقات', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التصدير');
      await logSecurityEvent('DATA_EXPORT', `فشل تصدير بيانات الملحقات: ${err.message}`, false);
    } finally {
      setExporting(false);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    // In a real app, this would come from your auth context
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const getQuantityColor = (quantity: number): string => {
    if (quantity === 0) return 'text-red-600 dark:text-red-400';
    if (quantity < 10) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
        نشط
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
        غير نشط
      </span>
    );
  };

  const renderAccessoryForm = () => {
    if (!showForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingItem ? 'تعديل الملحق' : 'إضافة ملحق جديد'}
            </h3>
            <button
              onClick={handleCancelEdit}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">المعلومات الأساسية</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم الملحق *
                  </label>
                  <input
                    type="text"
                    {...register('item_name', { required: 'اسم الملحق مطلوب' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                  {errors.item_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.item_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    كود الملحق *
                  </label>
                  <input
                    type="text"
                    {...register('item_code', { required: 'كود الملحق مطلوب' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                  {errors.item_code && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.item_code.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اللون
                  </label>
                  <input
                    type="text"
                    {...register('accessory_color')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المورد
                  </label>
                  <input
                    type="text"
                    {...register('supplier')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الموقع
                  </label>
                  <input
                    type="text"
                    {...register('location')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Quantity Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">الكميات</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      عدد الكرتون
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('carton_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      القطع في الكرتون
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('items_per_carton', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    القطع الفردية
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('individual_items', { min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                </div>

                {/* Specific Accessory Quantities */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      المضخات
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('pump_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الحلقات
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('ring_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الأغطية
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('cover_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الشرائط
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('ribbon_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الملصقات
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('sticker_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      البطاقات
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('tag_quantity', { min: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  editingItem ? 'تحديث' : 'إضافة'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderStockMovements = (item: AccessoryItem) => {
    if (showMovements !== item.id) return null;

    const itemMovements = stockMovements.filter(movement => 
      movement.item_code === item.item_code
    );

    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">حركات المخزون</h4>
        
        {itemMovements.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد حركات مخزون لهذا الملحق</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-right pb-2 font-medium text-gray-700 dark:text-gray-300">النوع</th>
                  <th className="text-right pb-2 font-medium text-gray-700 dark:text-gray-300">الكمية الداخلة</th>
                  <th className="text-right pb-2 font-medium text-gray-700 dark:text-gray-300">الكمية الخارجة</th>
                  <th className="text-right pb-2 font-medium text-gray-700 dark:text-gray-300">الرصيد</th>
                  <th className="text-right pb-2 font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {itemMovements.map((movement) => (
                  <tr key={movement.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 text-gray-600 dark:text-gray-400">{movement.movement_type}</td>
                    <td className="py-2 text-green-600 dark:text-green-400">{movement.quantity_in || '-'}</td>
                    <td className="py-2 text-red-600 dark:text-red-400">{movement.quantity_out || '-'}</td>
                    <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{movement.balance_after}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">
                      {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                إدارة الملحقات
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                إدارة وتتبع ملحقات العطور والمستلزمات
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button
                onClick={handleExport}
                disabled={exporting || accessories.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    تصدير Excel
                  </>
                )}
              </button>
              
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة ملحق جديد
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                البحث في الملحقات
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الملحق، الكود، اللون، أو المورد..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
              />
            </div>

            {/* Active Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الحالة
              </label>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                <input
                  type="checkbox"
                  id="showInactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="showInactive" className="text-sm text-gray-700 dark:text-gray-300">
                  إظهار الملحقات غير النشطة
                </label>
              </div>
            </div>

            {/* Stats */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الإحصائيات
              </label>
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  عرض <span className="font-semibold text-gray-900 dark:text-white">{filteredAccessories.length}</span> من أصل{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{accessories.length}</span> ملحق
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Accessories Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-400">جاري تحميل الملحقات...</span>
            </div>
          </div>
        ) : filteredAccessories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد ملحقات</h3>
            <p className="text-gray-500 dark:text-gray-400">لم يتم العثور على ملحقات تطابق معايير البحث.</p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
              إضافة أول ملحق
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAccessories.map((item) => (
              <div
                key={item.uuid}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      {item.item_name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {item.item_code}
                      </span>
                      {getStatusBadge(item.is_active)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {item.accessory_color && (
                      <span 
                        className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: item.accessory_color }}
                        title={item.accessory_color}
                      />
                    )}
                  </div>
                </div>

                {/* Supplier & Location */}
                {(item.supplier || item.location) && (
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.supplier && <div>المورد: {item.supplier}</div>}
                    {item.location && <div>الموقع: {item.location}</div>}
                  </div>
                )}

                {/* Quantities */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-blue-600 dark:text-blue-400 font-semibold">
                        {item.total_quantity}
                      </div>
                      <div className="text-blue-500 dark:text-blue-300 text-xs">إجمالي الكمية</div>
                    </div>
                    
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className={`font-semibold ${getQuantityColor(item.individual_items)}`}>
                        {item.individual_items}
                      </div>
                      <div className="text-green-500 dark:text-green-300 text-xs">قطع فردية</div>
                    </div>
                  </div>

                  {/* Carton Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">معلومات الكرتون</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">عدد الكرتون:</span>
                        <span className="font-medium mr-2">{item.carton_quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">القطع/كرتون:</span>
                        <span className="font-medium mr-2">{item.items_per_carton}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specific Accessories */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-1 bg-amber-50 dark:bg-amber-900/20 rounded">
                      <div className={`font-semibold ${getQuantityColor(item.pump_quantity)}`}>
                        {item.pump_quantity}
                      </div>
                      <div className="text-amber-600 dark:text-amber-400">مضخات</div>
                    </div>
                    <div className="text-center p-1 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <div className={`font-semibold ${getQuantityColor(item.ring_quantity)}`}>
                        {item.ring_quantity}
                      </div>
                      <div className="text-purple-600 dark:text-purple-400">حلقات</div>
                    </div>
                    <div className="text-center p-1 bg-pink-50 dark:bg-pink-900/20 rounded">
                      <div className={`font-semibold ${getQuantityColor(item.cover_quantity)}`}>
                        {item.cover_quantity}
                      </div>
                      <div className="text-pink-600 dark:text-pink-400">أغطية</div>
                    </div>
                    <div className="text-center p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                      <div className={`font-semibold ${getQuantityColor(item.ribbon_quantity)}`}>
                        {item.ribbon_quantity}
                      </div>
                      <div className="text-indigo-600 dark:text-indigo-400">شرائط</div>
                    </div>
                    <div className="text-center p-1 bg-teal-50 dark:bg-teal-900/20 rounded">
                      <div className={`font-semibold ${getQuantityColor(item.sticker_quantity)}`}>
                        {item.sticker_quantity}
                      </div>
                      <div className="text-teal-600 dark:text-teal-400">ملصقات</div>
                    </div>
                    <div className="text-center p-1 bg-cyan-50 dark:bg-cyan-900/20 rounded">
                      <div className={`font-semibold ${getQuantityColor(item.tag_quantity)}`}>
                        {item.tag_quantity}
                      </div>
                      <div className="text-cyan-600 dark:text-cyan-400">بطاقات</div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-xs text-yellow-800 dark:text-yellow-300">
                      {item.notes}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    تعديل
                  </button>
                  
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
                      item.is_active
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {item.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  
                  <button
                    onClick={() => handleViewMovements(item.id)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium text-sm"
                  >
                    {showMovements === item.id ? 'إخفاء' : 'الحركات'}
                  </button>
                </div>

                {/* Stock Movements */}
                {renderStockMovements(item)}

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>أضيف في: {new Date(item.added_date).toLocaleDateString('ar-EG')}</span>
                    <span>#{item.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accessory Form Modal */}
        {renderAccessoryForm()}
      </div>
    </div>
  );
};

export default AccessoryManagementPage;
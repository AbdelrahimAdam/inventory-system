// src/features/roles/buyer/pages/PurchaseInvoicesPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface PurchaseInvoice {
  id: number;
  uuid: string;
  invoice_number: string;
  invoice_type: 'PURCHASE' | 'PURCHASE_RETURN';
  invoice_date: string;
  supplier_name: string;
  total_amount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes: string;
  created_by: number;
  approved_by: number | null;
  approved_at: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  items: PurchaseInvoiceItem[];
}

interface PurchaseInvoiceItem {
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

interface PurchaseFormData {
  invoice_type: 'PURCHASE' | 'PURCHASE_RETURN';
  supplier_name: string;
  items: Array<{
    inventory_item_id: number;
    quantity: number;
    unit_price: number;
    unit_type: string;
    notes: string;
  }>;
  notes: string;
}

const PurchaseInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<PurchaseInvoice[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PurchaseFormData>();

  const invoiceType = watch('invoice_type');
  const items = watch('items') || [];

  // Fetch invoices and inventory items
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch purchase invoices
      const invoicesResponse = await fetch('/api/invoices/purchase', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!invoicesResponse.ok) {
        throw new Error('فشل في تحميل فواتير الشراء');
      }

      const invoicesData = await invoicesResponse.json();
      setInvoices(invoicesData.invoices || []);

      // Fetch inventory items for creating new invoices
      const inventoryResponse = await fetch('/api/inventory/items', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventoryItems(inventoryData.items || []);
      }

      await logSecurityEvent('PURCHASE_INVOICES_VIEW', 'عرض قائمة فواتير الشراء', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('PURCHASE_INVOICES_VIEW', `فشل عرض فواتير الشراء: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter invoices based on search and filters
  useEffect(() => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.invoice_type === typeFilter);
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.invoice_date) >= new Date(dateRange.start)
      );
    }

    if (dateRange.end) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.invoice_date) <= new Date(dateRange.end)
      );
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, statusFilter, typeFilter, dateRange]);

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
          details: { component: 'PurchaseInvoices' }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const getInvoiceTypeLabel = (type: string): string => {
    switch (type) {
      case 'PURCHASE': return 'فاتورة شراء';
      case 'PURCHASE_RETURN': return 'مرتجع شراء';
      default: return type;
    }
  };

  const getInvoiceTypeColor = (type: string): string => {
    switch (type) {
      case 'PURCHASE': return 'text-green-600 dark:text-green-400';
      case 'PURCHASE_RETURN': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
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

  const handleCreateInvoice = () => {
    setShowCreateForm(true);
    reset({
      invoice_type: 'PURCHASE',
      supplier_name: '',
      notes: '',
      items: []
    });
  };

  const handleAddItem = () => {
    const newItems = [...items, {
      inventory_item_id: 0,
      quantity: 1,
      unit_price: 0,
      unit_type: 'PIECES',
      notes: ''
    }];
    setValue('items', newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setValue('items', newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate total if unit price or quantity changes
    if (field === 'unit_price' || field === 'quantity') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = field === 'unit_price' ? value : newItems[index].unit_price;
      newItems[index].unit_price = unitPrice;
      newItems[index].quantity = quantity;
    }
    
    setValue('items', newItems);
  };

  const validateInvoice = (data: PurchaseFormData): string | null => {
    if (!data.supplier_name?.trim()) {
      return 'اسم المورد مطلوب';
    }

    if (data.items.length === 0) {
      return 'يجب إضافة عنصر واحد على الأقل للفاتورة';
    }

    for (const item of data.items) {
      if (!item.inventory_item_id) {
        return 'يجب اختيار عنصر لكل بند';
      }

      if (item.quantity <= 0) {
        return 'الكمية يجب أن تكون أكبر من الصفر';
      }

      if (item.unit_price < 0) {
        return 'سعر الوحدة يجب أن يكون صفر أو أكبر';
      }
    }

    return null;
  };

  const onSubmit = async (data: PurchaseFormData) => {
    try {
      const validationError = validateInvoice(data);
      if (validationError) {
        setError(validationError);
        return;
      }

      setProcessing(true);
      setError('');
      setSuccess('');

      const invoiceData = {
        type: data.invoice_type,
        supplier_name: data.supplier_name,
        details: data.items.map(item => ({
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_type: item.unit_type,
          notes: item.notes
        })),
        notes: data.notes,
        user_id: await getCurrentUserId()
      };

      const response = await fetch('/api/invoices/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إنشاء فاتورة الشراء');
      }

      const result = await response.json();

      setSuccess(`تم إنشاء فاتورة ${result.invoice_number} بنجاح`);
      setShowCreateForm(false);
      reset();

      // Refresh invoices list
      fetchData();

      await logSecurityEvent(
        'PURCHASE_INVOICE_CREATE',
        `تم إنشاء فاتورة ${getInvoiceTypeLabel(data.invoice_type)}: ${result.invoice_number}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الفاتورة');
      await logSecurityEvent(
        'PURCHASE_INVOICE_CREATE',
        `فشل إنشاء فاتورة: ${err.message}`,
        false
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusUpdate = async (invoiceId: number, newStatus: string) => {
    try {
      setError('');

      const response = await fetch(`/api/invoices/purchase/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('فشل في تحديث حالة الفاتورة');
      }

      // Update local state
      setInvoices(prev => prev.map(invoice =>
        invoice.id === invoiceId
          ? { ...invoice, status: newStatus as any }
          : invoice
      ));

      setSuccess(`تم تحديث حالة الفاتورة إلى "${getStatusLabel(newStatus)}"`);

      await logSecurityEvent(
        'PURCHASE_INVOICE_UPDATE',
        `تم تحديث حالة الفاتورة إلى ${getStatusLabel(newStatus)}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث الحالة');
      await logSecurityEvent(
        'PURCHASE_INVOICE_UPDATE',
        `فشل تحديث حالة الفاتورة: ${err.message}`,
        false
      );
    }
  };

  const handleExportInvoices = async () => {
    try {
      setExporting(true);
      
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (typeFilter !== 'all') queryParams.append('type', typeFilter);
      if (dateRange.start) queryParams.append('start_date', dateRange.start);
      if (dateRange.end) queryParams.append('end_date', dateRange.end);

      const response = await fetch(`/api/invoices/purchase/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في تصدير فواتير الشراء');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-invoices-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('تم تصدير فواتير الشراء بنجاح');
      
      await logSecurityEvent('PURCHASE_DATA_EXPORT', 'تم تصدير فواتير الشراء', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التصدير');
      await logSecurityEvent('PURCHASE_DATA_EXPORT', `فشل تصدير فواتير الشراء: ${err.message}`, false);
    } finally {
      setExporting(false);
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const calculateInvoiceTotal = (items: any[]): number => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const renderInvoiceDetails = () => {
    if (!selectedInvoice || !showInvoiceDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              تفاصيل الفاتورة - {selectedInvoice.invoice_number}
            </h3>
            <button
              onClick={() => setShowInvoiceDetails(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    نوع الفاتورة
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className={`font-medium ${getInvoiceTypeColor(selectedInvoice.invoice_type)}`}>
                      {getInvoiceTypeLabel(selectedInvoice.invoice_type)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    الحالة
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>
                      {getStatusLabel(selectedInvoice.status)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    التاريخ
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">
                      {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    المورد
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">
                      {selectedInvoice.supplier_name}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    الإجمالي
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {selectedInvoice.total_amount.toLocaleString('ar-EG')} ر.س
                    </span>
                  </div>
                </div>
                
                {selectedInvoice.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                      الملاحظات
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-white">{selectedInvoice.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-right">عناصر الفاتورة</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">العنصر</th>
                    <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                    <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">سعر الوحدة</th>
                    <th className="text-right pb-3 font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3">
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">{item.item_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{item.quantity} {item.unit_type}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{item.unit_price.toLocaleString('ar-EG')} ر.س</td>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {item.total_amount.toLocaleString('ar-EG')} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateInvoiceForm = () => {
    if (!showCreateForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              إنشاء فاتورة شراء جديدة
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  نوع الفاتورة *
                </label>
                <select
                  {...register('invoice_type', { required: 'نوع الفاتورة مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="PURCHASE">فاتورة شراء</option>
                  <option value="PURCHASE_RETURN">مرتجع شراء</option>
                </select>
                {errors.invoice_type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.invoice_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  اسم المورد *
                </label>
                <input
                  type="text"
                  {...register('supplier_name', { required: 'اسم المورد مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل اسم المورد"
                />
                {errors.supplier_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.supplier_name.message}</p>
                )}
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white text-right">عناصر الفاتورة</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة عنصر
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">لم تتم إضافة أي عناصر بعد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900 dark:text-white text-right">عنصر #{index + 1}</h5>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            العنصر *
                          </label>
                          <select
                            value={item.inventory_item_id}
                            onChange={(e) => handleItemChange(index, 'inventory_item_id', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          >
                            <option value={0}>اختر العنصر</option>
                            {inventoryItems.filter(invItem => invItem.is_active).map(invItem => (
                              <option key={invItem.id} value={invItem.id}>
                                {invItem.item_name} - {invItem.item_code} ({invItem.color})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            الكمية *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            سعر الوحدة *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                            نوع الوحدة
                          </label>
                          <select
                            value={item.unit_type}
                            onChange={(e) => handleItemChange(index, 'unit_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          >
                            <option value="PIECES">قطعة</option>
                            <option value="CARTON">كرتون</option>
                            <option value="SET">طقم</option>
                            <option value="METER">متر</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                          ملاحظات
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                          placeholder="ملاحظات حول العنصر"
                        />
                      </div>

                      {item.inventory_item_id > 0 && item.quantity > 0 && item.unit_price > 0 && (
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
                ملاحظات
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                placeholder="أدخل أي ملاحظات حول الفاتورة..."
              />
            </div>

            {items.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-blue-900 dark:text-blue-300 font-medium text-right">الإجمالي:</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {calculateInvoiceTotal(items).toLocaleString('ar-EG')} ر.س
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={processing || items.length === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء الفاتورة'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Main component render
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل فواتير الشراء...</p>
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
            فواتير الشراء
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة فواتير الشراء ومرتجعات الشراء
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

        {/* Actions Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
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
                  placeholder="بحث برقم الفاتورة أو اسم المورد..."
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="DRAFT">مسودة</option>
                  <option value="SUBMITTED">مقدمة</option>
                  <option value="APPROVED">معتمدة</option>
                  <option value="REJECTED">مرفوضة</option>
                  <option value="COMPLETED">مكتملة</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="PURCHASE">فواتير شراء</option>
                  <option value="PURCHASE_RETURN">مرتجعات شراء</option>
                </select>

                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                  placeholder="من تاريخ"
                />

                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                  placeholder="إلى تاريخ"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
              <button
                onClick={handleExportInvoices}
                disabled={exporting || filteredInvoices.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {exporting ? 'جاري التصدير...' : 'تصدير'}
              </button>

              <button
                onClick={handleCreateInvoice}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                فاتورة جديدة
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد فواتير</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على فواتير تطابق معايير البحث.</p>
              <button
                onClick={handleCreateInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
              >
                إنشاء أول فاتورة
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">رقم الفاتورة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">النوع</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المورد</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجمالي</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-medium ${getInvoiceTypeColor(invoice.invoice_type)}`}>
                          {getInvoiceTypeLabel(invoice.invoice_type)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(invoice.invoice_date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <div className="text-gray-900 dark:text-white">{invoice.supplier_name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-left font-medium text-green-600 dark:text-green-400">
                          {invoice.total_amount.toLocaleString('ar-EG')} ر.س
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowInvoiceDetails(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {invoice.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusUpdate(invoice.id, 'SUBMITTED')}
                              className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                              title="تقديم الفاتورة"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}

                          {invoice.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(invoice.id, 'APPROVED')}
                                className="p-2 text-green-600 hover:text-green-700 transition-colors"
                                title="اعتماد الفاتورة"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(invoice.id, 'REJECTED')}
                                className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                title="رفض الفاتورة"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredInvoices.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 dark:text-gray-300 text-right">
                  عرض <span className="font-medium">{filteredInvoices.length}</span> من <span className="font-medium">{invoices.length}</span> فاتورة
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {renderCreateInvoiceForm()}
      {renderInvoiceDetails()}
    </div>
  );
};

export default PurchaseInvoicesPage;
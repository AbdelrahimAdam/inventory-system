// src/features/roles/worker/pages/QualityControlPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface QualityCheck {
  id: number;
  uuid: string;
  batch_number: string;
  product_type: 'GLASS' | 'ACCESSORY' | 'FINAL_PRODUCT';
  inventory_item_id: number | null;
  accessory_item_id: number | null;
  item_name: string;
  item_code: string;
  color: string;
  checked_quantity: number;
  defective_quantity: number;
  pass_quantity: number;
  defect_rate: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'REQUIRES_REWORK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defect_types: string[];
  notes: string;
  checked_by: number;
  checked_by_name: string;
  checked_at: string;
  rework_notes: string;
  reworked_by: number | null;
  reworked_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
}

interface QualityMetric {
  total_checked: number;
  total_defective: number;
  overall_defect_rate: number;
  passed_checks: number;
  failed_checks: number;
  rework_required: number;
  daily_metrics: {
    date: string;
    checked: number;
    defective: number;
    defect_rate: number;
  }[];
}

interface QualityCheckFormData {
  batch_number: string;
  product_type: 'GLASS' | 'ACCESSORY' | 'FINAL_PRODUCT';
  inventory_item_id: number | null;
  accessory_item_id: number | null;
  checked_quantity: number;
  defective_quantity: number;
  defect_types: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string;
}

interface ReworkFormData {
  rework_notes: string;
  status: 'PASSED' | 'FAILED' | 'REQUIRES_REWORK';
}

const QualityControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checks' | 'new' | 'rework' | 'metrics'>('checks');
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [accessoryItems, setAccessoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
  const [showCheckForm, setShowCheckForm] = useState(false);
  const [showReworkForm, setShowReworkForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { register: registerCheck, handleSubmit: handleSubmitCheck, reset: resetCheck, watch: watchCheck, setValue: setCheckValue, formState: { errors: errorsCheck } } = useForm<QualityCheckFormData>();
  const { register: registerRework, handleSubmit: handleSubmitRework, reset: resetRework, formState: { errors: errorsRework } } = useForm<ReworkFormData>();

  const productType = watchCheck('product_type');
  const checkedQuantity = watchCheck('checked_quantity');
  const defectiveQuantity = watchCheck('defective_quantity');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [checksResponse, metricsResponse, inventoryResponse, accessoriesResponse] = await Promise.all([
        fetch('/api/quality/checks', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/quality/metrics', {
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

      if (!checksResponse.ok) {
        throw new Error('فشل في تحميل فحوصات الجودة');
      }

      const checksData = await checksResponse.json();
      setQualityChecks(checksData.checks || []);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setQualityMetrics(metricsData.metrics || null);
      }

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventoryItems(inventoryData.items || []);
      }

      if (accessoriesResponse.ok) {
        const accessoriesData = await accessoriesResponse.json();
        setAccessoryItems(accessoriesData.items || []);
      }

      await logSecurityEvent('QUALITY_CONTROL_VIEW', 'عرض صفحة مراقبة الجودة', true);

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('QUALITY_CONTROL_VIEW', `فشل عرض مراقبة الجودة: ${err.message}`, false);
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
          details: { component: 'QualityControl', tab: activeTab }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const handleNewCheck = () => {
    setShowCheckForm(true);
    resetCheck({
      batch_number: generateBatchNumber(),
      product_type: 'GLASS',
      inventory_item_id: null,
      accessory_item_id: null,
      checked_quantity: 1,
      defective_quantity: 0,
      defect_types: [],
      severity: 'LOW',
      notes: ''
    });
  };

  const generateBatchNumber = (): string => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `QC-${dateStr}-${timeStr}`;
  };

  const validateCheck = (data: QualityCheckFormData): string | null => {
    if (!data.batch_number?.trim()) {
      return 'رقم الدفعة مطلوب';
    }

    if (data.checked_quantity <= 0) {
      return 'الكمية المفحوصة يجب أن تكون أكبر من الصفر';
    }

    if (data.defective_quantity < 0) {
      return 'الكمية المعيبة لا يمكن أن تكون سالبة';
    }

    if (data.defective_quantity > data.checked_quantity) {
      return 'الكمية المعيبة لا يمكن أن تكون أكبر من الكمية المفحوصة';
    }

    if (data.product_type === 'GLASS' && !data.inventory_item_id) {
      return 'يجب اختيار عنصر المخزون للزجاج';
    }

    if (data.product_type === 'ACCESSORY' && !data.accessory_item_id) {
      return 'يجب اختيار عنصر الملحقات';
    }

    if (data.defective_quantity > 0 && data.defect_types.length === 0) {
      return 'يجب تحديد نوع العيب عند وجود قطع معيبة';
    }

    return null;
  };

  const onSubmitCheck = async (data: QualityCheckFormData) => {
    try {
      const validationError = validateCheck(data);
      if (validationError) {
        setError(validationError);
        return;
      }

      setProcessing(true);
      setError('');
      setSuccess('');

      const checkData = {
        batch_number: data.batch_number,
        product_type: data.product_type,
        inventory_item_id: data.inventory_item_id,
        accessory_item_id: data.accessory_item_id,
        checked_quantity: data.checked_quantity,
        defective_quantity: data.defective_quantity,
        pass_quantity: data.checked_quantity - data.defective_quantity,
        defect_types: data.defect_types,
        severity: data.severity,
        notes: data.notes,
        checked_by: await getCurrentUserId(),
        status: data.defective_quantity === 0 ? 'PASSED' : 
                data.defective_quantity / data.checked_quantity > 0.1 ? 'FAILED' : 'REQUIRES_REWORK'
      };

      const response = await fetch('/api/quality/checks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(checkData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إنشاء فحص الجودة');
      }

      const result = await response.json();

      setSuccess(`تم إنشاء فحص الجودة ${result.batch_number} بنجاح`);
      setShowCheckForm(false);
      resetCheck();
      fetchData(); // Refresh data

      await logSecurityEvent(
        'QUALITY_CHECK_CREATE',
        `تم إنشاء فحص جودة: ${result.batch_number} - ${data.product_type}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء فحص الجودة');
      await logSecurityEvent(
        'QUALITY_CHECK_CREATE',
        `فشل إنشاء فحص جودة: ${err.message}`,
        false
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRework = (check: QualityCheck) => {
    setSelectedCheck(check);
    setShowReworkForm(true);
    resetRework({
      rework_notes: '',
      status: 'PASSED'
    });
  };

  const onSubmitRework = async (data: ReworkFormData) => {
    if (!selectedCheck) return;

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/quality/checks/${selectedCheck.id}/rework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rework_notes: data.rework_notes,
          status: data.status,
          reworked_by: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في معالجة إعادة التصنيع');
      }

      const result = await response.json();

      setSuccess(`تم معالجة إعادة التصنيع للدفعة ${selectedCheck.batch_number} بنجاح`);
      setShowReworkForm(false);
      setSelectedCheck(null);
      fetchData(); // Refresh data

      await logSecurityEvent(
        'QUALITY_REWORK_PROCESS',
        `تم معالجة إعادة التصنيع: ${selectedCheck.batch_number} - ${data.status}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء معالجة إعادة التصنيع');
      await logSecurityEvent(
        'QUALITY_REWORK_PROCESS',
        `فشل معالجة إعادة التصنيع: ${err.message}`,
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

  const getProductTypeLabel = (type: string): string => {
    switch (type) {
      case 'GLASS': return 'زجاج';
      case 'ACCESSORY': return 'ملحقات';
      case 'FINAL_PRODUCT': return 'منتج نهائي';
      default: return type;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING': return 'قيد الانتظار';
      case 'IN_PROGRESS': return 'قيد التنفيذ';
      case 'PASSED': return 'مقبول';
      case 'FAILED': return 'مرفوض';
      case 'REQUIRES_REWORK': return 'يحتاج إعادة تصنيع';
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'PASSED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'FAILED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'REQUIRES_REWORK': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case 'LOW': return 'منخفض';
      case 'MEDIUM': return 'متوسط';
      case 'HIGH': return 'مرتفع';
      case 'CRITICAL': return 'حرج';
      default: return severity;
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const canRework = (check: QualityCheck): boolean => {
    return check.status === 'REQUIRES_REWORK' || check.status === 'FAILED';
  };

  const defectTypes = [
    'خدش', 'كسر', 'عيب لون', 'عيب تصنيع', 'تلوث', 'عدم تطابق المواصفات',
    'عيب في التغليف', 'عيب في الملحقات', 'أخرى'
  ];

  const calculateDefectRate = (checked: number, defective: number): number => {
    if (checked === 0) return 0;
    return (defective / checked) * 100;
  };

  const filteredChecks = qualityChecks.filter(check => {
    const matchesSearch = check.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || check.status === statusFilter;
    const matchesProductType = productTypeFilter === 'all' || check.product_type === productTypeFilter;
    
    const matchesDate = (!dateRange.start || new Date(check.checked_at) >= new Date(dateRange.start)) &&
                       (!dateRange.end || new Date(check.checked_at) <= new Date(dateRange.end));
    
    return matchesSearch && matchesStatus && matchesProductType && matchesDate;
  });

  const renderCheckForm = () => {
    if (!showCheckForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              فحص جودة جديد
            </h3>
            <button
              onClick={() => setShowCheckForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmitCheck(onSubmitCheck)} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  رقم الدفعة *
                </label>
                <input
                  type="text"
                  {...registerCheck('batch_number', { required: 'رقم الدفعة مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="رقم الدفعة"
                />
                {errorsCheck.batch_number && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsCheck.batch_number.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  نوع المنتج *
                </label>
                <select
                  {...registerCheck('product_type', { required: 'نوع المنتج مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="GLASS">زجاج</option>
                  <option value="ACCESSORY">ملحقات</option>
                  <option value="FINAL_PRODUCT">منتج نهائي</option>
                </select>
                {errorsCheck.product_type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsCheck.product_type.message}
                  </p>
                )}
              </div>

              {productType === 'GLASS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    عنصر المخزون *
                  </label>
                  <select
                    {...registerCheck('inventory_item_id', { 
                      required: productType === 'GLASS' ? 'عنصر المخزون مطلوب' : false 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  >
                    <option value="">اختر العنصر</option>
                    {inventoryItems.filter(item => item.is_active).map(item => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} - {item.item_code} ({item.color})
                      </option>
                    ))}
                  </select>
                  {errorsCheck.inventory_item_id && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                      {errorsCheck.inventory_item_id.message}
                    </p>
                  )}
                </div>
              )}

              {productType === 'ACCESSORY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                    الملحقات *
                  </label>
                  <select
                    {...registerCheck('accessory_item_id', { 
                      required: productType === 'ACCESSORY' ? 'الملحقات مطلوبة' : false 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  >
                    <option value="">اختر الملحقات</option>
                    {accessoryItems.filter(item => item.is_active).map(item => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} - {item.item_code}
                      </option>
                    ))}
                  </select>
                  {errorsCheck.accessory_item_id && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                      {errorsCheck.accessory_item_id.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الكمية المفحوصة *
                </label>
                <input
                  type="number"
                  min="1"
                  {...registerCheck('checked_quantity', { 
                    required: 'الكمية المفحوصة مطلوبة',
                    min: { value: 1, message: 'يجب أن تكون الكمية 1 على الأقل' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                />
                {errorsCheck.checked_quantity && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsCheck.checked_quantity.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الكمية المعيبة
                </label>
                <input
                  type="number"
                  min="0"
                  {...registerCheck('defective_quantity', { 
                    min: { value: 0, message: 'لا يمكن أن تكون الكمية سالبة' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                />
                {errorsCheck.defective_quantity && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsCheck.defective_quantity.message}
                  </p>
                )}
              </div>

              {checkedQuantity && defectiveQuantity !== undefined && (
                <div className="md:col-span-2">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-right">
                        <span className="text-blue-900 dark:text-blue-300 font-medium">الكمية المقبولة:</span>
                        <span className="mr-2 text-green-600 dark:text-green-400 font-bold">
                          {checkedQuantity - defectiveQuantity}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-900 dark:text-blue-300 font-medium">معدل العيوب:</span>
                        <span className={`mr-2 font-bold ${
                          calculateDefectRate(checkedQuantity, defectiveQuantity) > 10 ? 'text-red-600 dark:text-red-400' :
                          calculateDefectRate(checkedQuantity, defectiveQuantity) > 5 ? 'text-orange-600 dark:text-orange-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {calculateDefectRate(checkedQuantity, defectiveQuantity).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {defectiveQuantity > 0 && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                      أنواع العيوب *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {defectTypes.map((defectType) => (
                        <label key={defectType} className="flex items-center justify-end space-x-2 space-x-reverse">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{defectType}</span>
                          <input
                            type="checkbox"
                            value={defectType}
                            {...registerCheck('defect_types', {
                              validate: (value) => 
                                defectiveQuantity === 0 || value.length > 0 || 'يجب تحديد نوع العيب'
                            })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      ))}
                    </div>
                    {errorsCheck.defect_types && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                        {errorsCheck.defect_types.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                      شدة العيب
                    </label>
                    <select
                      {...registerCheck('severity')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                    >
                      <option value="LOW">منخفض</option>
                      <option value="MEDIUM">متوسط</option>
                      <option value="HIGH">مرتفع</option>
                      <option value="CRITICAL">حرج</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                ملاحظات
              </label>
              <textarea
                {...registerCheck('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                placeholder="ملاحظات حول فحص الجودة..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCheckForm(false)}
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
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء الفحص'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderReworkForm = () => {
    if (!showReworkForm || !selectedCheck) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              معالجة إعادة التصنيع
            </h3>
            <button
              onClick={() => setShowReworkForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmitRework(onSubmitRework)} className="p-6">
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-right">الدفعة</p>
              <p className="font-medium text-gray-900 dark:text-white text-right">{selectedCheck.batch_number}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                {selectedCheck.item_name} - {selectedCheck.item_code}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                العيوب: {selectedCheck.defect_types.join('، ')}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  نتيجة إعادة التصنيع *
                </label>
                <select
                  {...registerRework('status', { required: 'النتيجة مطلوبة' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="PASSED">مقبول</option>
                  <option value="FAILED">مرفوض</option>
                  <option value="REQUIRES_REWORK">يحتاج إعادة تصنيع</option>
                </select>
                {errorsRework.status && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsRework.status.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  ملاحظات إعادة التصنيع *
                </label>
                <textarea
                  {...registerRework('rework_notes', { required: 'ملاحظات إعادة التصنيع مطلوبة' })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="وصف إجراءات إعادة التصنيع..."
                />
                {errorsRework.rework_notes && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">
                    {errorsRework.rework_notes.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowReworkForm(false)}
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
                  'معالجة النتيجة'
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
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل فحوصات الجودة...</p>
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
            مراقبة الجودة
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة فحوصات الجودة وإعادة التصنيع
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
                { id: 'checks', name: 'الفحوصات', icon: '🔍' },
                { id: 'new', name: 'فحص جديد', icon: '➕' },
                { id: 'rework', name: 'إعادة التصنيع', icon: '🔄' },
                { id: 'metrics', name: 'الإحصائيات', icon: '📊' }
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
            {(activeTab === 'checks' || activeTab === 'rework') && (
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
                      placeholder="بحث برقم الدفعة أو اسم المنتج..."
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
                      <option value="PENDING">قيد الانتظار</option>
                      <option value="IN_PROGRESS">قيد التنفيذ</option>
                      <option value="PASSED">مقبول</option>
                      <option value="FAILED">مرفوض</option>
                      <option value="REQUIRES_REWORK">يحتاج إعادة تصنيع</option>
                    </select>

                    <select
                      value={productTypeFilter}
                      onChange={(e) => setProductTypeFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                    >
                      <option value="all">جميع الأنواع</option>
                      <option value="GLASS">زجاج</option>
                      <option value="ACCESSORY">ملحقات</option>
                      <option value="FINAL_PRODUCT">منتج نهائي</option>
                    </select>

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

                {activeTab === 'checks' && (
                  <button
                    onClick={handleNewCheck}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm w-full lg:w-auto justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    فحص جديد
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            {activeTab === 'checks' && (
              <div className="overflow-x-auto">
                {filteredChecks.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد فحوصات</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على فحوصات مطابقة لمعايير البحث.</p>
                    <button
                      onClick={handleNewCheck}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                    >
                      إنشاء أول فحص
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">رقم الدفعة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المنتج</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">النوع</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المعيبة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">معدل العيوب</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredChecks.map((check) => (
                        <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">{check.batch_number}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(check.checked_at).toLocaleDateString('ar-EG')}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{check.item_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{check.item_code}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {getProductTypeLabel(check.product_type)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-left">
                            {check.checked_quantity}
                          </td>
                          <td className="py-4 px-4 text-left">
                            <span className={`font-medium ${
                              check.defective_quantity > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {check.defective_quantity}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-left">
                            <span className={`font-medium ${
                              check.defect_rate > 10 ? 'text-red-600 dark:text-red-400' :
                              check.defect_rate > 5 ? 'text-orange-600 dark:text-orange-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {check.defect_rate.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                              {getStatusLabel(check.status)}
                            </span>
                            {check.defective_quantity > 0 && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getSeverityColor(check.severity)}`}>
                                {getSeverityLabel(check.severity)}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {canRework(check) && (
                                <button
                                  onClick={() => handleRework(check)}
                                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-xs font-medium"
                                >
                                  إعادة تصنيع
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

            {activeTab === 'new' && (
              <div className="text-center py-12">
                <div className="max-w-2xl mx-auto">
                  <svg className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">بدء فحص جودة جديد</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    قم بإنشاء فحص جودة جديد للمنتجات والمواد لضمان الجودة والمطابقة للمواصفات
                  </p>
                  <button
                    onClick={handleNewCheck}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    بدء فحص جديد
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'rework' && (
              <div className="overflow-x-auto">
                {filteredChecks.filter(check => canRework(check)).length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد عناصر تحتاج إعادة تصنيع</h3>
                    <p className="text-gray-500 dark:text-gray-400">جميع الفحوصات تم معالجتها أو لا تحتاج إلى إعادة تصنيع.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">رقم الدفعة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المنتج</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">أنواع العيوب</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">شدة العيب</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">معدل العيوب</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredChecks.filter(check => canRework(check)).map((check) => (
                        <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">{check.batch_number}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(check.checked_at).toLocaleDateString('ar-EG')}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{check.item_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{check.item_code}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              {check.defect_types.map((defect, index) => (
                                <span key={index} className="inline-block bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded-full ml-1 mb-1">
                                  {defect}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(check.severity)}`}>
                              {getSeverityLabel(check.severity)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-left">
                            <span className={`font-medium ${
                              check.defect_rate > 10 ? 'text-red-600 dark:text-red-400' :
                              check.defect_rate > 5 ? 'text-orange-600 dark:text-orange-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {check.defect_rate.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRework(check)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-xs font-medium"
                              >
                                معالجة
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'metrics' && qualityMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المفحوص</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{qualityMetrics.total_checked}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المعيب</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{qualityMetrics.total_defective}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">معدل العيوب</p>
                    <p className={`text-2xl font-bold ${
                      qualityMetrics.overall_defect_rate > 10 ? 'text-red-600 dark:text-red-400' :
                      qualityMetrics.overall_defect_rate > 5 ? 'text-orange-600 dark:text-orange-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {qualityMetrics.overall_defect_rate.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">المقبول</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{qualityMetrics.passed_checks}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderCheckForm()}
      {renderReworkForm()}
    </div>
  );
};

export default QualityControlPage;
// src/features/roles/manager/pages/main-inventory/batch-operations/BatchOperationsPage.tsx
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

interface BatchOperationForm {
  operation_type: 'BULK_ADD' | 'BULK_DEDUCT' | 'BULK_TRANSFER' | 'BULK_ADJUST';
  items: Array<{
    item_id: number;
    quantity: number;
    new_location?: string;
  }>;
  reason: string;
  notes: string;
  reference_number?: string;
  target_location?: string;
}

interface OperationTemplate {
  id: number;
  name: string;
  description: string;
  operation_type: string;
  items: Array<{
    item_id: number;
    quantity: number;
  }>;
  created_at: string;
}

interface BatchOperationResult {
  success: boolean;
  message: string;
  results: Array<{
    item_id: number;
    success: boolean;
    message: string;
    new_quantity: number;
  }>;
  operation_id?: string;
}

const BatchOperationsPage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [operationResults, setOperationResults] = useState<BatchOperationResult | null>(null);
  const [templates, setTemplates] = useState<OperationTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<OperationTemplate | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BatchOperationForm>();

  const operationType = watch('operation_type');
  const items = watch('items') || [];

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

      await logSecurityEvent('BATCH_OPERATIONS_VIEW', 'تم عرض صفحة العمليات المجمعة', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('BATCH_OPERATIONS_VIEW', `فشل عرض العمليات المجمعة: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch operation templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/operation-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, []);

  useEffect(() => {
    fetchInventoryItems();
    fetchTemplates();
  }, [fetchInventoryItems, fetchTemplates]);

  // Filter items based on search and active status
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActive = showInactive || item.is_active;
    
    return matchesSearch && matchesActive;
  });

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
          details: { component: 'BatchOperations' }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const handleItemSelection = (item: InventoryItem) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    
    if (isSelected) {
      setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
      setValue('items', items.filter(i => i.item_id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, item]);
      setValue('items', [
        ...items,
        {
          item_id: item.id,
          quantity: 0,
          new_location: operationType === 'BULK_TRANSFER' ? '' : undefined
        }
      ]);
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    const updatedItems = items.map(item =>
      item.item_id === itemId ? { ...item, quantity } : item
    );
    setValue('items', updatedItems);
  };

  const handleLocationChange = (itemId: number, location: string) => {
    const updatedItems = items.map(item =>
      item.item_id === itemId ? { ...item, new_location: location } : item
    );
    setValue('items', updatedItems);
  };

  const removeItem = (itemId: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    setValue('items', items.filter(item => item.item_id !== itemId));
  };

  const loadTemplate = (template: OperationTemplate) => {
    setSelectedTemplate(template);
    setValue('operation_type', template.operation_type as any);
    
    const templateItems = template.items.map(templateItem => {
      const item = inventoryItems.find(i => i.id === templateItem.item_id);
      return item ? item : null;
    }).filter(Boolean) as InventoryItem[];

    setSelectedItems(templateItems);
    
    setValue('items', template.items.map(templateItem => ({
      item_id: templateItem.item_id,
      quantity: templateItem.quantity
    })));

    setShowTemplates(false);
    setCurrentStep(2);
  };

  const validateOperation = (data: BatchOperationForm): string | null => {
    if (data.items.length === 0) {
      return 'يرجى اختيار عنصر واحد على الأقل';
    }

    if (data.operation_type === 'BULK_TRANSFER' && !data.target_location) {
      return 'يرجى تحديد الموقع الهدف للتحويل';
    }

    for (const item of data.items) {
      if (item.quantity <= 0) {
        return `الكمية يجب أن تكون أكبر من الصفر للعنصر ${getItemName(item.item_id)}`;
      }

      if (data.operation_type === 'BULK_DEDUCT') {
        const inventoryItem = inventoryItems.find(i => i.id === item.item_id);
        if (inventoryItem && inventoryItem.remaining_quantity < item.quantity) {
          return `الكمية غير كافية للعنصر ${inventoryItem.item_name}. المتاح: ${inventoryItem.remaining_quantity}`;
        }
      }
    }

    return null;
  };

  const getItemName = (itemId: number): string => {
    const item = inventoryItems.find(i => i.id === itemId);
    return item ? item.item_name : 'عنصر غير معروف';
  };

  const onSubmit = async (data: BatchOperationForm) => {
    try {
      const validationError = validateOperation(data);
      if (validationError) {
        setError(validationError);
        return;
      }

      setProcessing(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/inventory/batch-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          user_id: await getCurrentUserId()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تنفيذ العملية المجمعة');
      }

      const result: BatchOperationResult = await response.json();
      setOperationResults(result);

      if (result.success) {
        setSuccess(`تم تنفيذ العملية بنجاح. ${result.results.filter(r => r.success).length} من ${result.results.length} عنصر تم معالجته`);
        
        // Refresh inventory items
        fetchInventoryItems();
        
        // Reset form if successful
        if (result.results.every(r => r.success)) {
          reset();
          setSelectedItems([]);
          setCurrentStep(1);
        }
      } else {
        setError(`فشل في معالجة بعض العناصر: ${result.message}`);
      }

      await logSecurityEvent(
        'BATCH_OPERATION_EXECUTE',
        `تم تنفيذ عملية مجمعة: ${data.operation_type} على ${data.items.length} عنصر`,
        result.success
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تنفيذ العملية');
      await logSecurityEvent(
        'BATCH_OPERATION_EXECUTE',
        `فشل تنفيذ عملية مجمعة: ${err.message}`,
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

  const getOperationTypeLabel = (type: string): string => {
    switch (type) {
      case 'BULK_ADD': return 'إضافة مجمعة';
      case 'BULK_DEDUCT': return 'خصم مجمع';
      case 'BULK_TRANSFER': return 'تحويل مجمع';
      case 'BULK_ADJUST': return 'تعديل مجمع';
      default: return type;
    }
  };

  const getOperationTypeColor = (type: string): string => {
    switch (type) {
      case 'BULK_ADD': return 'text-green-600 dark:text-green-400';
      case 'BULK_DEDUCT': return 'text-red-600 dark:text-red-400';
      case 'BULK_TRANSFER': return 'text-blue-600 dark:text-blue-400';
      case 'BULK_ADJUST': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              step <= currentStep
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-gray-500'
            }`}>
              {step < currentStep ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="font-semibold">{step}</span>
              )}
            </div>
            <div className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {step === 1 && 'اختيار العملية'}
              {step === 2 && 'اختيار العناصر'}
              {step === 3 && 'التأكيد'}
            </div>
          </div>
          {step < 3 && (
            <div className={`w-16 h-1 mx-4 mt-5 ${
              step < currentStep
                ? 'bg-indigo-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderOperationTemplates = () => {
    if (!showTemplates) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              قوالب العمليات المجمعة
            </h3>
            <button
              onClick={() => setShowTemplates(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">لا توجد قوالب متاحة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors cursor-pointer"
                    onClick={() => loadTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getOperationTypeColor(template.operation_type)} bg-opacity-10`}>
                        {getOperationTypeLabel(template.operation_type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {template.items.length} عنصر • أنشئ في {new Date(template.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                العمليات المجمعة
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                إدارة وتنفيذ عمليات المخزون المجمعة بكفاءة وسهولة
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                القوالب
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Operation Type Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      اختر نوع العملية
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          operationType === 'BULK_ADD' 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600'
                        }`}
                        onClick={() => setValue('operation_type', 'BULK_ADD')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">إضافة مجمعة</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">إضافة كميات متعددة للمخزون</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          operationType === 'BULK_DEDUCT' 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600'
                        }`}
                        onClick={() => setValue('operation_type', 'BULK_DEDUCT')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">خصم مجمع</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">خصم كميات متعددة من المخزون</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          operationType === 'BULK_TRANSFER' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                        onClick={() => setValue('operation_type', 'BULK_TRANSFER')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">تحويل مجمع</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">تحويل كميات بين المواقع</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          operationType === 'BULK_ADJUST' 
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-600'
                        }`}
                        onClick={() => setValue('operation_type', 'BULK_ADJUST')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">تعديل مجمع</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">تعديل كميات متعددة دفعة واحدة</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {operationType && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Item Selection */}
                {currentStep === 2 && operationType && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        اختر العناصر
                      </h2>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedItems.length} عنصر مختار
                      </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                            selectedItems.some(selected => selected.id === item.id)
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          onClick={() => handleItemSelection(item)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">{item.item_name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{item.item_code}</p>
                            </div>
                            {selectedItems.some(selected => selected.id === item.id) && (
                              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div>المتاح: <span className="font-medium">{item.remaining_quantity}</span></div>
                            {item.location && <div>الموقع: {item.location}</div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected Items */}
                    {selectedItems.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">العناصر المختارة</h3>
                        <div className="space-y-3">
                          {selectedItems.map((item) => (
                            <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">{item.item_name}</h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">المتاح: {item.remaining_quantity}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-700 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الكمية
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={items.find(i => i.item_id === item.id)?.quantity || 0}
                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                                  />
                                </div>

                                {operationType === 'BULK_TRANSFER' && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      الموقع الجديد
                                    </label>
                                    <input
                                      type="text"
                                      value={items.find(i => i.item_id === item.id)?.new_location || ''}
                                      onChange={(e) => handleLocationChange(item.id, e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                                      placeholder="أدخل الموقع الجديد"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
                      >
                        رجوع
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        disabled={selectedItems.length === 0}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {currentStep === 3 && operationType && selectedItems.length > 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      تأكيد العملية
                    </h2>

                    {/* Operation Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3">ملخص العملية</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-blue-600 dark:text-blue-400 font-semibold">
                            {getOperationTypeLabel(operationType)}
                          </div>
                          <div className="text-blue-500 dark:text-blue-300">نوع العملية</div>
                        </div>
                        <div>
                          <div className="text-blue-600 dark:text-blue-400 font-semibold">
                            {selectedItems.length}
                          </div>
                          <div className="text-blue-500 dark:text-blue-300">عدد العناصر</div>
                        </div>
                        <div>
                          <div className="text-blue-600 dark:text-blue-400 font-semibold">
                            {items.reduce((sum, item) => sum + item.quantity, 0)}
                          </div>
                          <div className="text-blue-500 dark:text-blue-300">إجمالي الكمية</div>
                        </div>
                        <div>
                          <div className="text-blue-600 dark:text-blue-400 font-semibold">
                            {new Date().toLocaleDateString('ar-EG')}
                          </div>
                          <div className="text-blue-500 dark:text-blue-300">التاريخ</div>
                        </div>
                      </div>
                    </div>

                    {/* Reason and Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          سبب العملية *
                        </label>
                        <select
                          {...register('reason', { required: 'سبب العملية مطلوب' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                        >
                          <option value="">اختر سبب العملية</option>
                          <option value="INVENTORY_COUNT">جرد مخزون</option>
                          <option value="BULK_PURCHASE">شراء مجمع</option>
                          <option value="BULK_SALE">بيع مجمع</option>
                          <option value="WAREHOUSE_TRANSFER">تحويل مستودع</option>
                          <option value="QUALITY_ADJUSTMENT">تعديل جودة</option>
                          <option value="SYSTEM_CORRECTION">تصحيح نظام</option>
                          <option value="OTHER">أخرى</option>
                        </select>
                        {errors.reason && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reason.message}</p>
                        )}
                      </div>

                      {operationType === 'BULK_TRANSFER' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            الموقع الهدف *
                          </label>
                          <input
                            type="text"
                            {...register('target_location', { 
                              required: operationType === 'BULK_TRANSFER' ? 'الموقع الهدف مطلوب' : false 
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                            placeholder="أدخل الموقع الهدف"
                          />
                          {errors.target_location && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.target_location.message}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ملاحظات إضافية
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                        placeholder="أدخل أي ملاحظات إضافية حول العملية..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        رقم المرجع (اختياري)
                      </label>
                      <input
                        type="text"
                        {...register('reference_number')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors"
                        placeholder="مثال: BATCH-001, TRANSFER-2024"
                      />
                    </div>

                    <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
                      >
                        رجوع
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
                          'تأكيد وتنفيذ'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Operation Results */}
            {operationResults && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">نتائج العملية</h3>
                <div className="space-y-3">
                  {operationResults.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {getItemName(result.item_id)}
                          </div>
                          <div className={`text-sm ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {result.message}
                          </div>
                        </div>
                        {result.success && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            الكمية الجديدة: <span className="font-medium">{result.new_quantity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">إحصائيات سريعة</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إجمالي العناصر:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{inventoryItems.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">المختارة:</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedItems.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">إجمالي الكميات:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Operation Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">دليل العمليات</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">إضافة مجمعة</div>
                    <div className="text-gray-600 dark:text-gray-400">لإضافة كميات متعددة دفعة واحدة</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">خصم مجمع</div>
                    <div className="text-gray-600 dark:text-gray-400">لخصم كميات متعددة دفعة واحدة</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">تحويل مجمع</div>
                    <div className="text-gray-600 dark:text-gray-400">لتحويل كميات بين المواقع</div>
                  </div>
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
                    جميع العمليات المجمعة مسجلة ومراقبة. تأكد من صحة البيانات قبل التنفيذ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Templates Modal */}
        {renderOperationTemplates()}
      </div>
    </div>
  );
};

export default BatchOperationsPage;
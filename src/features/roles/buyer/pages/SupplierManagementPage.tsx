// src/features/roles/buyer/pages/SupplierManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

interface Supplier {
  id: number;
  uuid: string;
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_number: string;
  payment_terms: string;
  credit_limit: number;
  current_balance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  rating: number;
  notes: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  performance_metrics: {
    total_orders: number;
    completed_orders: number;
    on_time_delivery_rate: number;
    quality_rating: number;
    total_spent: number;
    last_order_date: string;
  };
}

interface SupplierPerformance {
  supplier_id: number;
  month: string;
  orders_count: number;
  delivered_on_time: number;
  quality_issues: number;
  total_amount: number;
}

interface SupplierFormData {
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_number: string;
  payment_terms: string;
  credit_limit: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes: string;
}

const SupplierManagementPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [performanceData, setPerformanceData] = useState<SupplierPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'performance' | 'analytics'>('list');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>();

  // Fetch suppliers and performance data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [suppliersResponse, performanceResponse] = await Promise.all([
        fetch('/api/suppliers', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/suppliers/performance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!suppliersResponse.ok) {
        throw new Error('فشل في تحميل بيانات الموردين');
      }

      const suppliersData = await suppliersResponse.json();
      setSuppliers(suppliersData.suppliers || []);

      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformanceData(performanceData.performance || []);
      }

      await logSecurityEvent('SUPPLIERS_VIEW', 'عرض قائمة الموردين', true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      await logSecurityEvent('SUPPLIERS_VIEW', `فشل عرض الموردين: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter suppliers based on search and filters
  useEffect(() => {
    let filtered = suppliers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }

    // Filter by rating
    if (ratingFilter !== 'all') {
      const ratingValue = parseInt(ratingFilter);
      filtered = filtered.filter(supplier => Math.floor(supplier.rating) === ratingValue);
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm, statusFilter, ratingFilter]);

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
          details: { component: 'SupplierManagement', tab: activeTab }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'نشط';
      case 'INACTIVE': return 'غير نشط';
      case 'SUSPENDED': return 'موقوف';
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'SUSPENDED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRatingStars = (rating: number): JSX.Element[] => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  const handleCreateSupplier = () => {
    setShowSupplierForm(true);
    setSelectedSupplier(null);
    reset({
      name: '',
      code: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'السعودية',
      tax_number: '',
      payment_terms: 'NET_30',
      credit_limit: 0,
      status: 'ACTIVE',
      notes: ''
    });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setShowSupplierForm(true);
    setSelectedSupplier(supplier);
    reset({
      name: supplier.name,
      code: supplier.code,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      tax_number: supplier.tax_number,
      payment_terms: supplier.payment_terms,
      credit_limit: supplier.credit_limit,
      status: supplier.status,
      notes: supplier.notes
    });
  };

  const validateSupplier = (data: SupplierFormData): string | null => {
    if (!data.name?.trim()) {
      return 'اسم المورد مطلوب';
    }

    if (!data.code?.trim()) {
      return 'كود المورد مطلوب';
    }

    if (!data.contact_person?.trim()) {
      return 'اسم الشخص المسؤول مطلوب';
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'البريد الإلكتروني غير صحيح';
    }

    if (!data.phone?.trim()) {
      return 'رقم الهاتف مطلوب';
    }

    if (data.credit_limit < 0) {
      return 'حد الائتمان لا يمكن أن يكون سالباً';
    }

    return null;
  };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const validationError = validateSupplier(data);
      if (validationError) {
        setError(validationError);
        return;
      }

      setProcessing(true);
      setError('');
      setSuccess('');

      const url = selectedSupplier 
        ? `/api/suppliers/${selectedSupplier.id}`
        : '/api/suppliers';
      
      const method = selectedSupplier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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
        throw new Error(errorData.message || `فشل في ${selectedSupplier ? 'تحديث' : 'إنشاء'} المورد`);
      }

      const result = await response.json();

      setSuccess(`تم ${selectedSupplier ? 'تحديث' : 'إنشاء'} المورد ${data.name} بنجاح`);
      setShowSupplierForm(false);
      reset();
      fetchData(); // Refresh data

      await logSecurityEvent(
        selectedSupplier ? 'SUPPLIER_UPDATE' : 'SUPPLIER_CREATE',
        `${selectedSupplier ? 'تم تحديث' : 'تم إنشاء'} مورد: ${data.name}`,
        true
      );

    } catch (err: any) {
      setError(err.message || `حدث خطأ أثناء ${selectedSupplier ? 'تحديث' : 'إنشاء'} المورد`);
      await logSecurityEvent(
        selectedSupplier ? 'SUPPLIER_UPDATE' : 'SUPPLIER_CREATE',
        `فشل ${selectedSupplier ? 'تحديث' : 'إنشاء'} مورد: ${err.message}`,
        false
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusUpdate = async (supplierId: number, newStatus: string) => {
    try {
      setError('');

      const response = await fetch(`/api/suppliers/${supplierId}/status`, {
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
        throw new Error('فشل في تحديث حالة المورد');
      }

      // Update local state
      setSuppliers(prev => prev.map(supplier =>
        supplier.id === supplierId
          ? { ...supplier, status: newStatus as any }
          : supplier
      ));

      setSuccess(`تم تحديث حالة المورد إلى "${getStatusLabel(newStatus)}"`);

      await logSecurityEvent(
        'SUPPLIER_UPDATE',
        `تم تحديث حالة المورد إلى ${getStatusLabel(newStatus)}`,
        true
      );

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث الحالة');
      await logSecurityEvent(
        'SUPPLIER_UPDATE',
        `فشل تحديث حالة المورد: ${err.message}`,
        false
      );
    }
  };

  const getCurrentUserId = async (): Promise<number> => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : 1;
  };

  const renderSupplierForm = () => {
    if (!showSupplierForm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedSupplier ? 'تعديل المورد' : 'إضافة مورد جديد'}
            </h3>
            <button
              onClick={() => setShowSupplierForm(false)}
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
                  اسم المورد *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'اسم المورد مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل اسم المورد"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  كود المورد *
                </label>
                <input
                  type="text"
                  {...register('code', { required: 'كود المورد مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل كود المورد"
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الشخص المسؤول *
                </label>
                <input
                  type="text"
                  {...register('contact_person', { required: 'اسم الشخص المسؤول مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل اسم الشخص المسؤول"
                />
                {errors.contact_person && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.contact_person.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل البريد الإلكتروني"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'رقم الهاتف مطلوب' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل رقم الهاتف"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  المدينة
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل المدينة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الدولة
                </label>
                <select
                  {...register('country')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="السعودية">السعودية</option>
                  <option value="مصر">مصر</option>
                  <option value="الإمارات">الإمارات</option>
                  <option value="الأردن">الأردن</option>
                  <option value="لبنان">لبنان</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الرقم الضريبي
                </label>
                <input
                  type="text"
                  {...register('tax_number')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                  placeholder="أدخل الرقم الضريبي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  شروط الدفع
                </label>
                <select
                  {...register('payment_terms')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="NET_15">صافي 15 يوم</option>
                  <option value="NET_30">صافي 30 يوم</option>
                  <option value="NET_60">صافي 60 يوم</option>
                  <option value="CASH">نقداً</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  حد الائتمان (ر.س)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('credit_limit', { 
                    min: { value: 0, message: 'حد الائتمان لا يمكن أن يكون سالباً' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                />
                {errors.credit_limit && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-right">{errors.credit_limit.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الحالة
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                >
                  <option value="ACTIVE">نشط</option>
                  <option value="INACTIVE">غير نشط</option>
                  <option value="SUSPENDED">موقوف</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                العنوان
              </label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                placeholder="أدخل العنوان الكامل"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                ملاحظات
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-right"
                placeholder="ملاحظات إضافية حول المورد..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSupplierForm(false)}
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
                    {selectedSupplier ? 'جاري التحديث...' : 'جاري الإنشاء...'}
                  </>
                ) : (
                  selectedSupplier ? 'تحديث المورد' : 'إنشاء المورد'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderSupplierDetails = () => {
    if (!selectedSupplier || !showSupplierDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              تفاصيل المورد - {selectedSupplier.name}
            </h3>
            <button
              onClick={() => setShowSupplierDetails(false)}
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
                    كود المورد
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">{selectedSupplier.code}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    الحالة
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSupplier.status)}`}>
                      {getStatusLabel(selectedSupplier.status)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    التقييم
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {getRatingStars(selectedSupplier.rating)}
                      </div>
                      <span className={`font-medium ${getRatingColor(selectedSupplier.rating)}`}>
                        {selectedSupplier.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    الشخص المسؤول
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">{selectedSupplier.contact_person}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    البريد الإلكتروني
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">{selectedSupplier.email || 'غير محدد'}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    رقم الهاتف
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">{selectedSupplier.phone}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    حد الائتمان
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {selectedSupplier.credit_limit.toLocaleString('ar-EG')} ر.س
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                    الرصيد الحالي
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className={`text-lg font-semibold ${
                      selectedSupplier.current_balance > selectedSupplier.credit_limit 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {selectedSupplier.current_balance.toLocaleString('ar-EG')} ر.س
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {selectedSupplier.performance_metrics && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-right">مؤشرات الأداء</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-right">
                      <p className="text-sm text-blue-600 dark:text-blue-400">إجمالي الطلبات</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedSupplier.performance_metrics.total_orders}
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-right">
                      <p className="text-sm text-green-600 dark:text-green-400">معدل التسليم في الوقت</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {selectedSupplier.performance_metrics.on_time_delivery_rate}%
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-right">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">التقييم النوعي</p>
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {selectedSupplier.performance_metrics.quality_rating}/5
                      </p>
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-right">
                      <p className="text-sm text-purple-600 dark:text-purple-400">إجمالي المشتريات</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {selectedSupplier.performance_metrics.total_spent.toLocaleString('ar-EG')} ر.س
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSupplier.notes && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                  الملاحظات
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-900 dark:text-white text-right">{selectedSupplier.notes}</p>
                </div>
              </div>
            )}
          </div>
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
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل بيانات الموردين...</p>
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
            إدارة الموردين
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-right">
            إدارة معلومات الموردين ومؤشرات الأداء
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
                { id: 'list', name: 'قائمة الموردين', icon: '👥' },
                { id: 'performance', name: 'أداء الموردين', icon: '📊' },
                { id: 'analytics', name: 'التحليلات', icon: '📈' }
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
            {activeTab === 'list' && (
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
                      placeholder="بحث باسم المورد أو الكود أو البريد..."
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
                      <option value="ACTIVE">نشط</option>
                      <option value="INACTIVE">غير نشط</option>
                      <option value="SUSPENDED">موقوف</option>
                    </select>

                    <select
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-colors text-sm"
                    >
                      <option value="all">جميع التقييمات</option>
                      <option value="5">5 نجوم</option>
                      <option value="4">4 نجوم</option>
                      <option value="3">3 نجوم</option>
                      <option value="2">2 نجوم</option>
                      <option value="1">1 نجمة</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateSupplier}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm w-full lg:w-auto justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  مورد جديد
                </button>
              </div>
            )}

            {/* Content */}
            {activeTab === 'list' && (
              <div className="overflow-x-auto">
                {filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد موردين</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على موردين مطابقين لمعايير البحث.</p>
                    <button
                      onClick={handleCreateSupplier}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                    >
                      إضافة أول مورد
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">المورد</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الكود</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الشخص المسؤول</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">التقييم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">حد الائتمان</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">{supplier.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{supplier.email}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{supplier.code}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-right">
                              <div className="text-gray-900 dark:text-white">{supplier.contact_person}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{supplier.phone}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="flex">
                                {getRatingStars(supplier.rating)}
                              </div>
                              <span className={`text-sm font-medium ${getRatingColor(supplier.rating)}`}>
                                {supplier.rating.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-left font-medium text-green-600 dark:text-green-400">
                              {supplier.credit_limit.toLocaleString('ar-EG')} ر.س
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.status)}`}>
                              {getStatusLabel(supplier.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setShowSupplierDetails(true);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="عرض التفاصيل"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => handleEditSupplier(supplier)}
                                className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                                title="تعديل المورد"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {supplier.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusUpdate(supplier.id, 'SUSPENDED')}
                                  className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                  title="تعليق المورد"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                </button>
                              )}

                              {supplier.status === 'SUSPENDED' && (
                                <button
                                  onClick={() => handleStatusUpdate(supplier.id, 'ACTIVE')}
                                  className="p-2 text-green-600 hover:text-green-700 transition-colors"
                                  title="تفعيل المورد"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
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

            {activeTab === 'performance' && (
              <div className="text-center py-12">
                <div className="max-w-2xl mx-auto">
                  <svg className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">أداء الموردين</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    عرض وتحليل أداء الموردين بناءً على معدلات التسليم والتقييمات والمؤشرات الأخرى
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <p className="text-yellow-800 dark:text-yellow-300">
                      هذه الصفحة قيد التطوير. سيتم إضافة رسوم بيانية وتحليلات متقدمة قريباً.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <div className="max-w-2xl mx-auto">
                  <svg className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">تحليلات الموردين</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    تحليلات متقدمة لأداء الموردين ومقارنات وتقارير مفصلة
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-blue-800 dark:text-blue-300">
                      هذه الصفحة قيد التطوير. سيتم إضافة تقارير متقدمة وتحليلات تنبؤية قريباً.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderSupplierForm()}
      {renderSupplierDetails()}
    </div>
  );
};

export default SupplierManagementPage;
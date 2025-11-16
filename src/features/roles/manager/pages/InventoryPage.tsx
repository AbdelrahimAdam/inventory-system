import React, { useEffect, useState, useMemo, useRef, Component, useCallback, lazy, Suspense } from "react";
import { FileText, PlusCircle, Search, X, Menu, ChevronDown, ChevronUp, Edit, Trash2, Eye, Download, RotateCcw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/roles/manager/ui/card";
import { Button } from "@/features/roles/manager/ui/Button";
import { Input } from "@/features/roles/manager/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/features/roles/manager/ui/Dialog";

// Firebase imports - only what's needed
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';

// Error Boundary Component
class InvoiceErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Invoice Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 dark:text-red-400 p-4">
          <p>حدث خطأ: {this.state.error.message}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
          >
            إعادة تحميل
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Optimized utility functions
const parseNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseNumber(number));
};

const formatDate = (date) => {
  if (!date) return 'غير متوفر';
  const parsedDate = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(parsedDate.getTime())) return 'تاريخ غير صالح';
  
  // Cache date formatting for better performance
  const day = parsedDate.getDate().toString().padStart(2, '0');
  const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
  const year = parsedDate.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Memoized invoice type mapping
const invoiceTypeMap = {
  'SALE': 'بيع',
  'PURCHASE': 'شراء',
  'FACTORY_DISPATCH': 'صرف المصنع',
  'FACTORY_RETURN': 'مرتجع المصنع'
};

const getInvoiceTypeDisplay = (type) => invoiceTypeMap[type] || type;

// Invoice Print Component - Now included in the same file
const InvoicePrint = React.memo(({ invoice }) => {
  if (!invoice) return <div>لا توجد بيانات للفاتورة</div>;

  const totalAmount = invoice.details?.reduce((sum, item) => {
    return sum + (parseNumber(item.quantity) * parseNumber(item.unit_price || 0));
  }, 0) || 0;

  return (
    <div className="print-content bg-white p-6 rounded-lg shadow-lg">
      <div className="text-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {invoice.invoice_type === 'FACTORY_DISPATCH' ? 'إذن تسليم زجاج' : 'فاتورة'}
        </h1>
        <p className="text-lg text-gray-600">رقم: {invoice.invoice_number || 'غير متوفر'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p><strong>التاريخ:</strong> {formatDate(invoice.created_at)}</p>
          <p><strong>أنشأها:</strong> {invoice.created_by_username || 'غير متوفر'}</p>
        </div>
        <div>
          {invoice.invoice_type === 'SALE' && (
            <>
              <p><strong>العميل:</strong> {invoice.client_name || 'غير متوفر'}</p>
              <p><strong>هاتف العميل:</strong> {invoice.client_phone || 'غير متوفر'}</p>
            </>
          )}
          {invoice.invoice_type === 'PURCHASE' && (
            <p><strong>المورد:</strong> {invoice.supplier_name || 'غير متوفر'}</p>
          )}
          {invoice.invoice_type === 'FACTORY_DISPATCH' && (
            <p><strong>منصرف إلى:</strong> {invoice.recipient || 'غير متوفر'}</p>
          )}
        </div>
      </div>

      {invoice.details && invoice.details.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">الأصناف:</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">#</th>
                <th className="border border-gray-300 p-2">اسم الصنف</th>
                <th className="border border-gray-300 p-2">الكود</th>
                <th className="border border-gray-300 p-2">اللون</th>
                <th className="border border-gray-300 p-2">الكمية</th>
                {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
                  <th className="border border-gray-300 p-2">سعر الوحدة</th>
                )}
                {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
                  <th className="border border-gray-300 p-2">الإجمالي</th>
                )}
                <th className="border border-gray-300 p-2">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {invoice.details.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.item_name || '-'}</td>
                  <td className="border border-gray-300 p-2">{item.item_code || '-'}</td>
                  <td className="border border-gray-300 p-2">{item.color || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity || 0}</td>
                  {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
                    <td className="border border-gray-300 p-2 text-center">
                      {formatCurrency(item.unit_price || 0)} جنيه
                    </td>
                  )}
                  {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
                    <td className="border border-gray-300 p-2 text-center">
                      {formatCurrency(parseNumber(item.quantity) * parseNumber(item.unit_price || 0))} جنيه
                    </td>
                  )}
                  <td className="border border-gray-300 p-2">{item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 mb-6">لا توجد أصناف في هذه الفاتورة</p>
      )}

      {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
        <div className="text-left mb-4">
          <p className="text-lg font-bold">
            الإجمالي الكلي: {formatCurrency(totalAmount)} جنيه
          </p>
        </div>
      )}

      {invoice.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <strong>ملاحظات:</strong> {invoice.notes}
        </div>
      )}

      <div className="text-center mt-8 pt-4 border-t">
        <p className="text-sm text-gray-500">شكراً لتعاملكم معنا</p>
      </div>
    </div>
  );
});

InvoicePrint.displayName = 'InvoicePrint';

// Create Invoice Form Component - Now included in the same file
const CreateInvoiceForm = React.memo(({ 
  clients, 
  suppliers, 
  stockItems, 
  user, 
  onCreated, 
  onCancel, 
  isEdit, 
  initialData 
}) => {
  const [formData, setFormData] = useState({
    invoice_type: 'SALE',
    client_name: '',
    client_phone: '',
    supplier_name: '',
    recipient: '',
    notes: '',
    details: []
  });
  const [currentItem, setCurrentItem] = useState({
    item_name: '',
    item_code: '',
    color: '',
    quantity: '',
    unit_price: '',
    notes: '',
    stock_id: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        invoice_type: initialData.invoice_type || 'SALE',
        client_name: initialData.client_name || '',
        client_phone: initialData.client_phone || '',
        supplier_name: initialData.supplier_name || '',
        recipient: initialData.recipient || '',
        notes: initialData.notes || '',
        details: initialData.details || []
      });
    }
  }, [isEdit, initialData]);

  const handleAddItem = () => {
    if (!currentItem.item_name || !currentItem.quantity) {
      alert('يرجى إدخال اسم الصنف والكمية');
      return;
    }

    setFormData(prev => ({
      ...prev,
      details: [...prev.details, { ...currentItem }]
    }));

    setCurrentItem({
      item_name: '',
      item_code: '',
      color: '',
      quantity: '',
      unit_price: '',
      notes: '',
      stock_id: ''
    });
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalAmount = formData.details.reduce((sum, item) => {
        return sum + (parseNumber(item.quantity) * parseNumber(item.unit_price || 0));
      }, 0);

      const invoiceData = {
        ...formData,
        invoice_number: isEdit ? initialData.invoice_number : `INV-${Date.now()}`,
        total_amount: totalAmount,
        created_by: user.id,
        created_by_username: user.username,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      if (isEdit && initialData) {
        await updateDoc(doc(db, 'invoices', initialData.id), invoiceData);
      } else {
        await addDoc(collection(db, 'invoices'), invoiceData);
      }

      onCreated();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">نوع الفاتورة</label>
          <select
            value={formData.invoice_type}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_type: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="SALE">فاتورة بيع</option>
            <option value="PURCHASE">فاتورة شراء</option>
            <option value="FACTORY_DISPATCH">صرف مصنع</option>
          </select>
        </div>

        {formData.invoice_type === 'SALE' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">اسم العميل</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="أدخل اسم العميل"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">هاتف العميل</label>
              <input
                type="text"
                value={formData.client_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="أدخل رقم الهاتف"
              />
            </div>
          </>
        )}

        {formData.invoice_type === 'PURCHASE' && (
          <div>
            <label className="block text-sm font-medium mb-2">اسم المورد</label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="أدخل اسم المورد"
            />
          </div>
        )}

        {formData.invoice_type === 'FACTORY_DISPATCH' && (
          <div>
            <label className="block text-sm font-medium mb-2">منصرف إلى</label>
            <input
              type="text"
              value={formData.recipient}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="أدخل اسم المستلم"
            />
          </div>
        )}
      </div>

      {/* Add Items Section */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">إضافة أصناف</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            value={currentItem.item_name}
            onChange={(e) => setCurrentItem(prev => ({ ...prev, item_name: e.target.value }))}
            placeholder="اسم الصنف"
            className="p-2 border rounded"
          />
          <input
            type="text"
            value={currentItem.item_code}
            onChange={(e) => setCurrentItem(prev => ({ ...prev, item_code: e.target.value }))}
            placeholder="كود الصنف"
            className="p-2 border rounded"
          />
          <input
            type="text"
            value={currentItem.color}
            onChange={(e) => setCurrentItem(prev => ({ ...prev, color: e.target.value }))}
            placeholder="اللون"
            className="p-2 border rounded"
          />
          <input
            type="number"
            value={currentItem.quantity}
            onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: e.target.value }))}
            placeholder="الكمية"
            className="p-2 border rounded"
          />
          {formData.invoice_type !== 'FACTORY_DISPATCH' && (
            <input
              type="number"
              value={currentItem.unit_price}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, unit_price: e.target.value }))}
              placeholder="سعر الوحدة"
              className="p-2 border rounded"
            />
          )}
          <input
            type="text"
            value={currentItem.notes}
            onChange={(e) => setCurrentItem(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="ملاحظات"
            className="p-2 border rounded"
          />
        </div>

        <Button
          type="button"
          onClick={handleAddItem}
          className="bg-blue-500 hover:bg-blue-600"
        >
          إضافة صنف
        </Button>
      </div>

      {/* Items List */}
      {formData.details.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">الأصناف المضافة</h3>
          <div className="space-y-2">
            {formData.details.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{item.item_name} - {item.quantity} قطعة</span>
                <Button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="bg-red-500 hover:bg-red-600 text-white p-1"
                >
                  حذف
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">ملاحظات</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="أدخل أي ملاحظات إضافية"
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-600"
        >
          {loading ? 'جاري الحفظ...' : (isEdit ? 'تحديث الفاتورة' : 'إنشاء الفاتورة')}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-500 hover:bg-gray-600"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
});

CreateInvoiceForm.displayName = 'CreateInvoiceForm';

// Factory Return Dialog Component - Optimized
const FactoryReturnDialog = React.memo(({ invoice, user, onSuccess, onCancel }) => {
  const [returnType, setReturnType] = useState('زجاج فقط');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!invoice?.id || !user?.id) {
      setError('بيانات غير صالحة');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const returnInvoiceNumber = `RET-${invoice.invoice_number}-${Date.now()}`;
      
      const returnInvoiceData = {
        invoice_number: returnInvoiceNumber,
        invoice_type: 'FACTORY_RETURN',
        original_invoice_id: invoice.id,
        original_invoice_number: invoice.invoice_number,
        return_type: returnType,
        recipient: invoice.recipient,
        details: invoice.details,
        notes: notes || undefined,
        created_by: user.id,
        created_by_username: user.username,
        created_at: Timestamp.now(),
        total_amount: 0
      };

      await addDoc(collection(db, 'invoices'), returnInvoiceData);

      // Batch stock updates
      const updatePromises = invoice.details.map(async (detail) => {
        if (detail.stock_id) {
          const stockRef = doc(db, 'warehouseItems', detail.stock_id);
          try {
            const stockDoc = await getDoc(stockRef);
            if (stockDoc.exists()) {
              const stockData = stockDoc.data();
              const newQuantity = (stockData.remaining_quantity || 0) + parseNumber(detail.quantity);
              await updateDoc(stockRef, {
                remaining_quantity: newQuantity,
                updatedAt: Timestamp.now()
              });
            }
          } catch (stockErr) {
            console.error('Error updating stock for return:', stockErr);
          }
        }
      });

      await Promise.all(updatePromises);

      onSuccess({
        success: true,
        return_invoice_number: returnInvoiceNumber,
        message: 'تم معالجة مرتجع المصنع بنجاح'
      });
    } catch (err) {
      console.error('Factory return error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة المرتجع');
    } finally {
      setSubmitting(false);
    }
  }, [invoice, user, returnType, notes, onSuccess]);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white">
            مرتجع صرف المصنع
          </DialogTitle>
          <DialogDescription>
            معالجة مرتجع لفاتورة صرف المصنع رقم: {invoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>
       
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              نوع المرتجع
            </label>
            <select
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
              className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              <option value="زجاج فقط">زجاج فقط</option>
              <option value="زجاج مع الإكسسوارات">زجاج مع الإكسسوارات</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات المرتجع
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أدخل ملاحظات المرتجع (اختياري)"
              className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              {submitting ? 'جاري المعالجة...' : 'معالجة المرتجع'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

FactoryReturnDialog.displayName = 'FactoryReturnDialog';

// Loading components for better UX
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
  </div>
);

// Main Invoice System Component - Optimized
export default function InvoiceSystemRedesign() {
  const [invoices, setInvoices] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClientListOpen, setIsClientListOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedForReturn, setSelectedForReturn] = useState(null);

  // Mock user data
  const user = useMemo(() => ({
    id: 'manager-1',
    username: 'المدير',
    role: 'manager'
  }), []);

  // Debounced search
  const debouncedQuery = useDebounce(query, 300);

  // Fetch data with error handling and performance optimization
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Parallel data fetching
      const [invoicesSnapshot, stockSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'invoices'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'warehouseItems'), orderBy('createdAt', 'desc')))
      ]);

      const invoicesData = invoicesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      const stockData = stockSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      setInvoices(invoicesData);
      setStockItems(stockData);
      setError(null);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err.message || "فشل في تحميل البيانات. حاول مرة أخرى لاحقًا.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimized filtering with useMemo
  const filtered = useMemo(() => {
    if (!debouncedQuery) return invoices;
    
    const q = debouncedQuery.toLowerCase();
    return invoices.filter((inv) =>
      String(inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.client_name || '').toLowerCase().includes(q) ||
      (inv.supplier_name || '').toLowerCase().includes(q) ||
      (inv.recipient || '').toLowerCase().includes(q) ||
      (inv.client_phone || '').includes(q) ||
      (inv.created_by_username || '').toLowerCase().includes(q)
    );
  }, [invoices, debouncedQuery]);

  // Memoized calculations
  const totalSales = useMemo(() => 
    invoices.reduce((sum, inv) =>
      inv.invoice_type !== 'FACTORY_DISPATCH' ? sum + parseNumber(inv.total_amount) : sum, 0),
    [invoices]
  );

  const invoiceClients = useMemo(() => {
    const clientMap = new Map();
    invoices.forEach(inv => {
      if (inv.client_name && inv.client_phone) {
        clientMap.set(inv.client_phone, {
          name: inv.client_name,
          phone: inv.client_phone,
          type: 'عادي',
          notes: `آخر فاتورة: ${inv.invoice_number}`
        });
      }
    });
    return Array.from(clientMap.values());
  }, [invoices]);

  const suppliers = useMemo(() => {
    const supplierMap = new Map();
    invoices.forEach(inv => {
      if (inv.supplier_name) {
        supplierMap.set(inv.supplier_name, {
          name: inv.supplier_name,
          type: 'مورد'
        });
      }
    });
    return Array.from(supplierMap.values());
  }, [invoices]);

  // Optimized event handlers
  const handleDeleteInvoice = useCallback(async (invoiceId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      try {
        const invoiceDocRef = doc(db, 'invoices', invoiceId);
        const invoiceDocSnap = await getDoc(invoiceDocRef);
        
        if (invoiceDocSnap.exists()) {
          const invoiceData = invoiceDocSnap.data();
          if (invoiceData.details && (invoiceData.invoice_type === 'SALE' || invoiceData.invoice_type === 'FACTORY_DISPATCH')) {
            const restorePromises = invoiceData.details.map(async (detail) => {
              if (detail.stock_id) {
                const stockRef = doc(db, 'warehouseItems', detail.stock_id);
                try {
                  const stockDoc = await getDoc(stockRef);
                  if (stockDoc.exists()) {
                    const stockData = stockDoc.data();
                    const newQuantity = (stockData.remaining_quantity || 0) + parseNumber(detail.quantity);
                    await updateDoc(stockRef, {
                      remaining_quantity: newQuantity,
                      updatedAt: Timestamp.now()
                    });
                  }
                } catch (stockErr) {
                  console.error('Error restoring stock:', stockErr);
                }
              }
            });
            await Promise.all(restorePromises);
          }
        }

        await deleteDoc(doc(db, 'invoices', invoiceId));
        fetchData();
      } catch (err) {
        console.error('Delete Error:', err);
        setError(`فشل في حذف الفاتورة: ${err.message}`);
      }
    }
  }, [fetchData]);

  const handleSendWhatsApp = useCallback((invoice) => {
    if (!invoice || !invoice.details) {
      setError("لا يمكن إرسال الفاتورة عبر واتساب: بيانات الفاتورة غير صالحة");
      return;
    }

    let message;
    const displayType = getInvoiceTypeDisplay(invoice.invoice_type);
    
    if (invoice.invoice_type === 'FACTORY_DISPATCH') {
      const itemsList = invoice.details.map((d, index) =>
        `${index + 1}. الصنف: ${d.item_name || '-'}\n الكود: ${d.item_code || '-'}\n اللون: ${d.color || '-'}\n الوحدة: ${d.unit || '-'}\n الكمية: ${d.quantity || 0}\n ملاحظات: ${d.notes || '-'}`
      ).join('\n\n');
      
      message = `إذن تسليم زجاج رقم ${invoice.invoice_number || 'غير متوفر'}
التاريخ: ${formatDate(invoice.created_at)}
منصرف إلى: ${invoice.recipient || 'غير متوفر'}
أنشأها: ${invoice.created_by_username || 'غير متوفر'}

الأصناف:
${itemsList}

ملاحظات: ${invoice.notes || 'لا توجد'}`;
    } else {
      const total = invoice.details.reduce((sum, d) => sum + (parseNumber(d.quantity) * parseNumber(d.unit_price)), 0);
      const itemsList = invoice.details.map((d, index) =>
        `${index + 1}. الصنف: ${d.item_name || '-'}\n الكود: ${d.item_code || '-'}\n اللون: ${d.color || '-'}\n الكمية: ${d.quantity || 0}\n سعر الوحدة: ${formatCurrency(d.unit_price)} جنيه\n الإجمالي: ${formatCurrency(parseNumber(d.quantity) * parseNumber(d.unit_price))} جنيه`
      ).join('\n\n');
      
      message = `فاتورة ${displayType} رقم ${invoice.invoice_number || 'غير متوفر'}
التاريخ: ${formatDate(invoice.created_at)}
العميل: ${invoice.client_name || 'غير متوفر'}
${invoice.invoice_type === 'SALE' ? `رقم هاتف العميل: ${invoice.client_phone || 'غير متوفر'}\n` : ''}المورد: ${invoice.supplier_name || 'غير متوفر'}
أنشأها: ${invoice.created_by_username || 'غير متوفر'}

الأصناف:
${itemsList}

الإجمالي الكلي: ${formatCurrency(total)} جنيه
ملاحظات: ${invoice.notes || 'لا توجد'}`;
    }

    const phoneNumber = invoice.invoice_type === 'SALE' && invoice.client_phone ?
      invoice.client_phone.replace(/\D/g, '') : '';
    const whatsappUrl = phoneNumber ?
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}` :
      `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  }, []);

  const handleFactoryReturn = useCallback((invoice) => {
    setSelectedForReturn(invoice);
    setIsReturnDialogOpen(true);
  }, []);

  const handleReturnSuccess = useCallback((result) => {
    setIsReturnDialogOpen(false);
    setSelectedForReturn(null);
    fetchData();
    alert(`تم معالجة مرتجع المصنع بنجاح\nرقم الفاتورة: ${result.return_invoice_number}\n${result.message}`);
  }, [fetchData]);

  const handleReturnCancel = useCallback(() => {
    setIsReturnDialogOpen(false);
    setSelectedForReturn(null);
  }, []);

  // Optimized table row component
  const InvoiceRow = React.memo(({ inv, onSelect, onEdit, onDelete, onWhatsApp, onReturn }) => (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
      onClick={() => onSelect(inv)}
    >
      <td className="p-3 text-gray-700 dark:text-gray-300">{inv.invoice_number || 'غير متوفر'}</td>
      <td className="p-3">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          inv.invoice_type === 'SALE' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
          inv.invoice_type === 'PURCHASE' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
          'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        }`}>
          {getInvoiceTypeDisplay(inv.invoice_type)}
        </span>
      </td>
      <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(inv.created_at)}</td>
      <td className="p-3 text-gray-700 dark:text-gray-300">
        {inv.invoice_type === 'SALE' ? inv.client_name :
         inv.invoice_type === 'PURCHASE' ? inv.supplier_name :
         inv.recipient || 'غير متوفر'}
      </td>
      <td className="p-3 text-gray-700 dark:text-gray-300">{inv.created_by_username || 'غير متوفر'}</td>
      <td className="p-3 text-right font-bold text-gray-800 dark:text-white">
        {inv.invoice_type !== 'FACTORY_DISPATCH' ? `${formatCurrency(inv.total_amount)} جنيه` : '-'}
      </td>
      <td className="p-3">
        <div className="action-buttons">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(inv);
            }}
            className="action-btn text-blue-500 hover:text-blue-700"
            title="عرض"
          >
            <Eye size={18} />
          </Button>
          {inv.invoice_type === 'FACTORY_DISPATCH' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onReturn(inv);
              }}
              className="action-btn text-purple-500 hover:text-purple-700"
              title="مرتجع المصنع"
            >
              <RotateCcw size={18} />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(inv);
            }}
            className="action-btn text-green-500 hover:text-green-700"
            title="إرسال عبر واتساب"
          >
            <FaWhatsapp size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(inv);
            }}
            className="action-btn text-amber-500 hover:text-amber-700"
            title="تعديل"
          >
            <Edit size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(inv.id);
            }}
            className="action-btn text-red-500 hover:text-red-700"
            title="حذف"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </td>
    </tr>
  ));

  InvoiceRow.displayName = 'InvoiceRow';

  return (
    <InvoiceErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6 font-tajawal transition-colors duration-200" dir="rtl">
        <OptimizedStyles />

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">نظام الفواتير</h1>
          <Button
            variant="ghost"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Main Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow">
              <FileText size={24} className="md:size-7" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">نظام إدارة الفواتير</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الفواتير، العملاء، والمخزون بكفاءة</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">مرحباً، {user?.username || 'غير متوفر'}</span>
          </div>
          <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto`}>
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث برقم فاتورة أو اسم أو رقم هاتف أو اسم المستخدم"
                className="pl-10 pr-4 w-full"
              />
            </div>
            <Button
              onClick={() => {
                setIsCreateOpen(true);
                setSelected(null);
              }}
              className="flex items-center justify-center gap-2 mt-2 md:mt-0 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              <PlusCircle size={16} /> إضافة فاتورة
            </Button>
          </div>
        </div>

        {/* Mobile Stats Cards */}
        <MobileStats 
          invoices={invoices}
          totalSales={totalSales}
          invoiceClients={invoiceClients}
          suppliers={suppliers}
          stockItems={stockItems}
          onRefresh={fetchData}
          onCreateInvoice={() => {
            setIsCreateOpen(true);
            setSelected(null);
          }}
          onShowClients={() => setIsClientListOpen(true)}
        />

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Invoices Table */}
          <div className="flex-1 lg:w-2/3 invoices-table">
            <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  قائمة الفواتير ({invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <LoadingSpinner />
                ) : error ? (
                  <div className="py-6 text-center text-red-500 dark:text-red-400">{error}</div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 dark:text-gray-400">لا توجد فواتير متاحة</div>
                ) : (
                  <div className="table-container max-h-[60vh]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-right sticky-header">
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[100px]">رقم</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[100px]">النوع</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[100px]">التاريخ</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[120px]">طرف</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[120px]">أنشأها</th>
                          <th className="p-3 text-right text-gray-800 dark:text-white font-bold min-w-[100px]">الإجمالي</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[140px] text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((inv) => (
                          <InvoiceRow
                            key={inv.id}
                            inv={inv}
                            onSelect={setSelected}
                            onEdit={(inv) => {
                              setIsCreateOpen(true);
                              setSelected(inv);
                            }}
                            onDelete={handleDeleteInvoice}
                            onWhatsApp={handleSendWhatsApp}
                            onReturn={handleFactoryReturn}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Desktop Stats Cards */}
          <DesktopStats 
            invoices={invoices}
            totalSales={totalSales}
            invoiceClients={invoiceClients}
            suppliers={suppliers}
            stockItems={stockItems}
            onRefresh={fetchData}
            onCreateInvoice={() => {
              setIsCreateOpen(true);
              setSelected(null);
            }}
            onShowClients={() => setIsClientListOpen(true)}
          />
        </div>

        {/* Dialogs */}
        {selected && (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  تفاصيل {selected.invoice_type === 'FACTORY_DISPATCH' ? 'إذن التسليم' : 'الفاتورة'} - {selected.invoice_number || 'غير متوفر'}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 space-y-4">
                <InvoicePrint invoice={selected} />
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                {selected ? 'تحرير الفاتورة' : 'إنشاء فاتورة جديدة'}
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <CreateInvoiceForm
                clients={invoiceClients}
                suppliers={suppliers}
                stockItems={stockItems}
                user={user}
                onCreated={() => {
                  setIsCreateOpen(false);
                  setSelected(null);
                  fetchData();
                }}
                onCancel={() => {
                  setIsCreateOpen(false);
                  setSelected(null);
                }}
                isEdit={!!selected}
                initialData={selected}
              />
            </div>
          </DialogContent>
        </Dialog>

        {isReturnDialogOpen && selectedForReturn && (
          <FactoryReturnDialog
            invoice={selectedForReturn}
            user={user}
            onSuccess={handleReturnSuccess}
            onCancel={handleReturnCancel}
          />
        )}

        <ClientListDialog
          isOpen={isClientListOpen}
          onClose={() => setIsClientListOpen(false)}
          clients={invoiceClients}
          search={clientSearch}
          onSearch={setClientSearch}
        />
      </div>
    </InvoiceErrorBoundary>
  );
}

// Optimized Sub-components
const MobileStats = React.memo(({ 
  invoices, 
  totalSales, 
  invoiceClients, 
  suppliers, 
  stockItems, 
  onRefresh, 
  onCreateInvoice, 
  onShowClients 
}) => (
  <div className="mobile-stats md:hidden space-y-4">
    <StatsCard 
      title="إحصائيات سريعة"
      items={[
        { label: 'إجمالي الفواتير', value: invoices.length },
        { label: 'إجمالي المبيعات', value: formatCurrency(totalSales) + ' جنيه' }
      ]}
    />
    
    <ActionCard
      title="إنشاء فاتورة جديدة"
      actions={[
        { label: 'فاتورة جديدة', onClick: onCreateInvoice, primary: true },
        { label: 'تحديث البيانات', onClick: onRefresh, outline: true }
      ]}
    />
    
    <StatsCard
      title="الأطراف"
      items={[
        { label: 'العملاء', value: invoiceClients.length },
        { label: 'الموردون', value: suppliers.length },
        { label: 'الأصناف', value: stockItems.length }
      ]}
      action={{ label: 'عرض قائمة العملاء', onClick: onShowClients }}
    />
  </div>
));

const DesktopStats = React.memo(({ 
  invoices, 
  totalSales, 
  invoiceClients, 
  suppliers, 
  stockItems, 
  onRefresh, 
  onCreateInvoice, 
  onShowClients 
}) => (
  <div className="desktop-stats stats-cards lg:w-1/3 space-y-4">
    <StatsCard 
      title="إحصائيات سريعة"
      items={[
        { label: 'إجمالي الفواتير', value: invoices.length },
        { label: 'إجمالي المبيعات', value: formatCurrency(totalSales) + ' جنيه' }
      ]}
    />
    
    <ActionCard
      title="إنشاء فاتورة جديدة"
      actions={[
        { label: 'فاتورة جديدة', onClick: onCreateInvoice, primary: true },
        { label: 'تحديث البيانات', onClick: onRefresh, outline: true }
      ]}
    />
    
    <StatsCard
      title="الأطراف"
      items={[
        { label: 'العملاء', value: invoiceClients.length },
        { label: 'الموردون', value: suppliers.length },
        { label: 'الأصناف', value: stockItems.length }
      ]}
      action={{ label: 'عرض قائمة العملاء', onClick: onShowClients }}
    />
  </div>
));

const StatsCard = React.memo(({ title, items, action }) => (
  <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
            <strong className="text-gray-800 dark:text-white">{item.value}</strong>
          </div>
        ))}
      </div>
      {action && (
        <Button
          variant="outline"
          onClick={action.onClick}
          className="w-full mt-4 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
        >
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
));

const ActionCard = React.memo(({ title, actions }) => (
  <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            className={action.primary ? 
              "w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600" :
              "w-full border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            }
          >
            {action.primary && <PlusCircle size={16} />}
            {action.label}
          </Button>
        ))}
      </div>
    </CardContent>
  </Card>
));

const ClientListDialog = React.memo(({ isOpen, onClose, clients, search, onSearch }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">قائمة العملاء</DialogTitle>
      </DialogHeader>
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ابحث عن عميل بالاسم أو الهاتف"
            className="pl-10 pr-4 w-full"
          />
        </div>
        <div className="client-table-container">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-right bg-gray-100 dark:bg-gray-700">
                <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[150px]">الاسم</th>
                <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[120px]">رقم الهاتف</th>
                <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[80px]">النوع</th>
                <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[200px]">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {clients
                .filter(client =>
                  (client.name || '').toLowerCase().includes(search.toLowerCase()) ||
                  (client.phone || '').includes(search)
                )
                .map((client, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-right">{client.name || 'غير متوفر'}</td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{client.phone || '-'}</td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs ${client.type === 'vip' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}>
                        {client.type === 'vip' ? 'VIP' : 'عادي'}
                      </span>
                    </td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{client.notes || '-'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </DialogContent>
  </Dialog>
));

// Custom hooks for performance
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Optimized styles component
const OptimizedStyles = React.memo(() => (
  <style>
    {`
      .font-tajawal { font-family: 'Tajawal', Arial, sans-serif; }
      @media print {
        body * { visibility: hidden; }
        .print-content, .print-content * { visibility: visible; }
        .print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 210mm;
          min-height: 297mm;
          font-size: 12pt;
          padding: 15mm;
        }
      }
      .stats-cards { max-width: 400px; }
      @media (max-width: 768px) {
        .stats-cards { max-width: 100%; order: -1; }
        .invoices-table { order: 1; }
        .mobile-stats { display: block; }
        .desktop-stats { display: none; }
      }
      @media (min-width: 769px) {
        .mobile-stats { display: none; }
        .desktop-stats { display: block; }
      }
      .table-container { overflow-x: auto; }
      .sticky-header {
        position: sticky;
        top: 0;
        background: white;
        z-index: 10;
      }
      .dark .sticky-header { background: #1f2937; }
      .action-buttons {
        display: flex;
        gap: 4px;
        justify-content: center;
      }
      .action-btn {
        padding: 6px;
        border-radius: 4px;
        transition: all 0.3s ease;
      }
      .action-btn:hover {
        transform: scale(1.1);
        background-color: rgba(0,0,0,0.05);
      }
      .dark .action-btn:hover {
        background-color: rgba(255,255,255,0.05);
      }
      .client-table-container {
        max-height: 400px;
        overflow-y: auto;
      }
      .client-table-container thead {
        position: sticky;
        top: 0;
        background: white;
        z-index: 10;
      }
      .dark .client-table-container thead {
        background: #1f2937;
      }
    `}
  </style>
));

OptimizedStyles.displayName = 'OptimizedStyles';
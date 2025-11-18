import React, { useEffect, useState, useMemo, useRef, Component } from "react";
import { FileText, PlusCircle, Search, Printer, X, Menu, ChevronDown, ChevronUp, Edit, Trash2, Eye, Download, RotateCcw, Package, Database, Users, MapPin, PackageCheck } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  getDoc,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config'; // Updated import path
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/roles/manager/ui/card";
import { Button } from "@/features/roles/manager/ui/Button";
import { Input } from "@/features/roles/manager/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/features/roles/manager/ui/Dialog";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Error Boundary Component
class InvoiceErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
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

// Utility functions
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
  const parsedDate = date?.toDate ? date.toDate() : new Date(date);
  if (isNaN(parsedDate.getTime())) return 'تاريخ غير صالح';
  return parsedDate.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Map invoice types for display
const getInvoiceTypeDisplay = (type) => {
  const typeMap = {
    'SALE': 'بيع',
    'PURCHASE': 'شراء',
    'FACTORY_DISPATCH': 'صرف المصنع',
    'SALE_RETURN': 'مرتجع بيع',
    'PURCHASE_RETURN': 'مرتجع شراء',
    'FACTORY_RETURN': 'مرتجع المصنع'
  };
  return typeMap[type] || type;
};

// Warehouse configuration
const warehouses = [
  { value: 'main-inventory', label: 'المخزن الرئيسي', color: 'bg-purple-600' },
  { value: 'monofia', label: 'المنوفية', color: 'bg-emerald-600' },
  { value: 'matbaa', label: 'المطبعة', color: 'bg-orange-600' }
];

// Firebase service functions with proper error handling
const firebaseService = {
  // Helper to validate db instance
  validateDb() {
    if (!db) {
      throw new Error('Firestore instance is not available');
    }
    return db;
  },

  // Invoices
  async getInvoices() {
    try {
      const database = this.validateDb();
      const q = query(collection(database, 'invoices'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        invoice_date: doc.data().invoice_date?.toDate?.() || doc.data().invoice_date
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  async createInvoice(invoiceData) {
    try {
      const database = this.validateDb();
      // Generate invoice number
      const invoicesQuery = query(collection(database, 'invoices'), orderBy('invoice_number', 'desc'));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const lastInvoice = invoicesSnapshot.docs[0]?.data();
      const lastNumber = lastInvoice?.invoice_number || 0;
      const newInvoiceNumber = lastNumber + 1;

      const docRef = await addDoc(collection(database, 'invoices'), {
        ...invoiceData,
        invoice_number: newInvoiceNumber,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      
      // Update stock quantities for sales and factory dispatch (only from main inventory)
      if (invoiceData.type === 'SALE' || invoiceData.type === 'FACTORY_DISPATCH') {
        await this.updateStockForInvoice(invoiceData.details, 'decrease');
      } else if (invoiceData.type === 'PURCHASE') {
        await this.updateStockForInvoice(invoiceData.details, 'increase');
      }
      
      return { id: docRef.id, ...invoiceData, invoice_number: newInvoiceNumber };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  async updateInvoice(invoiceId, invoiceData) {
    try {
      const database = this.validateDb();
      const invoiceRef = doc(database, 'invoices', invoiceId);
      const currentInvoice = await getDoc(invoiceRef);
      const currentData = currentInvoice.data();
      
      // Restore original stock quantities first
      if (currentData.type === 'SALE' || currentData.type === 'FACTORY_DISPATCH') {
        await this.updateStockForInvoice(currentData.details, 'increase');
      } else if (currentData.type === 'PURCHASE') {
        await this.updateStockForInvoice(currentData.details, 'decrease');
      }
      
      // Update with new quantities
      if (invoiceData.type === 'SALE' || invoiceData.type === 'FACTORY_DISPATCH') {
        await this.updateStockForInvoice(invoiceData.details, 'decrease');
      } else if (invoiceData.type === 'PURCHASE') {
        await this.updateStockForInvoice(invoiceData.details, 'increase');
      }
      
      await updateDoc(invoiceRef, {
        ...invoiceData,
        updated_at: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  async deleteInvoice(invoiceId) {
    try {
      const database = this.validateDb();
      const invoiceRef = doc(database, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);
      const invoiceData = invoiceDoc.data();
      
      // Restore stock quantities when deleting invoice
      if (invoiceData.type === 'SALE' || invoiceData.type === 'FACTORY_DISPATCH') {
        await this.updateStockForInvoice(invoiceData.details, 'increase');
      } else if (invoiceData.type === 'PURCHASE') {
        await this.updateStockForInvoice(invoiceData.details, 'decrease');
      }
      
      await deleteDoc(invoiceRef);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },

  async updateStockForInvoice(details, operation) {
    try {
      const database = this.validateDb();
      const batch = writeBatch(database);
      
      for (const item of details) {
        if (item.stock_id) {
          const stockRef = doc(database, 'warehouseItems', item.stock_id);
          const quantity = parseNumber(item.الكمية);
          
          if (operation === 'decrease') {
            batch.update(stockRef, {
              remaining_quantity: increment(-quantity)
            });
          } else if (operation === 'increase') {
            batch.update(stockRef, {
              remaining_quantity: increment(quantity)
            });
          }
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  },

  // Stock - Only from main inventory for invoices
  async getStockItems() {
    try {
      const database = this.validateDb();
      const q = query(
        collection(database, 'warehouseItems'), 
        where('warehouseId', '==', 'main-inventory'),
        orderBy('item_name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        الصنف: doc.data().item_name,
        الكود: doc.data().item_code,
        اللون: doc.data().color,
        الكمية_المتبقية: doc.data().remaining_quantity || 0,
        سعر_الوحدة: doc.data().unit_price || 0,
        الوحدة: 'قطعة'
      }));
    } catch (error) {
      console.error('Error fetching stock items:', error);
      throw error;
    }
  },

  // Clients from invoices
  async getClients() {
    try {
      const database = this.validateDb();
      const invoicesQuery = query(
        collection(database, 'invoices'),
        where('client_name', '!=', null)
      );
      const querySnapshot = await getDocs(invoicesQuery);
      const clientsMap = new Map();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.client_name && data.client_phone) {
          clientsMap.set(data.client_phone, {
            name: data.client_name,
            phone: data.client_phone,
            type: 'عادي',
            notes: `آخر فاتورة: ${data.invoice_number}`
          });
        }
      });
      
      return Array.from(clientsMap.values());
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },

  // Suppliers from invoices
  async getSuppliers() {
    try {
      const database = this.validateDb();
      const invoicesQuery = query(
        collection(database, 'invoices'),
        where('supplier_name', '!=', null)
      );
      const querySnapshot = await getDocs(invoicesQuery);
      const suppliersMap = new Map();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.supplier_name) {
          suppliersMap.set(data.supplier_name, {
            name: data.supplier_name,
            type: 'مورد'
          });
        }
      });
      
      return Array.from(suppliersMap.values());
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  // Factory return
  async processFactoryReturn(returnData) {
    try {
      const database = this.validateDb();
      // Generate return invoice number
      const invoicesQuery = query(collection(database, 'invoices'), orderBy('invoice_number', 'desc'));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const lastInvoice = invoicesSnapshot.docs[0]?.data();
      const lastNumber = lastInvoice?.invoice_number || 0;
      const newInvoiceNumber = lastNumber + 1;

      // Create return invoice
      const returnInvoiceRef = await addDoc(collection(database, 'invoices'), {
        ...returnData,
        invoice_number: newInvoiceNumber,
        invoice_type: 'FACTORY_RETURN',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });

      // Update stock quantities - return items to main inventory
      const batch = writeBatch(database);
      
      for (const item of returnData.details) {
        if (item.stock_id) {
          const stockRef = doc(database, 'warehouseItems', item.stock_id);
          batch.update(stockRef, {
            remaining_quantity: increment(parseNumber(item.الكمية))
          });
        }
      }

      await batch.commit();
      return { 
        id: returnInvoiceRef.id, 
        ...returnData, 
        return_invoice_number: newInvoiceNumber,
        message: 'تم معالجة مرتجع المصنع بنجاح'
      };
    } catch (error) {
      console.error('Error processing factory return:', error);
      throw error;
    }
  }
};

// Add Item Modal Component
const AddItemModal = ({ isOpen, onClose, onSave, initialItem, isEdit = false }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    item_code: '',
    color: '',
    cartons_count: '',
    bottles_per_carton: '',
    single_bottles: '',
    supplier: '',
    location: '',
    notes: '',
    warehouseId: 'main-inventory',
    unit_price: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialItem && isEdit) {
      setFormData({
        item_name: initialItem.item_name || '',
        item_code: initialItem.item_code || '',
        color: initialItem.color || '',
        cartons_count: initialItem.cartons_count?.toString() || '',
        bottles_per_carton: initialItem.bottles_per_carton?.toString() || '',
        single_bottles: initialItem.single_bottles?.toString() || '',
        supplier: initialItem.supplier || '',
        location: initialItem.location || '',
        notes: initialItem.notes || '',
        warehouseId: initialItem.warehouseId || 'main-inventory',
        unit_price: initialItem.unit_price?.toString() || ''
      });
    } else {
      setFormData({
        item_name: '',
        item_code: '',
        color: '',
        cartons_count: '',
        bottles_per_carton: '',
        single_bottles: '',
        supplier: '',
        location: '',
        notes: '',
        warehouseId: 'main-inventory',
        unit_price: ''
      });
    }
  }, [initialItem, isEdit]);

  const calculateTotalQuantity = () => {
    const cartons = parseNumber(formData.cartons_count);
    const perCarton = parseNumber(formData.bottles_per_carton);
    const singles = parseNumber(formData.single_bottles);
    return (cartons * perCarton) + singles;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.item_name || !formData.item_code) {
      setError('يرجى إدخال اسم الصنف والكود');
      return;
    }

    if (!formData.cartons_count || !formData.bottles_per_carton) {
      setError('يرجى إدخال عدد الكراتين وعدد القطع في الكرتونة');
      return;
    }

    setSaving(true);
    try {
      const totalQuantity = calculateTotalQuantity();
      const itemData = {
        item_name: formData.item_name.trim(),
        item_code: formData.item_code.trim(),
        color: formData.color.trim(),
        cartons_count: parseNumber(formData.cartons_count),
        bottles_per_carton: parseNumber(formData.bottles_per_carton),
        single_bottles: parseNumber(formData.single_bottles),
        supplier: formData.supplier.trim(),
        location: formData.location.trim(),
        notes: formData.notes.trim(),
        warehouseId: formData.warehouseId,
        unit_price: parseNumber(formData.unit_price) || 0,
        added_quantity: totalQuantity,
        remaining_quantity: isEdit ? initialItem.remaining_quantity : totalQuantity,
        updatedAt: Timestamp.now()
      };

      if (!isEdit) {
        itemData.createdAt = Timestamp.now();
      }

      await onSave(itemData, isEdit);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      setError('حدث خطأ أثناء حفظ الصنف');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
            {isEdit ? 'تعديل الصنف' : 'إضافة صنف جديد'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'قم بتعديل بيانات الصنف' : 'أدخل بيانات الصنف الجديد'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                المعلومات الأساسية
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم الصنف *
                </label>
                <Input
                  value={formData.item_name}
                  onChange={(e) => handleChange('item_name', e.target.value)}
                  placeholder="أدخل اسم الصنف"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الكود *
                </label>
                <Input
                  value={formData.item_code}
                  onChange={(e) => handleChange('item_code', e.target.value)}
                  placeholder="أدخل كود الصنف"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اللون
                </label>
                <Input
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  placeholder="أدخل اللون"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  سعر الوحدة
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => handleChange('unit_price', e.target.value)}
                  placeholder="أدخل سعر الوحدة"
                />
              </div>
            </div>

            {/* Quantity Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                معلومات الكمية
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عدد الكراتين *
                </label>
                <Input
                  type="number"
                  value={formData.cartons_count}
                  onChange={(e) => handleChange('cartons_count', e.target.value)}
                  placeholder="عدد الكراتين"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عدد القطع في الكرتونة *
                </label>
                <Input
                  type="number"
                  value={formData.bottles_per_carton}
                  onChange={(e) => handleChange('bottles_per_carton', e.target.value)}
                  placeholder="عدد القطع في الكرتونة"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  القطع الفردية
                </label>
                <Input
                  type="number"
                  value={formData.single_bottles}
                  onChange={(e) => handleChange('single_bottles', e.target.value)}
                  placeholder="القطع الفردية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المستودع
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => handleChange('warehouseId', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  {warehouses.map(wh => (
                    <option key={wh.value} value={wh.value}>{wh.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
              معلومات إضافية
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المورد
                </label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="اسم المورد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الموقع
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="موقع التخزين"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="ملاحظات إضافية"
                rows={3}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">الكمية الإجمالية</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {calculateTotalQuantity().toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">المستودع</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-white">
                    {warehouses.find(w => w.value === formData.warehouseId)?.label}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">سعر الوحدة</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(formData.unit_price)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">الحالة</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-white">
                    {isEdit ? 'تعديل' : 'جديد'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              {saving ? 'جاري الحفظ...' : (isEdit ? 'تحديث الصنف' : 'حفظ الصنف')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Items Management Component
const ItemsManagement = ({ onItemSelect, showItemsManagement, setShowItemsManagement }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('main-inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const database = firebaseService.validateDb();
      const q = query(
        collection(database, 'warehouseItems'),
        where('warehouseId', '==', selectedWarehouse),
        orderBy('item_name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async (itemData, isEdit = false) => {
    try {
      const database = firebaseService.validateDb();
      if (isEdit && selectedItem) {
        await updateDoc(doc(database, 'warehouseItems', selectedItem.id), itemData);
      } else {
        await addDoc(collection(database, 'warehouseItems'), itemData);
      }
      fetchItems(); // Refresh the list
    } catch (error) {
      console.error('Error saving item:', error);
      throw error;
    }
  };

  const deleteItem = async (itemId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      try {
        const database = firebaseService.validateDb();
        await deleteDoc(doc(database, 'warehouseItems', itemId));
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('حدث خطأ أثناء حذف الصنف');
      }
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEdit(true);
    setShowAddModal(true);
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setIsEdit(false);
    setShowAddModal(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  useEffect(() => {
    if (showItemsManagement) {
      fetchItems();
    }
  }, [selectedWarehouse, showItemsManagement]);

  if (!showItemsManagement) return null;

  return (
    <Dialog open={showItemsManagement} onOpenChange={setShowItemsManagement}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            إدارة الأصناف
          </DialogTitle>
          <DialogDescription>
            إدارة الأصناف والمخزون في المستودعات المختلفة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                {warehouses.map(wh => (
                  <option key={wh.value} value={wh.value}>{wh.label}</option>
                ))}
              </select>
              
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالصنف، الكود، اللون أو المورد..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button
              onClick={handleAddNew}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              <PlusCircle className="w-4 h-4" />
              إضافة صنف
            </Button>
          </div>

          {/* Items Table */}
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد أصناف</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-3 text-right">الصنف</th>
                    <th className="p-3 text-right">الكود</th>
                    <th className="p-3 text-right">اللون</th>
                    <th className="p-3 text-right">المتاح</th>
                    <th className="p-3 text-right">سعر الوحدة</th>
                    <th className="p-3 text-right">المستودع</th>
                    <th className="p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">{item.item_name}</td>
                      <td className="p-3">{item.item_code}</td>
                      <td className="p-3">{item.color || '-'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.remaining_quantity === 0 ? 'bg-red-100 text-red-800' :
                          item.remaining_quantity < 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.remaining_quantity}
                        </span>
                      </td>
                      <td className="p-3 text-left">{formatCurrency(item.unit_price || 0)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs text-white ${
                          warehouses.find(w => w.value === item.warehouseId)?.color
                        }`}>
                          {warehouses.find(w => w.value === item.warehouseId)?.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => onItemSelect(item)}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            اختر للفاتورة
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEdit(item)}
                            variant="outline"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => deleteItem(item.id)}
                            variant="red"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={saveItem}
          initialItem={selectedItem}
          isEdit={isEdit}
        />
      </DialogContent>
    </Dialog>
  );
};

// Printable Invoice Component
const InvoicePrint = React.forwardRef(({ invoice }, ref) => {
  const handleExportToPDF = async () => {
    const input = document.getElementById('invoice-content');
    if (!input) return;
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`فاتورة_${invoice.invoice_number || 'فاتورة'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    let ws;
   
    if (invoice.invoice_type === 'FACTORY_DISPATCH') {
      ws = XLSX.utils.json_to_sheet([
        { A: `إذن تسليم زجاج رقم: ${invoice.invoice_number || 'غير متوفر'}` },
        { A: `تاريخ الإصدار: ${formatDate(invoice.invoice_date)}` },
        { A: `منصرف إلى: ${invoice.recipient || 'غير متوفر'}` },
        { A: `ملاحظات: ${invoice.notes || 'لا توجد'}` },
        { A: "" },
        { A: "الأصناف" },
      ], { skipHeader: true });
      const itemsData = (invoice.details || []).map((d, index) => ({
        "م": index + 1,
        "الكود/التشغيله": d.الكود || '-',
        "اسم الصنف/الوصف": d.الصنف || '-',
        "اللون": d.اللون || '-',
        "الوحدة": d.الوحدة || '-',
        "الكمية": d.الكمية || 0,
        "ملاحظات": d.ملاحظات || '-',
      }));
      XLSX.utils.sheet_add_json(ws, itemsData, { origin: -1 });
      XLSX.utils.book_append_sheet(wb, ws, "إذن تسليم زجاج");
      XLSX.writeFile(wb, `إذن_تسليم_زجاج_${invoice.invoice_number || 'إذن'}.xlsx`);
    } else {
      ws = XLSX.utils.json_to_sheet([
        { A: `فاتورة رقم: ${invoice.invoice_number || 'غير متوفر'}` },
        { A: `تاريخ الإصدار: ${formatDate(invoice.invoice_date)}` },
        { A: `نوع الفاتورة: ${getInvoiceTypeDisplay(invoice.invoice_type)}` },
        { A: `العميل: ${invoice.client_name || 'غير متوفر'}` },
        ...(invoice.invoice_type === 'SALE' ? [{ A: `رقم هاتف العميل: ${invoice.client_phone || 'غير متوفر'}` }] : []),
        { A: `المورد: ${invoice.supplier_name || 'غير متوفر'}` },
        { A: `ملاحظات: ${invoice.notes || 'لا توجد'}` },
        { A: "" },
        { A: "الأصناف" },
      ], { skipHeader: true });
      const itemsData = (invoice.details || []).map((d, index) => ({
        "الصنف": d.الصنف || '-',
        "الكود": d.الكود || '-',
        "اللون": d.اللون || '-',
        "الكمية": d.الكمية || 0,
        "سعر الوحدة (جنيه)": formatCurrency(d.serial_الوحدة),
        "الإجمالي (جنيه)": formatCurrency(parseNumber(d.الكمية) * parseNumber(d.serial_الوحدة)),
      }));
      XLSX.utils.sheet_add_json(ws, itemsData, { origin: -1 });
      XLSX.utils.sheet_add_json(ws, [
        { "الصنف": "الإجمالي الكلي", "الإجمالي (جنيه)": formatCurrency(invoice.total_amount) }
      ], { origin: -1, skipHeader: true });
      XLSX.utils.book_append_sheet(wb, ws, "فاتورة");
      XLSX.writeFile(wb, `فاتورة_${invoice.invoice_number || 'فاتورة'}.xlsx`);
    }
  };

  if (!invoice || !invoice.details) {
    return null;
  }

  const totalQuantity = invoice.details.reduce((sum, d) => sum + parseNumber(d.الكمية), 0);
  const displayType = getInvoiceTypeDisplay(invoice.invoice_type);

  return (
    <div dir="rtl" className="font-tajawal text-right">
      <div id="invoice-content" ref={ref} className="p-6 bg-white dark:bg-gray-800 print-content relative" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
          <div className="text-6xl font-bold text-gray-400 dark:text-gray-600">EL BARAN</div>
        </div>
        
        {/* Company Header */}
        <div className="flex justify-between items-start mb-6 border-b-2 border-gray-300 dark:border-gray-600 pb-4">
          <div className="text-left">
            <div className="text-sm text-gray-600 dark:text-gray-400">نظام إدارة الفواتير</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">#{invoice.invoice_number || "غير متوفر"}</div>
          </div>
          <div className="flex flex-col items-center">
            <img
              src="/logo.png"
              alt="EL BARAN Logo"
              className="w-16 h-16 object-cover rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="text-sm font-bold text-gray-800 dark:text-white mt-2">EL BARAN</div>
          </div>
        </div>

        {invoice.invoice_type === 'FACTORY_DISPATCH' ? (
          <>
            {/* Factory Dispatch Invoice */}
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">تفاصيل إذن التسليم</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">رقم:</span> {invoice.invoice_number || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">التاريخ:</span> {formatDate(invoice.invoice_date)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">بيانات التسليم</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">منصرف إلى:</span> {invoice.recipient || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">أنشأها:</span> {invoice.created_by_username || 'غير متوفر'}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">اذن تسليم زجاج</h1>
              </div>
              <table className="w-full border-collapse border border-gray-800 dark:border-gray-400 text-sm mb-6">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold w-12 text-gray-800 dark:text-white">م</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[150px] text-gray-800 dark:text-white">الصنف</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[100px] text-gray-800 dark:text-white">الكود</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[100px] text-gray-800 dark:text-white">اللون</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[80px] text-gray-800 dark:text-white">الوحدة</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[80px] text-gray-800 dark:text-white">الكمية</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[150px] text-gray-800 dark:text-white">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.details || []).map((d, index) => (
                    <tr key={index} className="border-b border-gray-800 dark:border-gray-400">
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.الصنف || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.الكود || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.اللون || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.الوحدة || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{d.الكمية || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.ملاحظات || ''}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 15 - (invoice.details?.length || 0)) }).map((_, index) => (
                    <tr key={`empty-${index}`}>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{(invoice.details?.length || 0) + index + 1}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <td colSpan={5} className="border border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-800 dark:text-white">المجموع</td>
                    <td className="border border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-800 dark:text-white">{totalQuantity}</td>
                    <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                  </tr>
                </tfoot>
              </table>
              {invoice.notes && (
                <Card className="mt-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <CardContent className="p-4">
                    <span className="font-bold text-gray-800 dark:text-white">ملاحظات: </span>
                    <span className="text-gray-700 dark:text-gray-300">{invoice.notes}</span>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Regular Invoice */}
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">تفاصيل الفاتورة</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">فاتورة رقم:</span> {invoice.invoice_number || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">تاريخ الإصدار:</span> {formatDate(invoice.invoice_date)}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">نوع الفاتورة:</span> {displayType}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">أنشأها:</span> {invoice.created_by_username || 'غير متوفر'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">بيانات العميل / المورد</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">العميل:</span> {invoice.client_name || 'غير متوفر'}</p>
                    {invoice.invoice_type === 'SALE' && (
                      <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">رقم هاتف العميل:</span> {invoice.client_phone || 'غير متوفر'}</p>
                    )}
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">المورد:</span> {invoice.supplier_name || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">ملاحظات:</span> {invoice.notes || 'لا توجد'}</p>
                  </CardContent>
                </Card>
              </div>
              <table className="w-full border-collapse mb-6 text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[150px] text-gray-800 dark:text-white">الصنف</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">الكود</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">اللون</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[80px] text-gray-800 dark:text-white">الكمية</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">سعر الوحدة (جنيه)</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">الإجمالي (جنيه)</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.details || []).map((d, index) => (
                    <tr key={index} className="border-b border-gray-300 dark:border-gray-600">
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-right text-gray-700 dark:text-gray-300">{d.الصنف || '-'}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-700 dark:text-gray-300">{d.الكود || '-'}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-700 dark:text-gray-300">{d.اللون || '-'}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-center text-gray-700 dark:text-gray-300">{d.الكمية || 0}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(d.serial_الوحدة)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(parseNumber(d.الكمية) * parseNumber(d.serial_الوحدة))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <td colSpan={5} className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold text-gray-800 dark:text-white">الإجمالي الكلي</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold text-gray-800 dark:text-white">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
        <div className="relative z-10 text-center text-gray-600 dark:text-gray-400 mt-6">
          <p className="text-sm">نشكر ثقتكم بمنتجاتنا 🌸</p>
          {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
            <p className="text-sm">سياسة الاسترجاع: خلال 14 يوم من تاريخ الفاتورة مع الاحتفاظ بالعبوة الأصلية.</p>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Button
          onClick={handleExportToPDF}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
        >
          <Download size={16} /> تحميل PDF
        </Button>
        <Button
          onClick={handleExportToExcel}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
        >
          تصدير إلى Excel
        </Button>
      </div>
    </div>
  );
});
InvoicePrint.displayName = 'InvoicePrint';

// Factory Return Dialog Component
const FactoryReturnDialog = ({ invoice, user, onSuccess, onCancel }) => {
  const [returnType, setReturnType] = useState('زجاج فقط');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!invoice?.id || !user?.id) {
      setError('بيانات غير صالحة');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const returnData = {
        invoice_id: invoice.id,
        return_type: returnType,
        user_id: user.id,
        notes: notes || undefined,
        details: invoice.details || [],
        type: 'FACTORY_RETURN',
        client_name: invoice.client_name,
        supplier_name: invoice.supplier_name,
        recipient: invoice.recipient,
        total_amount: 0,
        created_by_username: user.username || 'غير معروف'
      };

      const result = await firebaseService.processFactoryReturn(returnData);
      
      if (result) {
        onSuccess(result);
      } else {
        setError('فشل في معالجة المرتجع');
      }
    } catch (err) {
      console.error('Factory return error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة المرتجع');
    } finally {
      setSubmitting(false);
    }
  };

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
};

// Create Invoice Form Component
function CreateInvoiceForm({ clients, suppliers, user, onCreated, onCancel, isEdit, initialData }) {
  const [type, setType] = useState(initialData?.invoice_type || "SALE");
  const [party, setParty] = useState(initialData ? (initialData.invoice_type === 'SALE' ? initialData.client_name : initialData.invoice_type === 'PURCHASE' ? initialData.supplier_name : initialData.recipient) : "");
  const [clientPhone, setClientPhone] = useState(initialData?.client_phone || "");
  const [details, setDetails] = useState(initialData?.details || []);
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [stockItems, setStockItems] = useState([]);
  const [showItemsManagement, setShowItemsManagement] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    try {
      const items = await firebaseService.getStockItems();
      setStockItems(items);
    } catch (error) {
      console.error('Error fetching stock items:', error);
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item.id);
    setPrice(item.unit_price || '');
    setUnit('قطعة');
    setShowItemsManagement(false);
  };

  const filteredItems = useMemo(() => {
    if (!itemSearch) return stockItems;
    return stockItems.filter(item =>
      (item.الصنف || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.الكود || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.اللون || '').toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [stockItems, itemSearch]);

  const totalQty = details.reduce((sum, d) => sum + parseNumber(d.الكمية), 0);
  const total = type !== 'FACTORY_DISPATCH' ? details.reduce((s, d) => s + (parseNumber(d.الكمية) * parseNumber(d.serial_الوحدة)), 0) : 0;

  const addLine = () => {
    if (!selectedItem || qty <= 0) {
      setError("يرجى إكمال بيانات الصنف: الصنف والكمية");
      return;
    }
   
    if (type !== 'FACTORY_DISPATCH' && (!price || parseFloat(price) <= 0)) {
      setError("يرجى إدخال سعر الوحدة (يجب أن يكون أكبر من 0)");
      return;
    }
   
    const item = stockItems.find(s => String(s.id) === String(selectedItem));
    if (!item) {
      setError("الصنف غير موجود");
      return;
    }
   
    if ((type === 'SALE' || type === 'FACTORY_DISPATCH') && item.الكمية_المتبقية < qty) {
      setError(`الكمية غير كافية للصنف ${item.الصنف}: المتوفر ${item.الكمية_المتبقية}، المطلوب ${qty}`);
      return;
    }
   
    const existingItemIndex = details.findIndex(d => d.stock_id === item.id);
   
    const newDetail = {
      stock_id: item.id,
      الصنف: item.الصنف,
      الكود: item.الكود,
      اللون: item.اللون,
      الكمية: parseInt(qty),
    };
    if (type !== 'FACTORY_DISPATCH') {
      newDetail.serial_الوحدة = parseFloat(price) || 0;
    } else {
      newDetail.الوحدة = unit || '';
      newDetail.ملاحظات = itemNotes || '';
    }
    if (existingItemIndex >= 0) {
      const updatedDetails = [...details];
      updatedDetails[existingItemIndex] = {
        ...updatedDetails[existingItemIndex],
        الكمية: parseInt(updatedDetails[existingItemIndex].الكمية) + parseInt(qty),
        ...(type !== 'FACTORY_DISPATCH' && { serial_الوحدة: parseFloat(price) || 0 }),
        ...(type === 'FACTORY_DISPATCH' && { الوحدة: unit || '', ملاحظات: itemNotes || '' })
      };
      setDetails(updatedDetails);
    } else {
      setDetails([...details, newDetail]);
    }
   
    setSelectedItem("");
    setQty(1);
    setPrice("");
    setUnit("");
    setItemNotes("");
    setError("");
    setShowItemForm(false);
    setItemSearch("");
  };

  const removeDetail = (index) => {
    const newDetails = [...details];
    newDetails.splice(index, 1);
    setDetails(newDetails);
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...details];
    const item = stockItems.find(s => s.id === newDetails[index].stock_id);
    if (field === 'الكمية' && (type === 'SALE' || type === 'FACTORY_DISPATCH') && item && parseInt(value) > item.الكمية_المتبقية) {
      setError(`الكمية غير كافية للصنف ${item.الصنف}: المتوفر ${item.الكمية_المتبقية}، المطلوب ${value}`);
      return;
    }
    newDetails[index] = {
      ...newDetails[index],
      [field]: field === 'الكمية' ? parseInt(value) || 0 : field === 'serial_الوحدة' ? parseFloat(value) || 0 : value
    };
    setDetails(newDetails);
  };

  const submit = async () => {
    if (!isAuthenticated || !user?.id) {
      setError("يجب تسجيل الدخول أولاً");
      navigate('/login');
      return;
    }
    if (!party) {
      setError("يرجى إدخال اسم العميل أو المورد أو الجهة المنصرف إليها");
      return;
    }
    if (type === 'SALE' && !clientPhone) {
      setError("يرجى إدخال رقم هاتف العميل");
      return;
    }
    if (type === 'SALE' && !/^\+?\d+$/.test(clientPhone)) {
      setError("رقم هاتف العميل يجب أن يحتوي على أرقام فقط (يمكن أن يبدأ بـ +)");
      return;
    }
    if (details.length === 0) {
      setError("أضف صنفًا واحدًا على الأقل");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type,
        client_name: type === "SALE" ? party : null,
        client_phone: type === "SALE" ? clientPhone : null,
        supplier_name: type === "PURCHASE" ? party : null,
        recipient: type === "FACTORY_DISPATCH" ? party : null,
        details,
        user_id: user.id,
        notes: notes || '',
        total_amount: type !== 'FACTORY_DISPATCH' ? total : 0,
        created_by_username: user.username || 'غير معروف'
      };
      if (isEdit) {
        if (!initialData?.id) {
          throw new Error("معرف الفاتورة غير صالح");
        }
        payload.original_details = initialData.details || [];
        await firebaseService.updateInvoice(initialData.id, payload);
      } else {
        await firebaseService.createInvoice(payload);
      }
      onCreated();
    } catch (err) {
      console.error('API Error:', err);
      setError(err.response?.data?.message || err.message || 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-tajawal">
      {error && <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">{error}</div>}
      
      {/* Invoice Type and Party Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الفاتورة</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setParty("");
              setClientPhone("");
              setDetails([]);
            }}
            className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            <option value="SALE">فاتورة بيع</option>
            <option value="PURCHASE">فاتورة شراء</option>
            <option value="FACTORY_DISPATCH">صرف المصنع</option>
          </select>
        </div>
        <div className={type === 'SALE' ? 'md:col-span-1' : 'md:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {type === 'SALE' ? 'اسم العميل' : type === 'PURCHASE' ? 'اسم المورد' : 'منصرف إلى'}
          </label>
          <Input
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder={`أدخل ${type === 'SALE' ? 'اسم العميل' : type === 'PURCHASE' ? 'اسم المورد' : 'الجهة المنصرف إليها'}`}
            className="p-2 border rounded w-full"
          />
        </div>
        {type === 'SALE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم هاتف العميل</label>
            <Input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="أدخل رقم هاتف العميل (مثال: +966123456789)"
              className="p-2 border rounded w-full"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أدخل ملاحظات الفاتورة (اختياري)"
          className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          rows={3}
        />
      </div>

      {/* Items Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-gray-800 dark:text-white">الأصناف</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowItemsManagement(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              إدارة الأصناف
            </Button>
            <Button
              onClick={() => setShowItemForm(!showItemForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              {showItemForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showItemForm ? 'إخفاء' : 'إضافة صنف'}
            </Button>
          </div>
        </div>
       
        {showItemForm && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="ابحث بالصنف، الكود أو اللون..."
                className="pl-10 pr-4 w-full"
              />
            </div>
           
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-600">
                    <th className="p-2 text-gray-800 dark:text-white">الصنف</th>
                    <th className="p-2 text-gray-800 dark:text-white">الكود</th>
                    <th className="p-2 text-gray-800 dark:text-white">اللون</th>
                    <th className="p-2 text-gray-800 dark:text-white">المتاح</th>
                    {type !== 'FACTORY_DISPATCH' && <th className="p-2 text-gray-800 dark:text-white">سعر الوحدة</th>}
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.الصنف || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.الكود || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.اللون || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.الكمية_المتبقية || 0}</td>
                      {type !== 'FACTORY_DISPATCH' && (
                        <td className="p-2 text-gray-700 dark:text-gray-300">{formatCurrency(item.سعر_الوحدة)}</td>
                      )}
                      <td className="p-2">
                        <Button
                          size="sm"
                          onClick={() => handleItemSelect(item)}
                          className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                          اختر
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصنف</label>
                <select
                  value={selectedItem}
                  onChange={(e) => {
                    const item = stockItems.find(s => String(s.id) === String(e.target.value));
                    setSelectedItem(e.target.value);
                    setPrice(item?.سعر_الوحدة || '');
                    setUnit('قطعة');
                    setItemNotes('');
                  }}
                  className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">اختر صنف</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.الصنف} {item.اللون ? `(${item.اللون})` : ''} {item.الكود ? `[${item.الكود}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكمية</label>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  placeholder="أدخل الكمية"
                  className="p-2 border rounded w-full"
                />
              </div>
              {type !== 'FACTORY_DISPATCH' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر الوحدة</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="أدخل سعر الوحدة"
                    className="p-2 border rounded w-full"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="أدخل الوحدة"
                      className="p-2 border rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الصنف</label>
                    <Input
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="أدخل ملاحظات الصنف"
                      className="p-2 border rounded w-full"
                    />
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={addLine}
              className="w-full mt-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              إضافة الصنف
            </Button>
          </div>
        )}
      </div>

      {/* Items List */}
      {details.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2">الأصناف المضافة</h3>
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${type === 'FACTORY_DISPATCH' ? 'elastic-table' : ''}`}>
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr className="text-right">
                  <th className="p-3 text-gray-800 dark:text-white">الصنف</th>
                  <th className="p-3 text-gray-800 dark:text-white">الكود</th>
                  <th className="p-3 text-gray-800 dark:text-white">اللون</th>
                  <th className="p-3 text-gray-800 dark:text-white">الكمية</th>
                  {type !== 'FACTORY_DISPATCH' ? (
                    <>
                      <th className="p-3 text-gray-800 dark:text-white">سعر الوحدة</th>
                      <th className="p-3 text-gray-800 dark:text-white">الإجمالي</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 text-gray-800 dark:text-white">الوحدة</th>
                      <th className="p-3 text-gray-800 dark:text-white">ملاحظات</th>
                    </>
                  )}
                  <th className="p-3 text-gray-800 dark:text-white">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                    <td className="p-3 text-gray-700 dark:text-gray-300">{detail.الصنف || '-'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{detail.الكود || '-'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{detail.اللون || '-'}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="1"
                        value={detail.الكمية}
                        onChange={(e) => updateDetail(index, 'الكمية', e.target.value)}
                        className="p-2 border rounded w-20 text-center"
                      />
                    </td>
                    {type !== 'FACTORY_DISPATCH' ? (
                      <>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={detail.serial_الوحدة}
                            onChange={(e) => updateDetail(index, 'serial_الوحدة', e.target.value)}
                            className="p-2 border rounded w-24 text-center"
                          />
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {formatCurrency(parseNumber(detail.الكمية) * parseNumber(detail.serial_الوحدة))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">
                          <Input
                            value={detail.الوحدة}
                            onChange={(e) => updateDetail(index, 'الوحدة', e.target.value)}
                            className="p-2 border rounded w-24 text-center"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={detail.ملاحظات}
                            onChange={(e) => updateDetail(index, 'ملاحظات', e.target.value)}
                            className="p-2 border rounded w-32 text-center"
                          />
                        </td>
                      </>
                    )}
                    <td className="p-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDetail(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-gray-100"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={type !== 'FACTORY_DISPATCH' ? 4 : 3} className="p-3 text-right font-bold text-gray-800 dark:text-white">
                    {type !== 'FACTORY_DISPATCH' ? 'إجمالي الكمية' : 'الإجمالي'}
                  </td>
                  <td className="p-3 text-right font-bold text-gray-800 dark:text-white">{totalQty}</td>
                  {type !== 'FACTORY_DISPATCH' && (
                    <>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-bold text-gray-800 dark:text-white">
                        {formatCurrency(total)}
                      </td>
                    </>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={submit}
          disabled={submitting || !isAuthenticated}
          className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
        >
          {submitting ? 'جاري الحفظ...' : isEdit ? 'تحديث الفاتورة' : 'إنشاء الفاتورة'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
        >
          إلغاء
        </Button>
      </div>

      {/* Items Management Modal */}
      <ItemsManagement
        onItemSelect={handleItemSelect}
        showItemsManagement={showItemsManagement}
        setShowItemsManagement={setShowItemsManagement}
      />
    </div>
  );
}

// Main Invoice System Component
export default function InvoiceSystemRedesign() {
  const [invoices, setInvoices] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, initialized } = useAuth();
  const printRef = useRef();

  useEffect(() => {
    if (isAuthenticated && initialized && !authLoading) {
      fetchData();
    } else if (!isAuthenticated && initialized) {
      setLoading(false);
      setError("يرجى تسجيل الدخول للوصول إلى نظام الفواتير");
      navigate('/login');
    }
  }, [isAuthenticated, initialized, authLoading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Validate Firebase connection first
      try {
        firebaseService.validateDb();
      } catch (dbError) {
        setError("خطأ في الاتصال بقاعدة البيانات. يرجى التحقق من إعدادات Firebase.");
        return;
      }

      const [invoicesRes, stockRes, clientsRes, suppliersRes] = await Promise.all([
        firebaseService.getInvoices().catch(err => {
          console.error('Error fetching invoices:', err);
          return [];
        }),
        firebaseService.getStockItems().catch(err => {
          console.error('Error fetching stock items:', err);
          return [];
        }),
        firebaseService.getClients().catch(err => {
          console.error('Error fetching clients:', err);
          return [];
        }),
        firebaseService.getSuppliers().catch(err => {
          console.error('Error fetching suppliers:', err);
          return [];
        }),
      ]);
      setInvoices(invoicesRes || []);
      setStockItems(stockRes || []);
      setClients(clientsRes || []);
      setSuppliers(suppliersRes || []);
      setError(null);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err.message || "فشل في تحميل البيانات. حاول مرة أخرى لاحقًا.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        String(inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.client_name || '').toLowerCase().includes(q) ||
        (inv.supplier_name || '').toLowerCase().includes(q) ||
        (inv.recipient || '').toLowerCase().includes(q) ||
        (inv.client_phone || '').includes(q) ||
        (inv.created_by_username || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, query]);

  const totalSales = useMemo(() => {
    return invoices.reduce((sum, inv) =>
      inv.invoice_type !== 'FACTORY_DISPATCH' ? sum + parseNumber(inv.total_amount) : sum, 0);
  }, [invoices]);

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

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      try {
        await firebaseService.deleteInvoice(invoiceId);
        fetchData();
      } catch (err) {
        console.error('Delete Error:', err);
        setError(`فشل في حذف الفاتورة: ${err.message}`);
      }
    }
  };

  const handleSendWhatsApp = (invoice) => {
    if (!invoice || !invoice.details) {
      setError("لا يمكن إرسال الفاتورة عبر واتساب: بيانات الفاتورة غير صالحة");
      return;
    }
    let message;
    const displayType = getInvoiceTypeDisplay(invoice.invoice_type);
    if (invoice.invoice_type === 'FACTORY_DISPATCH') {
      const itemsList = invoice.details.map((d, index) =>
        `${index + 1}. الصنف: ${d.الصنف || '-'}\n الكود: ${d.الكود || '-'}\n اللون: ${d.اللون || '-'}\n الوحدة: ${d.الوحدة || '-'}\n الكمية: ${d.الكمية || 0}\n ملاحظات: ${d.ملاحظات || '-'}`
      ).join('\n\n');
      message = `إذن تسليم زجاج رقم ${invoice.invoice_number || 'غير متوفر'}
التاريخ: ${formatDate(invoice.invoice_date)}
منصرف إلى: ${invoice.recipient || 'غير متوفر'}
أنشأها: ${invoice.created_by_username || 'غير متوفر'}
الأصناف:
${itemsList}
ملاحظات: ${invoice.notes || 'لا توجد'}`;
    } else {
      const total = invoice.details.reduce((sum, d) => sum + (parseNumber(d.الكمية) * parseNumber(d.serial_الوحدة)), 0);
      const itemsList = invoice.details.map((d, index) =>
        `${index + 1}. الصنف: ${d.الصنف || '-'}\n الكود: ${d.الكود || '-'}\n اللون: ${d.اللون || '-'}\n الكمية: ${d.الكمية || 0}\n سعر الوحدة: ${formatCurrency(d.serial_الوحدة)} جنيه\n الإجمالي: ${formatCurrency(parseNumber(d.الكمية) * parseNumber(d.serial_الوحدة))} جنيه`
      ).join('\n\n');
      message = `فاتورة ${displayType} رقم ${invoice.invoice_number || 'غير متوفر'}
التاريخ: ${formatDate(invoice.invoice_date)}
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
  };

  const handleFactoryReturn = (invoice) => {
    setSelectedForReturn(invoice);
    setIsReturnDialogOpen(true);
  };

  const handleReturnSuccess = (result) => {
    setIsReturnDialogOpen(false);
    setSelectedForReturn(null);
    fetchData();
    alert(`تم معالجة مرتجع المصنع بنجاح\nرقم الفاتورة: ${result.return_invoice_number}\n${result.message}`);
  };

  const handleReturnCancel = () => {
    setIsReturnDialogOpen(false);
    setSelectedForReturn(null);
  };

  return (
    <InvoiceErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6 font-tajawal transition-colors duration-200" dir="rtl">
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
            .elastic-table {
              width: 100%;
              table-layout: fixed;
            }
            .elastic-table td, .elastic-table th {
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
          `}
        </style>
        {!isAuthenticated && (
          <div className="text-center text-red-500 dark:text-red-400">
            {error}
            <Button
              onClick={() => navigate('/login')}
              className="mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              تسجيل الدخول
            </Button>
          </div>
        )}
        {isAuthenticated && (
          <>
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
            <div className="mobile-stats md:hidden space-y-4">
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إحصائيات سريعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي الفواتير</div>
                      <div className="text-xl font-bold text-gray-800 dark:text-white">{invoices.length}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</div>
                      <div className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalSales)} جنيه</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إنشاء فاتورة جديدة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        setIsCreateOpen(true);
                        setSelected(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                    >
                      <PlusCircle size={16} /> فاتورة جديدة
                    </Button>
                    <Button
                      variant="outline"
                      onClick={fetchData}
                      className="w-full border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                    >
                      تحديث البيانات
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">الأطراف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-500 dark:text-gray-400">العملاء:</span>
                      <strong className="text-gray-800 dark:text-white">{invoiceClients.length}</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-500 dark:text-gray-400">الموردون:</span>
                      <strong className="text-gray-800 dark:text-white">{suppliers.length}</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-500 dark:text-gray-400">الأصناف:</span>
                      <strong className="text-gray-800 dark:text-white">{stockItems.length}</strong>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsClientListOpen(true)}
                    className="w-full mt-4 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                  >
                    عرض قائمة العملاء
                  </Button>
                </CardContent>
              </Card>
            </div>
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
                      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</div>
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
                              <tr
                                key={inv.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                                onClick={() => setSelected(inv)}
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
                                <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(inv.invoice_date)}</td>
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
                                        setSelected(inv);
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
                                          handleFactoryReturn(inv);
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
                                        handleSendWhatsApp(inv);
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
                                        setIsCreateOpen(true);
                                        setSelected(inv);
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
                                        handleDeleteInvoice(inv.id);
                                      }}
                                      className="action-btn text-red-500 hover:text-red-700"
                                      title="حذف"
                                    >
                                      <Trash2 size={18} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              {/* Desktop Stats Cards */}
              <div className="desktop-stats stats-cards lg:w-1/3 space-y-4">
                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إحصائيات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي الفواتير</div>
                        <div className="text-xl font-bold text-gray-800 dark:text-white">{invoices.length}</div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</div>
                        <div className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalSales)} جنيه</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إنشاء فاتورة جديدة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => {
                          setIsCreateOpen(true);
                          setSelected(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                      >
                        <PlusCircle size={16} /> فاتورة جديدة
                      </Button>
                      <Button
                        variant="outline"
                        onClick={fetchData}
                        className="w-full border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                      >
                        تحديث البيانات
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">الأطراف</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-500 dark:text-gray-400">العملاء:</span>
                        <strong className="text-gray-800 dark:text-white">{invoiceClients.length}</strong>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-500 dark:text-gray-400">الموردون:</span>
                        <strong className="text-gray-800 dark:text-white">{suppliers.length}</strong>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-500 dark:text-gray-400">الأصناف:</span>
                        <strong className="text-gray-800 dark:text-white">{stockItems.length}</strong>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsClientListOpen(true)}
                      className="w-full mt-4 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                    >
                      عرض قائمة العملاء
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* Dialogs */}
            {selected && (
              <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                      تفاصيل {selected.invoice_type === 'FACTORY_DISPATCH' ? 'إذن التسليم' : 'الفاتورة'} - {selected.invoice_number || 'غير متوفر'}
                    </DialogTitle>
                    <DialogDescription>
                      عرض تفاصيل {selected.invoice_type === 'FACTORY_DISPATCH' ? 'إذن التسليم' : 'الفاتورة'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4 space-y-4">
                    <InvoicePrint ref={printRef} invoice={selected} />
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
                  <DialogDescription>
                    {selected ? 'قم بتعديل بيانات الفاتورة' : 'أدخل بيانات الفاتورة الجديدة'}
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                  <CreateInvoiceForm
                    clients={clients}
                    suppliers={suppliers}
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
            <Dialog open={isClientListOpen} onOpenChange={setIsClientListOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">قائمة العملاء</DialogTitle>
                  <DialogDescription>
                    عرض قائمة العملاء المسجلين في النظام
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
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
                        {invoiceClients
                          .filter(client =>
                            (client.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                            (client.phone || '').includes(clientSearch)
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
          </>
        )}
      </div>
    </InvoiceErrorBoundary>
  );
}  
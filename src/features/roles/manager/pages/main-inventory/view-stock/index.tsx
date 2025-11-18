import React, { useState, useEffect, useMemo } from 'react';
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
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/roles/manager/ui/card';
import { Button } from '@/features/roles/manager/ui/Button';
import { Input } from '@/features/roles/manager/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/roles/manager/ui/Dialog';
import { Package, PlusCircle, Search, Edit, Trash2, Eye, Download, Database, MapPin, PackageCheck, Users } from 'lucide-react';

// Error Boundary Component
class InventoryErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Inventory Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 dark:text-red-400 p-4">
          <p>حدث خطأ في صفحة المخزون: {this.state.error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
          >
            إعادة تحميل الصفحة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Utility functions
const parseNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (number: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseNumber(number));
};

// Warehouse configuration
const warehouses = [
  { value: 'main-inventory', label: 'المخزن الرئيسي', color: 'bg-purple-600' },
  { value: 'monofia', label: 'المنوفية', color: 'bg-emerald-600' },
  { value: 'matbaa', label: 'المطبعة', color: 'bg-orange-600' }
];

// Firebase service functions
const inventoryService = {
  validateDb() {
    if (!db) {
      throw new Error('Firestore instance is not available');
    }
    return db;
  },

  async getInventoryItems(warehouseId?: string) {
    try {
      const database = this.validateDb();
      let q;
      if (warehouseId) {
        q = query(
          collection(database, 'warehouseItems'),
          where('warehouseId', '==', warehouseId),
          orderBy('item_name', 'asc')
        );
      } else {
        q = query(collection(database, 'warehouseItems'), orderBy('item_name', 'asc'));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },

  async createInventoryItem(itemData: any) {
    try {
      const database = this.validateDb();
      const docRef = await addDoc(collection(database, 'warehouseItems'), {
        ...itemData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return { id: docRef.id, ...itemData };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  },

  async updateInventoryItem(itemId: string, itemData: any) {
    try {
      const database = this.validateDb();
      const itemRef = doc(database, 'warehouseItems', itemId);
      await updateDoc(itemRef, {
        ...itemData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  async deleteInventoryItem(itemId: string) {
    try {
      const database = this.validateDb();
      await deleteDoc(doc(database, 'warehouseItems', itemId));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },

  async getInventoryStats() {
    try {
      const database = this.validateDb();
      const items = await this.getInventoryItems();
      
      const totalItems = items.length;
      const lowStockItems = items.filter((item: any) => item.remaining_quantity < 10).length;
      const outOfStockItems = items.filter((item: any) => item.remaining_quantity === 0).length;
      const totalValue = items.reduce((sum: number, item: any) => {
        return sum + (parseNumber(item.remaining_quantity) * parseNumber(item.unit_price));
      }, 0);

      return {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue
      };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      throw error;
    }
  }
};

// Add Item Modal Component
const AddItemModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialItem, 
  isEdit = false 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: any, isEdit: boolean) => Promise<void>;
  initialItem: any;
  isEdit: boolean;
}) => {
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

  const calculateTotalQuantity = (): number => {
    const cartons = parseNumber(formData.cartons_count);
    const perCarton = parseNumber(formData.bottles_per_carton);
    const singles = parseNumber(formData.single_bottles);
    return (cartons * perCarton) + singles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        (itemData as any).createdAt = Timestamp.now();
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

  const handleChange = (field: string, value: string) => {
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
                    {formatCurrency(parseNumber(formData.unit_price))}
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

// View Item Details Modal
const ViewItemModal = ({ 
  item, 
  isOpen, 
  onClose 
}: {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
            تفاصيل الصنف
          </DialogTitle>
          <DialogDescription>
            عرض التفاصيل الكاملة للصنف
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">المعلومات الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">اسم الصنف:</span>
                  <span className="font-medium">{item.item_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الكود:</span>
                  <span className="font-medium">{item.item_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">اللون:</span>
                  <span className="font-medium">{item.color || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">المستودع:</span>
                  <span className="font-medium">
                    {warehouses.find(w => w.value === item.warehouseId)?.label}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">المعلومات المالية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">سعر الوحدة:</span>
                  <span className="font-medium text-green-600">{formatCurrency(item.unit_price || 0)} جنيه</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">القيمة الإجمالية:</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(parseNumber(item.remaining_quantity) * parseNumber(item.unit_price))} جنيه
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">معلومات الكمية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الكمية المتبقية:</span>
                  <span className={`font-medium ${
                    item.remaining_quantity === 0 ? 'text-red-600' :
                    item.remaining_quantity < 10 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {item.remaining_quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الكمية المضافة:</span>
                  <span className="font-medium">{item.added_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عدد الكراتين:</span>
                  <span className="font-medium">{item.cartons_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">القطع في الكرتونة:</span>
                  <span className="font-medium">{item.bottles_per_carton}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">القطع الفردية:</span>
                  <span className="font-medium">{item.single_bottles || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">معلومات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">المورد:</span>
                  <span className="font-medium">{item.supplier || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الموقع:</span>
                  <span className="font-medium">{item.location || 'غير محدد'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-600 dark:text-gray-400 mb-1">ملاحظات:</span>
                  <span className="font-medium text-sm">{item.notes || 'لا توجد ملاحظات'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Inventory Page Component
export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const { user, isAuthenticated } = useAuth();

  const fetchItems = async () => {
    try {
      setLoading(true);
      let itemsData;
      if (selectedWarehouse === 'all') {
        itemsData = await inventoryService.getInventoryItems();
      } else {
        itemsData = await inventoryService.getInventoryItems(selectedWarehouse);
      }
      setItems(itemsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('فشل في تحميل بيانات المخزون');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await inventoryService.getInventoryStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const saveItem = async (itemData: any, isEditMode: boolean = false) => {
    try {
      if (isEditMode && selectedItem) {
        await inventoryService.updateInventoryItem(selectedItem.id, itemData);
      } else {
        await inventoryService.createInventoryItem(itemData);
      }
      await fetchItems();
      await fetchStats();
    } catch (error) {
      console.error('Error saving item:', error);
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      try {
        await inventoryService.deleteInventoryItem(itemId);
        await fetchItems();
        await fetchStats();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('حدث خطأ أثناء حذف الصنف');
      }
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setIsEdit(true);
    setShowAddModal(true);
  };

  const handleView = (item: any) => {
    setViewItem(item);
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
    if (isAuthenticated) {
      fetchItems();
      fetchStats();
    }
  }, [isAuthenticated, selectedWarehouse]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 text-lg mb-4">يرجى تسجيل الدخول للوصول إلى صفحة المخزون</p>
        </div>
      </div>
    );
  }

  return (
    <InventoryErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6" dir="rtl">
        <style>
          {`
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1rem;
            }
            @media (max-width: 768px) {
              .stats-grid {
                grid-template-columns: 1fr;
              }
            }
          `}
        </style>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow">
              <Package size={24} className="md:size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">إدارة المخزون</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الأصناف والمخزون في المستودعات المختلفة</p>
            </div>
          </div>
          <Button
            onClick={handleAddNew}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
          >
            <PlusCircle className="w-4 h-4 ml-2" />
            إضافة صنف جديد
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الأصناف</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalItems}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الأصناف منخفضة المخزون</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowStockItems}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <PackageCheck className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">الأصناف المنتهية</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outOfStockItems}</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <Database className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">القيمة الإجمالية</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(stats.totalValue)} جنيه
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="all">جميع المستودعات</option>
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
                    className="pl-10 pr-4 w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  onClick={fetchItems}
                  variant="outline"
                  className="border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                >
                  تحديث البيانات
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="bg-white dark:bg-gray-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
              قائمة الأصناف ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</div>
            ) : error ? (
              <div className="py-6 text-center text-red-500 dark:text-red-400">{error}</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400">لا توجد أصناف</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">الصنف</th>
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">الكود</th>
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">اللون</th>
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">المتاح</th>
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">سعر الوحدة</th>
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">المستودع</th>
                      <th className="p-3 text-right font-bold text-gray-800 dark:text-white">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3 text-gray-700 dark:text-gray-300">{item.item_name}</td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">{item.item_code}</td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">{item.color || '-'}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.remaining_quantity === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                            item.remaining_quantity < 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          }`}>
                            {item.remaining_quantity}
                          </span>
                        </td>
                        <td className="p-3 text-left text-gray-700 dark:text-gray-300">
                          {formatCurrency(item.unit_price || 0)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs text-white ${
                            warehouses.find(w => w.value === item.warehouseId)?.color || 'bg-gray-500'
                          }`}>
                            {warehouses.find(w => w.value === item.warehouseId)?.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleView(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              <Eye className="w-3 h-3" />
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
          </CardContent>
        </Card>

        {/* Modals */}
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={saveItem}
          initialItem={selectedItem}
          isEdit={isEdit}
        />

        <ViewItemModal
          item={viewItem}
          isOpen={!!viewItem}
          onClose={() => setViewItem(null)}
        />
      </div>
    </InventoryErrorBoundary>
  );
}
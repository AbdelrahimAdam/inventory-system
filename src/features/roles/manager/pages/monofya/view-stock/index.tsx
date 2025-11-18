import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiSearch, FiRefreshCw, FiDownload, FiPrinter, FiChevronLeft, 
  FiFilter, FiChevronDown, FiChevronUp, FiPlus, FiTrash2, 
  FiEdit, FiX, FiArrowRight, FiCheckSquare, FiSquare 
} from 'react-icons/fi';
import { Input } from '../../../ui/Input';
import Checkbox from '../../../ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Save, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from "@/context/AuthContext";

// Simple className helper
const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

// Types based on warehouseItems collection structure
type MonofiaItem = {
  id: string;
  warehouseId: string;
  item_name: string;
  item_code: string;
  color: string;
  cartons_count: number;
  bottles_per_carton: number;
  single_bottles: number;
  added_quantity: number;
  remaining_quantity: number;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string;
  createdAt: any;
  updatedAt: any;
};

type TransferLog = {
  id: string;
  item_name: string;
  item_code: string;
  color: string;
  transfer_quantity: number;
  transfer_date: string;
  user_id: string;
  username: string;
  supplier: string | null;
  notes: string | null;
  source_location: string;
  destination_location: string;
  created_at: any;
};

interface FormData {
  item_name: string;
  item_code: string;
  color: string;
  carton_quantity: string;
  items_per_carton: string;
  individual_items: string;
  supplier: string;
  notes: string;
  remaining_quantity: string;
}

interface TransferValues {
  transfer_quantity: number;
  location: string;
  supplier: string;
  notes: string;
}

// Firebase Service using warehouseItems collection (same as ViewStockPage)
class MonofyaInventoryService {
  private static instance: MonofyaInventoryService;
  private readonly collectionName = 'warehouseItems'; // Same collection as ViewStockPage
  private readonly transferLogsCollection = 'location_transfers';
  private readonly stockMovementsCollection = 'stock_movements';
  private readonly itemMovementsUnified = 'item_movements_unified';
  private readonly warehouseId = 'monofia'; // Same warehouseId pattern as ViewStockPage

  private constructor() {}

  public static getInstance(): MonofyaInventoryService {
    if (!MonofyaInventoryService.instance) {
      MonofyaInventoryService.instance = new MonofyaInventoryService();
    }
    return MonofyaInventoryService.instance;
  }

  // Get all monofia inventory items with optional filtering
  async getMonofiaInventory(filters: { item_name?: string; item_code?: string; color?: string } = {}) {
    try {
      let q = query(
        collection(db, this.collectionName), 
        where('warehouseId', '==', this.warehouseId),
        where('is_active', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      // Apply filters
      if (filters.item_name) {
        q = query(q, where('item_name', '>=', filters.item_name), where('item_name', '<=', filters.item_name + '\uf8ff'));
      }
      if (filters.item_code) {
        q = query(q, where('item_code', '==', filters.item_code));
      }
      if (filters.color) {
        q = query(q, where('color', '==', filters.color));
      }

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MonofiaItem[];

      return {
        success: true,
        data: items,
        message: 'تم جلب البيانات بنجاح'
      };
    } catch (error) {
      console.error('Error fetching monofia inventory:', error);
      return {
        success: false,
        data: [],
        message: 'فشل في جلب البيانات من قاعدة البيانات'
      };
    }
  }

  // Get transfer logs
  async getTransferLogs(searchText: string = '') {
    try {
      let q = query(
        collection(db, this.transferLogsCollection), 
        where('source_location', '==', 'MONOFIA'),
        orderBy('created_at', 'desc')
      );
      
      if (searchText) {
        q = query(q, where('item_name', '>=', searchText), where('item_name', '<=', searchText + '\uf8ff'));
      }

      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransferLog[];

      return {
        success: true,
        data: logs,
        message: 'تم جلب سجل التحويلات بنجاح'
      };
    } catch (error) {
      console.error('Error fetching transfer logs:', error);
      return {
        success: false,
        data: [],
        message: 'فشل في جلب سجل التحويلات'
      };
    }
  }

  // Add new item to monofia inventory
  async addMonofiaItem(itemData: any, userId: string) {
    try {
      const cartonQuantity = parseInt(itemData.carton_quantity) || 0;
      const itemsPerCarton = parseInt(itemData.items_per_carton) || 0;
      const individualItems = parseInt(itemData.individual_items) || 0;
      const totalQuantity = cartonQuantity * itemsPerCarton + individualItems;

      const newItem = {
        warehouseId: this.warehouseId,
        item_name: itemData.item_name?.trim(),
        item_code: itemData.item_code?.trim(),
        color: itemData.color?.trim(),
        cartons_count: cartonQuantity,
        bottles_per_carton: itemsPerCarton,
        single_bottles: individualItems,
        added_quantity: totalQuantity,
        remaining_quantity: totalQuantity,
        supplier: itemData.supplier?.trim() || null,
        location: itemData.location?.trim() || null,
        notes: itemData.notes?.trim() || null,
        is_active: true,
        created_by: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collectionName), newItem);

      // Create unified movement record
      await addDoc(collection(db, this.itemMovementsUnified), {
        monofia_item_id: docRef.id,
        item_name: newItem.item_name,
        item_code: newItem.item_code,
        color: newItem.color,
        movementType: 'إضافة صنف',
        incomingQuantity: totalQuantity,
        outgoingQuantity: 0,
        balanceAfter: totalQuantity,
        source: 'MONOFIA',
        destination: null,
        factory: 'MONOFIA',
        date: new Date().toISOString().split('T')[0],
        user: userId,
        notes: 'إضافة صنف جديد إلى مخزون المنوفية',
        created_at: serverTimestamp()
      });

      return {
        success: true,
        message: 'تم إضافة الصنف بنجاح'
      };
    } catch (error) {
      console.error('Error adding monofia item:', error);
      return {
        success: false,
        message: 'فشل في إضافة الصنف'
      };
    }
  }

  // Update monofia item
  async updateMonofiaItem(itemId: string, itemData: any, userId: string) {
    try {
      const cartonQuantity = parseInt(itemData.carton_quantity) || 0;
      const itemsPerCarton = parseInt(itemData.items_per_carton) || 0;
      const individualItems = parseInt(itemData.individual_items) || 0;
      const totalQuantity = cartonQuantity * itemsPerCarton + individualItems;

      const updateData = {
        item_name: itemData.item_name?.trim(),
        item_code: itemData.item_code?.trim(),
        color: itemData.color?.trim(),
        cartons_count: cartonQuantity,
        bottles_per_carton: itemsPerCarton,
        single_bottles: individualItems,
        added_quantity: totalQuantity,
        remaining_quantity: totalQuantity,
        supplier: itemData.supplier?.trim() || null,
        location: itemData.location?.trim() || null,
        notes: itemData.notes?.trim() || null,
        updatedAt: serverTimestamp()
      };

      const itemRef = doc(db, this.collectionName, itemId);
      await updateDoc(itemRef, updateData);

      // Create movement record for the update
      await addDoc(collection(db, this.itemMovementsUnified), {
        monofia_item_id: itemId,
        item_name: updateData.item_name,
        item_code: updateData.item_code,
        color: updateData.color,
        movementType: 'تعديل صنف',
        incomingQuantity: 0,
        outgoingQuantity: 0,
        balanceAfter: totalQuantity,
        source: 'MONOFIA',
        destination: null,
        factory: 'MONOFIA',
        date: new Date().toISOString().split('T')[0],
        user: userId,
        notes: 'تعديل بيانات الصنف في مخزون المنوفية',
        created_at: serverTimestamp()
      });

      return {
        success: true,
        message: 'تم تحديث الصنف بنجاح'
      };
    } catch (error) {
      console.error('Error updating monofia item:', error);
      return {
        success: false,
        message: 'فشل في تحديث الصنف'
      };
    }
  }

  // Delete monofia item (soft delete)
  async deleteMonofiaItem(itemId: string, itemData: any, userId: string) {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      await updateDoc(itemRef, {
        is_active: false,
        updatedAt: serverTimestamp()
      });

      // Create movement record for deletion
      await addDoc(collection(db, this.itemMovementsUnified), {
        monofia_item_id: itemId,
        item_name: itemData.item_name,
        item_code: itemData.item_code,
        color: itemData.color,
        movementType: 'حذف صنف',
        incomingQuantity: 0,
        outgoingQuantity: itemData.remaining_quantity,
        balanceAfter: 0,
        source: 'MONOFIA',
        destination: null,
        factory: 'MONOFIA',
        date: new Date().toISOString().split('T')[0],
        user: userId,
        notes: 'حذف صنف من مخزون المنوفية',
        created_at: serverTimestamp()
      });

      return {
        success: true,
        message: 'تم حذف الصنف بنجاح'
      };
    } catch (error) {
      console.error('Error deleting monofia item:', error);
      return {
        success: false,
        message: 'فشل في حذف الصنف'
      };
    }
  }

  // Transfer item to main inventory (creates records in all relevant collections)
  async transferToMainInventory(itemData: any, userId: string, username: string) {
    try {
      const batch = writeBatch(db);
      
      const transferQuantity = parseInt(itemData.transfer_quantity) || 0;
      const newRemainingQuantity = itemData.remaining_quantity - transferQuantity;

      if (newRemainingQuantity < 0) {
        return {
          success: false,
          message: 'الكمية المراد تحويلها أكبر من الكمية المتاحة'
        };
      }

      // Update monofia inventory (reduce quantity)
      const monofiaItemRef = doc(db, this.collectionName, itemData.id);
      batch.update(monofiaItemRef, {
        remaining_quantity: newRemainingQuantity,
        cartons_count: Math.floor(newRemainingQuantity / itemData.bottles_per_carton),
        single_bottles: newRemainingQuantity % itemData.bottles_per_carton,
        updatedAt: serverTimestamp()
      });

      // Add item to main warehouse (warehouseId: 'main')
      const mainWarehouseItemRef = doc(collection(db, this.collectionName));
      batch.set(mainWarehouseItemRef, {
        warehouseId: 'main',
        item_name: itemData.item_name,
        item_code: itemData.item_code,
        color: itemData.color,
        cartons_count: Math.floor(transferQuantity / itemData.bottles_per_carton),
        bottles_per_carton: itemData.bottles_per_carton,
        single_bottles: transferQuantity % itemData.bottles_per_carton,
        added_quantity: transferQuantity,
        remaining_quantity: transferQuantity,
        supplier: itemData.supplier || null,
        location: itemData.location || null,
        notes: itemData.notes || `تم التحويل من المنوفية - ${new Date().toLocaleDateString('ar-EG')}`,
        is_active: true,
        created_by: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create transfer log
      const transferLogRef = doc(collection(db, this.transferLogsCollection));
      batch.set(transferLogRef, {
        item_name: itemData.item_name,
        item_code: itemData.item_code,
        color: itemData.color,
        transfer_quantity: transferQuantity,
        transfer_date: new Date().toISOString().split('T')[0],
        user_id: userId,
        username: username,
        supplier: itemData.supplier || null,
        notes: itemData.notes || null,
        source_location: 'MONOFIA',
        destination_location: 'MAIN_INVENTORY',
        created_at: serverTimestamp()
      });

      // Create stock movement record
      const movementRef = doc(collection(db, this.stockMovementsCollection));
      batch.set(movementRef, {
        monofia_item_id: itemData.id,
        item_name: itemData.item_name,
        item_code: itemData.item_code,
        color: itemData.color,
        movement_type: 'TRANSFER',
        quantity_in: 0,
        quantity_out: transferQuantity,
        balance_after: newRemainingQuantity,
        source_location: 'MONOFIA',
        destination_location: 'MAIN_INVENTORY',
        notes: itemData.notes || 'تحويل من المنوفية إلى المخزون الرئيسي',
        created_by: userId,
        created_at: serverTimestamp(),
        ip_address: null
      });

      // Create unified movement record
      const unifiedMovementRef = doc(collection(db, this.itemMovementsUnified));
      batch.set(unifiedMovementRef, {
        monofia_item_id: itemData.id,
        item_name: itemData.item_name,
        item_code: itemData.item_code,
        color: itemData.color,
        movementType: 'تحويل منوفية',
        incomingQuantity: 0,
        outgoingQuantity: transferQuantity,
        balanceAfter: newRemainingQuantity,
        source: 'MONOFIA',
        destination: 'MAIN_INVENTORY',
        factory: 'MONOFIA',
        date: new Date().toISOString().split('T')[0],
        user: username,
        notes: itemData.notes || 'تحويل من المنوفية إلى المخزون الرئيسي',
        created_at: serverTimestamp()
      });

      await batch.commit();

      return {
        success: true,
        message: 'تم التحويل إلى المخزون الرئيسي بنجاح'
      };
    } catch (error) {
      console.error('Error transferring item:', error);
      return {
        success: false,
        message: 'فشل في عملية التحويل'
      };
    }
  }
}

// Helper function to format dates in Arabic
const formatToArabicDate = (dateString: string) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const day = date.getDate();
    const month = arabicMonths[date.getMonth()];
    const year = date.getFullYear();

    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const toEasternArabic = (num: number) => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    };

    return `${toEasternArabic(day)} ${month} ${toEasternArabic(year)}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return dateString;
  }
};

export default function ViewMonofyaStock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<MonofiaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MonofiaItem[]>([]);
  const [logRows, setLogRows] = useState<TransferLog[]>([]);
  const [filteredLogRows, setFilteredLogRows] = useState<TransferLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [filters, setFilters] = useState({
    item_name: '',
    item_code: '',
    color: '',
  });
  const [logSearchText, setLogSearchText] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [exportColumns, setExportColumns] = useState({
    item_name: true,
    item_code: true,
    color: true,
    cartons_count: true,
    bottles_per_carton: true,
    single_bottles: true,
    remaining_quantity: true,
    supplier: true,
    location: true,
    notes: true,
    createdAt: true,
  });
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MonofiaItem | null>(null);
  const [formData, setFormData] = useState<FormData>({
    item_name: '',
    item_code: '',
    color: '',
    carton_quantity: '',
    items_per_carton: '',
    individual_items: '',
    supplier: '',
    notes: '',
    remaining_quantity: '0',
  });
  const [editValues, setEditValues] = useState<FormData>({
    item_name: '',
    item_code: '',
    color: '',
    carton_quantity: '',
    items_per_carton: '',
    individual_items: '',
    supplier: '',
    notes: '',
    remaining_quantity: '0',
  });
  const [transferValues, setTransferValues] = useState<TransferValues>({
    transfer_quantity: 0,
    location: '',
    supplier: '',
    notes: '',
  });
  const [notif, setNotif] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });

  const inputRefs = {
    item_name: useRef<HTMLInputElement>(null),
    item_code: useRef<HTMLInputElement>(null),
    color: useRef<HTMLInputElement>(null),
    carton_quantity: useRef<HTMLInputElement>(null),
    items_per_carton: useRef<HTMLInputElement>(null),
    individual_items: useRef<HTMLInputElement>(null),
    supplier: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLInputElement>(null),
    transfer_quantity: useRef<HTMLInputElement>(null),
    location: useRef<HTMLInputElement>(null),
  };

  const inventoryService = MonofyaInventoryService.getInstance();

  // Normalize Arabic numbers to standard numbers
  const normalizeArabicNumber = (value: string) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return value.replace(/[٠-٩]/g, (d) => {
      return String(arabicNumbers.indexOf(d));
    });
  };

  // Show notification
  const showNotification = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ show: true, msg, type });
    setTimeout(() => setNotif({ show: false, msg: '', type: 'success' }), 3000);
  }, []);

  // Fetch stock data
  const fetchFilteredData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await inventoryService.getMonofiaInventory({
        item_name: filters.item_name,
        item_code: filters.item_code,
        color: filters.color,
      });

      if (result.success) {
        setItems(result.data);
        setFilteredItems(result.data);
        setResultCount(result.data.length);
        if (result.data.length === 0) {
          showNotification('لم يتم العثور على نتائج.', 'error');
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ غير متوقع");
      setItems([]);
      setFilteredItems([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, filters, showNotification]);

  // Fetch transfer logs
  const fetchLogData = useCallback(async () => {
    if (!user) return;
    
    try {
      const result = await inventoryService.getTransferLogs(logSearchText);
      if (result.success) {
        setLogRows(result.data);
        setFilteredLogRows(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching transfer logs:', error);
      showNotification('فشل في تحميل سجل التحويلات', 'error');
    }
  }, [user, logSearchText, showNotification]);

  // Initial data fetch and date/time update
  useEffect(() => {
    fetchFilteredData();
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour12: true, timeZone: 'Africa/Cairo' }));
      setCurrentDate(formatToArabicDate(now.toISOString()));
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, [fetchFilteredData]);

  // Filter items based on search criteria
  useEffect(() => {
    let filtered = [...items];
    if (filters.item_name || filters.item_code || filters.color) {
      filtered = filtered.filter(item =>
        (!filters.item_name || item.item_name.toLowerCase().includes(filters.item_name.toLowerCase())) &&
        (!filters.item_code || item.item_code.toLowerCase().includes(filters.item_code.toLowerCase())) &&
        (!filters.color || item.color.toLowerCase().includes(filters.color.toLowerCase()))
      );
    }
    setFilteredItems(filtered);
    setResultCount(filtered.length);
  }, [filters, items]);

  // Filter transfer logs
  useEffect(() => {
    let filtered = [...logRows];
    if (logSearchText) {
      const search = logSearchText.trim().toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val => 
          val && String(val).toLowerCase().includes(search)
        )
      );
    }
    if (fromDate) {
      filtered = filtered.filter(row => new Date(row.transfer_date) >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(row => new Date(row.transfer_date) <= toDate);
    }
    setFilteredLogRows(filtered);
  }, [logSearchText, fromDate, toDate, logRows]);

  // Delete item with confirmation
  const handleDelete = async (item: MonofiaItem) => {
    if (!user) {
      showNotification('يجب تسجيل الدخول لإجراء هذه العملية', 'error');
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ هل أنت متأكد أنك تريد حذف هذا الصنف؟\n\nالصنف: ${item.item_name}\nالكود: ${item.item_code}\nاللون: ${item.color}\n\nهذا الإجراء لا يمكن التراجع عنه!`
    );

    if (!confirmDelete) {
      showNotification("تم إلغاء الحذف", "info");
      return;
    }

    try {
      const result = await inventoryService.deleteMonofiaItem(item.id, item, user.uid);
      if (result.success) {
        showNotification("✅ تم حذف الصنف بنجاح");
        fetchFilteredData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      showNotification("❌ فشل في حذف الصنف", "error");
    }
  };

  // Update total quantity in add/edit form
  const updateTotalQuantity = useCallback((form: FormData) => {
    const cartons = parseInt(normalizeArabicNumber(form.carton_quantity)) || 0;
    const perCarton = parseInt(normalizeArabicNumber(form.items_per_carton)) || 0;
    const individual = parseInt(normalizeArabicNumber(form.individual_items)) || 0;
    const total = cartons * perCarton + individual;
    return { ...form, remaining_quantity: total.toString() };
  }, []);

  // Handle input change for add/edit form
  const handleInputChange = (
    field: keyof FormData,
    value: string,
    setForm: React.Dispatch<React.SetStateAction<FormData>>
  ) => {
    setForm(prev => {
      const updatedForm = { ...prev, [field]: value };
      if (['carton_quantity', 'items_per_carton', 'individual_items'].includes(field)) {
        return updateTotalQuantity(updatedForm);
      }
      return updatedForm;
    });
  };

  // Clear form fields
  const clearFields = () => {
    setFormData({
      item_name: '',
      item_code: '',
      color: '',
      carton_quantity: '',
      items_per_carton: '',
      individual_items: '',
      supplier: '',
      notes: '',
      remaining_quantity: '0',
    });
  };

  // Save new product
  const saveProduct = async (clearAfterSave: boolean) => {
    if (!user) {
      showNotification('يجب تسجيل الدخول لإضافة أصناف', 'error');
      return;
    }

    if (!formData.item_name || !formData.item_code || !formData.color || !formData.items_per_carton) {
      showNotification('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    try {
      const result = await inventoryService.addMonofiaItem(formData, user.uid);
      if (result.success) {
        showNotification('تم إضافة الصنف بنجاح');
        if (clearAfterSave) {
          clearFields();
        } else {
          setAddItemDialogOpen(false);
          clearFields();
        }
        fetchFilteredData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('فشل في إضافة الصنف', 'error');
    }
  };

  // Open edit dialog
  const openEditDialog = (item: MonofiaItem) => {
    setSelectedItem(item);

    setEditValues({
      item_name: item.item_name || "",
      item_code: item.item_code || "",
      color: item.color || "",
      carton_quantity: item.cartons_count?.toString() || "0",
      items_per_carton: item.bottles_per_carton?.toString() || "0",
      individual_items: item.single_bottles?.toString() || "0",
      supplier: item.supplier || "",
      notes: item.notes || "",
      remaining_quantity: item.remaining_quantity?.toString() || "0",
    });

    setEditDialogOpen(true);
  };

  // Save edited product
  const saveEditedProduct = async () => {
    if (!selectedItem || !user) return;

    const item_name = editValues.item_name?.trim();
    const item_code = editValues.item_code?.trim();
    const color = editValues.color?.trim();
    const items_per_carton = parseInt(normalizeArabicNumber(editValues.items_per_carton || "0"), 10);

    if (!item_name || !item_code || !color || isNaN(items_per_carton) || items_per_carton <= 0) {
      showNotification("⚠️ الرجاء إدخال الصنف، الكود، اللون وعدد في الكرتونة بشكل صحيح", "error");
      return;
    }

    try {
      const result = await inventoryService.updateMonofiaItem(selectedItem.id, editValues, user.uid);
      if (result.success) {
        showNotification("✅ تم تعديل الصنف بنجاح");
        setEditDialogOpen(false);
        setSelectedItem(null);
        fetchFilteredData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error editing product:", error);
      showNotification("❌ فشل في تعديل الصنف", "error");
    }
  };

  // Transfer handlers
  const openTransferDialog = (item: MonofiaItem) => {
    if (!item.id) {
      showNotification('معرف الصنف غير موجود', 'error');
      return;
    }
    setSelectedItem(item);
    setTransferValues({
      transfer_quantity: 0,
      location: item.location || '',
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setTransferDialogOpen(true);
  };

  const handleTransferChange = (field: keyof TransferValues, value: string | number) => {
    setTransferValues((prev) => ({
      ...prev,
      [field]: typeof value === 'string' ? value.trim() : value,
    }));
  };

  const handleTransferSubmit = async () => {
    if (!selectedItem || !user) {
      showNotification('يجب تسجيل الدخول لإجراء التحويل', 'error');
      return;
    }

    if (!selectedItem.id) {
      showNotification('معرف الصنف غير موجود', 'error');
      return;
    }

    if (transferValues.transfer_quantity <= 0) {
      showNotification('الكمية يجب أن تكون أكبر من الصفر', 'error');
      return;
    }

    if (transferValues.transfer_quantity > selectedItem.remaining_quantity) {
      showNotification(
        `الكمية المطلوبة (${transferValues.transfer_quantity}) أكبر من الكمية المتاحة (${selectedItem.remaining_quantity})`,
        'error'
      );
      return;
    }

    try {
      const transferData = {
        id: selectedItem.id,
        item_name: selectedItem.item_name,
        item_code: selectedItem.item_code,
        color: selectedItem.color,
        transfer_quantity: transferValues.transfer_quantity,
        remaining_quantity: selectedItem.remaining_quantity,
        bottles_per_carton: selectedItem.bottles_per_carton,
        supplier: transferValues.supplier || selectedItem.supplier,
        notes: transferValues.notes,
        location: transferValues.location
      };

      const result = await inventoryService.transferToMainInventory(
        transferData, 
        user.uid, 
        user.displayName || user.email || 'غير معروف'
      );

      if (result.success) {
        showNotification('تم التحويل إلى المخزون الرئيسي بنجاح');
        setTransferDialogOpen(false);
        setSelectedItem(null);
        fetchFilteredData();
        if (showLog) fetchLogData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error transferring item:', error);
      showNotification('حدث خطأ أثناء التحويل', 'error');
    }
  };

  // Handle key down for form submission
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callback();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      item_name: '',
      item_code: '',
      color: '',
    });
    setFromDate(null);
    setToDate(null);
    setLogSearchText('');
    fetchFilteredData();
  };

  // Export to Excel
  const exportToExcel = () => {
    const columnsFull = [
      "item_name", "item_code", "color", "cartons_count", "bottles_per_carton",
      "single_bottles", "remaining_quantity", "supplier", "location", "notes", "createdAt"
    ];
    
    const columnsDisplay = [
      'الصنف', 'الكود', 'اللون', 'الكراتين', 'في الكرتونة',
      'الفردي', 'المتبقي', 'المورد', 'المكان', 'ملاحظات', 'تاريخ الإضافة'
    ];

    const dataToExport = showLog ? filteredLogRows : filteredItems;
    const selectedCols = columnsFull.filter((col) => exportColumns[col as keyof typeof exportColumns]);
    if (!selectedCols.length) {
      showNotification('يرجى تحديد أعمدة للتصدير.', 'error');
      return;
    }

    const data = dataToExport.map((item: any) =>
      selectedCols.map((col) => {
        switch (col) {
          case "item_name": return item.item_name;
          case "item_code": return item.item_code;
          case "color": return item.color;
          case "cartons_count": return item.cartons_count;
          case "bottles_per_carton": return item.bottles_per_carton;
          case "single_bottles": return item.single_bottles;
          case "remaining_quantity": return item.remaining_quantity;
          case "supplier": return item.supplier;
          case "location": return item.location;
          case "notes": return item.notes;
          case "createdAt": return item.createdAt ? formatToArabicDate(item.createdAt.toDate().toISOString()) : '-';
          case "transfer_quantity": return item.transfer_quantity;
          case "transfer_date": return formatToArabicDate(item.transfer_date);
          case "username": return item.username;
          case "source_location": return item.source_location;
          case "destination_location": return item.destination_location;
          default: return '';
        }
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([selectedCols.map((col) => {
      if (col === "transfer_quantity") return 'الكمية المحولة';
      if (col === "transfer_date") return 'تاريخ التحويل';
      if (col === "username") return 'المستخدم';
      if (col === "source_location") return 'المصدر';
      if (col === "destination_location") return 'الوجهة';
      return columnsDisplay[columnsFull.indexOf(col)];
    }), ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, showLog ? 'سجل_التحويلات' : 'مخزون_المنوفية');
    XLSX.writeFile(wb, showLog ? 'سجل_التحويلات.xlsx' : 'مخزون_المنوفية.xlsx');
    showNotification('تم التصدير بنجاح');
  };

  // Print data
  const printData = () => {
    if (!filteredItems.length && !showLog) {
      showNotification('لا توجد بيانات للطباعة.', 'error');
      return;
    }
    if (!filteredLogRows.length && showLog) {
      showNotification('لا توجد بيانات للطباعة.', 'error');
      return;
    }

    const columnsPrint = showLog
      ? ['الصنف', 'الكود', 'اللون', 'الكمية المحولة', 'تاريخ التحويل', 'المستخدم', 'المورد', 'المصدر', 'الوجهة', 'ملاحظات']
      : ['الصنف', 'الكود', 'اللون', 'الكراتين', 'في الكرتونة', 'الفردي', 'المتبقي', 'المورد', 'المكان', 'ملاحظات'];

    const text = (showLog ? filteredLogRows : filteredItems).map((item: any) =>
      columnsPrint.map((col) => {
        switch (col) {
          case 'الصنف': return item.item_name;
          case 'الكود': return item.item_code;
          case 'اللون': return item.color;
          case 'الكراتين': return item.cartons_count;
          case 'في الكرتونة': return item.bottles_per_carton;
          case 'الفردي': return item.single_bottles;
          case 'المتبقي': return item.remaining_quantity;
          case 'المورد': return item.supplier;
          case 'المكان': return item.location;
          case 'ملاحظات': return item.notes;
          case 'الكمية المحولة': return item.transfer_quantity;
          case 'تاريخ التحويل': return formatToArabicDate(item.transfer_date);
          case 'المستخدم': return item.username;
          case 'المصدر': return item.source_location;
          case 'الوجهة': return item.destination_location;
          default: return '';
        }
      }).join('\t')
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = showLog ? 'سجل_التحويلات.txt' : 'مخزون_المنوفية.txt';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('تم الطباعة بنجاح');
  };

  // Selection handler
  const toggleSelection = (item: MonofiaItem) => {
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const selectAllItems = () => {
    if (selectedItem) {
      setSelectedItem(null);
    } else {
      showNotification('يمكن تحديد صنف واحد فقط للتحويل', 'error');
    }
  };

  // Truncate notes for mobile view
  const truncateNotes = (notes: string | null, maxLength: number = 30) => {
    if (!notes) return '-';
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  const columnLabels: { [key: string]: string } = {
    select: 'تحديد',
    "item_name": 'الصنف',
    "item_code": 'الكود',
    "color": 'اللون',
    "cartons_count": 'الكراتين',
    "bottles_per_carton": 'في الكرتونة',
    "single_bottles": 'الفردي',
    "remaining_quantity": 'المتبقي',
    "supplier": 'المورد',
    "location": 'المكان',
    "notes": 'ملاحظات',
    "createdAt": 'تاريخ الإضافة',
    actions: 'الإجراءات',
  };

  const logColumnLabels: { [key: string]: string } = {
    "item_name": 'الصنف',
    "item_code": 'الكود',
    "color": 'اللون',
    "transfer_quantity": 'الكمية المحولة',
    "transfer_date": 'تاريخ التحويل',
    "username": 'المستخدم',
    "notes": 'ملاحظات',
    "supplier": 'المورد',
    "source_location": 'المصدر',
    "destination_location": 'الوجهة',
  };

  const columnOrder = [
    'select',
    "item_name",
    "item_code",
    "color",
    "cartons_count",
    "bottles_per_carton",
    "single_bottles",
    "remaining_quantity",
    "supplier",
    "location",
    "notes",
    "createdAt",
    'actions',
  ];

  // Render the component UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-gray-100/80 dark:from-gray-900/90 dark:to-gray-800/90 dir-rtl font-['Tajawal',sans-serif]">
      {/* Notification */}
      <AnimatePresence>
        {notif.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] p-4 rounded-lg shadow-lg flex items-center gap-2 max-w-md w-full mx-4',
              notif.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            )}
          >
            {notif.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{notif.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:p-6">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-4">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1 text-sm bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <FiChevronLeft size={16} /> رجوع
                </button>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {showLog ? 'سجل تحويلات المنوفية' : 'مخزون المنوفية'}
                </h1>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                تاريخ اليوم: {currentDate} | توقيت القاهرة: {currentTime}
              </span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  setShowLog(!showLog);
                  if (!showLog) fetchLogData();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base transition-colors duration-200"
              >
                {showLog ? 'عرض المخزون' : 'عرض سجل التحويلات'}
              </button>
              {!showLog && (
                <button
                  onClick={() => setAddItemDialogOpen(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                  <FiPlus />
                  إضافة صنف
                </button>
              )}
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                <FiDownload />
                خيارات التصدير
                {showExportOptions ? <FiChevronUp className="w-4 h-4 mr-1" /> : <FiChevronDown className="w-4 h-4 mr-1" />}
              </button>
              <button
                onClick={printData}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
              >
                <FiPrinter />
                طباعة
              </button>
            </div>
          </div>

          {/* Filter Section */}
          {!showLog ? (
            <div className="mb-4">
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiFilter className="w-5 h-5 ml-2" />
                  {showFilters ? 'إخفاء الفلتر' : 'عرض الفلتر'}
                </button>
                <button
                  onClick={fetchFilteredData}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiSearch className="w-5 h-5 ml-2" />
                  تطبيق التصفية
                </button>
                <button
                  onClick={resetFilters}
                  className="flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-xl shadow-[0_4px_12px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.4)] hover:bg-orange-600 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiRefreshCw className="w-5 h-5 ml-2" />
                  إعادة تحميل الكل
                </button>
              </div>
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 transition-all duration-300">
                  {[
                    { label: 'الصنف', key: "item_name" },
                    { label: 'الكود', key: "item_code" },
                    { label: 'اللون', key: "color" },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </label>
                      <Input
                        type="text"
                        value={filters[field.key as keyof typeof filters]}
                        onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && fetchFilteredData()}
                        placeholder={field.label}
                        className="p-2 text-right text-sm bg-white/90 dark:bg-gray-700/90 rounded-lg border border-gray-200/50 dark:border-gray-600/50"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={logSearchText}
                  onChange={(e) => setLogSearchText(e.target.value)}
                  placeholder="ابحث في سجل التحويلات..."
                  className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white text-sm sm:text-base"
                />
                <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <DatePicker
                  selected={fromDate}
                  onChange={(date: Date) => setFromDate(date)}
                  placeholderText="من تاريخ"
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
                />
                <DatePicker
                  selected={toDate}
                  onChange={(date: Date) => setToDate(date)}
                  placeholderText="إلى تاريخ"
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
                />
              </div>
            </div>
          )}

          {/* Export Options */}
          {showExportOptions && (
            <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-4 mt-4 transition-all duration-300">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 text-right">
                حدد الأعمدة للتصدير
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { key: "item_name", label: 'الصنف' },
                  { key: "item_code", label: 'الكود' },
                  { key: "color", label: 'اللون' },
                  { key: "cartons_count", label: 'الكراتين' },
                  { key: "bottles_per_carton", label: 'في الكرتونة' },
                  { key: "single_bottles", label: 'الفردي' },
                  { key: "remaining_quantity", label: 'المتبقي' },
                  { key: "supplier", label: 'المورد' },
                  { key: "location", label: 'المكان' },
                  { key: "notes", label: 'ملاحظات' },
                  { key: "createdAt", label: 'تاريخ الإضافة' },
                ].map((col) => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={exportColumns[col.key as keyof typeof exportColumns]}
                      onCheckedChange={(checked) =>
                        setExportColumns({ ...exportColumns, [col.key]: checked })
                      }
                      className="border-gray-300 dark:border-gray-600"
                    />
                    <label className="text-sm text-gray-900 dark:text-white">
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={exportToExcel}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-xl shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_16px_rgba(22,163,74,0.4)] hover:bg-green-700 transition-all duration-300 text-sm sm:text-base"
                >
                  <FiDownload className="w-5 h-5 ml-2" />
                  تصدير إلى Excel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
          {!showLog ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                  <table className="w-full border border-gray-300 dark:border-gray-600 border-collapse font-['Tajawal',sans-serif]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-blue-600 dark:bg-blue-800 shadow-sm">
                        {columnOrder.map((key) => (
                          <th
                            key={key}
                            className={cn(
                              'border border-gray-300 dark:border-gray-600 p-3 text-center text-white text-sm font-bold whitespace-nowrap',
                              key === "item_name" ? 'w-64 min-w-[16rem]' : 'w-auto',
                              key === "notes" ? 'max-w-[200px]' : ''
                            )}
                          >
                            {key === 'select' ? (
                              <div className="flex items-center justify-center">
                                <button onClick={selectAllItems} className="text-white">
                                  {selectedItem ? (
                                    <FiCheckSquare className="w-5 h-5" />
                                  ) : (
                                    <FiSquare className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            ) : key === 'actions' ? (
                              'الإجراءات'
                            ) : (
                              columnLabels[key]
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={columnOrder.length} className="border border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
                            جارٍ تحميل البيانات...
                          </td>
                        </tr>
                      ) : filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-100/90 dark:hover:bg-gray-700/90 transition-colors duration-150"
                          >
                            {columnOrder.map((col) => (
                              <td
                                key={col}
                                className={cn(
                                  'border border-gray-300 dark:border-gray-600 p-3 text-center text-gray-900 dark:text-white',
                                  col === "item_name" || col === "notes" ? 'text-right' : '',
                                  col === "notes" ? 'max-w-[200px] truncate' : ''
                                )}
                                title={col === "notes" ? item.notes || '' : undefined}
                              >
                                {col === 'select' ? (
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItem?.id === item.id}
                                      onChange={() => toggleSelection(item)}
                                    />
                                  </div>
                                ) : col === 'actions' ? (
                                  <div className="flex justify-center gap-2">
                                    <button
                                      className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                                      title="تحويل"
                                      onClick={() => openTransferDialog(item)}
                                    >
                                      <FiArrowRight className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                                      title="تعديل"
                                      onClick={() => openEditDialog(item)}
                                    >
                                      <FiEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                                      title="حذف"
                                      onClick={() => handleDelete(item)}
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : col === "createdAt" ? (
                                  item.createdAt ? formatToArabicDate(item.createdAt.toDate().toISOString()) : '-'
                                ) : (
                                  item[col as keyof MonofiaItem] ?? '-'
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnOrder.length} className="border border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
                            لا توجد بيانات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3 p-3">
                {loading ? (
                  <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    جارٍ تحميل البيانات...
                  </div>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 bg-white/90 dark:bg-gray-700/90 hover:bg-gray-100/90 dark:hover:bg-gray-600/90 transition-colors duration-150 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedItem?.id === item.id}
                            onChange={() => toggleSelection(item)}
                            className="ml-2"
                          />
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{item.item_name}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                            title="تحويل"
                            onClick={() => openTransferDialog(item)}
                          >
                            <FiArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200"
                            title="تعديل"
                            onClick={() => openEditDialog(item)}
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                            title="حذف"
                            onClick={() => handleDelete(item)}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {columnOrder.map((col) => (
                          col !== "item_name" && col !== 'select' && col !== 'actions' && (
                            <div key={col} className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white">{columnLabels[col]}:</span>
                              <span>
                                {col === "createdAt" ? (
                                  item.createdAt ? formatToArabicDate(item.createdAt.toDate().toISOString()) : '-'
                                ) : col === "notes" ? (
                                  truncateNotes(item.notes)
                                ) : (
                                  item[col as keyof MonofiaItem] ?? '-'
                                )}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                    لا توجد بيانات
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden lg:block">
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                <table className="w-full border border-gray-300 dark:border-gray-600 border-collapse font-['Tajawal',sans-serif]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-blue-600 dark:bg-blue-800 shadow-sm">
                      {Object.keys(logColumnLabels).map((key) => (
                        <th
                          key={key}
                          className={cn(
                            'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-white text-sm font-bold',
                            key === "item_name" || key === "notes" || key === "item_code" ? 'min-w-[200px]' : 'min-w-[100px]'
                          )}
                        >
                          {logColumnLabels[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogRows.length > 0 ? (
                      filteredLogRows.map((row, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-100/90 dark:hover:bg-gray-700/90 transition-colors duration-150"
                        >
                          {Object.keys(logColumnLabels).map((col) => (
                            <td
                              key={col}
                              className={cn(
                                'border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white',
                                col === "item_name" || col === "notes" ? 'text-right' : ''
                              )}
                            >
                              {col === "transfer_date" ? formatToArabicDate(row.transfer_date) : row[col as keyof TransferLog] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={Object.keys(logColumnLabels).length}
                          className="border border-gray-300 dark:border-gray-600 p-4 text-center text-gray-500 dark:text-gray-400"
                        >
                          لا توجد بيانات
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mobile Log Cards */}
          {showLog && (
            <div className="lg:hidden space-y-4 p-4">
              {filteredLogRows.length > 0 ? (
                filteredLogRows.map((row, index) => (
                  <div
                    key={index}
                    className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 bg-white/90 dark:bg-gray-700/90 hover:bg-gray-100/90 dark:hover:bg-gray-600/90 transition-colors duration-150 shadow-sm"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      {Object.keys(logColumnLabels).map((col) => (
                        <div key={col} className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{logColumnLabels[col]}:</span>
                          <span>
                            {col === "transfer_date" ? formatToArabicDate(row.transfer_date) : row[col as keyof TransferLog] ?? '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                  لا توجد بيانات
                </div>
              )}
            </div>
          )}

          <div className="p-4 text-right text-sm font-semibold text-gray-900 dark:text-white border-t border-gray-200/50 dark:border-gray-700/50">
            عدد النتائج: {showLog ? filteredLogRows.length : resultCount} سجل
          </div>
        </div>

        {/* Add Item Dialog */}
        {addItemDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md my-8 mx-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة صنف جديد</h2>
                <button
                  onClick={() => {
                    setAddItemDialogOpen(false);
                    clearFields();
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'اسم الصنف', key: "item_name", ref: inputRefs["item_name"], required: true },
                    { label: 'الكود', key: "item_code", ref: inputRefs["item_code"], required: true },
                    { label: 'اللون', key: "color", ref: inputRefs["color"], required: true },
                    { label: 'عدد الكراتين', key: "carton_quantity", ref: inputRefs["carton_quantity"], type: 'number' },
                    { label: 'عدد في الكرتونة', key: "items_per_carton", ref: inputRefs["items_per_carton"], type: 'number', required: true },
                    { label: 'عدد القزاز الفردي', key: "individual_items", ref: inputRefs["individual_items"], type: 'number' },
                    { label: 'المورد', key: "supplier", ref: inputRefs["supplier"] },
                    { label: 'ملاحظات', key: "notes", ref: inputRefs["notes"] },
                    { label: 'الكمية الإجمالية', key: "remaining_quantity", disabled: true },
                  ].map(field => (
                    <div key={field.key} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 mr-1">*</span>}
                      </label>
                      <input
                        ref={field.ref}
                        type={field.type || 'text'}
                        value={formData[field.key as keyof FormData]}
                        onChange={(e) => handleInputChange(field.key as keyof FormData, e.target.value, setFormData)}
                        onKeyDown={(e) => handleKeyDown(e, () => saveProduct(true))}
                        disabled={field.disabled}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-2xl">
                <button
                  onClick={() => saveProduct(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm transition-colors duration-200 order-2 sm:order-1"
                >
                  <Save className="w-4 h-4" />
                  حفظ وإضافة أخرى
                </button>
                <button
                  onClick={() => saveProduct(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm transition-colors duration-200 order-1 sm:order-2 mb-2 sm:mb-0"
                >
                  <Save className="w-4 h-4" />
                  حفظ وإغلاق
                </button>
                <button
                  onClick={() => {
                    setAddItemDialogOpen(false);
                    clearFields();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm transition-colors duration-200 order-3"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Dialog */}
        {editDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">تعديل الصنف</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: 'اسم الصنف', key: "item_name", ref: inputRefs["item_name"] },
                  { label: 'الكود', key: "item_code", ref: inputRefs["item_code"] },
                  { label: 'اللون', key: "color", ref: inputRefs["color"] },
                  { label: 'عدد الكراتين', key: "carton_quantity", ref: inputRefs["carton_quantity"], type: 'number' },
                  { label: 'عدد في الكرتونة', key: "items_per_carton", ref: inputRefs["items_per_carton"], type: 'number' },
                  { label: 'عدد القزاز الفردي', key: "individual_items", ref: inputRefs["individual_items"], type: 'number' },
                  { label: 'المورد', key: "supplier", ref: inputRefs["supplier"] },
                  { label: 'ملاحظات', key: "notes", ref: inputRefs["notes"] },
                  { label: 'الكمية الإجمالية', key: "remaining_quantity", disabled: true },
                ].map(field => (
                  <div key={field.key} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</label>
                    <input
                      ref={field.ref}
                      type={field.type || 'text'}
                      value={editValues[field.key as keyof FormData]}
                      onChange={(e) => handleInputChange(field.key as keyof FormData, e.target.value, setEditValues)}
                      onKeyDown={(e) => handleKeyDown(e, saveEditedProduct)}
                      disabled={field.disabled}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6">
                <button
                  onClick={saveEditedProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                  <Save className="w-4 h-4" />
                  حفظ التعديل
                </button>
                <button
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base transition-colors duration-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Dialog */}
        {transferDialogOpen && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">تحويل الصنف إلى المخزون الرئيسي</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">اسم الصنف</label>
                  <input
                    type="text"
                    value={selectedItem.item_name}
                    disabled
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الكمية المتاحة</label>
                  <input
                    type="number"
                    value={selectedItem.remaining_quantity}
                    disabled
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الكمية المحولة</label>
                  <input
                    ref={inputRefs["transfer_quantity"]}
                    type="number"
                    value={transferValues.transfer_quantity}
                    onChange={(e) => handleTransferChange("transfer_quantity", parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">مكان الصنف</label>
                  <input
                    ref={inputRefs["location"]}
                    type="text"
                    value={transferValues.location}
                    onChange={(e) => handleTransferChange("location", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">المورد</label>
                  <input
                    ref={inputRefs["supplier"]}
                    type="text"
                    value={transferValues.supplier}
                    onChange={(e) => handleTransferChange("supplier", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ملاحظات</label>
                  <input
                    ref={inputRefs["notes"]}
                    type="text"
                    value={transferValues.notes}
                    onChange={(e) => handleTransferChange("notes", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleTransferSubmit)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6">
                <button
                  onClick={handleTransferSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base transition-colors duration-200"
                >
                  <FiArrowRight className="w-4 h-4" />
                  تحويل
                </button>
                <button
                  onClick={() => {
                    setTransferDialogOpen(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base transition-colors duration-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
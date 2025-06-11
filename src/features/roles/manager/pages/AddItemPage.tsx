import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiPlus, FiSearch, FiTrash2, FiEdit2, FiSave, 
  FiDownload, FiUpload, FiAlertTriangle, FiX
} from 'react-icons/fi';
import { 
  MdOutlineInventory2, MdOutlineCategory, 
  MdCheckCircle, MdArrowBack, MdArrowForward
} from 'react-icons/md';

type ItemType = 'bottle' | 'accessory';

interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
}

const ITEMS_PER_PAGE = 10;

const AddItemPage = () => {
  // State management
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | ItemType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState({
    name: '',
    type: 'bottle' as ItemType,
    quantity: 0,
  });

  // Responsive design
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('inventory') || '[]');
    setInventory(stored);

    const savedFilter = localStorage.getItem('filter');
    const savedSearch = localStorage.getItem('searchTerm');
    if (savedFilter) setFilter(savedFilter as 'all' | ItemType);
    if (savedSearch) setSearchTerm(savedSearch);
  }, []);

  // Focus name input when adding
  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  // Save data to localStorage
  const saveInventory = useCallback((data: InventoryItem[]) => {
    localStorage.setItem('inventory', JSON.stringify(data));
    setInventory(data);
  }, []);

  // CRUD operations
  const handleDelete = useCallback((id: string) => {
    const item = inventory.find((i) => i.id === id);
    if (window.confirm(`هل أنت متأكد من حذف "${item?.name}"؟`)) {
      const updated = inventory.filter((item) => item.id !== id);
      saveInventory(updated);
      toast.success('تم الحذف بنجاح');
    }
  }, [inventory, saveInventory]);

  const handleEdit = useCallback((id: string, newQuantity: number) => {
    const updated = inventory.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    saveInventory(updated);
    toast.success('تم التحديث بنجاح');
  }, [inventory, saveInventory]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(inventory, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventory.json';
    link.click();
    toast.success('تم التصدير بنجاح');
  }, [inventory]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) {
          saveInventory(parsed);
          toast.success(`تم استيراد ${parsed.length} منتج بنجاح`);
        }
      } catch {
        toast.error('ملف غير صالح');
      }
    };
    reader.readAsText(file);
  }, [saveInventory]);

  const handleAdd = useCallback(() => {
    if (!newItem.name.trim()) {
      toast.error('أدخل اسم المنتج');
      return;
    }
    
    const item: InventoryItem = {
      ...newItem,
      id: Date.now().toString(),
      quantity: Number(newItem.quantity)
    };
    
    saveInventory([...inventory, item]);
    setNewItem({ name: '', type: 'bottle', quantity: 0 });
    setIsAdding(false);
    toast.success('تمت الإضافة بنجاح');
  }, [newItem, inventory, saveInventory]);

  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResult(null);
      return;
    }

    const lowerSearch = searchTerm.trim().toLowerCase();
    const matches = inventory.filter((item) =>
      item.name.toLowerCase().includes(lowerSearch)
    );

    if (matches.length > 0) {
      const total = matches.reduce((sum, item) => sum + item.quantity, 0);
      setSearchResult(total > 0 
        ? `الكمية الإجمالية: ${total}` 
        : 'موجود ولكن نفد المخزون');
    } else {
      setSearchResult('غير موجود أو نفد');
    }
  }, [searchTerm, inventory]);

  // Persist preferences
  useEffect(() => localStorage.setItem('filter', filter), [filter]);
  useEffect(() => localStorage.setItem('searchTerm', searchTerm), [searchTerm]);

  // Filter and paginate items
  const filtered = filter === 'all' 
    ? inventory 
    : inventory.filter((item) => item.type === filter);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity < 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 max-w-6xl mx-auto" dir="rtl">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <MdOutlineInventory2 className="text-2xl text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">إدارة المخزون</h1>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsAdding(!isAdding)} 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <FiPlus size={18} />
              <span>{isAdding ? 'إلغاء' : 'إضافة منتج'}</span>
            </button>

            <button 
              onClick={handleExport} 
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-colors"
            >
              <FiDownload size={18} />
              <span>تصدير</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-colors"
            >
              <FiUpload size={18} />
              <span>استيراد</span>
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* Add Item Form */}
      {isAdding && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">إضافة منتج جديد</h2>
            <button 
              onClick={() => setIsAdding(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="أدخل اسم المنتج"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({...newItem, type: e.target.value as ItemType})}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bottle">زجاجة</option>
                <option value="accessory">إكسسوار</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
              <input
                type="number"
                min={0}
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiSave size={18} />
              <span>حفظ المنتج</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {searchResult && (
              <div className="mt-2 text-sm font-medium">
                {searchResult.includes('الإجمالية') ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <MdCheckCircle /> {searchResult}
                  </span>
                ) : searchResult.includes('نفد') ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <FiAlertTriangle /> {searchResult}
                  </span>
                ) : (
                  <span className="text-yellow-600">{searchResult}</span>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تصفية حسب النوع</label>
            <select
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | ItemType)}
            >
              <option value="all">الكل</option>
              <option value="bottle">الزجاجات</option>
              <option value="accessory">الإكسسوارات</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
          <MdOutlineInventory2 className="mx-auto text-5xl text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-500 mb-2">لا توجد منتجات</h3>
          <p className="text-gray-400 mb-6">ابدأ بإضافة منتجات جديدة إلى المخزون</p>
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <FiPlus size={18} />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      ) : isMobile ? (
        // Mobile View
        <div className="space-y-4">
          {paginatedItems.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MdOutlineCategory size={14} />
                    {item.type === 'bottle' ? 'زجاجة' : 'إكسسوار'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(item.quantity)}`}>
                  {item.quantity === 0 ? 'نفد' : item.quantity < 5 ? 'منخفض' : 'متوفر'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">الكمية</label>
                  <input
                    type="number"
                    value={item.quantity}
                    min={0}
                    onChange={(e) => handleEdit(item.id, parseInt(e.target.value))}
                    className="w-full border border-gray-300 p-2 rounded-lg text-center"
                  />
                </div>
                
                <div className="flex gap-2 items-end">
                  <button
                    onClick={() => handleEdit(item.id, item.quantity)}
                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm flex-1 flex items-center justify-center gap-1"
                  >
                    <FiSave size={14} />
                    <span>حفظ</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm flex-1 flex items-center justify-center gap-1"
                  >
                    <FiTrash2 size={14} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">النوع</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {item.type === 'bottle' ? 'زجاجة' : 'إكسسوار'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-24 border border-gray-300 p-2 rounded-lg text-center focus:ring-2 focus:ring-blue-500"
                        value={item.quantity}
                        min={0}
                        onChange={(e) => handleEdit(item.id, parseInt(e.target.value))}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(item.quantity)}`}>
                        {item.quantity === 0 ? 'نفد المخزون' : item.quantity < 5 ? 'كمية منخفضة' : 'متوفر'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(item.id, item.quantity)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <FiEdit2 size={16} />
                          <span>حفظ</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <FiTrash2 size={16} />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-700">
            عرض <span className="font-medium">{(currentPage-1)*ITEMS_PER_PAGE+1}</span> إلى{' '}
            <span className="font-medium">{Math.min(currentPage*ITEMS_PER_PAGE, filtered.length)}</span> من{' '}
            <span className="font-medium">{filtered.length}</span> منتج
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(p-1, 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${currentPage === 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <MdArrowBack size={20} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(p+1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <MdArrowForward size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItemPage;
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

type InventoryItem = {
  id: string;
  name: string;
  type: 'bottle' | 'accessory';
  quantity: number;
};

const InventoryPage = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'bottle' | 'accessory'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', type: 'bottle', quantity: 1 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('inventory') || '[]');
    setItems(stored);
  }, []);

  const saveItems = (updated: InventoryItem[]) => {
    setItems(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    saveItems(updated);
  };

  const handleEdit = (id: string, newQuantity: number) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    saveItems(updated);
  };

  const handleAddNewItem = () => {
    if (!newItem.name.trim()) return alert('❌ أدخل اسم المنتج');
    const newEntry: InventoryItem = {
      id: uuidv4(),
      name: newItem.name,
      type: newItem.type as 'bottle' | 'accessory',
      quantity: newItem.quantity,
    };
    const updated = [newEntry, ...items];
    saveItems(updated);
    setIsModalOpen(false);
    setNewItem({ name: '', type: 'bottle', quantity: 1 });
  };

  const getAlertColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity < 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredItems = items
    .filter((item) => filter === 'all' || item.type === filter)
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.json';
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data)) {
          saveItems(data);
          alert('✅ تم استيراد المنتجات بنجاح');
        }
      } catch {
        alert('❌ الملف غير صالح');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-sudanPrimary">📋 المخزون الحالي</h2>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-sudanPrimary text-white px-4 py-2 rounded hover:opacity-90"
        >
          ➕ إضافة منتج
        </button>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleExport}
        >
          📤 تصدير
        </button>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => fileInputRef.current?.click()}
        >
          📥 استيراد
        </button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImport}
          className="hidden"
        />

        <select
          className="border p-2 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">📁 الكل</option>
          <option value="bottle">🧴 زجاجة</option>
          <option value="accessory">🎀 إكسسوار</option>
        </select>

        <input
          type="text"
          placeholder="🔍 ابحث عن منتج..."
          className="border p-2 rounded w-60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link
          to="/inventory-report"
          className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
        >
          🖨️ تقرير الطباعة
        </Link>
      </div>

      {paginatedItems.length === 0 ? (
        <p className="text-gray-500">لا يوجد منتجات حالياً.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-center">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border">المنتج</th>
                  <th className="p-2 border">النوع</th>
                  <th className="p-2 border">الكمية</th>
                  <th className="p-2 border">تنبيه</th>
                  <th className="p-2 border">حذف</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{item.name}</td>
                    <td className="p-2 border">
                      {item.type === 'bottle' ? 'زجاجة' : 'إكسسوار'}
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        className="w-full border p-1 rounded text-center"
                        value={item.quantity}
                        onChange={(e) => handleEdit(item.id, parseInt(e.target.value))}
                        min={0}
                      />
                    </td>
                    <td className={`p-2 border font-semibold ${getAlertColor(item.quantity)}`}>
                      {item.quantity === 0
                        ? '❌ نفد المخزون'
                        : item.quantity < 5
                        ? '⚠️ كمية منخفضة'
                        : '✅ متوفر'}
                    </td>
                    <td className="p-2 border">
                      <button
                        onClick={() => handleEdit(item.id, item.quantity)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        حفظ
                      </button>
                    </td>
                    <td className="p-2 border">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded border ${
                  currentPage === page ? 'bg-sudanPrimary text-white' : 'bg-white text-black'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md text-right">
            <h3 className="text-lg font-semibold mb-4 text-sudanPrimary">➕ إضافة منتج جديد</h3>
            <input
              type="text"
              placeholder="اسم المنتج"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full border p-2 rounded mb-3"
            />
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              className="w-full border p-2 rounded mb-3"
            >
              <option value="bottle">🧴 زجاجة</option>
              <option value="accessory">🎀 إكسسوار</option>
            </select>
            <input
              type="number"
              placeholder="الكمية"
              min={1}
              value={newItem.quantity}
              onChange={(e) =>
                setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })
              }
              className="w-full border p-2 rounded mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={handleAddNewItem}
                className="bg-green-600 text-white px-4 py-2 rounded hover:opacity-90"
              >
                حفظ
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;

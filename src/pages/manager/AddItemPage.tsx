import React, { useEffect, useState, useRef } from 'react';

type ItemType = 'bottle' | 'accessory';

interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
}

const AddItemPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | ItemType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<{ name: string; type: ItemType; quantity: number }>({
    name: '',
    type: 'bottle',
    quantity: 0,
  });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('inventory') || '[]');
    setInventory(stored);

    const savedFilter = localStorage.getItem('filter');
    const savedSearch = localStorage.getItem('searchTerm');
    if (savedFilter) setFilter(savedFilter as 'all' | ItemType);
    if (savedSearch) setSearchTerm(savedSearch);
  }, []);

  const saveInventory = (data: InventoryItem[]) => {
    localStorage.setItem('inventory', JSON.stringify(data));
    setInventory(data);
  };

  const handleDelete = (id: string) => {
    const item = inventory.find((i) => i.id === id);
    if (window.confirm(`هل أنت متأكد من حذف "${item?.name}"؟`)) {
      const updated = inventory.filter((item) => item.id !== id);
      saveInventory(updated);
    }
  };

  const handleEdit = (id: string, newQuantity: number) => {
    const updated = inventory.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    saveInventory(updated);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(inventory, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventory.json';
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      try {
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed)) {
          saveInventory(parsed);
          alert('📥 تم استيراد الملف بنجاح');
        }
      } catch {
        alert('❌ ملف غير صالح');
      }
    };
    reader.readAsText(file);
  };

  const handleAdd = () => {
    if (!newItem.name.trim()) return alert('⚠️ أدخل اسم المنتج');
    const id = Date.now().toString();
    const item: InventoryItem = { ...newItem, id, quantity: Number(newItem.quantity) };
    saveInventory([...inventory, item]);
    setNewItem({ name: '', type: 'bottle', quantity: 0 });
  };

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
      if (total > 0) {
        setSearchResult(`✅ الكمية الإجمالية: ${total}`);
      } else {
        setSearchResult('🚫 موجود ولكن نفد المخزون');
      }
    } else {
      setSearchResult('🚫 غير موجود أو نفد');
    }
  }, [searchTerm, inventory]);

  useEffect(() => {
    localStorage.setItem('filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('searchTerm', searchTerm);
  }, [searchTerm]);

  const filtered = filter === 'all' ? inventory : inventory.filter((item) => item.type === filter);

  return (
    <div className="p-8 text-right max-w-6xl mx-auto" dir="rtl">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">📦 إدارة المخزون</h2>

      {/* إضافة عنصر جديد */}
      <div className="mb-6 bg-gray-50 p-4 rounded shadow-md">
        <h3 className="text-lg font-semibold mb-2">➕ إضافة منتج جديد</h3>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="اسم المنتج"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="border p-2 rounded w-64"
            aria-label="اسم المنتج"
          />
          <select
            value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ItemType })}
            className="border p-2 rounded"
            aria-label="نوع المنتج"
          >
            <option value="bottle">🧴 زجاجة</option>
            <option value="accessory">🎀 إكسسوار</option>
          </select>
          <input
            type="number"
            min={0}
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
            className="border p-2 rounded w-24"
            aria-label="الكمية"
          />
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            حفظ
          </button>
        </div>
      </div>

      {/* أدوات التحكم */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleExport}>
          📤 تصدير
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => fileInputRef.current?.click()}
        >
          📥 استيراد من ملف
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
          onChange={(e) => setFilter(e.target.value as 'all' | ItemType)}
        >
          <option value="all">📁 الكل</option>
          <option value="bottle">🧴 الزجاجات</option>
          <option value="accessory">🎀 الإكسسوارات</option>
        </select>
      </div>

      {/* شريط البحث */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="ابحث باسم المنتج (مثال: مسك)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-64"
          aria-label="بحث"
        />
        {searchResult && (
          <div className="text-lg font-medium text-gray-700">{searchResult}</div>
        )}
      </div>

      {/* جدول المنتجات */}
      <table className="w-full border text-right">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">اسم المنتج</th>
            <th className="p-2 border">النوع</th>
            <th className="p-2 border">الكمية</th>
            <th className="p-2 border">تعديل</th>
            <th className="p-2 border">حذف</th>
            <th className="p-2 border">🔔 تنبيه</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id} className="border">
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{item.type === 'bottle' ? 'زجاجة' : 'إكسسوار'}</td>
              <td className="p-2 border">
                <input
                  type="number"
                  value={item.quantity}
                  min={0}
                  onChange={(e) => handleEdit(item.id, parseInt(e.target.value))}
                  className="w-20 p-1 border rounded"
                />
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => handleEdit(item.id, item.quantity)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  حفظ
                </button>
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  حذف
                </button>
              </td>
              <td className="p-2 border">
                {item.quantity === 0 ? (
                  <span className="text-red-600 font-bold">🚫 نفد المخزون</span>
                ) : item.quantity < 5 ? (
                  <span className="text-orange-500 font-medium">🟠 كمية منخفضة</span>
                ) : (
                  '✅'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AddItemPage;

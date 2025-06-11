import React, { useState } from 'react';
import { Plus, Upload, Download, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InventoryTable from "../components/InventoryTable";
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import DashboardInventoryCards from '../ui/DashboardInventoryCards';

const InventoryPage = () => {
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const [items, setItems] = useState([
    { id: 1, name: 'المنتج أ', quantity: 20, price: 9.99, category: 'إكسسوارات' },
    { id: 2, name: 'المنتج ب', quantity: 5, price: 14.99, category: 'زجاج' },
    { id: 3, name: 'المنتج ج', quantity: 15, price: 19.99, category: 'إكسسوارات' },
  ]);

  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    price: '',
    category: '',
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();

    if (!newItem.name || !newItem.quantity || !newItem.price || !newItem.category) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    if (editingItemId !== null) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                name: newItem.name.trim(),
                quantity: Number(newItem.quantity),
                price: parseFloat(newItem.price),
                category: newItem.category.trim(),
              }
            : item
        )
      );
    } else {
      const newId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;

      setItems(prev => [
        ...prev,
        {
          id: newId,
          name: newItem.name.trim(),
          quantity: Number(newItem.quantity),
          price: parseFloat(newItem.price),
          category: newItem.category.trim(),
        },
      ]);
    }

    setNewItem({ name: '', quantity: '', price: '', category: '' });
    setEditingItemId(null);
    setShowAddModal(false);
  };

  const handleEdit = (item) => {
    setNewItem({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
    });
    setEditingItemId(item.id);
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingItemId === id) {
        setShowAddModal(false);
        setEditingItemId(null);
        setNewItem({ name: '', quantity: '', price: '', category: '' });
      }
    }
  };

  return (
    <div dir="rtl" className="min-h-screen p-6 space-y-6 bg-white dark:bg-gray-900 dark:text-white transition-colors duration-300">
      {/* ✅ Responsive Header Section */}
      <div className="grid gap-4 sm:flex sm:items-center sm:justify-between sm:flex-wrap">
        <h1 className="text-3xl font-bold">إدارة المخزون</h1>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <Input
            placeholder="ابحث في المخزون..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />

          <Button variant="outline" onClick={() => alert('استيراد البيانات')}>
            <Upload className="w-4 h-4 ml-2" />
            استيراد
          </Button>

          <Button variant="outline" onClick={() => alert('تصدير البيانات')}>
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>

          <Button onClick={() => {
            setShowAddModal(true);
            setEditingItemId(null);
            setNewItem({ name: '', quantity: '', price: '', category: '' });
          }}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة جديد
          </Button>

          <Button variant="ghost" onClick={toggleDarkMode} className="ml-2">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <DashboardInventoryCards items={items} />

      <InventoryTable
        items={filteredItems}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold mb-4 text-center">
                {editingItemId !== null ? 'تعديل العنصر' : 'إضافة عنصر جديد'}
              </h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <Input
                  name="name"
                  placeholder="اسم المنتج"
                  value={newItem.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  name="quantity"
                  type="number"
                  min="0"
                  placeholder="الكمية"
                  value={newItem.quantity}
                  onChange={handleChange}
                  required
                />
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="السعر"
                  value={newItem.price}
                  onChange={handleChange}
                  required
                />
                <Input
                  name="category"
                  placeholder="الفئة (إكسسوارات أو زجاج)"
                  value={newItem.category}
                  onChange={handleChange}
                  required
                />

                <div className="flex justify-between mt-6">
                  <Button type="submit">
                    {editingItemId !== null ? 'حفظ التغييرات' : 'إضافة'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItemId(null);
                      setNewItem({ name: '', quantity: '', price: '', category: '' });
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPage;

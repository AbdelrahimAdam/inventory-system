import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const categories = ["إكسسوارات", "زجاج", "الفئة ١", "الفئة ٢"];

const NewItemModal = ({ open, onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: "",
    quantity: "",
    price: "",
    category: categories[0],
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.quantity || !form.price) {
      setError("جميع الحقول مطلوبة");
      return;
    }

    if (isNaN(form.quantity) || isNaN(form.price)) {
      setError("الكمية والسعر يجب أن يكونا أرقامًا صالحة");
      return;
    }

    onAdd({
      id: Date.now(),
      name: form.name.trim(),
      quantity: Number(form.quantity),
      price: Number(form.price),
      category: form.category,
    });

    // Reset form
    setForm({ name: "", quantity: "", price: "", category: categories[0] });
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md">
          <Dialog.Title className="text-lg font-bold mb-4">إضافة منتج جديد</Dialog.Title>

          {error && (
            <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="اسم المنتج"
              required
              dir="rtl"
            />

            <Input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={handleChange}
              placeholder="الكمية"
              required
              dir="rtl"
            />

            <Input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              placeholder="السعر"
              required
              dir="rtl"
            />

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-right"
              dir="rtl"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={onClose}>إلغاء</Button>
              <Button type="submit">إضافة</Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default NewItemModal;

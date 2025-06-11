// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

type ItemType = 'bottle' | 'accessory';

interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  sold?: number;
}

const HomePage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('inventory') || '[]');
    setInventory(stored);
  }, []);

  const totalGlasses = inventory
    .filter((item) => item.type === 'bottle')
    .reduce((acc, item) => acc + item.quantity, 0);

  const totalAccessories = inventory
    .filter((item) => item.type === 'accessory')
    .reduce((acc, item) => acc + item.quantity, 0);

  const mostSellingGlass = inventory
    .filter((item) => item.type === 'bottle')
    .reduce(
      (max, item) => (item.sold ?? 0) > (max.sold ?? 0) ? item : max,
      { sold: 0 } as InventoryItem
    );

  return (
    <div className="min-h-screen bg-appleBg text-appleTextPrimary pt-16 relative" dir="rtl">
      {/* Navbar */}
      <Navbar />

      {/* Main Dashboard */}
      <main className="flex flex-col items-center justify-center px-4 py-10">
        <div className="bg-white shadow-xl rounded-3xl max-w-4xl w-full p-10 space-y-10 border border-appleBorder">
          <h1 className="text-3xl font-extrabold text-appleTextPrimary text-center select-none">
            مرحباً بك في نظام إدارة مخزون العطور
          </h1>
          <p className="text-appleTextSecondary text-lg text-center select-none">
            لوحة التحكم الخاصة بك
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-center justify-center select-none transition hover:shadow-xl cursor-default">
              <div className="text-6xl mb-2 text-appleAccentBlue">🧴</div>
              <h2 className="text-xl font-semibold mb-1 text-appleTextPrimary">إجمالي الزجاجات</h2>
              <p className="text-4xl font-bold text-appleAccentBlue">{totalGlasses}</p>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-center justify-center select-none transition hover:shadow-xl cursor-default">
              <div className="text-6xl mb-2 text-appleAccentBlue">🎀</div>
              <h2 className="text-xl font-semibold mb-1 text-appleTextPrimary">إجمالي الإكسسوارات</h2>
              <p className="text-4xl font-bold text-appleAccentBlue">{totalAccessories}</p>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-center justify-center select-none transition hover:shadow-xl cursor-default">
              <div className="text-6xl mb-2 text-appleAccentBlue">🔥</div>
              <h2 className="text-xl font-semibold mb-1 text-appleTextPrimary">الأكثر مبيعاً</h2>
              <p className="text-lg font-semibold text-appleTextPrimary max-w-xs text-center">
                {mostSellingGlass.name ? mostSellingGlass.name : 'لا يوجد بيانات مبيعات'}
              </p>
              <p className="text-sm text-appleTextSecondary mt-1">
                {mostSellingGlass.sold
                  ? `تم بيع ${mostSellingGlass.sold} قطعة`
                  : 'لم يتم تسجيل مبيعات'}
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-3 max-w-md mx-auto">
            <Link
              to="/add-item"
              className="block w-full text-center bg-appleAccentBlue hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition"
            >
              ➕ إضافة منتج جديد
            </Link>
            <Link
              to="/inventory"
              className="block w-full text-center bg-appleAccentBlue hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition"
            >
              📦 عرض المخزون
            </Link>
            <Link
              to="/users"
              className="block w-full text-center bg-appleAccentBlue hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition"
            >
              👤 إدارة المستخدمين
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;

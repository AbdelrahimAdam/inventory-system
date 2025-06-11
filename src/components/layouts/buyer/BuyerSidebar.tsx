import React from 'react';
import { Link } from 'react-router-dom';

const BuyerSidebar = () => {
  return (
    <aside className="w-full md:w-64 bg-white shadow-lg rounded-lg p-4 space-y-4 text-right" dir="rtl">
      <h2 className="text-2xl font-bold text-sudanPrimary">لوحة المشتري</h2>
      <nav className="space-y-2">
        <Link to="/buyer/dashboard" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🏠 الرئيسية</Link>
        <Link to="/buyer/products" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🧴 المنتجات</Link>
        <Link to="/buyer/orders" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🛒 طلباتي</Link>
        <Link to="/buyer/profile" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">👤 الحساب</Link>
      </nav>
    </aside>
  );
};

export default BuyerSidebar;

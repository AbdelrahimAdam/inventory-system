import React from 'react';
import { Link } from 'react-router-dom';

const SupplierSidebar = () => {
  return (
    <aside className="w-full md:w-64 bg-white shadow-lg rounded-lg p-4 space-y-4 text-right" dir="rtl">
      <h2 className="text-2xl font-bold text-sudanPrimary">لوحة المورد</h2>
      <nav className="space-y-2">
        <Link to="/supplier/dashboard" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🏠 الرئيسية</Link>
        <Link to="/supplier/inventory" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">📦 إدارة المنتجات</Link>
        <Link to="/supplier/orders" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">📑 الطلبات الواردة</Link>
        <Link to="/supplier/profile" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">👤 الحساب</Link>
      </nav>
    </aside>
  );
};

export default SupplierSidebar;

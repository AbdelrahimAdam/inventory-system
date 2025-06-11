import React from 'react';
import { Link } from 'react-router-dom';

const WorkerSidebar = () => {
  return (
    <aside className="w-full md:w-64 bg-white shadow-lg rounded-lg p-4 space-y-4 text-right" dir="rtl">
      <h2 className="text-2xl font-bold text-sudanPrimary">لوحة العامل</h2>
      <nav className="space-y-2">
        <Link to="/worker/dashboard" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🏠 الرئيسية</Link>
        <Link to="/worker/tasks" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🛠 المهام اليومية</Link>
        <Link to="/worker/inventory-check" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">🔍 فحص المخزون</Link>
        <Link to="/worker/profile" className="block p-2 rounded hover:bg-sudanPrimary hover:text-white">👤 الحساب</Link>
      </nav>
    </aside>
  );
};

export default WorkerSidebar;

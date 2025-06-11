import React from 'react';
import { Link } from 'react-router-dom';

const RoleNavbar = ({ role }: { role: 'supplier' | 'worker' | 'buyer' }) => {
  const roleTitle = {
    supplier: 'المورد',
    worker: 'العامل',
    buyer: 'المشتري',
  }[role];

  return (
    <header className="w-full bg-sudanPrimary text-white p-4 flex justify-between items-center" dir="rtl">
      <h1 className="text-xl font-semibold">نظام العطور - {roleTitle}</h1>
      <nav className="space-x-4 space-x-reverse">
        <Link to="/" className="hover:underline">🏠 الصفحة الرئيسية</Link>
        <Link to="/logout" className="hover:underline">🚪 تسجيل الخروج</Link>
      </nav>
    </header>
  );
};

export default RoleNavbar;

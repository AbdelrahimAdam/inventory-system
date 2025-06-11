// src/pages/NotFoundPage.tsx
import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center px-4">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">404</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">الصفحة غير موجودة</p>
      <Link
        to="/login"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        الرجوع إلى تسجيل الدخول
      </Link>
    </div>
  );
};

export default NotFoundPage;

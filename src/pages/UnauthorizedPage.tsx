// src/pages/UnauthorizedPage.tsx
import React from "react";
import { Link } from "react-router-dom";

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center px-4">
      <h1 className="text-3xl font-bold text-red-600 mb-4">غير مصرح</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      <Link
        to="/login"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        الرجوع إلى تسجيل الدخول
      </Link>
    </div>
  );
};

export default UnauthorizedPage;

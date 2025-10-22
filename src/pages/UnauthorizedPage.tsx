// src/pages/UnauthorizedPage.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  // Automatically redirect to login
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1000); // redirect after 1 second (optional delay)

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center px-4">
      <h1 className="text-3xl font-bold text-red-600 mb-4">غير مصرح</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        ليس لديك صلاحية للوصول إلى هذه الصفحة
      </p>
      <p className="text-gray-500 dark:text-gray-400">جارٍ التحويل إلى صفحة تسجيل الدخول...</p>
    </div>
  );
};

export default UnauthorizedPage;

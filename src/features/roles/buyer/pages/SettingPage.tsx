import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SettingPage: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("كلمات المرور الجديدة غير متطابقة");
      return;
    }

    // Simulate secure API call
    setTimeout(() => {
      setSuccess("تم تحديث بياناتك بنجاح");
      setError("");
    }, 1000);
  };

  const handleLogout = () => {
    // Clear all sensitive data
    localStorage.clear();
    sessionStorage.clear();
    // Redirect securely
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition"
        >
          تسجيل الخروج
        </button>
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-md transition"
        >
          {darkMode ? "وضع النهار" : "الوضع الداكن"}
        </button>
      </div>

      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
        إعدادات الحساب
      </h1>

      <div className="mt-8 max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          تحديث المعلومات الشخصية
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 p-3 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 p-3 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              كلمة المرور الحالية
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 p-3 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              كلمة المرور الجديدة
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 p-3 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 p-3 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
          {success && <div className="text-sm text-green-500 mt-2">{success}</div>}
         <button
         type="submit"
       className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition duration-150 ease-in-out"
         >
        حفظ التغييرات
        </button>

        </form>
      </div>
    </div>
  );
};

export default SettingPage;

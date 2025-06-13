import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, saveUsers } from "../utils/localStorageService";
import { motion } from "framer-motion";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manager");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("يرجى تعبئة جميع الحقول");
      return;
    }

    if (!validateEmail(email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }

    const users = getUsers();
    if (users.find((u) => u.email === email && u.role === role)) {
      setError("يوجد حساب بهذا البريد والدور بالفعل");
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role,
      settings: {},
    };

    saveUsers([...users, newUser]);
    setSuccess("تم إنشاء الحساب بنجاح 🎉");

    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 px-4 relative overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 opacity-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity }}
      />
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 z-10">
        <div className="flex justify-center mb-4">
          <motion.img
            src="/logo.png"
            alt="Logo"
            className="h-20 w-20 rounded-full shadow-lg border-4 border-white dark:border-gray-800"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
          />
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          إنشاء حساب جديد
        </h2>

        {error && (
          <div className="mb-4 text-red-500 text-sm text-center animate-pulse">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-green-500 text-sm text-center animate-fade">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              الاسم الكامل
            </label>
            <input
              type="text"
              className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10 focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-500"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              اختر الدور
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="manager">مدير</option>
              <option value="supplier">مورد</option>
              <option value="worker">عامل</option>
              <option value="buyer">مشتري</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
          >
            إنشاء الحساب
          </button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
            لديك حساب؟{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              سجل الدخول
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;

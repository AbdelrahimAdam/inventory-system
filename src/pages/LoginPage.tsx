import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);

      // Wait a tick to let context update
      const role = JSON.parse(atob(localStorage.getItem("token") || ""))?.role;
      switch (role) {
        case "manager":
          navigate("/manager");
          break;
        case "supplier":
          navigate("/supplier");
          break;
        case "worker":
          navigate("/worker");
          break;
        case "buyer":
          navigate("/buyer");
          break;
        default:
          navigate("/unauthorized");
      }
    } catch {
      setError("بيانات الدخول غير صحيحة");
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 px-4 relative overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 opacity-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity }}
      />

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 z-10">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="مخازن عطور المعلم خليفه"
            className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-800"
          />
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          تسجيل الدخول
        </h2>

        {error && (
          <div className="mb-4 text-red-500 text-sm text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10 focus:ring-2 focus:ring-blue-500"
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

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
          >
            تسجيل الدخول
          </button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              سجل الآن
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

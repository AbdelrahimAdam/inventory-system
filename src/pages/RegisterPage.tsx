// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { callFunction } from "../services/firebase";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperadmin, hasFeature } = useAuth();

  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role_name, setRoleName] = useState<"buyer" | "supplier" | "worker" | "manager" | "superadmin">("buyer");
  const [isFactoryUser, setIsFactoryUser] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // === صلاحيات الإنشاء ===
  const canCreateSuperadmin = isSuperadmin;
  const canCreateManager = isSuperadmin || hasFeature("USER_MANAGE_create");
  const canCreateWorker = isSuperadmin || hasFeature("FACTORY_USER_create");

  // === التحقق من الصحة ===
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pwd: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/.test(pwd);
  const validateName = (name: string) => /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/.test(name);

  // === عرض الدور بالعربية ===
  const getRoleDisplay = (role: string) => {
    const map: Record<string, string> = {
      superadmin: "مشرف عام",
      manager: "مدير",
      worker: "عامل مصنع",
      buyer: "مشتري",
      supplier: "مورد",
    };
    return map[role] || role;
  };

  // === الأدوار المتاحة بناءً على الصلاحيات ===
  const availableRoles = [
    "buyer",
    "supplier",
    ...(canCreateWorker ? ["worker"] : []),
    ...(canCreateManager ? ["manager"] : []),
    ...(canCreateSuperadmin ? ["superadmin"] : []),
  ].filter(r => isFactoryUser ? r === "worker" : r !== "worker");

  // === معالج التسجيل ===
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!validateName(full_name)) return setError("الاسم يجب أن يكون 2-50 حرفًا ولا يحتوي على رموز");
    if (!validateEmail(email)) return setError("البريد الإلكتروني غير صالح");
    if (!validatePassword(password)) return setError("كلمة المرور يجب أن تحتوي على 8+ أحرف، حرف كبير، صغير، ورقم");

    const finalRole = isFactoryUser ? "worker" : role_name;

    try {
      await callFunction("createUserWithRole", {
        email,
        password,
        name: full_name,
        role: finalRole,
      });

      setSuccess("تم إنشاء الحساب بنجاح! جاري التوجيه...");
      setTimeout(() => navigate("/login", { state: { email } }), 2000);
    } catch (err: any) {
      setError(err.message || "فشل في إنشاء الحساب. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 px-4">
      {/* خلفية متحركة */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 opacity-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 z-10">
        {/* الشعار */}
        <div className="flex justify-center mb-6">
          <motion.img
            src="/logo.png"
            alt="شعار النظام"
            className="h-20 w-20 rounded-full shadow-lg border-4 border-white dark:border-gray-800"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
          />
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          {isFactoryUser ? "إنشاء حساب عامل مصنع" : "إنشاء حساب جديد"}
        </h2>

        {/* رسائل النجاح / الخطأ */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm text-center"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* الاسم الكامل */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
              disabled={loading}
              placeholder="أحمد محمد علي"
            />
          </div>

          {/* البريد الإلكتروني */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
              disabled={loading}
              placeholder="example@company.com"
            />
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                required
                minLength={8}
                disabled={loading}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                tabIndex={-1}
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              8+ أحرف، حرف كبير، صغير، ورقم
            </p>
          </div>

          {/* اختيار نوع التسجيل (عام أو عامل مصنع) */}
          {(canCreateWorker || isSuperadmin) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                نوع التسجيل
              </label>
              <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isFactoryUser}
                    onChange={() => setIsFactoryUser(false)}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">تسجيل عام</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isFactoryUser}
                    onChange={() => setIsFactoryUser(true)}
                    disabled={loading || !canCreateWorker}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm">عامل مصنع</span>
                </label>
              </div>
            </div>
          )}

          {/* اختيار الدور (إذا لم يكن عامل مصنع) */}
          {!isFactoryUser && availableRoles.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                اختر الدور
              </label>
              <select
                value={role_name}
                onChange={(e) => setRoleName(e.target.value as any)}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                disabled={loading}
              >
                {availableRoles.map(r => (
                  <option key={r} value={r}>
                    {getRoleDisplay(r)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* زر الإرسال */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-all duration-300"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                جارٍ الإنشاء...
                <span className="animate-spin h-4 w-4 border-b-2 border-white ml-2 inline-block"></span>
              </>
            ) : (
              isFactoryUser
                ? "إنشاء حساب عامل مصنع"
                : `إنشاء حساب ${getRoleDisplay(role_name)}`
            )}
          </motion.button>

          {/* رابط تسجيل الدخول */}
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            لديك حساب؟{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              سجل الدخول
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
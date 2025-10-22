import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

// Fallback API URL if environment variable is not defined - FIXED FOR VITE
const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.209:3001/api/v1";

type SchemaRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "USER"
  | "VIEWER"
  | "WORKER"
  | "BUYER"
  | "SUPPLIER";

interface Role {
  name: SchemaRole;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [full_name, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role_name, setRoleName] = useState<SchemaRole>("BUYER");
  const [isFactoryUser, setIsFactoryUser] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<SchemaRole[]>([]);

  // Enhanced permission checks
  const isSuperAdmin = user?.role_name === "SUPER_ADMIN";
  const canCreateUsers = hasPermission("USER_MANAGE_create") || isSuperAdmin;
  const canCreateSuperAdmin = hasPermission("SUPER_ADMIN_create") || isSuperAdmin;
  const canCreateAdmin = hasPermission("ADMIN_create") || isSuperAdmin;
  const canCreateManager = hasPermission("MANAGER_create") || isSuperAdmin;
  const canCreateFactoryUsers = hasPermission("FACTORY_USER_create") || isSuperAdmin;

  const validateEmail = (email: string): boolean =>
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email);

  const validatePassword = (password: string): boolean =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*]{8,}$/.test(password);

  const validateFullName = (full_name: string): boolean =>
    /^[a-zA-Z\u0600-\u06FF\s]{2,50}$/.test(full_name.replace(/[\n\r\t"]/g, ""));

  const normalizeRole = (role: string): SchemaRole => {
    if (!role) return "BUYER";
    const normalized = role.toUpperCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
    const roleMap: { [key: string]: SchemaRole } = {
      SUPERADMIN: "SUPER_ADMIN",
      SUPER_ADMIN: "SUPER_ADMIN",
      ADMIN: "ADMIN",
      ADMINISTRATOR: "ADMIN",
      MANAGER: "MANAGER",
      USER: "USER",
      VIEWER: "VIEWER",
      WORKER: "WORKER",
      BUYER: "BUYER",
      CLIENT: "BUYER",
      CUSTOMER: "BUYER",
      SUPPLIER: "SUPPLIER",
      VENDOR: "SUPPLIER",
    };
    return roleMap[normalized] || "BUYER";
  };

  const getRoleDisplayName = (role: string): string => {
    const roleNames: { [key: string]: string } = {
      SUPER_ADMIN: "👑 مشرف عام",
      ADMIN: "⚙️ إداري",
      MANAGER: "📊 مدير",
      USER: "👤 مستخدم",
      VIEWER: "👀 عارض",
      WORKER: "🏭 عامل مصنع",
      BUYER: "🛒 مشتري",
      SUPPLIER: "🚚 مورد",
    };
    return roleNames[role] || role;
  };

  const getRoleDescription = (role: string): string => {
    const descriptions: { [key: string]: string } = {
      SUPER_ADMIN: "صلاحيات كاملة على النظام بأكمله",
      ADMIN: "إدارة المستخدمين والإعدادات والتقارير",
      MANAGER: "إدارة المخزون والفواتير والعمليات",
      USER: "الوصول الأساسي للعمليات اليومية",
      VIEWER: "مشاهدة البيانات فقط بدون تعديل",
      WORKER: "عمليات المصنع والتعبئة والتغليف",
      BUYER: "إدارة المشتريات والعروض والموردين",
      SUPPLIER: "إدارة المنتجات والعروض والتوريد",
    };
    return descriptions[role] || "دور المستخدم في النظام";
  };

  // Fetch roles from backend - UPDATED TO MATCH SCHEMA
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        // Get roles from the database
        const res = await axios.get(`${API_URL}/auth/roles`);
        if (res.data.success) {
          const availableRoles = res.data.roles
            .map((role: Role) => normalizeRole(role.name))
            .filter((role: SchemaRole) => {
              if (role === "SUPER_ADMIN") return canCreateSuperAdmin;
              if (role === "ADMIN") return canCreateAdmin || isSuperAdmin;
              if (role === "MANAGER") return canCreateManager || isSuperAdmin;
              if (role === "WORKER") return canCreateFactoryUsers || isSuperAdmin;
              return true;
            });
          setRoles(availableRoles);
        } else {
          setError("فشل تحميل قائمة الأدوار");
          console.error("ROLES_FETCH_ERROR:", res.data.message || "Failed to fetch roles");
        }
      } catch (err: any) {
        console.error("Fetch roles error:", err);
        // Fallback roles based on permissions
        const defaultRoles: SchemaRole[] = ["BUYER", "SUPPLIER"];
        if (canCreateUsers) {
          defaultRoles.push("USER", "VIEWER");
        }
        if (canCreateManager) {
          defaultRoles.push("MANAGER");
        }
        if (canCreateAdmin) {
          defaultRoles.push("ADMIN");
        }
        if (canCreateSuperAdmin) {
          defaultRoles.push("SUPER_ADMIN");
        }
        if (canCreateFactoryUsers) {
          defaultRoles.push("WORKER");
        }
        setRoles([...new Set(defaultRoles)]);
      }
    };
    fetchRoles();
  }, [canCreateUsers, canCreateSuperAdmin, canCreateAdmin, canCreateManager, canCreateFactoryUsers, isSuperAdmin]);

  // Validate session token - UPDATED TO MATCH SCHEMA
  const validateSession = async (sessionToken: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/auth/validate-session`, {
        session_token: sessionToken,
        ip_address: "127.0.0.1",
      });
      return response.data.is_valid;
    } catch (error) {
      console.error("Session validation failed:", error);
      return false;
    }
  };

  // UPDATED REGISTER FUNCTION TO MATCH DATABASE SCHEMA
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate session if user is logged in
    if (user && user.session_token) {
      const isSessionValid = await validateSession(user.session_token);
      if (!isSessionValid) {
        setError("جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }
    }

    if (!full_name || !email || !password) {
      setError("يرجى تعبئة جميع الحقول");
      return;
    }

    if (!validateFullName(full_name)) {
      setError("الاسم يجب أن يكون بين 2 و50 حرفًا ويحتوي على أحرف عربية أو إنجليزية فقط");
      return;
    }

    if (!validateEmail(email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }

    if (!validatePassword(password)) {
      setError(
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل، وتحتوي على حرف كبير، حرف صغير، ورقم على الأقل"
      );
      return;
    }

    const normalizedRole = isFactoryUser ? "WORKER" : normalizeRole(role_name);

    // Role validation
    if (!isFactoryUser) {
      if (normalizedRole === "SUPER_ADMIN" && !canCreateSuperAdmin) {
        setError("غير مصرح لك بإنشاء حسابات مشرف عام");
        return;
      }
      if (normalizedRole === "ADMIN" && !canCreateAdmin) {
        setError("غير مصرح لك بإنشاء حسابات إدارية");
        return;
      }
      if (normalizedRole === "MANAGER" && !canCreateManager) {
        setError("غير مصرح لك بإنشاء حسابات مديرين");
        return;
      }
      if (normalizedRole === "WORKER" && !canCreateFactoryUsers) {
        setError("غير مصرح لك بإنشاء حسابات عمال مصنع");
        return;
      }
      if (!roles.includes(normalizedRole)) {
        setError("الدور المحدد غير صالح أو غير متاح");
        return;
      }
    }

    if (isFactoryUser && !canCreateFactoryUsers) {
      setError("غير مصرح لك بإنشاء حسابات عمال المصنع");
      return;
    }

    try {
      setLoading(true);
      const ip_address = "127.0.0.1";
      const user_agent = navigator.userAgent;

      // UPDATED TO CALL THE DATABASE FUNCTION DIRECTLY
      const response = await axios.post(`${API_URL}/auth/register`, {
        full_name: full_name,
        email: email,
        password: password,
        role_name: normalizedRole.toLowerCase(), // Convert to lowercase for database function
        ip_address: ip_address,
        user_agent: user_agent
      });

      if (response.data.success) {
        const successMessage = `تم إنشاء حساب ${getRoleDisplayName(normalizedRole)} بنجاح 🎉`;
        setSuccess(successMessage);

        // Log successful registration - UPDATED TO MATCH SCHEMA
        try {
          await axios.post(`${API_URL}/auth/log-security-event`, {
            event_type: "USER_REGISTRATION",
            event_description: `User registered with role ${normalizedRole}`,
            user_id: user?.user_id || null,
            username: user?.username || "anonymous",
            ip_address: ip_address,
            success: true,
            severity: "INFO",
          });
        } catch (logError) {
          console.error("Failed to log security event:", logError);
        }

        setTimeout(() => {
          navigate("/login", { 
            state: { 
              message: "تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول.",
              email: email 
            } 
          });
        }, 3000);
      } else {
        setError(response.data.message || "فشل في إنشاء الحساب");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      let errorMessage = "حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى";
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || "بيانات غير صحيحة";
      } else if (err.response?.status === 409 || err.response?.data?.message?.includes("duplicate")) {
        errorMessage = "البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل";
      } else if (err.message === "Network Error") {
        errorMessage = "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الشبكة";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);

      // Log failed registration - UPDATED TO MATCH SCHEMA
      try {
        await axios.post(`${API_URL}/auth/log-security-event`, {
          event_type: "USER_REGISTRATION_FAILED",
          event_description: `Registration failed: ${errorMessage}`,
          user_id: user?.user_id || null,
          username: user?.username || "anonymous",
          ip_address: "127.0.0.1",
          success: false,
          severity: "ERROR",
        });
      } catch (logError) {
        console.error("Failed to log security event:", logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRoleName("BUYER");
    setIsFactoryUser(false);
    setError("");
    setSuccess("");
  };

  const availableRoles = roles.filter((role) => {
    if (isFactoryUser) return false;
    if (role === "WORKER") return canCreateFactoryUsers;
    if (role === "SUPER_ADMIN") return canCreateSuperAdmin;
    if (role === "ADMIN") return canCreateAdmin;
    if (role === "MANAGER") return canCreateManager;
    return true;
  });

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
          {isFactoryUser ? "🏭 إنشاء حساب عامل مصنع" : "👤 إنشاء حساب جديد"}
        </h2>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm text-center"
          >
            {success}
            <div className="mt-2 flex space-x-2 justify-center">
              <button
                onClick={() => navigate("/login", { state: { email } })}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                🔑 تسجيل الدخول
              </button>
              <button
                onClick={handleClearForm}
                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
              >
                ➕ إنشاء حساب آخر
              </button>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              👤 الاسم الكامل
            </label>
            <input
              type="text"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={full_name}
              onChange={(e) =>
                setFullName(e.target.value.replace(/[^\u0600-\u06FFa-zA-Z\s]/g, ""))
              }
              placeholder="أدخل اسمك الكامل"
              required
              disabled={loading || !!success}
              minLength={2}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              📧 البريد الإلكتروني
            </label>
            <input
              type="email"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value.replace(/[\n\r\t"]/g, ""))
              }
              placeholder="example@email.com"
              required
              disabled={loading || !!success}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              🔐 كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/[\n\r\t"]/g, ""))
                }
                placeholder="•••••••• (8 أحرف على الأقل)"
                required
                disabled={loading || !!success}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
                disabled={loading || !!success}
              >
                {showPassword ? "🙈 إخفاء" : "👁️ إظهار"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              🔒 كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، مع حرف كبير، حرف صغير، ورقم
            </p>
          </div>

          {(canCreateUsers || canCreateFactoryUsers) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                🎯 نوع التسجيل
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="registrationType"
                    checked={!isFactoryUser}
                    onChange={() => setIsFactoryUser(false)}
                    disabled={loading || !!success}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">👤 تسجيل عام</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="registrationType"
                    checked={isFactoryUser}
                    onChange={() => setIsFactoryUser(true)}
                    disabled={loading || !!success || !canCreateFactoryUsers}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">🏭 تسجيل عامل مصنع</span>
                </label>
              </div>
            </div>
          )}

          {!isFactoryUser && availableRoles.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                🎭 اختر الدور
              </label>
              <select
                value={role_name}
                onChange={(e) => setRoleName(e.target.value as SchemaRole)}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading || !!success}
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                💡 {getRoleDescription(role_name)}
              </p>
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-all duration-200 font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:shadow-none"
            whileHover={{ scale: loading || !!success ? 1 : 1.02 }}
            whileTap={{ scale: loading || !!success ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                جارٍ الإنشاء...
              </>
            ) : success ? (
              "✅ تم التسجيل"
            ) : (
              isFactoryUser ? "🏭 إنشاء حساب عامل مصنع" : `👤 إنشاء حساب ${getRoleDisplayName(role_name)}`
            )}
          </motion.button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            لديك حساب بالفعل؟{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
            >
              🔑 سجل الدخول
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
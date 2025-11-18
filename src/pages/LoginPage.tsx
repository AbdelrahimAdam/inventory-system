// src/pages/LoginPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    isAuthenticated, 
    loading: authLoading, 
    role, 
    login, 
    debugLogin 
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const redirectOnceRef = useRef(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // === PREVENT VERTICAL SCROLLING ===
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.documentElement.style.height = "100vh";
    
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
      document.body.style.height = "auto";
      document.documentElement.style.height = "auto";
    };
  }, []);

  // === REDIRECT AFTER AUTH ===
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !redirectOnceRef.current) {
      redirectOnceRef.current = true;
      console.log("🔄 LoginPage: User authenticated, redirecting...");
      console.log("👤 User role:", role);
      console.log("👑 Is superadmin:", user.role === 'superadmin');
      
      const paths: Record<string, string> = {
        superadmin: "/superadmin/dashboard",
        super_admin: "/superadmin/dashboard",
        manager: "/manager/dashboard",
        worker: "/worker/dashboard",
        supplier: "/supplier/dashboard",
        buyer: "/buyer/dashboard",
      };
      const redirectPath = paths[role || "worker"] || "/dashboard";
      console.log("📍 Redirecting to:", redirectPath);
      
      setTimeout(() => navigate(redirectPath, { replace: true }), 100);
    }
  }, [authLoading, isAuthenticated, user, role, navigate]);

  // === DEBUG LOGIN HANDLER ===
  const handleDebugLogin = async () => {
    console.clear();
    console.log("=== DEBUG LOGIN STARTED ===");
    setError("");
    setIsLoggingIn(true);

    try {
      const result = await debugLogin(email.trim(), password.trim());
      if (result.success) {
        console.log("✅ Debug login successful");
        console.log("🔑 Final claims:", result.claims);
        
        // Now do the actual login to process the user
        await handleLogin(new Event('submit') as any);
      } else {
        setError(`Debug failed: ${result.error}`);
      }
    } catch (err: any) {
      setError(`Debug error: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // === LOGIN HANDLER ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setIsLoggingIn(true);

    if (!email || !password) {
      setError("يرجى تعبئة جميع الحقول");
      setIsLoggingIn(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      setIsLoggingIn(false);
      return;
    }

    try {
      console.log("🔐 LoginPage: Starting login process...");
      const result = await login(email.trim(), password.trim());
      
      if (result.success) {
        console.log("✅ LoginPage: Login successful via AuthContext");
        console.log("👤 Processed user:", result.user);
        console.log("🎯 User role:", result.user?.role);
        console.log("👑 Is superadmin:", result.user?.role === 'superadmin');
        
        setInfoMessage("تم تسجيل الدخول بنجاح! جاري التوجيه...");
        // The redirect will happen automatically via the useEffect
      } else {
        console.error("❌ LoginPage: Login failed:", result.message);
        setError(result.message || "فشل تسجيل الدخول");
      }
    } catch (err: any) {
      console.error("❌ LoginPage: Login error:", err);
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Show loading
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <div className="text-center">
          <motion.div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-gray-600 dark:text-gray-400">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      dir="rtl" 
      className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 overflow-hidden"
      style={{ height: '100vh' }}
    >
      {/* Subtle Background Animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-10 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20 blur-xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-16 h-16 bg-green-200 dark:bg-green-800 rounded-full opacity-20 blur-xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ 
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-full opacity-15 blur-lg"
        animate={{ 
          y: [0, -20, 0],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{ 
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      {/* Login Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 z-10 border border-gray-200/50 dark:border-gray-700/50"
        style={{ 
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Scrollable Content Container */}
        <div 
          className="h-full overflow-y-auto custom-scrollbar"
          style={{ 
            maxHeight: 'calc(90vh - 3rem)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {/* Hide scrollbar for Chrome, Safari and Opera */}
          <style>
            {`
              .custom-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden"
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-white font-bold text-lg">LOGO</span>';
                  }
                }}
              />
            </motion.div>
          </div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white"
          >
            تسجيل الدخول
          </motion.h2>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs"
            >
              <strong>Development Mode</strong>
              <br />
              Using AuthContext login function
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Info Message */}
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm text-center"
            >
              {infoMessage}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="example@email.com"
                required
                autoComplete="email"
                disabled={isLoggingIn}
                autoFocus
              />
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoggingIn}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  tabIndex={-1}
                  disabled={isLoggingIn}
                >
                  {showPassword ? "إخفاء" : "إظهار"}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white rounded-lg font-medium flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    جاري الدخول...
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-b-2 border-white ml-2 rounded-full"
                    />
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>
            </motion.div>

            {/* Debug Button (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="button"
                  onClick={handleDebugLogin}
                  disabled={isLoggingIn}
                  className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-lg font-medium text-sm transition-all duration-200"
                >
                  Debug Login (Check Console)
                </button>
              </motion.div>
            )}

            {/* Forgot Password Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center pt-2"
            >
              <Link 
                to="/forgot-password" 
                className="text-blue-600 hover:text-blue-700 hover:underline text-sm transition-colors duration-200 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={(e) => isLoggingIn && e.preventDefault()}
              >
                نسيت كلمة المرور؟
              </Link>
            </motion.div>

            {/* Register Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center pt-4 mt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ليس لديك حساب؟{" "}
                <Link 
                  to="/register" 
                  className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={(e) => isLoggingIn && e.preventDefault()}
                >
                  إنشاء حساب
                </Link>
              </p>
            </motion.div>
          </form>

          {/* Current Auth Status */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700"
            >
              <strong>Auth Status:</strong>
              <br />
              Loading: {authLoading ? "Yes" : "No"}
              <br />
              Authenticated: {isAuthenticated ? "Yes" : "No"}
              <br />
              User Role: {role || "None"}
              <br />
              User: {user ? "Loaded" : "None"}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
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

  const [email, setEmail] = useState("abdelrahim.elbran@gmail.com");
  const [password, setPassword] = useState("Abdoa@90@90@90");
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
    
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 px-4 overflow-hidden"
      style={{ height: '100vh' }}
    >
      {/* Background Animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 opacity-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity }}
      />
      
      {/* Login Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 z-10 border border-gray-200 dark:border-gray-700"
        style={{ maxHeight: '95vh', overflowY: 'auto' }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <motion.img
            src="/logo.png"
            alt="Logo"
            className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-800"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          تسجيل الدخول
        </h2>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
            <strong>Development Mode</strong>
            <br />
            Email: {email}
            <br />
            Using AuthContext login function
          </div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Info Message */}
        {infoMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md text-sm text-center"
          >
            {infoMessage}
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="example@email.com"
              required
              autoComplete="email"
              disabled={isLoggingIn}
              autoFocus
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoggingIn}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
                disabled={isLoggingIn}
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium flex items-center justify-center transition-colors shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
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

          {/* Debug Button (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={handleDebugLogin}
              disabled={isLoggingIn}
              className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-md font-medium text-sm transition-colors"
            >
              Debug Login (Check Console)
            </button>
          )}

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <Link 
              to="/forgot-password" 
              className="text-blue-600 hover:underline text-sm transition-colors dark:text-blue-400"
              onClick={(e) => isLoggingIn && e.preventDefault()}
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          {/* Register Link */}
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            ليس لديك حساب؟{" "}
            <Link 
              to="/register" 
              className="text-blue-600 hover:underline font-medium transition-colors dark:text-blue-400"
              onClick={(e) => isLoggingIn && e.preventDefault()}
            >
              إنشاء حساب
            </Link>
          </p>
        </form>

        {/* Current Auth Status */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
            <strong>Auth Status:</strong>
            <br />
            Loading: {authLoading ? "Yes" : "No"}
            <br />
            Authenticated: {isAuthenticated ? "Yes" : "No"}
            <br />
            User Role: {role || "None"}
            <br />
            User: {user ? "Loaded" : "None"}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    login, 
    resendVerification, 
    user, 
    isAuthenticated, 
    loading: authLoading, 
    getRedirectPath,
    sessionToken 
  } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEmail, setMfaEmail] = useState("");
  const redirectOnceRef = useRef(false);

  // ✅ Environment variable for API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001/api/v1";

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Schema-compatible security logging
  const logSecurityEvent = async (
    eventType: string, 
    description: string, 
    success: boolean, 
    severity: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
  ) => {
    try {
      const eventDetails = {
        event_type: eventType,
        event_description: description,
        success,
        severity,
        user_id: user?.id,
        username: user?.username,
        user_role: user?.role_name,
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        ...(user && {
          user_agent: navigator.userAgent,
          ip_address: 'client_ip_placeholder' // In real app, get from your backend
        })
      };

      console.log(`[Security] ${eventType}:`, eventDetails);

      // Log to backend security logs if we have a session token
      if (sessionToken) {
        try {
          await fetch(`${API_BASE_URL}/auth/log-security-event`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(eventDetails)
          });
        } catch (error) {
          console.warn('Failed to send security event to backend:', error);
        }
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  // Redirect when authenticated - using AuthContext's getRedirectPath
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !redirectOnceRef.current) {
      redirectOnceRef.current = true;
      
      // Use AuthContext's built-in redirect path function
      const redirectPath = getRedirectPath(user.role_name);
      
      console.log("🟢 [LoginPage] User authenticated, redirecting based on role:", {
        role: user.role_name,
        redirectPath: redirectPath,
        user: {
          id: user.user_id,
          username: user.user_username,
          role_id: user.role_id,
          role_name: user.role_name,
          is_verified: user.is_verified,
          mfa_enabled: user.mfa_enabled
        }
      });
      
      // Log successful login for security audit
      logSecurityEvent('LOGIN_SUCCESS', `User ${user.user_username} logged in successfully`, true);
      
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate, getRedirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setRequiresMFA(false);
    setIsLoggingIn(true);

    if (!email || !password) {
      setError("يرجى تعبئة جميع الحقول");
      logSecurityEvent('LOGIN_ATTEMPT', 'Missing required fields', false);
      setIsLoggingIn(false);
      return;
    }

    // Validate input format
    if (!validateEmail(email) && !/^[a-zA-Z0-9_]+$/.test(email)) {
      setError("صيغة البريد الإلكتروني أو اسم المستخدم غير صحيحة");
      logSecurityEvent('LOGIN_ATTEMPT', 'Invalid email or username format', false);
      setIsLoggingIn(false);
      return;
    }

    try {
      // Use client IP and user agent for schema compatibility
      const clientIP = "unknown"; // In production, get from your backend
      const userAgent = navigator.userAgent;

      console.log("🔐 [LoginPage] Attempting login with:", {
        username: email,
        hasPassword: !!password,
        clientIP,
        userAgent: userAgent.substring(0, 50) + "..."
      });

      const res = await login(email.trim(), password.trim(), undefined, clientIP, userAgent);
      
      if (res.success && res.user) {
        // Login successful - redirect handled by useEffect
        console.log("✅ [LoginPage] Login successful, waiting for redirect", {
          user: res.user,
          role: res.user.role_name,
          session_token: res.user.session_token ? 'present' : 'missing',
          permissions_count: res.user.permissions?.length || 0
        });
        
        // Validate session structure matches schema
        if (!res.user.session_token) {
          console.warn("⚠️ [LoginPage] Session token missing in response");
          logSecurityEvent('LOGIN_ERROR', 'Session token missing in login response', false, 'WARN');
        }
        
      } else if (res.requiresMFA) {
        // Handle MFA requirement - schema compatible
        setRequiresMFA(true);
        setMfaEmail(res.email || email);
        setInfoMessage("التحقق الثنائي مطلوب. يرجى إدخال الرمز المرسل إليك.");
        console.log("🔐 [LoginPage] MFA required for user:", res.email);
        logSecurityEvent('MFA_VERIFY_ATTEMPT', `MFA required for user ${res.email}`, true);
      } else {
        // Handle login failures according to schema error types
        const errorMsg = res.message || "بيانات الدخول غير صحيحة";
        setError(errorMsg);
        
        // Schema-compatible error handling
        if (res.detail?.includes("غير مفعل") || res.detail?.includes("not verified") || res.detail?.includes("verification required")) {
          setInfoMessage("البريد الإلكتروني غير مفعل. يرجى التحقق من بريدك الإلكتروني أو إعادة إرسال رابط التحقق.");
          logSecurityEvent('LOGIN_FAILED', 'Email not verified', false);
        } else if (res.detail?.includes("مقفل") || res.detail?.includes("locked")) {
          setError("الحساب مقفل مؤقتًا. حاول مرة أخرى لاحقًا.");
          logSecurityEvent('LOGIN_LOCKOUT', `Account locked for user ${email}`, false, 'WARN');
        } else if (res.detail?.includes("نشط") || res.detail?.includes("inactive")) {
          setError("الحساب غير نشط. يرجى التواصل مع المسؤول.");
          logSecurityEvent('LOGIN_FAILED', 'Account inactive', false);
        } else {
          logSecurityEvent('LOGIN_FAILED', errorMsg, false);
        }
      }
    } catch (err: any) {
      console.error("🔴 [LoginPage] Login error:", err);
      
      // Schema-compatible error logging
      const errorDetail = err.response?.data?.detail || "Login request failed";
      const errorMessage = err.response?.data?.message || "خطأ في تسجيل الدخول";
      
      setError(errorMessage);
      logSecurityEvent('LOGIN_ERROR', `Login error: ${errorDetail}`, false, 'ERROR');
      
      // Enhanced error handling for different scenarios
      if (errorDetail.includes("غير مفعل") || 
          errorDetail.includes("not verified") ||
          errorDetail.includes("verification required")) {
        setInfoMessage("البريد الإلكتروني غير مفعل. يرجى التحقق من بريدك الإلكتروني أو إعادة إرسال رابط التحقق.");
      }
      
      if (errorDetail.includes("مقفل") || 
          errorDetail.includes("locked")) {
        setError("الحساب مقفل مؤقتًا. حاول مرة أخرى لاحقًا.");
      }
      
      if (errorDetail.includes("نشط") || 
          errorDetail.includes("inactive")) {
        setError("الحساب غير نشط. يرجى التواصل مع المسؤول.");
      }
      
      // Handle rate limiting (schema compatible)
      if (err.response?.status === 429) {
        setError("تم تجاوز عدد المحاولات المسموح بها. الرجاء المحاولة بعد بضع دقائق.");
        logSecurityEvent('LOGIN_ATTEMPT', 'Rate limit exceeded', false, 'WARN');
      }
      
      // Handle network errors
      if (!err.response) {
        setError("خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.");
        logSecurityEvent('LOGIN_ERROR', 'Network connection failed', false, 'ERROR');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    if (!mfaCode) {
      setError("يرجى إدخال رمز التحقق الثنائي");
      setIsLoggingIn(false);
      return;
    }

    // Validate MFA code format (6 digits as per schema)
    if (!/^\d{6}$/.test(mfaCode)) {
      setError("رمز التحقق يجب أن يكون 6 أرقام");
      setIsLoggingIn(false);
      return;
    }

    try {
      const clientIP = "unknown";
      const userAgent = navigator.userAgent;

      console.log("🔐 [LoginPage] Verifying MFA code...");
      
      const res = await login(mfaEmail, password, mfaCode, clientIP, userAgent);
      
      if (res.success && res.user) {
        // MFA verification successful - redirect handled by useEffect
        console.log("✅ [LoginPage] MFA verification successful");
        logSecurityEvent('MFA_VERIFY_SUCCESS', 'MFA verification successful', true);
      } else {
        setError(res.message || "رمز التحقق غير صحيح");
        logSecurityEvent('MFA_VERIFY_FAILED', 'Invalid MFA code', false);
      }
    } catch (err: any) {
      console.error("🔴 [LoginPage] MFA verification error:", err);
      const errorMessage = err.response?.data?.message || "خطأ في التحقق الثنائي";
      setError(errorMessage);
      logSecurityEvent('MFA_VERIFY_ERROR', `MFA verification error: ${errorMessage}`, false, 'ERROR');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("يرجى إدخال البريد الإلكتروني لإعادة إرسال رابط التحقق");
      logSecurityEvent('RESEND_VERIFICATION_ERROR', 'Missing email for resend verification', false);
      return;
    }

    if (!validateEmail(email)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      logSecurityEvent('RESEND_VERIFICATION_ERROR', 'Invalid email format for resend verification', false);
      return;
    }

    setIsResending(true);
    setError("");
    setInfoMessage("");

    try {
      console.log("📧 [LoginPage] Resending verification email to:", email);
      
      const res = await resendVerification(email.trim());
      if (res.success) {
        setInfoMessage("تم إرسال رابط التحقق بنجاح. تحقق من بريدك الإلكتروني.");
        logSecurityEvent('RESEND_VERIFICATION_SUCCESS', `Verification email resent to ${email}`, true);
      } else {
        setError(res.message || "فشل إرسال رابط التحقق");
        logSecurityEvent('RESEND_VERIFICATION_FAILED', res.message || 'Failed to resend verification', false);
      }
    } catch (err: any) {
      console.error("🔴 [LoginPage] Resend verification error:", err);
      const errorMessage = err.response?.data?.message || "خطأ في إرسال رابط التحقق";
      setError(errorMessage);
      logSecurityEvent('RESEND_VERIFICATION_ERROR', `Resend verification error: ${errorMessage}`, false, 'ERROR');
    } finally {
      setIsResending(false);
    }
  };

  const backToLogin = () => {
    setRequiresMFA(false);
    setMfaCode("");
    setError("");
    setInfoMessage("");
    logSecurityEvent('MFA_VERIFY_ATTEMPT', 'User returned to login from MFA', true, 'INFO');
  };

  // Show loading state while auth is initializing
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <motion.div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="mr-3 text-gray-600 dark:text-gray-400">جاري التحميل...</span>
      </div>
    );
  }

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
          <motion.img
            src="/logo.png"
            alt="Logo"
            className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-800"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
          />
        </div>

        {/* MFA Verification Form */}
        {requiresMFA ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
              التحقق الثنائي
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

            {infoMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md text-sm text-center"
              >
                {infoMessage}
              </motion.div>
            )}

            <form onSubmit={handleMFAVerification} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  رمز التحقق الثنائي
                </label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456"
                  required
                  maxLength={6}
                  disabled={isLoggingIn}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة الخاص بك
                </p>
              </div>

              <div className="flex space-x-3 space-x-reverse">
                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 font-medium disabled:bg-gray-400"
                  disabled={isLoggingIn}
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></span>
                      جاري التحقق...
                    </>
                  ) : (
                    "تحقق"
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Regular Login Form */
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
              تسجيل الدخول
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

            {infoMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md text-sm text-center"
              >
                {infoMessage}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[\n\r\t"]/g, ""))}
                  className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example@email.com أو username"
                  required
                  autoComplete="username"
                  disabled={isLoggingIn || isResending}
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
                    onChange={(e) => setPassword(e.target.value.replace(/[\n\r\t"]/g, ""))}
                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={isLoggingIn || isResending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                    tabIndex={-1}
                    disabled={isLoggingIn || isResending}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || isResending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors duration-200 font-medium flex items-center justify-center"
              >
                {isLoggingIn ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></span>
                    جاري الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>

              {infoMessage.includes("البريد الإلكتروني غير مفعل") && (
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending || isLoggingIn}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm flex items-center transition-colors duration-200"
                  >
                    {isResending ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></span>
                        جارٍ الإرسال...
                      </>
                    ) : (
                      "إعادة إرسال رابط التحقق"
                    )}
                  </button>
                </div>
              )}

              <div className="text-center mt-4">
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm transition-colors duration-200"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                ليس لديك حساب؟{" "}
                <Link
                  to="/register"
                  className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200"
                >
                  إنشاء حساب جديد
                </Link>
              </p>
            </form>
          </>
        )}

        {/* Development info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 text-center">
            API: {API_BASE_URL}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
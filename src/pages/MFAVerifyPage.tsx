// src/components/MFAVerifyPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface MFAVerifyProps {
  onVerificationSuccess: (token: string) => void;
  onVerificationFail: () => void;
  userId?: number;
  username?: string;
  isLoginFlow?: boolean;
}

const MFAVerifyPage: React.FC<MFAVerifyProps> = ({ 
  onVerificationSuccess, 
  onVerificationFail, 
  userId, 
  username,
  isLoginFlow = true 
}) => {
  const navigate = useNavigate();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recoveryInputRef = useRef<HTMLInputElement>(null);

  const MAX_RETRIES = 5;
  const LOCKOUT_DURATION = 300; // 5 minutes in seconds

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isLocked) {
      setIsLocked(false);
      setRetryCount(0);
    }
  }, [countdown, isLocked]);

  useEffect(() => {
    if (activeStep === 0 && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (isLocked) return;

    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      setError('');

      // الانتقال التلقائي للحقل التالي
      if (value && index < 5) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
      }

      // التحقق التلقائي عند اكتمال الرمز
      if (newCode.every(digit => digit !== '') && index === 5) {
        handleVerification();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').split('').slice(0, 6);
    
    if (numbers.length === 6) {
      const newCode = [...verificationCode];
      numbers.forEach((num, index) => {
        newCode[index] = num;
      });
      setVerificationCode(newCode);
      setError('');
      
      // التركيز على آخر حقل
      setTimeout(() => inputRefs.current[5]?.focus(), 10);
    }
  };

  const handleVerification = async () => {
    if (isLocked) return;

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('الرجاء إدخال رمز مكون من 6 أرقام');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLoginFlow ? '/api/auth/mfa/verify-login' : '/api/auth/mfa/verify';
      const payload = isLoginFlow 
        ? { username, code }
        : { userId, code };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // نجاح التحقق
        await logSecurityEvent('MFA_VERIFY_SUCCESS', 'تم التحقق من المصادقة الثنائية بنجاح', true);
        onVerificationSuccess(data.token || data.accessToken);
      } else {
        // فشل التحقق
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);

        if (newRetryCount >= MAX_RETRIES) {
          await handleLockout();
        } else {
          setError(data.message || `رمز التحقق غير صحيح. لديك ${MAX_RETRIES - newRetryCount} محاولات متبقية`);
          await logSecurityEvent('MFA_VERIFY_FAILED', `فشل التحقق من المصادقة الثنائية. المحاولة: ${newRetryCount}`, false);
        }

        // إعادة تعيين الحقول
        setVerificationCode(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 10);
      }
    } catch (err: any) {
      setError('حدث خطأ في الاتصال. الرجاء المحاولة مرة أخرى');
      await logSecurityEvent('MFA_VERIFY_ERROR', `خطأ في التحقق: ${err.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockout = async () => {
    setIsLocked(true);
    setCountdown(LOCKOUT_DURATION);
    setError(`تم تعليق المحاولات مؤقتًا بسبب كثرة المحاولات الفاشلة. الرجاء الانتظار ${Math.floor(LOCKOUT_DURATION / 60)} دقيقة`);
    
    await logSecurityEvent('MFA_LOCKOUT', `تم تعليق التحقق بسبب ${MAX_RETRIES} محاولات فاشلة`, false);
  };

  const handleRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      setError('الرجاء إدخال رمز الاستعادة');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLoginFlow ? '/api/auth/mfa/recover-login' : '/api/auth/mfa/recover';
      const payload = isLoginFlow 
        ? { username, recoveryCode: recoveryCode.trim() }
        : { userId, recoveryCode: recoveryCode.trim() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // نجاح الاستعادة
        await logSecurityEvent('MFA_RECOVERY_SUCCESS', 'تم الاستعادة باستخدام رمز النسخ الاحتياطي', true);
        onVerificationSuccess(data.token || data.accessToken);
      } else {
        setError(data.message || 'رمز الاستعادة غير صحيح');
        await logSecurityEvent('MFA_RECOVERY_FAILED', 'فشل الاستعادة باستخدام رمز النسخ الاحتياطي', false);
        setRecoveryCode('');
        recoveryInputRef.current?.focus();
      }
    } catch (err: any) {
      setError('حدث خطأ في الاتصال. الرجاء المحاولة مرة أخرى');
      await logSecurityEvent('MFA_RECOVERY_ERROR', `خطأ في الاستعادة: ${err.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  const logSecurityEvent = async (eventType: string, description: string, success: boolean) => {
    try {
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          eventDescription: description,
          userId: isLoginFlow ? undefined : userId,
          username,
          success,
          severity: success ? 'INFO' : 'WARN',
          ipAddress: await getClientIP()
        }),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const getClientIP = async (): Promise<string> => {
    // في تطبيق حقيقي، سيكون هذا من headers الطلب
    return 'client-ip';
  };

  const handleResendCode = async () => {
    if (isLocked) return;

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLoginFlow ? '/api/auth/mfa/resend' : '/api/auth/mfa/resend-setup';
      const payload = isLoginFlow ? { username } : { userId };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setError('تم إرسال رمز تحقق جديد إلى تطبيق المصادقة الخاص بك');
        await logSecurityEvent('MFA_RESEND_SUCCESS', 'تم إعادة إرسال رمز التحقق', true);
      } else {
        setError(data.message || 'فشل في إعادة إرسال الرمز');
        await logSecurityEvent('MFA_RESEND_FAILED', 'فشل في إعادة إرسال رمز التحقق', false);
      }
    } catch (err: any) {
      setError('حدث خطأ في الاتصال. الرجاء المحاولة مرة أخرى');
      await logSecurityEvent('MFA_RESEND_ERROR', `خطأ في إعادة الإرسال: ${err.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleRecoveryMode = () => {
    setShowRecovery(!showRecovery);
    setError('');
    setRecoveryCode('');
    
    if (!showRecovery) {
      setTimeout(() => recoveryInputRef.current?.focus(), 10);
    } else {
      setTimeout(() => inputRefs.current[0]?.focus(), 10);
    }
  };

  const handleCancel = () => {
    if (isLoginFlow) {
      navigate('/login');
    } else {
      onVerificationFail();
    }
  };

  // الخطوات
  const steps = [
    {
      title: 'إدخال رمز التحقق',
      description: 'من تطبيق المصادقة'
    },
    {
      title: 'التحقق',
      description: 'من صحة الرمز'
    }
  ];
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            المصادقة الثنائية
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isLoginFlow 
              ? 'أدخل رمز التحقق من تطبيق المصادقة الخاص بك' 
              : 'أدخل رمز التحقق لتأكيد إعداد المصادقة الثنائية'
            }
          </p>
          {username && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              للمستخدم: <span className="font-semibold">{username}</span>
            </p>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  index <= activeStep
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-gray-500'
                }`}>
                  {index < activeStep ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="font-semibold text-sm">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    index <= activeStep
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 mx-2 mt-5 ${
                  index < activeStep
                    ? 'bg-indigo-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          
          {/* Error/Success Messages */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg border ${
              error.includes('نجاح') || error.includes('تم') && !error.includes('فشل')
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 flex-shrink-0 ${
                  error.includes('نجاح') || error.includes('تم') && !error.includes('فشل')
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`} fill="currentColor" viewBox="0 0 20 20">
                  {error.includes('نجاح') || error.includes('تم') && !error.includes('فشل') ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  )}
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">تم تعليق المحاولات مؤقتًا</p>
                  <p className="text-sm mt-1">يمكنك المحاولة مرة أخرى بعد: <span className="font-mono">{formatTime(countdown)}</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Code Input */}
          {!showRecovery ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  أدخل رمز التحقق
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  قم بفتح تطبيق المصادقة وأدخل الرمز المكون من 6 أرقام
                </p>
              </div>

              {/* Code Input Fields */}
              <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleVerificationCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading || isLocked}
                    className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    dir="ltr"
                  />
                ))}
              </div>

              {/* Auto-submit Info */}
              {verificationCode.every(digit => digit !== '') && !isLoading && (
                <div className="text-center">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                    جاري التحقق تلقائياً...
                  </p>
                </div>
              )}

              {/* Manual Submit Button */}
              <button
                onClick={handleVerification}
                disabled={isLoading || isLocked || verificationCode.some(digit => digit === '')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  'تأكيد الرمز'
                )}
              </button>
            </div>
          ) : (
            /* Recovery Code Input */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  أدخل رمز الاستعادة
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  استخدم أحد رموز النسخ الاحتياطي المكونة من 8 أرقام
                </p>
              </div>

              <div>
                <input
                  ref={recoveryInputRef}
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  disabled={isLoading}
                  placeholder="أدخل رمز الاستعادة المكون من 8 أرقام"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all text-center font-mono disabled:opacity-50"
                  dir="ltr"
                  maxLength={8}
                />
              </div>

              <button
                onClick={handleRecoveryCode}
                disabled={isLoading || !recoveryCode.trim()}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الاستعادة...
                  </>
                ) : (
                  'استخدام رمز الاستعادة'
                )}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            
            {/* Toggle Recovery Mode */}
            <button
              onClick={toggleRecoveryMode}
              disabled={isLoading || isLocked}
              className="w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showRecovery ? 'العودة إلى رمز التحقق' : 'استخدام رمز الاستعادة'}
            </button>

            {/* Resend Code */}
            {!showRecovery && (
              <button
                onClick={handleResendCode}
                disabled={isLoading || isLocked}
                className="w-full py-2 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                إعادة إرسال رمز التحقق
              </button>
            )}

            {/* Cancel */}
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-medium text-sm disabled:opacity-50"
            >
              إلغاء والعودة {isLoginFlow ? 'لتسجيل الدخول' : 'للإعدادات'}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>تلميح:</strong> تأكد من أن وقت هاتفك متزامن مع التوقيت العالمي. 
                  {!showRecovery && ' يمكنك استخدام رموز النسخ الاحتياطي إذا لم يكن هاتفك متاحاً.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              اتصال آمن مشفر
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFAVerifyPage;
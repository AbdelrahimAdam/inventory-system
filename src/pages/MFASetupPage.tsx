// src/pages/MFASetupPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
  userId: number;
  userEmail: string;
}

interface MFAState {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  isVerified: boolean;
  isEnabled: boolean;
}

const MFASetupPage: React.FC<MFASetupProps> = ({ onComplete, onCancel, userId, userEmail }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaState, setMfaState] = useState<MFAState>({
    secret: '',
    qrCodeUrl: '',
    backupCodes: [],
    isVerified: false,
    isEnabled: false
  });
  const [backupCodesViewed, setBackupCodesViewed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(-1);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // الخطوات باللغة العربية
  const steps = [
    {
      title: 'بدء الإعداد',
      description: 'تهيئة المصادقة الثنائية'
    },
    {
      title: 'ربط التطبيق',
      description: 'مسح رمز QR'
    },
    {
      title: 'تأكيد الرمز',
      description: 'إدخال رمز التحقق'
    },
    {
      title: 'حفظ النسخ الاحتياطي',
      description: 'تخزين رموز الاستعادة'
    }
  ];

  // جلب بيانات MFA الأولية
  useEffect(() => {
    initializeMFA();
  }, []);

  // التركيز التلقائي على الحقول
  useEffect(() => {
    if (activeStep === 2 && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [activeStep]);

  const initializeMFA = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setMfaState(data);
        setActiveStep(1);
      } else {
        throw new Error('فشل في إعداد المصادقة الثنائية');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الإعداد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);

      // الانتقال التلقائي للحقل التالي
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
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

  const handleVerification = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('الرجاء إدخال رمز مكون من 6 أرقام');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          code,
          secret: mfaState.secret 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMfaState(prev => ({ ...prev, isVerified: true }));
        setSuccess('تم تفعيل المصادقة الثنائية بنجاح!');
        setActiveStep(3);
      } else {
        throw new Error(data.message || 'رمز التحقق غير صحيح');
      }
    } catch (err: any) {
      setError(err.message || 'فشل في التحقق من الرمز');
      // إعادة تعيين الرمز
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodesViewed = () => {
    setBackupCodesViewed(true);
    // في الواقع، هنا يجب حفظ رموز النسخ الاحتياطي بشكل آمن
  };

  const handleComplete = () => {
    onComplete();
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(-1), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadBackupCodes = () => {
    const content = mfaState.backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${userEmail}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const regenerateBackupCodes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/mfa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setMfaState(prev => ({ ...prev, backupCodes: data.backupCodes }));
        setSuccess('تم إنشاء رموز نسخ احتياطي جديدة');
      } else {
        throw new Error('فشل في إنشاء رموز جديدة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الرموز');
    } finally {
      setIsLoading(false);
    }
  };

  // عرض الخطوات
  const renderStepIndicator = () => (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step Circle */}
            <div className="flex flex-col items-center z-10">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  index <= activeStep
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-gray-500'
                }`}
              >
                {index < activeStep ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${
                  index <= activeStep
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {step.description}
                </div>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-4 mt-6 ${
                  index < activeStep
                    ? 'bg-emerald-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // محتوى الخطوة 1: المقدمة
  const renderStep1 = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          إعداد المصادقة الثنائية
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          المصادقة الثنائية تضيف طبقة إضافية من الأماية لحسابك. 
          ستطلب منك إدخال رمز تحقق من تطبيق المصادقة على هاتفك عند تسجيل الدخول.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-right">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              تنبيه مهم
            </h4>
            <p className="text-amber-700 dark:text-amber-400 text-sm">
              تأكد من حفظ رموز النسخ الاحتياطي في مكان آمن. ستحتاجها إذا فقدت الوصول إلى هاتفك.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center pt-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          إلغاء
        </button>
        <button
          onClick={() => setActiveStep(1)}
          disabled={isLoading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري التهيئة...
            </>
          ) : (
            <>
              بدء الإعداد
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // محتوى الخطوة 2: رمز QR
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ربط تطبيق المصادقة
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          قم بمسح رمز QR باستخدام تطبيق المصادقة مثل Google Authenticator أو Authy
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* QR Code Section */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-white border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              {mfaState.qrCodeUrl ? (
                <QRCodeSVG 
                  value={mfaState.qrCodeUrl} 
                  size={200}
                  level="M"
                  includeMargin
                  className="mx-auto"
                />
              ) : (
                <div className="w-50 h-50 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              أو أدخل المفتاح يدوياً:
            </h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm font-mono break-all">
                {mfaState.secret || 'جاري التحميل...'}
              </code>
              <button
                onClick={() => mfaState.secret && copyToClipboard(mfaState.secret, -2)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="نسخ المفتاح"
              >
                {copiedCode === -2 ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              خطوات الربط
            </h4>
            <ol className="text-blue-800 dark:text-blue-400 text-sm space-y-2 list-decimal list-inside">
              <li>افتح تطبيق المصادقة على هاتفك</li>
              <li>اضغط على إضافة حساب جديد</li>
              <li>قم بمسح رمز QR أعلاه</li>
              <li>أو أدخل المفتاح يدوياً</li>
              <li>احفظ التغييرات في التطبيق</li>
            </ol>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              تطبيقات مقترحة:
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { name: 'Google Authenticator', icon: '🔐' },
                { name: 'Authy', icon: '📱' },
                { name: 'Microsoft Authenticator', icon: '🪪' },
                { name: 'LastPass Authenticator', icon: '🔒' }
              ].map((app, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <span className="text-lg">{app.icon}</span>
                  <span className="text-gray-700 dark:text-gray-300">{app.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveStep(0)}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          رجوع
        </button>
        <button
          onClick={() => setActiveStep(2)}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          التالي
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // محتوى الخطوة 3: التحقق
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          تأكيد الرمز
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {/* Code Input */}
        <div className="flex gap-3 justify-center mb-6">
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
              className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 outline-none transition-all"
              dir="ltr"
            />
          ))}
        </div>

        {/* Auto-submit info */}
        {verificationCode.every(digit => digit !== '') && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              جاري التحقق تلقائياً...
            </p>
          </div>
        )}

        {/* Manual Submit Button */}
        <button
          onClick={handleVerification}
          disabled={isLoading || verificationCode.some(digit => digit === '')}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
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

        {/* Help Text */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            تأكد من أن وقت هاتفك متزامن مع التوقيت العالمي
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveStep(1)}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          رجوع
        </button>
      </div>
    </div>
  );

  // محتوى الخطوة 4: رموز النسخ الاحتياطي
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          تم التفعيل بنجاح!
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          تم تفعيل المصادقة الثنائية بنجاح لحسابك
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-right">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
              رموز النسخ الاحتياطي
            </h4>
            <p className="text-yellow-700 dark:text-yellow-400 text-sm">
              هذه الرموز تستخدم لاستعادة الوصول في حالة فقدان هاتفك. 
              <strong> احفظها في مكان آمن ولا تشاركها مع أحد.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Backup Codes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {mfaState.backupCodes.map((code, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative group"
          >
            <code className="font-mono text-sm text-gray-900 dark:text-white block text-center">
              {code}
            </code>
            <button
              onClick={() => copyToClipboard(code, index)}
              className="absolute top-1 left-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
              title="نسخ الرمز"
            >
              {copiedCode === index ? (
                <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={downloadBackupCodes}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          تحميل الرموز
        </button>
        <button
          onClick={regenerateBackupCodes}
          disabled={isLoading}
          className="px-4 py-2 border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          إنشاء رموز جديدة
        </button>
      </div>

      {/* Confirmation Checkbox */}
      <div className="flex items-center gap-3 justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <input
          type="checkbox"
          id="backupCodesViewed"
          checked={backupCodesViewed}
          onChange={(e) => setBackupCodesViewed(e.target.checked)}
          className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label htmlFor="backupCodesViewed" className="text-sm text-gray-700 dark:text-gray-300">
          لقد قمت بحفظ رموز النسخ الاحتياطي في مكان آمن
        </label>
      </div>

      <div className="flex gap-3 justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveStep(2)}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          رجوع
        </button>
        <button
          onClick={handleComplete}
          disabled={!backupCodesViewed}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          إنهاء الإعداد
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            المصادقة الثنائية
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            حماية إضافية لحسابك في نظام إدارة العطور
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          {/* Step Indicator */}
          {renderStepIndicator()}
          
          {/* Step Content */}
          <div className="mt-8">
            {renderCurrentStep()}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            لمزيد من المساعدة، يرجى التواصل مع الدعم الفني
          </p>
        </div>
      </div>
    </div>
  );
};

export default MFASetupPage;
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield
} from 'lucide-react';

// Validation schema
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'يجب أن تحتوي على حرف كبير، حرف صغير، ورقم'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange'
  });

  const passwordValue = watch('password', '');

  // Check token validity on component mount
  useEffect(() => {
    const checkTokenValidity = async () => {
      if (!token) {
        setTokenValid(false);
        setError('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
        return;
      }

      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();
        
        if (!response.ok || !data.valid) {
          setTokenValid(false);
          setError('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
        } else {
          setTokenValid(true);
        }
      } catch (err) {
        setTokenValid(false);
        setError('حدث خطأ في التحقق من الرابط');
      }
    };

    checkTokenValidity();
  }, [token]);

  // Password strength calculator
  useEffect(() => {
    if (!passwordValue) {
      setPasswordStrength({ score: 0, feedback: '' });
      return;
    }

    let score = 0;
    const feedback = [];

    // Length check
    if (passwordValue.length >= 8) score += 1;
    else feedback.push('8 أحرف على الأقل');

    // Lowercase check
    if (/[a-z]/.test(passwordValue)) score += 1;
    else feedback.push('حرف صغير');

    // Uppercase check
    if (/[A-Z]/.test(passwordValue)) score += 1;
    else feedback.push('حرف كبير');

    // Number check
    if (/\d/.test(passwordValue)) score += 1;
    else feedback.push('رقم');

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(passwordValue)) score += 1;
    else feedback.push('رمز خاص');

    setPasswordStrength({
      score,
      feedback: feedback.length > 0 ? `مطلوب: ${feedback.join('، ')}` : 'قوية'
    });
  }, [passwordValue]);

  const getPasswordStrengthColor = (score: number) => {
    if (score === 0) return 'bg-gray-200';
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score === 0) return { text: 'ضعيفة', color: 'text-gray-600' };
    if (score <= 2) return { text: 'ضعيفة', color: 'text-red-600' };
    if (score <= 3) return { text: 'متوسطة', color: 'text-yellow-600' };
    if (score <= 4) return { text: 'جيدة', color: 'text-blue-600' };
    return { text: 'قوية', color: 'text-green-600' };
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('رابط إعادة التعيين غير صالح');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'فشل في إعادة تعيين كلمة المرور');
      }

      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          replace: true,
          state: { message: 'تم إعادة تعيين كلمة المرور بنجاح' }
        });
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              رابط غير صالح
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.
              يرجى طلب رابط جديد من صفحة نسيت كلمة المرور.
            </p>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
                طلب رابط جديد
              </Link>
              
              <Link
                to="/login"
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              تم إعادة التعيين بنجاح
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              تم إعادة تعيين كلمة المرور الخاصة بك بنجاح.
              يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
            </p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6"
            >
              <p className="text-sm text-green-800 dark:text-green-200">
                سيتم تحويلك تلقائياً إلى صفحة تسجيل الدخول خلال 3 ثوانٍ...
              </p>
            </motion.div>

            <Link
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
                <ArrowRight className="w-5 h-5 rotate-180" />
                الانتقال إلى تسجيل الدخول الآن
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading state while checking token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            جاري التحقق من الرابط...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            يرجى الانتظار أثناء التحقق من صحة رابط إعادة التعيين
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Lock className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            اختر كلمة مرور قوية لحسابك
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* New Password Field */}
            <div className="space-y-3">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right"
              >
                كلمة المرور الجديدة
              </label>
              
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  dir="ltr"
                  className={`block w-full pr-10 pl-12 py-3 border rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="أدخل كلمة المرور الجديدة"
                  autoComplete="new-password"
                  autoFocus
                />

                <button
                  type="button"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {passwordValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">قوة كلمة المرور:</span>
                    <span className={`font-medium ${getPasswordStrengthText(passwordStrength.score).color}`}>
                      {getPasswordStrengthText(passwordStrength.score).text}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>

                  {passwordStrength.feedback && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      {passwordStrength.feedback}
                    </p>
                  )}
                </motion.div>
              )}

              {errors.password && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 text-right"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </motion.p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right"
              >
                تأكيد كلمة المرور
              </label>
              
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  dir="ltr"
                  className={`block w-full pr-10 pl-12 py-3 border rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="أعد إدخال كلمة المرور"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 text-right"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword.message}
                </motion.p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 text-right">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Password Requirements */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-right">
                متطلبات كلمة المرور:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-right">
                <li className="flex items-center justify-end gap-2">
                  <span>• 8 أحرف على الأقل</span>
                </li>
                <li className="flex items-center justify-end gap-2">
                  <span>• حرف كبير واحد على الأقل (A-Z)</span>
                </li>
                <li className="flex items-center justify-end gap-2">
                  <span>• حرف صغير واحد على الأقل (a-z)</span>
                </li>
                <li className="flex items-center justify-end gap-2">
                  <span>• رقم واحد على الأقل (0-9)</span>
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري تعيين كلمة المرور...
                </>
              ) : (
                <>
                  تعيين كلمة المرور
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/login"
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200 text-right">
              <strong>ملاحظة أمنية:</strong> بعد تعيين كلمة المرور الجديدة، سيتم تسجيل خروجك من جميع الأجهزة.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
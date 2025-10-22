import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Mail, 
  ArrowRight, 
  Shield, 
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('البريد الإلكتروني غير صالح')
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, 'تنسيق البريد الإلكتروني غير صالح'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange'
  });

  const emailValue = watch('email');

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response - in real app, this would be your API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('فشل في إرسال رابط إعادة تعيين كلمة المرور');
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              تم إرسال رابط إعادة التعيين
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني:
            </p>
            
            <p className="text-blue-600 dark:text-blue-400 font-medium mb-6 dir-ltr text-center">
              {emailValue}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              يرجى التحقق من بريدك الإلكتروني ومتابعة التعليمات الموجودة في الرسالة لإعادة تعيين كلمة المرور الخاصة بك.
            </p>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-right">
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-right">
                <li className="flex items-center justify-end gap-2">
                  <span>• تحقق من مجلد البريد العشوائي إذا لم تجد الرسالة</span>
                </li>
                <li className="flex items-center justify-end gap-2">
                  <span>• الرابط ساري لمدة 24 ساعة</span>
                </li>
                <li className="flex items-center justify-end gap-2">
                  <span>• اتبع التعليمات في البريد الإلكتروني</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/login"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
                العودة إلى تسجيل الدخول
              </Link>
              
              <button
                onClick={() => setIsSuccess(false)}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                إعادة إرسال الرابط
              </button>
            </div>
          </div>

          {/* Support Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              تحتاج مساعدة؟{' '}
              <a 
                href="mailto:support@company.com" 
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                اتصل بالدعم الفني
              </a>
            </p>
          </div>
        </motion.div>
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
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            نسيت كلمة المرور
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور
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
            {/* Email Field */}
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right"
              >
                البريد الإلكتروني
              </label>
              
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  dir="ltr"
                  className={`block w-full pr-10 pl-4 py-3 border rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="example@company.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {errors.email && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 text-right"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
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
                  جاري الإرسال...
                </>
              ) : (
                <>
                  إرسال رابط إعادة التعيين
                  <ArrowRight className="w-5 h-5 rotate-180" />
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

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 space-y-3"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            لا تتذكر بريدك الإلكتروني؟{' '}
            <a 
              href="mailto:support@company.com" 
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              اتصل بالدعم الفني
            </a>
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-right">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>ملاحظة:</strong> سوف تستلم رابطًا سريًا لإعادة تعيين كلمة المرور. 
              يرجى عدم مشاركته مع أي شخص.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
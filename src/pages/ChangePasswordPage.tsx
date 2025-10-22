import React, { useState } from 'react';
import { 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  KeyIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

const ChangePasswordPage: React.FC = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  // Password strength validation based on database password policy
  const validatePasswordStrength = (password: string) => {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push('• يجب أن تكون 8 أحرف على الأقل');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('• تحتوي على حرف كبير واحد على الأقل');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('• تحتوي على حرف صغير واحد على الأقل');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('• تحتوي على رقم واحد على الأقل');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('• تحتوي على رمز خاص واحد على الأقل (@$!%*?&)');

    return {
      score,
      feedback: feedback.length > 0 ? feedback.join('\n') : 'كلمة مرور قوية'
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'كلمة المرور الحالية مطلوبة';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'كلمة المرور الجديدة مطلوبة';
    } else {
      const strength = validatePasswordStrength(formData.newPassword);
      if (strength.score < 3) {
        newErrors.newPassword = 'كلمة المرور ضعيفة جداً';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'يرجى تأكيد كلمة المرور';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'newPassword') {
      setPasswordStrength(validatePasswordStrength(value));
    }
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // API call that matches your database schema
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordStrength({ score: 0, feedback: '' });
        
        // Log security event according to database schema
        await fetch('/api/security-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('session_token')}`
          },
          body: JSON.stringify({
            event_type: 'PASSWORD_CHANGE',
            event_description: 'تم تغيير كلمة المرور بنجاح',
            success: true,
            severity: 'INFO'
          })
        });

        setTimeout(() => setSuccess(false), 5000);
      } else {
        // Handle different error cases based on database constraints
        if (result.code === 'INVALID_CURRENT_PASSWORD') {
          setErrors({ currentPassword: 'كلمة المرور الحالية غير صحيحة' });
        } else if (result.code === 'PASSWORD_HISTORY') {
          setErrors({ newPassword: 'لا يمكن استخدام كلمة مرور سابقة' });
        } else {
          setErrors({ submit: result.message || 'فشل في تغيير كلمة المرور' });
        }

        // Log failed attempt
        await fetch('/api/security-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('session_token')}`
          },
          body: JSON.stringify({
            event_type: 'PASSWORD_CHANGE_FAILED',
            event_description: `فشل تغيير كلمة المرور: ${result.message}`,
            success: false,
            severity: 'WARN'
          })
        });
      }
    } catch (error) {
      setErrors({ submit: 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.' });
      
      // Log error event
      await fetch('/api/security-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        },
        body: JSON.stringify({
          event_type: 'PASSWORD_CHANGE_ERROR',
          event_description: 'خطأ في تغيير كلمة المرور',
          success: false,
          severity: 'ERROR'
        })
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 2) return 'ضعيفة';
    if (score <= 3) return 'متوسطة';
    return 'قوية';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تغيير كلمة المرور</h1>
          <p className="text-gray-600">قم بتحديث كلمة المرور لحسابك</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center space-x-3 space-x-reverse">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">تم تغيير كلمة المرور بنجاح</span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-apple border border-gray-200 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الحالية
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 rtl-input"
                    placeholder="أدخل كلمة المرور الحالية"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.current ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center space-x-1 space-x-reverse">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>{errors.currentPassword}</span>
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 rtl-input"
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.new ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">قوة كلمة المرور:</span>
                      <span className={`text-sm font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-600' :
                        passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    {passwordStrength.feedback && passwordStrength.score < 4 && (
                      <p className="mt-2 text-xs text-red-600 whitespace-pre-line">{passwordStrength.feedback}</p>
                    )}
                  </div>
                )}
                {errors.newPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center space-x-1 space-x-reverse">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>{errors.newPassword}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 rtl-input"
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.confirm ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center space-x-1 space-x-reverse">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>{errors.confirmPassword}</span>
                  </p>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 space-x-reverse">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 text-sm">{errors.submit}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-l from-blue-600 to-blue-700 text-white py-3 px-4 rounded-2xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري التحديث...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    <KeyIcon className="w-5 h-5" />
                    <span>تغيير كلمة المرور</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex items-start space-x-3 space-x-reverse">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">
                  نوصي باستخدام كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
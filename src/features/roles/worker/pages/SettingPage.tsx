// src/features/roles/worker/pages/SettingPage.tsx
import React, { useState } from "react";
import { useAuth } from '@context/AuthContext';
import { motion } from "framer-motion";

const SettingPage: React.FC = () => {
  const { user, updateUserSettings } = useAuth(); 
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Assuming you have a function for updating settings
      await updateUserSettings({ email, password });
      alert("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      setError("حدث خطأ أثناء حفظ الإعدادات. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="p-6 max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-semibold text-center text-gray-800 dark:text-white mb-8">
        إعدادات الحساب
      </h1>

      {error && (
        <div className="mb-4 text-red-600 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
            placeholder="البريد الإلكتروني"
          />
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            كلمة المرور
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
            placeholder="••••••••"
          />
        </div>

        {/* Save Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 bg-blue-600 text-white font-semibold rounded-md transition-colors ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"}`}
          >
            {loading ? "جارٍ حفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default SettingPage;

// src/pages/supplier/SupplierDashboard.tsx
import React, { useEffect, useState } from 'react';
import SupplierLayout from '../../layouts/SupplierLayout';
import { motion } from 'framer-motion';

const cards = [
  {
    title: 'عدد الشحنات',
    value: '5',
    gradient: 'from-sudanPrimary/10 via-white to-white dark:from-sudanPrimary/10 dark:via-gray-800 dark:to-gray-900',
  },
  {
    title: 'قيد التوصيل',
    value: '2',
    gradient: 'from-yellow-100 via-white to-white dark:from-yellow-500/10 dark:via-gray-800 dark:to-gray-900',
  },
  {
    title: 'مكتملة',
    value: '3',
    gradient: 'from-green-100 via-white to-white dark:from-green-500/10 dark:via-gray-800 dark:to-gray-900',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  hover: { scale: 1.03, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' },
};

const SupplierDashboard = () => {
  const username = 'ليلى';
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SupplierLayout>
      <div
        className="space-y-6 px-4 pt-4 overflow-y-auto h-full scroll-smooth"
        dir="rtl"
        style={{
          background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
          backgroundRepeat: 'no-repeat',
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-sudanPrimary mb-1">
            👋 مرحباً، {username}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            ⏰ الوقت الحالي: {time}
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {cards.map((card, index) => (
            <motion.div
              key={index}
              className={`bg-gradient-to-br ${card.gradient} p-5 rounded-3xl cursor-pointer transition duration-300 select-none`}
              variants={cardVariants}
              whileHover="hover"
              tabIndex={0}
            >
              <h2 className="text-lg font-semibold text-sudanPrimary mb-2">
                {card.title}
              </h2>
              <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
                {card.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 p-4 rounded-xl text-base sm:text-lg mt-6 shadow-inner"
        >
          ✅ جميع الشحنات في حالة جيدة.
        </motion.div>
      </div>
    </SupplierLayout>
  );
};

export default SupplierDashboard;

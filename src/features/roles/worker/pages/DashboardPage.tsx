// src/features/roles/worker/pages/DashboardPage.tsx
import React from "react";
import { motion } from "framer-motion";
import { FaTasks, FaBarcode, FaBoxes } from "react-icons/fa";

const cards = [
  { icon: <FaTasks size={32} />, title: "المهام اليومية", description: "عرض المهام وتنفيذها." },
  { icon: <FaBarcode size={32} />, title: "فحص المنتجات", description: "استخدم الباركود لتحديث البيانات." },
  { icon: <FaBoxes size={32} />, title: "إضافة منتجات", description: "أضف المنتجات الجديدة للمخزون." }
];

const WorkerDashboardPage: React.FC = () => {
  return (
    <div className="p-6 md:p-10" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">لوحة تحكم العامل</h1>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-transform"
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-green-600 dark:text-green-400 mb-4">{card.icon}</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{card.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default WorkerDashboardPage;

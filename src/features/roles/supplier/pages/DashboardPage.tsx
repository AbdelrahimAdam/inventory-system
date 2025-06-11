// src/features/roles/supplier/pages/DashboardPage.tsx
import React from "react";
import { motion } from "framer-motion";
import { FaTruck, FaBoxes, FaFileInvoice } from "react-icons/fa";
import DashboardCard from "../components/DashboardCard";
const cards = [
  { icon: <FaBoxes size={32} />, title: "منتجاتي", description: "إدارة المنتجات وتفاصيلها." },
  { icon: <FaTruck size={32} />, title: "الشحنات", description: "تتبع حالة الشحنات والتسليم." },
  { icon: <FaFileInvoice size={32} />, title: "الفواتير", description: "عرض وتحديث بيانات الفواتير." }
];

const SupplierDashboardPage: React.FC = () => {
  return (
    <div className="p-6 md:p-10" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">لوحة تحكم المورّد</h1>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-transform"
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-orange-500 dark:text-orange-400 mb-4">{card.icon}</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{card.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SupplierDashboardPage;

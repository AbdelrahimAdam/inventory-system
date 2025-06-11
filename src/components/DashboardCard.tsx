// src/components/DashboardCard.tsx
import { motion } from "framer-motion";
import React from "react";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, onClick }) => {
  return (
    <motion.div
      className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl cursor-pointer transform transition duration-300 hover:scale-105 hover:shadow-2xl"
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
    </motion.div>
  );
};

export default DashboardCard;

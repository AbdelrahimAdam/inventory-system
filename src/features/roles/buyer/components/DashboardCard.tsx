// src/features/roles/buyer/components/DashboardCard.tsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
}

const DashboardCard: React.FC<Props> = ({ icon, title, description, link }) => {
  const content = (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-transform"
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="text-purple-600 dark:text-purple-400 mb-4">{icon}</div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </motion.div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};

export default DashboardCard;

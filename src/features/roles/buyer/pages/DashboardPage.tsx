import React, { useEffect, useState } from "react";
import { FaShoppingCart, FaBoxes, FaTruck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import DashboardCard from "../components/DashboardCard";
import SpendAnalytics from "../components/SpendAnalytics";
import PurchaseOrders from "../components/PurchaseOrders";
import { useAuth } from "../../../../context/AuthContext";

const TABS = [
  { key: "home", label: "الرئيسية" },
  { key: "favorites", label: "المفضلة" },
  { key: "history", label: "المحفوظات" },
];

const tabContentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
};

const BuyerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("buyerDashboardActiveTab") || "home";
  });

  useEffect(() => {
    localStorage.setItem("buyerDashboardActiveTab", activeTab);
  }, [activeTab]);

  const allCards = [
    {
      icon: <FaShoppingCart size={32} />,
      title: "الطلبات",
      description: "عرض وتتبع الطلبات.",
      permission: "view_orders",
      link: "/buyer/orders",
    },
    {
      icon: <FaBoxes size={32} />,
      title: "المنتجات",
      description: "استعرض المنتجات المتاحة.",
      permission: "view_products",
      link: "/buyer/products",
    },
    {
      icon: <FaTruck size={32} />,
      title: "المورّدون",
      description: "تعرّف على أفضل المورّدين.",
      permission: "view_suppliers",
      link: "/buyer/suppliers",
    },
  ];

  const hasPermission = (perm: string) => user?.permissions?.includes(perm);

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              {allCards
                .filter((card) => hasPermission(card.permission))
                .map((card, index) => (
                  <DashboardCard
                    key={index}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    link={card.link}
                  />
                ))}
            </div>
            <div className="mt-8">
              <SpendAnalytics />
            </div>
          </>
        );
      case "favorites":
        return (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">المفضلة</h2>
            <p className="text-gray-600 dark:text-gray-300">لا توجد عناصر مفضلة حالياً.</p>
          </div>
        );
      case "history":
        return (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">المحفوظات</h2>
            <PurchaseOrders />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main dir="rtl" className="p-6 md:p-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">لوحة تحكم المشتري</h1>

      <div className="flex space-x-2 space-x-reverse mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
              activeTab === tab.key
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={tabContentVariants.transition}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default BuyerDashboardPage;

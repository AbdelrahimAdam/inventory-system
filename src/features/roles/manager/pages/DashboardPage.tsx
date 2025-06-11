import React, { useEffect, useState, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  PlusCircle,
  PackageCheck,
  Users2,
  FileBarChart2,
  FlaskConical,
  Award,
  Flame
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "./Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

type ItemType = "bottle" | "accessory";

interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  sold?: number;
}

const quickLinks = [
  
];

const cards = [
  {
    icon: <PackageCheck size={32} />,
    title: "إدارة المخزون",
    description: "راقب وحدّث حالة المنتجات داخل النظام.",
  },
  {
    icon: <Users2 size={32} />,
    title: "إدارة المستخدمين",
    description: "أضف أو عدّل صلاحيات الموظفين وسجلاتهم.",
  },
  {
    icon: <FileBarChart2 size={32} />,
    title: "التقارير",
    description: "استعرض تقارير الأداء والمبيعات والمخزون.",
  },
];

const COLORS = ["#2563eb", "#f59e0b"];

const ManagerDashboardPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [view, setView] = useState<"week" | "month">("week");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("inventory") || "[]");
    setInventory(stored);
  }, []);

  const totalGlasses = inventory
    .filter((item) => item.type === "bottle")
    .reduce((acc, item) => acc + item.quantity, 0);

  const totalAccessories = inventory
    .filter((item) => item.type === "accessory")
    .reduce((acc, item) => acc + item.quantity, 0);

  const mostSellingGlass = inventory
    .filter((item) => item.type === "bottle")
    .reduce(
      (max, item) => (item.sold ?? 0) > (max.sold ?? 0) ? item : max,
      { sold: 0 } as InventoryItem
    );

  const salesData = inventory
    .filter((item) => item.sold && item.sold > 0)
    .map((item) => ({
      name: item.name,
      sales: view === "week" ? Math.round((item.sold ?? 0) * 0.25) : item.sold ?? 0,
    }));

  const pieData = [
    {
      name: "زجاجات",
      value: inventory
        .filter((item) => item.type === "bottle")
        .reduce((acc, item) => acc + (item.sold ?? 0), 0),
    },
    {
      name: "إكسسوارات",
      value: inventory
        .filter((item) => item.type === "accessory")
        .reduce((acc, item) => acc + (item.sold ?? 0), 0),
    },
  ];

  return (
    <>
      <Helmet>
        <title>لوحة تحكم المدير - نظام المخزون</title>
        <meta name="description" content="نظرة عامة على أداء النظام والمخزون" />
      </Helmet>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-10">جاري التحميل...</div>}>
          <div className="min-h-screen flex flex-col bg-appleBg text-appleTextPrimary" dir="rtl">
            

            <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
              {/* 🔢 Stats Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                

                

                
              </div>

              {/* 🔧 Management Cards */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                {cards.map((card, index) => (
                  <motion.div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-2xl"
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-blue-600 dark:text-blue-400 mb-4">{card.icon}</div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{card.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
                  </motion.div>
                ))}
              </div>

              {/* 📊 Sales Chart */}
              <motion.div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 space-y-4" whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold text-appleTextPrimary">المبيعات حسب المنتج</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setView("week")} className={`px-3 py-1 rounded-full text-sm font-semibold ${view === "week" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                      أسبوعي
                    </button>
                    <button onClick={() => setView("month")} className={`px-3 py-1 rounded-full text-sm font-semibold ${view === "month" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                      شهري
                    </button>
                  </div>
                </div>

                {salesData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip
                          contentStyle={{ direction: "rtl" }}
                          labelStyle={{ direction: "rtl" }}
                          formatter={(value: number) => [`${value} قطعة`, "المبيعات"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="#2563eb"
                          strokeWidth={3}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-300">لا توجد بيانات مبيعات حالياً</p>
                )}
              </motion.div>

              {/* 🥧 Pie Chart for Type Sales */}
              <motion.div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 space-y-4" whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
                <h2 className="text-2xl font-semibold text-appleTextPrimary">نسبة المبيعات حسب النوع</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`${val} قطعة`, "العدد"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* 🔗 Quick Access Buttons */}
              <div className="space-y-3 max-w-md mx-auto">
                {quickLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    to={link.to}
                    className="block w-full text-center bg-appleAccentBlue hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition"
                  >
                    {link.icon}
                    {link.text}
                  </Link>
                ))}
              </div>
            </main>

            <Footer />
          </div>
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

export default ManagerDashboardPage;

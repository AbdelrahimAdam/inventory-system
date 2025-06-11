import React from "react";
import BuyerLayout from "../../layouts/BuyerLayout";

const BuyerDashboard = () => {
  const username = "محمود"; // Replace with dynamic user info as needed
  const time = new Date().toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-sudanPrimary mb-2">
            👋 أهلاً، {username}
          </h1>
          <p className="text-gray-500 dark:text-gray-300">
            🕒 الوقت الحالي: {time}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-sudanPrimary">
              عدد الطلبات
            </h2>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              12
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-sudanPrimary">
              طلبات قيد التنفيذ
            </h2>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              4
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-sudanPrimary">
              طلبات مكتملة
            </h2>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              8
            </p>
          </div>
        </div>

        <div className="bg-sudanPrimary/10 text-sudanPrimary p-4 rounded-xl mt-6">
          🔔 لا توجد إشعارات جديدة حالياً.
        </div>
      </div>
    </BuyerLayout>
  );
};

export default BuyerDashboard;

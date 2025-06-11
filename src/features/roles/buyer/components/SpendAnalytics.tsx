import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
);

interface PurchaseRequest {
  id: number;
  supplierId: string;
  supplierName: string;
  quantity: number;
  notes?: string;
  date: string;
}

const SpendAnalytics: React.FC = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("purchaseRequests");
    if (raw) {
      try {
        setRequests(JSON.parse(raw));
      } catch {
        console.warn("Invalid purchase request data in localStorage.");
      }
    }
  }, []);

  const stats = useMemo(() => {
    const spendPerSupplier: Record<string, number> = {};
    const monthlyTrends: Record<string, number> = {};

    for (const req of requests) {
      const month = new Date(req.date).toLocaleString("ar-EG", {
        month: "long",
        year: "numeric",
      });

      spendPerSupplier[req.supplierName] =
        (spendPerSupplier[req.supplierName] || 0) + req.quantity;
      monthlyTrends[month] = (monthlyTrends[month] || 0) + req.quantity;
    }

    const avgOrderSize =
      requests.length > 0
        ? (
            requests.reduce((acc, r) => acc + r.quantity, 0) / requests.length
          ).toFixed(2)
        : "0";

    const topSuppliers = Object.entries(spendPerSupplier)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      spendPerSupplier,
      monthlyTrends,
      avgOrderSize,
      topSuppliers,
    };
  }, [requests]);

  const spendData = {
    labels: Object.keys(stats.spendPerSupplier),
    datasets: [
      {
        label: "إجمالي الشراء",
        data: Object.values(stats.spendPerSupplier),
        backgroundColor: "#4f46e5",
        borderRadius: 6,
      },
    ],
  };

  const trendData = {
    labels: Object.keys(stats.monthlyTrends),
    datasets: [
      {
        label: "الشراء الشهري",
        data: Object.values(stats.monthlyTrends),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <section
      dir="rtl"
      className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-8"
      id="analytics-report"
    >
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center">
        تحليلات المشتريات
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            إجمالي الشراء حسب المورد
          </h3>
          <Bar data={spendData} />
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            اتجاه المشتريات الشهرية
          </h3>
          <Line data={trendData} />
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center">
        <p className="text-gray-800 dark:text-gray-100 text-lg">
          متوسط حجم الطلب: <strong>{stats.avgOrderSize}</strong> وحدة / طلب
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
          أفضل 3 موردين
        </h3>
        <ul className="space-y-2 text-gray-800 dark:text-gray-100 font-medium">
          {stats.topSuppliers.length === 0 ? (
            <li className="text-sm text-gray-500">لا يوجد بيانات</li>
          ) : (
            stats.topSuppliers.map(([name, value], idx) => (
              <li key={idx}>
                🏆 {idx + 1}. {name} — {value} وحدة
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
};

export default SpendAnalytics;

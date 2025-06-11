// src/features/roles/buyer/pages/ReportsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
 

interface Report {
  id: number;
  title: string;
  description: string;
  date: string;
}

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch reports when the component mounts
  useEffect(() => {
    const getReports = async () => {
      try {
        const fetchedReports = await fetchReports(); // Replace with your API call
        setReports(fetchedReports);
      } catch (err) {
        setError("فشل تحميل التقارير. حاول مرة أخرى لاحقاً.");
      } finally {
        setLoading(false);
      }
    };

    getReports();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-16 h-16 border-4 border-t-4 border-blue-600 rounded-full animate-spin"
        />
        <p className="mt-4 text-gray-600 dark:text-gray-200">جاري تحميل التقارير...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          التقارير
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{report.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{report.description}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{report.date}</p>
              <button
                onClick={() => navigate(`/buyer/reports/${report.id}`)}
                className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                عرض التقرير
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ReportsPage;

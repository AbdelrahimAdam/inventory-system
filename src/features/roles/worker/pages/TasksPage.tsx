import React, { useState, useEffect } from "react";
import TaskQueue from "../components/TaskQueue";
import { Helmet } from "react-helmet-async";

const TasksPage: React.FC = () => {
  // Simulate loading & error for demo (replace with real API call or context)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Optional: fetch tasks from API or context here
  useEffect(() => {
    // Simulate API delay
    const timer = setTimeout(() => {
      setLoading(false);
      // setError("حدث خطأ في تحميل المهام"); // Uncomment to simulate error
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex justify-center items-center min-h-screen bg-gray-100 p-6"
        role="alert"
        aria-busy="true"
        aria-label="جاري تحميل المهام"
      >
        <p className="text-gray-500 text-lg select-none">جاري تحميل المهام...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir="rtl"
        className="flex justify-center items-center min-h-screen bg-gray-100 p-6"
        role="alert"
        aria-live="assertive"
      >
        <p className="text-red-600 text-lg font-semibold">{error}</p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-100 p-6 flex flex-col items-center"
    >
      <Helmet>
        <title>مهام العامل - مخزن الزجاجات الفارغة</title>
        <meta
          name="description"
          content="صفحة عرض مهام العامل في مخزن الزجاجات الفارغة - متابعة وتنفيذ المهام اليومية."
        />
      </Helmet>

      <h1 className="text-3xl font-bold mb-8 text-gray-900">مهام العامل</h1>

      <div className="w-full max-w-5xl">
        <TaskQueue />
      </div>
    </main>
  );
};

export default TasksPage;

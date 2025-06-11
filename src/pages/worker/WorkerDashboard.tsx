import React from 'react';
import WorkerLayout from '../../layouts/WorkerLayout';

const WorkerDashboard = () => {
  const username = "سامي";
  const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-sudanPrimary mb-2">👋 مرحباً، {username}</h1>
          <p className="text-gray-500 dark:text-gray-300">الوقت الحالي: {time}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "منتجات بالمخزن", count: 126 },
            { title: "تمت معالجتها", count: 17 },
            { title: "معلقة", count: 6 },
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition">
              <h2 className="text-lg font-semibold text-sudanPrimary">{item.title}</h2>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{item.count}</p>
            </div>
          ))}
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl mt-6">
          ⚠️ يوجد منتجات منخفضة المخزون تحتاج إلى متابعة.
        </div>
      </div>
    </WorkerLayout>
  );
};

export default WorkerDashboard;

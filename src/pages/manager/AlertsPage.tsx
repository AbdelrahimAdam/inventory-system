import React, { useEffect, useState } from 'react';

type Item = {
  id: number;
  name: string;
  type: 'زجاجة' | 'إكسسوار';
  quantity: number;
  minThreshold: number;
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Item[]>([]);

  useEffect(() => {
    const storedItems: Item[] = JSON.parse(localStorage.getItem('inventory') || '[]');
    const lowStock = storedItems.filter((item) => item.quantity <= item.minThreshold);
    setAlerts(lowStock);
  }, []);

  return (
    <div className="p-8 text-right">
      <h2 className="text-2xl font-bold mb-6 text-sudanPrimary">🔔 التنبيهات</h2>
      {alerts.length === 0 ? (
        <p className="text-green-600">لا توجد عناصر منخفضة حالياً 🎉</p>
      ) : (
        <table className="min-w-full border text-center bg-white rounded-lg shadow">
          <thead className="bg-red-100">
            <tr>
              <th className="p-2 border">الاسم</th>
              <th className="p-2 border">النوع</th>
              <th className="p-2 border">الكمية الحالية</th>
              <th className="p-2 border">الحد الأدنى</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((item) => (
              <tr key={item.id}>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.type}</td>
                <td className="p-2 border text-red-600 font-bold">{item.quantity}</td>
                <td className="p-2 border">{item.minThreshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AlertsPage;

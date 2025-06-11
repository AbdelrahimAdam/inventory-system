import React from 'react';

const mockData = [
  { id: 1, name: 'زجاجة كلاسيكية 50مل', stock: 120, status: 'متوفر' },
  { id: 2, name: 'زجاجة فاخرة 100مل', stock: 45, status: 'منخفض' },
  { id: 3, name: 'غطاء معدني ذهبي', stock: 0, status: 'منتهي' },
];

const statusColor = {
  متوفر: 'text-green-600',
  منخفض: 'text-yellow-600',
  منتهي: 'text-red-600',
};

const TableSection: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md overflow-x-auto">
      <h3 className="text-lg font-semibold text-purple-700 dark:text-white mb-4">تفاصيل المخزون</h3>
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-purple-100 dark:bg-gray-700">
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">#</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">اسم المنتج</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">الكمية</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {mockData.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.id}</td>
              <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.name}</td>
              <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.stock}</td>
              <td className={`p-2 border-b border-gray-200 dark:border-gray-600 ${statusColor[item.status]}`}>
                {item.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSection;

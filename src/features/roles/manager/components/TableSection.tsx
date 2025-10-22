import React from 'react';

const statusColor = {
  متوفر: 'text-green-600',
  منخفض: 'text-yellow-600',
  منتهي: 'text-red-600',
};

const TableSection = ({ items = [] }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md overflow-x-auto">
      <h3 className="text-lg font-semibold text-purple-700 dark:text-white mb-4">
        تفاصيل المخزون
      </h3>
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-purple-100 dark:bg-gray-700">
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">#</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">الصنف</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">الكود</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">اللون</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">الكراتين</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">في الكرتونة</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">الفردي</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">المورد</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">المكان</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">ملاحظات</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">التاريخ</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">المضافة</th>
            <th className="p-2 border-b border-gray-200 dark:border-gray-600">المتبقية</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{index + 1}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.name}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.code}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.color || '-'}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.cartons}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.per_carton}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.individual}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.supplier || '-'}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.location || '-'}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.notes || '-'}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{formatDate(item.date_added)}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.added_quantity}</td>
                <td className="p-2 border-b border-gray-200 dark:border-gray-600">{item.remaining_quantity}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={13} className="p-4 text-center text-gray-500 dark:text-gray-400">
                لا توجد بيانات
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableSection;

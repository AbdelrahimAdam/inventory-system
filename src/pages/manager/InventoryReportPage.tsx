import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type InventoryItem = {
  id: string;
  name: string;
  type: 'bottle' | 'accessory';
  quantity: number;
  date?: string; // تاريخ الإضافة (اختياري)
};

const InventoryReportPage = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'bottle' | 'accessory'>('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('inventory') || '[]');
    setItems(stored);
    setFilteredItems(stored);
  }, []);

  useEffect(() => {
    let result = items;

    if (filterType !== 'all') {
      result = result.filter((item) => item.type === filterType);
    }

    if (filterDate) {
      result = result.filter((item) => {
        const itemDate = item.date?.split('T')[0];
        return itemDate === filterDate;
      });
    }

    setFilteredItems(result);
  }, [filterType, filterDate, items]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('تقرير المخزون', 105, 15, { align: 'center' });

    autoTable(doc, {
      head: [['اسم المنتج', 'النوع', 'الكمية', 'التاريخ']],
      body: filteredItems.map((item) => [
        item.name,
        item.type === 'bottle' ? 'زجاجة' : 'إكسسوار',
        item.quantity.toString(),
        item.date?.split('T')[0] || 'غير متوفر',
      ]),
      startY: 25,
      styles: {
        font: 'helvetica',
        fontSize: 12,
        halign: 'right',
      },
    });

    doc.save('تقرير_المخزون.pdf');
  };

  return (
    <div className="p-6 text-right" dir="rtl">
      <h1 className="text-2xl font-bold mb-4 text-sudanPrimary">📄 طباعة تقرير المخزون</h1>

      <div className="flex flex-wrap gap-4 items-center mb-6">
        <label className="flex flex-col text-sm text-gray-700">
          📅 التاريخ:
          <input
            type="date"
            className="border p-2 rounded"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col text-sm text-gray-700">
          🗂️ النوع:
          <select
            className="border p-2 rounded"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'bottle' | 'accessory')}
          >
            <option value="all">الكل</option>
            <option value="bottle">زجاجة</option>
            <option value="accessory">إكسسوار</option>
          </select>
        </label>

        <button
          onClick={generatePDF}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          🖨️ طباعة PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 border">المنتج</th>
              <th className="p-2 border">النوع</th>
              <th className="p-2 border">الكمية</th>
              <th className="p-2 border">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  لا توجد بيانات مطابقة.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="text-center hover:bg-gray-50">
                  <td className="p-2 border">{item.name}</td>
                  <td className="p-2 border">{item.type === 'bottle' ? 'زجاجة' : 'إكسسوار'}</td>
                  <td className="p-2 border">{item.quantity}</td>
                  <td className="p-2 border">
                    {item.date?.split('T')[0] || 'غير متوفر'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryReportPage;

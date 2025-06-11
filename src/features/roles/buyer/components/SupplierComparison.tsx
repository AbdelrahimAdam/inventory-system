// src/features/roles/buyer/components/SupplierComparison.tsx
import React from "react";

interface Supplier {
  id: string;
  name: string;
  minOrderQty: number;
  unitPrice: number;
  estimatedShippingDays: number;
}

interface Props {
  selectedSuppliers: Supplier[];
  onRemoveSupplier: (id: string) => void;
}

const SupplierComparison: React.FC<Props> = ({ selectedSuppliers, onRemoveSupplier }) => {
  if (selectedSuppliers.length === 0) {
    return <p className="text-gray-500 text-center py-8">لم يتم تحديد أي مورد للمقارنة.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-lg rounded-xl border border-gray-200" dir="rtl">
      <table className="w-full text-sm text-right text-gray-800 border-collapse">
        <thead>
          <tr className="bg-blue-100 text-blue-900">
            <th className="p-3 border border-gray-200 font-bold">اسم المورد</th>
            <th className="p-3 border border-gray-200 font-bold">سعر الوحدة (ج.م)</th>
            <th className="p-3 border border-gray-200 font-bold">الحد الأدنى للطلب</th>
            <th className="p-3 border border-gray-200 font-bold">مدة الشحن (أيام)</th>
            <th className="p-3 border border-gray-200 font-bold print:hidden">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {selectedSuppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-gray-50 transition">
              <td className="p-3 border border-gray-200 font-medium">{supplier.name}</td>
              <td className="p-3 border border-gray-200">{supplier.unitPrice.toFixed(2)}</td>
              <td className="p-3 border border-gray-200">{supplier.minOrderQty}</td>
              <td className="p-3 border border-gray-200">{supplier.estimatedShippingDays}</td>
              <td className="p-3 border border-gray-200 text-center print:hidden">
                <button
                  onClick={() => onRemoveSupplier(supplier.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  إزالة
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierComparison;

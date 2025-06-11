// src/features/roles/buyer/pages/SuppliersPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import SupplierComparison from "../components/SupplierComparison";
import html2pdf from "html2pdf.js";

const mockSuppliers = [
  { id: "1", name: "مورد القاهرة", minOrderQty: 100, unitPrice: 2.5, estimatedShippingDays: 3 },
  { id: "2", name: "مورد الخرطوم", minOrderQty: 50, unitPrice: 2.8, estimatedShippingDays: 6 },
  { id: "3", name: "مورد الإسكندرية", minOrderQty: 200, unitPrice: 2.4, estimatedShippingDays: 4 },
];

const STORAGE_KEY = "selectedSuppliers";

const SuppliersPage: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const comparisonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelected(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  }, [selected]);

  const toggleSupplier = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedSuppliers = mockSuppliers.filter((s) => selected.includes(s.id));

  const handleDownloadPDF = () => {
    if (!comparisonRef.current) return;

    html2pdf()
      .from(comparisonRef.current)
      .set({
        margin: 0.5,
        filename: "مقارنة_الموردين.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      })
      .save();
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <Helmet>
        <title>دليل الموردين - المشتري</title>
        <meta name="description" content="استعرض قائمة الموردين المعتمدين للمشتريات الخاصة بالزجاجات الفارغة." />
      </Helmet>

      <h1 className="text-3xl font-bold mb-8 text-gray-900">دليل الموردين</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mb-8">
        {mockSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            onClick={() => toggleSupplier(supplier.id)}
            className={`cursor-pointer rounded-xl shadow-md p-4 transition-all ${
              selected.includes(supplier.id)
                ? "bg-blue-50 border-2 border-blue-500"
                : "bg-white hover:shadow-lg"
            }`}
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-2">{supplier.name}</h2>
            <p className="text-sm text-gray-700">الحد الأدنى للطلب: {supplier.minOrderQty}</p>
            <p className="text-sm text-gray-700">سعر الوحدة: {supplier.unitPrice} ج.م</p>
            <p className="text-sm text-gray-700">مدة الشحن: {supplier.estimatedShippingDays} أيام</p>
          </div>
        ))}
      </div>

      {selectedSuppliers.length > 0 && (
        <div className="w-full max-w-6xl space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
            >
              تحميل المقارنة PDF
            </button>
          </div>
          <div ref={comparisonRef}>
            <SupplierComparison
              selectedSuppliers={selectedSuppliers}
              onRemoveSupplier={(id) => setSelected(selected.filter((x) => x !== id))}
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default SuppliersPage;

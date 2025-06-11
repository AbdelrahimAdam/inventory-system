import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NewPurchaseRequestModal from "./NewPurchaseRequestModal";

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  location: string;
}

const mockSuppliers: Supplier[] = [
  {
    id: "1",
    name: "شركة الزجاج العصرية",
    contact: "محمد علي",
    email: "info@glassmodern.sa",
    location: "الرياض، السعودية",
  },
  {
    id: "2",
    name: "مصنع التغليف الفاخر",
    contact: "سارة المنصور",
    email: "contact@packlux.com",
    location: "جدة، السعودية",
  },
  {
    id: "3",
    name: "توريد زجاجات الشرق",
    contact: "عبدالله العتيبي",
    email: "support@eastbottles.com",
    location: "الدمام، السعودية",
  },
];

const SupplierDirectory: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuppliers(mockSuppliers);
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const filtered = suppliers.filter((supplier) =>
    supplier.name.includes(searchTerm) ||
    supplier.contact.includes(searchTerm) ||
    supplier.location.includes(searchTerm)
  );

  return (
    <section dir="rtl" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input
          type="text"
          placeholder="بحث عن مورد..."
          className="p-3 rounded-lg border border-gray-300 shadow-sm w-full sm:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {selectedSupplier && (
          <NewPurchaseRequestModal
            supplier={selectedSupplier}
            onClose={() => setSelectedSupplier(null)}
          />
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-6">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filtered.map((supplier) => (
              <motion.div
                key={supplier.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{supplier.name}</h3>
                <p className="text-gray-700 mb-1">
                  <span className="font-medium">المسؤول: </span>{supplier.contact}
                </p>
                <p className="text-gray-600 text-sm mb-1">
                  <span className="font-medium">البريد: </span>
                  <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                    {supplier.email}
                  </a>
                </p>
                <p className="text-gray-600 text-sm mb-3">
                  <span className="font-medium">الموقع: </span>{supplier.location}
                </p>
                <button
                  onClick={() => setSelectedSupplier(supplier)}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition"
                >
                  طلب شراء جديد
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};

export default SupplierDirectory;

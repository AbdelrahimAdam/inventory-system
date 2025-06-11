import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import EditPurchaseRequestModal, { PurchaseRequest } from "./EditPurchaseRequestModal";

const PurchaseHistory: React.FC = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [editRequest, setEditRequest] = useState<PurchaseRequest | null>(null);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortKey, setSortKey] = useState<"date" | "supplier">("date");

  useEffect(() => {
    const data = localStorage.getItem("purchaseRequests");
    if (data) {
      setRequests(JSON.parse(data));
    }
  }, []);

  const saveRequests = (data: PurchaseRequest[]) => {
    localStorage.setItem("purchaseRequests", JSON.stringify(data));
    setRequests(data);
  };

  const handleDelete = (id: number) => {
    const updated = requests.filter((r) => r.id !== id);
    saveRequests(updated);
  };

  const handleEditSave = (updated: PurchaseRequest) => {
    const updatedList = requests.map((r) => (r.id === updated.id ? updated : r));
    saveRequests(updatedList);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("Helvetica");
    doc.setFontSize(12);
    doc.text("سجل الطلبات", 10, 10);
    filteredRequests.forEach((r, i) => {
      const y = 20 + i * 40;
      doc.text(`المورد: ${r.supplierName}`, 10, y);
      doc.text(`الكمية: ${r.quantity}`, 10, y + 10);
      doc.text(`ملاحظات: ${r.notes || "-"}`, 10, y + 20);
      doc.text(`التاريخ: ${new Date(r.date).toLocaleString("ar-EG")}`, 10, y + 30);
    });
    doc.save("سجل_الطلبات.pdf");
  };

  const downloadCSV = () => {
    const csv = Papa.unparse({
      fields: ["المورد", "الكمية", "ملاحظات", "التاريخ"],
      data: filteredRequests.map((r) => [
        r.supplierName,
        r.quantity,
        r.notes || "",
        new Date(r.date).toLocaleString("ar-EG"),
      ]),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "سجل_الطلبات.csv");
  };

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortKey === "supplier") {
      return a.supplierName.localeCompare(b.supplierName, "ar");
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const filteredRequests = sortedRequests.filter((r) =>
    [r.supplierName, r.notes].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const currentRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <section dir="rtl" className="mt-10 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-right">سجل الطلبات</h2>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <input
          type="text"
          placeholder="ابحث عن مورد أو ملاحظة..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:max-w-sm border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2">
          <button onClick={downloadPDF} className="bg-blue-600 text-white px-4 py-1 rounded-lg">
            تحميل PDF
          </button>
          <button onClick={downloadCSV} className="bg-green-600 text-white px-4 py-1 rounded-lg">
            تحميل CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2">
          <label className="text-sm text-gray-600">عدد العناصر:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            {[3, 6, 9, 12].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <label className="text-sm text-gray-600">ترتيب حسب:</label>
          <select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as "date" | "supplier");
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            <option value="date">تاريخ الطلب</option>
            <option value="supplier">اسم المورد</option>
          </select>
        </div>
      </div>

      {currentRequests.length === 0 ? (
        <p className="text-center text-gray-500">لا توجد نتائج مطابقة.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {currentRequests.map((request) => (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    المورد: {request.supplierName}
                  </h3>
                  <p className="text-sm text-gray-700 mb-1">
                    الكمية المطلوبة: <span className="font-medium">{request.quantity}</span>
                  </p>
                  {request.notes && (
                    <p className="text-sm text-gray-600 mb-1">ملاحظات: {request.notes}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-3">
                    التاريخ: {new Date(request.date).toLocaleString("ar-EG")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditRequest(request)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded-lg"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg"
                    >
                      حذف
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded-lg"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i + 1)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded-lg"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}

      {editRequest && (
        <EditPurchaseRequestModal
          request={editRequest}
          onClose={() => setEditRequest(null)}
          onSave={handleEditSave}
        />
      )}
    </section>
  );
};

export default PurchaseHistory;

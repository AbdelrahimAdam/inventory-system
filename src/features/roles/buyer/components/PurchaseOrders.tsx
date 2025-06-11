import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Helmet } from "react-helmet-async";
import LoadingSpinner from "../../../../components/LoadingSpinner";

interface PurchaseOrder {
  id: number;
  productName: string;
  supplierName: string;
  quantity: number;
  notes?: string;
  date: string;
  status: "نشط" | "ملغي";
}

const ITEMS_PER_PAGE = 5;

const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteId, setShowDeleteId] = useState<number | null>(null);
  const [showDetailsId, setShowDetailsId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [newOrder, setNewOrder] = useState<PurchaseOrder>({
    id: Date.now(),
    productName: "",
    supplierName: "",
    quantity: 1,
    notes: "",
    date: new Date().toISOString().split("T")[0],
    status: "نشط",
  });

  useEffect(() => {
    setTimeout(() => {
      setOrders([
        {
          id: 1,
          productName: "زجاجة عطر 100مل",
          supplierName: "شركة العطور",
          quantity: 100,
          notes: "أولوية عالية",
          date: "2024-04-01",
          status: "نشط",
        },
        {
          id: 2,
          productName: "رأس بخاخ",
          supplierName: "مورد الرؤوس",
          quantity: 200,
          notes: "",
          date: "2024-04-15",
          status: "نشط",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const pagedOrders = orders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddOrder = () => {
    setOrders((prev) => [{ ...newOrder, id: Date.now() }, ...prev]);
    resetForm();
  };

  const handleUpdateOrder = () => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === editId ? { ...order, ...newOrder } : order
      )
    );
    resetForm();
  };

  const handleDeleteOrder = () => {
    if (showDeleteId !== null) {
      setOrders((prev) => prev.filter((order) => order.id !== showDeleteId));
      setShowDeleteId(null);
    }
  };

  const handleCancelOrder = (id: number) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: "ملغي" } : order
      )
    );
  };

  const resetForm = () => {
    setNewOrder({
      id: Date.now(),
      productName: "",
      supplierName: "",
      quantity: 1,
      notes: "",
      date: new Date().toISOString().split("T")[0],
      status: "نشط",
    });
    setEditId(null);
  };

  const startEdit = (order: PurchaseOrder) => {
    setNewOrder(order);
    setEditId(order.id);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 bg-white rounded shadow-md text-right" dir="rtl">
      <Helmet>
        <title>طلبات الشراء - المشتري</title>
        <meta name="description" content="إدارة طلبات الشراء للمستخدم المشتري" />
      </Helmet>

      <h2 className="text-2xl font-bold mb-4">طلبات الشراء</h2>

      {/* Order Form */}
      <div className="bg-gray-50 p-4 mb-6 rounded shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border p-2 rounded"
            placeholder="اسم المنتج"
            value={newOrder.productName}
            onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="اسم المورد"
            value={newOrder.supplierName}
            onChange={(e) => setNewOrder({ ...newOrder, supplierName: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            type="number"
            placeholder="الكمية"
            value={newOrder.quantity}
            onChange={(e) =>
              setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) })
            }
          />
          <input
            className="border p-2 rounded"
            type="date"
            value={newOrder.date}
            onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
          />
          <textarea
            className="border p-2 rounded col-span-1 md:col-span-2"
            placeholder="ملاحظات"
            value={newOrder.notes}
            onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
          />
        </div>
        <div className="mt-4">
          {editId ? (
            <button
              onClick={handleUpdateOrder}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              تحديث الطلب
            </button>
          ) : (
            <button
              onClick={handleAddOrder}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              إضافة طلب
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">اسم المنتج</th>
              <th className="border p-2">اسم المورد</th>
              <th className="border p-2">الكمية</th>
              <th className="border p-2">الملاحظات</th>
              <th className="border p-2">تاريخ الطلب</th>
              <th className="border p-2">الحالة</th>
              <th className="border p-2">الخيارات</th>
            </tr>
          </thead>
          <tbody>
            {pagedOrders.map((order, index) => (
              <tr key={order.id} className="text-center">
                <td className="border p-2">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td className="border p-2">{order.productName}</td>
                <td className="border p-2">{order.supplierName}</td>
                <td className="border p-2">{order.quantity}</td>
                <td className="border p-2">{order.notes || "-"}</td>
                <td className="border p-2">{order.date}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-white text-sm ${
                      order.status === "نشط" ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="border p-2 space-x-2 space-x-reverse">
                  {order.status === "نشط" && editId !== order.id && (
                    <>
                      <button
                        onClick={() => startEdit(order)}
                        className="text-blue-600 hover:text-blue-800"
                        aria-label={`تعديل طلب رقم ${order.id}`}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => setShowDeleteId(order.id)}
                        className="text-red-600 hover:text-red-800"
                        aria-label={`حذف طلب رقم ${order.id}`}
                      >
                        <FaTrash />
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-yellow-600 hover:text-yellow-800"
                        aria-label={`إلغاء طلب رقم ${order.id}`}
                      >
                        إلغاء
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowDetailsId(order.id)}
                    className="text-gray-600 hover:text-black"
                    aria-label={`عرض تفاصيل طلب رقم ${order.id}`}
                  >
                    <FaEye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-center items-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={`px-3 py-1 rounded ${
              currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Delete Confirmation */}
      {showDeleteId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <p className="mb-4 text-lg font-semibold">هل أنت متأكد من حذف هذا الطلب؟</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleDeleteOrder}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setShowDeleteId(null)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            {(() => {
              const order = orders.find((o) => o.id === showDetailsId);
              if (!order) return null;
              return (
                <>
                  <h3 className="text-xl font-bold mb-4">تفاصيل الطلب</h3>
                  <p><strong>المنتج:</strong> {order.productName}</p>
                  <p><strong>المورد:</strong> {order.supplierName}</p>
                  <p><strong>الكمية:</strong> {order.quantity}</p>
                  <p><strong>الملاحظات:</strong> {order.notes || "لا توجد"}</p>
                  <p><strong>التاريخ:</strong> {order.date}</p>
                  <p>
                    <strong>الحالة:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded text-white ${
                        order.status === "نشط" ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {order.status}
                    </span>
                  </p>
                  <button
                    onClick={() => setShowDetailsId(null)}
                    className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إغلاق
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;

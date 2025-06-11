import React, { useState } from "react";
import { Dialog } from "@headlessui/react";

interface Props {
  supplier: {
    id: string;
    name: string;
  };
  onClose: () => void;
}

const NewPurchaseRequestModal: React.FC<Props> = ({ supplier, onClose }) => {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRequest = {
      id: Date.now(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      quantity: Number(quantity),
      notes,
      date: new Date().toISOString(),
    };

    // Get existing requests from localStorage
    const existing = JSON.parse(localStorage.getItem("purchaseRequests") || "[]");

    // Check for duplicates by supplierId
    const duplicate = existing.find((req: any) => req.supplierId === supplier.id);
    if (duplicate) {
      alert("⚠️ يوجد بالفعل طلب مفتوح لهذا المورد.");
      return;
    }

    // Save to localStorage
    localStorage.setItem("purchaseRequests", JSON.stringify([...existing, newRequest]));

    // TODO: Sync with backend later
    console.log("✅ سيتم إرسال الطلب لاحقاً إلى الخادم:", newRequest);

    alert("✅ تم إرسال الطلب بنجاح!");
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      dir="rtl"
    >
      <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4 shadow-2xl">
        <Dialog.Title className="text-xl font-bold text-gray-800 text-center">
          طلب شراء جديد
        </Dialog.Title>
        <p className="text-sm text-gray-600 text-center">
          إلى المورد: <strong>{supplier.name}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">الكمية المطلوبة</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">ملاحظات</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تفاصيل إضافية (اختياري)"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between gap-4 mt-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full"
            >
              إرسال الطلب
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg w-full"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};

export default NewPurchaseRequestModal;

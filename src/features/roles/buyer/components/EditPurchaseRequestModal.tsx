import React, { useState, useEffect } from "react";

interface EditPurchaseRequestModalProps {
  request: PurchaseRequest | null;
  onClose: () => void;
  onSave: (updated: PurchaseRequest) => void;
}

export interface PurchaseRequest {
  id: number;
  supplierId: string;
  supplierName: string;
  quantity: string;
  notes: string;
  date: string;
  synced?: boolean;
}

const EditPurchaseRequestModal: React.FC<EditPurchaseRequestModalProps> = ({
  request,
  onClose,
  onSave,
}) => {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (request) {
      setQuantity(request.quantity);
      setNotes(request.notes || "");
    }
  }, [request]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    const updated = {
      ...request,
      quantity,
      notes,
      date: new Date().toISOString(),
      synced: false,
    };

    onSave(updated);
    onClose();
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" dir="rtl">
        <h2 className="text-xl font-bold text-right mb-4">تعديل الطلب</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">الكمية المطلوبة</label>
            <input
              type="text"
              className="w-full border rounded-lg p-2"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">ملاحظات</label>
            <textarea
              className="w-full border rounded-lg p-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded-lg">
              إلغاء
            </button>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg">
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPurchaseRequestModal;

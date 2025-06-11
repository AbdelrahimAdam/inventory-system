import React, { useState } from "react";
import BarcodeScanner from "../components/BarcodeScanner";
import { useInventory } from '../../context/InventoryContext';

const ScanPage: React.FC = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const { scannedItem, handleBarcode } = useInventory();

  return (
    <div className="p-6">
      <button
        onClick={() => setScannerOpen(true)}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
      >
        افتح الماسح
      </button>

      {scannedItem ? (
        <div className="mt-4 text-gray-800 dark:text-white space-y-2">
          <h2 className="text-xl font-bold">النتيجة:</h2>
          <p>الاسم: <strong>{scannedItem.name}</strong></p>
          <p>الكمية في المخزون: {scannedItem.quantity}</p>
          <p>الباركود: {scannedItem.barcode}</p>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">لم يتم العثور على عنصر.</p>
      )}

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcode}
      />
    </div>
  );
};

export default ScanPage;

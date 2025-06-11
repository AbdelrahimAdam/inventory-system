import React, { createContext, useContext, useState } from "react";

interface Item {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
}

interface InventoryContextType {
  scannedItem: Item | null;
  handleBarcode: (code: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const mockInventory: Item[] = [
  { id: "1", name: "زجاجة 50مل", barcode: "1234567890", quantity: 10 },
  { id: "2", name: "غطاء ذهبي", barcode: "0987654321", quantity: 5 },
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scannedItem, setScannedItem] = useState<Item | null>(null);

  const handleBarcode = (code: string) => {
    const item = mockInventory.find((item) => item.barcode === code);
    setScannedItem(item ?? null);
  };

  return (
    <InventoryContext.Provider value={{ scannedItem, handleBarcode }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
};

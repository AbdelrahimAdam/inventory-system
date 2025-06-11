// src/components/InventoryCard.tsx
import React from "react";

interface InventoryCardProps {
  name: string;
  quantity: number;
  type: "bottle" | "accessory";
}

const InventoryCard: React.FC<InventoryCardProps> = ({ name, quantity, type }) => {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-right" dir="rtl">
      <h3 className="text-lg font-bold text-gray-800">
        {type === "bottle" ? "زجاجة" : "إكسسوار"}: {name}
      </h3>
      <p className="text-sm text-gray-600">الكمية المتوفرة: {quantity}</p>
    </div>
  );
};

export default InventoryCard;

// src/features/roles/supplier/components/ShipmentTracker.tsx
import React from "react";
import { motion } from "framer-motion";
import { IoMdCheckmarkCircle } from "react-icons/io";
import { FaTruck } from "react-icons/fa";

interface Shipment {
  id: string;
  status: "in-transit" | "delivered" | "pending";
  destination: string;
  estimatedArrival: string;
}

interface ShipmentTrackerProps {
  shipments: Shipment[];
}

const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({ shipments }) => {
  return (
    <div className="space-y-4">
      {shipments.map((shipment) => (
        <motion.div
          key={shipment.id}
          className="bg-white shadow-lg rounded-lg p-6 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{shipment.destination}</h3>
            <div className="text-sm text-gray-600">{shipment.estimatedArrival}</div>
          </div>
          <div className="flex items-center space-x-2">
            {shipment.status === "in-transit" && (
              <FaTruck className="text-yellow-600" size={24} />
            )}
            {shipment.status === "delivered" && (
              <IoMdCheckmarkCircle className="text-green-600" size={24} />
            )}
            {shipment.status === "pending" && (
              <div className="text-gray-400">قيد الانتظار</div>
            )}
            <div className={`text-sm ${shipment.status === "delivered" ? "text-green-600" : "text-yellow-600"}`}>
              {shipment.status === "in-transit" && "جارِ الشحن"}
              {shipment.status === "delivered" && "تم التوصيل"}
              {shipment.status === "pending" && "قيد الانتظار"}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ShipmentTracker;

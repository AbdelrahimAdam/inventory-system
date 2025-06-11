// src/features/roles/supplier/pages/ShipmentsPage.tsx
import React, { useState, useEffect } from "react";
import ShipmentTracker from "../components/ShipmentTracker";
import { motion } from "framer-motion";

// Sample data for shipments
const sampleShipments = [
  {
    id: "1",
    status: "in-transit",
    destination: "الرياض",
    estimatedArrival: "2025-05-30",
  },
  {
    id: "2",
    status: "delivered",
    destination: "جدة",
    estimatedArrival: "2025-05-22",
  },
  {
    id: "3",
    status: "pending",
    destination: "الدمام",
    estimatedArrival: "2025-06-15",
  },
];

const ShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState(sampleShipments);

  useEffect(() => {
    // Simulate fetching data from an API or local storage
    // You can replace this with actual API calls
    setShipments(sampleShipments);
  }, []);

  return (
    <motion.div
      className="p-6 bg-gray-100 min-h-screen space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-center text-gray-800">تتبع الشحنات</h1>
      <ShipmentTracker shipments={shipments} />
    </motion.div>
  );
};

export default ShipmentsPage;

// src/features/roles/buyer/pages/OrdersPage.tsx
import React from "react";
import PurchaseOrders from "../components/PurchaseOrders";

const OrdersPage: React.FC = () => {
  return (
    <main className="p-6 bg-gray-100 min-h-screen" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">طلبات الشراء</h1>
      <PurchaseOrders />
    </main>
  );
};

export default OrdersPage;

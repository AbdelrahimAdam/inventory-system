import React, { createContext, useContext, useState } from 'react';

interface Order {
  id: string;
  supplier: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  orderDate: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface OrdersContextType {
  orders: Order[];
  suppliers: string[];
  createOrder: (supplier: string, items: Omit<OrderItem, 'unitPrice'>[]) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers] = useState(['Supplier A', 'Supplier B', 'Supplier C']);

  const fetchOrders = async () => {
    // Simulate API call
    setOrders([
      {
        id: '1',
        supplier: 'Supplier A',
        items: [
          { productId: '1', quantity: 10, unitPrice: 12.99 },
          { productId: '2', quantity: 5, unitPrice: 24.50 }
        ],
        total: 259.90,
        status: 'pending',
        orderDate: '2023-05-20'
      }
    ]);
  };

  const createOrder = async (supplier: string, items: Omit<OrderItem, 'unitPrice'>[]) => {
    // In a real app, this would call your API
    const newOrder: Order = {
      id: Math.random().toString(36).substring(2, 9),
      supplier,
      items: items.map(item => ({ ...item, unitPrice: 0 })), // Would get real prices from API
      total: 0, // Would be calculated
      status: 'pending',
      orderDate: new Date().toISOString().split('T')[0]
    };
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  };

  const cancelOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  return (
    <OrdersContext.Provider value={{ orders, suppliers, createOrder, cancelOrder, fetchOrders }}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};
import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

const DashboardPage = lazy(() => import('./DashboardPage'));
const ProductsPage = lazy(() => import('./ProductsPage'));
const OrdersPage = lazy(() => import('./OrdersPage'));

const SupplierPages: React.FC = () => (
  <Routes>
    <Route index element={<DashboardPage />} />
    <Route path="products" element={<ProductsPage />} />
    <Route path="orders" element={<OrdersPage />} />
  </Routes>
);

export default SupplierPages;
import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

const DashboardPage = lazy(() => import('./DashboardPage'));
const OrdersPage = lazy(() => import('./OrdersPage'));
const SuppliersPage = lazy(() => import('./SuppliersPage'));

const BuyerPages: React.FC = () => (
  <Routes>
    <Route index element={<DashboardPage />} />
    <Route path="orders" element={<OrdersPage />} />
    <Route path="suppliers" element={<SuppliersPage />} />
  </Routes>
);

export default BuyerPages;
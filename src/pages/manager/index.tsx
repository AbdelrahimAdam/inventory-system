import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

// Lazy-loaded manager pages
const DashboardPage = lazy(() => import('./DashboardPage'));
const InventoryPage = lazy(() => import('./InventoryPage'));
const ReportsPage = lazy(() => import('./ReportsPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

const ManagerPages: React.FC = () => (
  <Routes>
    <Route index element={<DashboardPage />} />
    <Route path="inventory" element={<InventoryPage />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="settings" element={<SettingsPage />} />
  </Routes>
);

export default ManagerPages;
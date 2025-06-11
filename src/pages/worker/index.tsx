import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

const DashboardPage = lazy(() => import('./DashboardPage'));
const TasksPage = lazy(() => import('./TasksPage'));
const ScanPage = lazy(() => import('./ScanPage'));
const InventoryPage = lazy(() => import('./InventoryPage'));

const WorkerPages: React.FC = () => (
  <Routes>
    <Route index element={<DashboardPage />} />
    <Route path="tasks" element={<TasksPage />} />
    <Route path="scan" element={<ScanPage />} />
    <Route path="inventory" element={<InventoryPage />} />
  </Routes>
);

export default WorkerPages;
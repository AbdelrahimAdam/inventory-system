import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import LoadingSpinner from "./components/LoadingSpinner";
import {
  LoginPage,
  RegisterPage,
  UnauthorizedPage,
  NotFoundPage,
  RoleBasedRedirect,
  UnifiedLayout,
  ManagerDashboard,
  UsersPage,
  InventoryPage,
  InventoryReportPage,
  ManagerReports,
  AlertsPage,
  ManagerSettings,
  AddItemPage,
  DispatchFactoryPage,
  DispatchExternalPage,
  SearchEditPage,
  ViewStockPage,
  DeleteFromStockPage,
  DeleteFromFactoryPage,
  DeleteFromExternalPage,
  TransferToPrintPage,
  FactoryReturnPage,
  PrintStockManager,
  AccessoriesViewStockPage,
  MonofyaAddItemPage,
  MonofyaViewStockPage,
  SupplierDashboard,
  ProductsPage,
  ShipmentsPage,
  WorkerDashboard,
  TasksPage,
  ScanPage,
  WorkerReports,
  WorkerSettings,
  BuyerDashboard,
  BuyerOrders,
  BuyerSuppliers,
  BuyerReports,
  BuyerSettings,
} from "./App";

import RequireRole from "./components/RequireRole";
import { ROLES } from "./utils/constants";

const PageTransitionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const AppContent: React.FC = () => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // ✅ Prevent rendering until auth state is initialized
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className={["bg-gray-100 dark:bg-gray-950"].join(" ")} dir="rtl">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/login" element={<PageTransitionWrapper><LoginPage /></PageTransitionWrapper>} />
          <Route path="/register" element={<PageTransitionWrapper><RegisterPage /></PageTransitionWrapper>} />
          <Route path="/unauthorized" element={<PageTransitionWrapper><UnauthorizedPage /></PageTransitionWrapper>} />
          <Route path="/" element={<PageTransitionWrapper><RoleBasedRedirect /></PageTransitionWrapper>} />

          {/* Manager */}
          <Route
            path="/manager/*"
            element={
              <RequireRole allowedRoles={[ROLES.MANAGER]}>
                <UnifiedLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory-report" element={<InventoryReportPage />} />
            <Route path="reports" element={<ManagerReports />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="settings" element={<ManagerSettings />} />
            {/* Inventory nested routes */}
            <Route path="main-inventory/add-item" element={<AddItemPage />} />
            <Route path="main-inventory/dispatch/dispatch-factory" element={<DispatchFactoryPage />} />
            <Route path="main-inventory/dispatch/dispatch-external" element={<DispatchExternalPage />} />
            <Route path="main-inventory/search-edit" element={<SearchEditPage />} />
            <Route path="main-inventory/view-stock" element={<ViewStockPage />} />
            <Route path="main-inventory/delete-from-stock" element={<DeleteFromStockPage />} />
            <Route path="main-inventory/delete-from-factory" element={<DeleteFromFactoryPage />} />
            <Route path="main-inventory/delete-from-external" element={<DeleteFromExternalPage />} />
            <Route path="main-inventory/transfer-to-print" element={<TransferToPrintPage />} />
            <Route path="main-inventory/factory-return" element={<FactoryReturnPage />} />
            <Route path="monofya/view-stock" element={<MonofyaViewStockPage />} />
            <Route path="print/manager" element={<PrintStockManager />} />
            <Route path="accessories/view-stock" element={<AccessoriesViewStockPage />} />
            <Route path="monofya/add-item" element={<MonofyaAddItemPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Supplier */}
          <Route
            path="/supplier/*"
            element={
              <RequireRole allowedRoles={[ROLES.SUPPLIER]}>
                <UnifiedLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SupplierDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Worker */}
          <Route
            path="/worker/*"
            element={
              <RequireRole allowedRoles={[ROLES.WORKER]}>
                <UnifiedLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="reports" element={<WorkerReports />} />
            <Route path="settings" element={<WorkerSettings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Buyer */}
          <Route
            path="/buyer/*"
            element={
              <RequireRole allowedRoles={[ROLES.BUYER]}>
                <UnifiedLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<BuyerDashboard />} />
            <Route path="orders" element={<BuyerOrders />} />
            <Route path="suppliers" element={<BuyerSuppliers />} />
            <Route path="reports" element={<BuyerReports />} />
            <Route path="settings" element={<BuyerSettings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Not found */}
          <Route path="*" element={<PageTransitionWrapper><NotFoundPage /></PageTransitionWrapper>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default AppContent;

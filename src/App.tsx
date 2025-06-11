// App.tsx
import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";

import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import RequireRole from "./components/RequireRole";
import OfflineBanner from "./components/OfflineBanner";
import { ROLES } from "./utils/constants";
import { AuthProvider } from "./context/AuthContext";

// === Lazy-loaded Pages ===
// Public
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const RoleBasedRedirect = lazy(() => import("./pages/RoleBasedRedirect"));
const UnifiedLayout = lazy(() => import("./layouts/UnifiedLayout"));

// Manager
const ManagerDashboard = lazy(() => import("./features/roles/manager/pages/DashboardPage"));
const UsersPage = lazy(() => import("./features/roles/manager/pages/UsersPage"));
const InventoryPage = lazy(() => import("./features/roles/manager/pages/InventoryPage"));
const InventoryReportPage = lazy(() => import("./features/roles/manager/pages/InventoryReportPage"));
const AddItemPage = lazy(() => import("./features/roles/manager/pages/AddItemPage"));
const ManagerReports = lazy(() => import("./features/roles/manager/pages/ReportsPage"));
const AlertsPage = lazy(() => import("./features/roles/manager/pages/AlertsPage"));
const ManagerSettings = lazy(() => import("./features/roles/manager/pages/SettingPage"));

// Supplier
const SupplierDashboard = lazy(() => import("./features/roles/supplier/pages/DashboardPage"));
const ProductsPage = lazy(() => import("./features/roles/supplier/pages/ProductsPage"));
const ShipmentsPage = lazy(() => import("./features/roles/supplier/pages/ShipmentsPage"));

// Worker
const WorkerDashboard = lazy(() => import("./features/roles/worker/pages/DashboardPage"));
const TasksPage = lazy(() => import("./features/roles/worker/pages/TasksPage"));
const ScanPage = lazy(() => import("./features/roles/worker/pages/ScanPage"));
const WorkerReports = lazy(() => import("./features/roles/worker/pages/ReportsPage"));
const WorkerSettings = lazy(() => import("./features/roles/worker/pages/SettingPage"));

// Buyer
const BuyerDashboard = lazy(() => import("./features/roles/buyer/pages/DashboardPage"));
const BuyerOrders = lazy(() => import("./features/roles/buyer/pages/OrdersPage"));
const BuyerSuppliers = lazy(() => import("./features/roles/buyer/pages/SuppliersPage"));
const BuyerReports = lazy(() => import("./features/roles/buyer/pages/ReportsPage"));
const BuyerSettings = lazy(() => import("./features/roles/buyer/pages/SettingPage"));

// === Page Transition Wrapper ===
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

// === App Routes ===
const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  return (
    <div className={isAuthPage ? "" : "bg-gray-100 dark:bg-gray-950"} dir="rtl">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/login" element={<PageTransitionWrapper><LoginPage /></PageTransitionWrapper>} />
          <Route path="/register" element={<PageTransitionWrapper><RegisterPage /></PageTransitionWrapper>} />
          <Route path="/unauthorized" element={<PageTransitionWrapper><UnauthorizedPage /></PageTransitionWrapper>} />
          <Route path="/" element={<PageTransitionWrapper><RoleBasedRedirect /></PageTransitionWrapper>} />

          {/* Manager Routes */}
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
            <Route path="add-item" element={<AddItemPage />} />
            <Route path="reports" element={<ManagerReports />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="settings" element={<ManagerSettings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Supplier Routes */}
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

          {/* Worker Routes */}
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

          {/* Buyer Routes */}
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

          {/* Not Found */}
          <Route path="*" element={<PageTransitionWrapper><NotFoundPage /></PageTransitionWrapper>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

// === App Entry ===
const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <AuthProvider>
            {!isOnline && <OfflineBanner />}
            <AppRoutes />
          </AuthProvider>
        </Suspense>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;

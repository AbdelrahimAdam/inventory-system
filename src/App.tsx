import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";

import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import OfflineBanner from "./components/OfflineBanner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RoleBasedDashboardRedirect from "./components/RoleBasedDashboardRedirect";
import UnifiedLayout from "./layouts/UnifiedLayout";
import { ThemeProvider } from "./context/ThemeContext";
import RequireRole from "./components/RequireRole";

// === Firebase-compatible role constants ===
const ROLES = {
  SUPER_ADMIN: "superadmin",
  MANAGER: "manager", 
  WORKER: "worker",
  BUYER: "buyer",
  SUPPLIER: "supplier"
} as const;

// === Lazy-loaded Pages ===
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmail"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const MFASetupPage = lazy(() => import("./pages/MFASetupPage"));
const MFAVerifyPage = lazy(() => import("./pages/MFAVerifyPage"));

// Super Admin
const SuperAdminDashboard = lazy(() => import("./features/roles/superadmin/components/SuperAdminDashboard"));
const UserManagement = lazy(() => import("./features/roles/superadmin/components/UserManagement"));
const RoleManagement = lazy(() => import("./features/roles/superadmin/components/RoleManagement"));
const SystemControl = lazy(() => import("./features/roles/superadmin/components/SystemControl"));
const SystemMonitoring = lazy(() => import("./features/roles/superadmin/components/SystemMonitoring"));
const AuditLogs = lazy(() => import("./features/roles/superadmin/components/AuditLogs"));
const SecurityLogs = lazy(() => import("./features/roles/superadmin/components/SecurityLogs"));
const SystemConfig = lazy(() => import("./features/roles/superadmin/components/SystemConfig"));
const DatabaseManagement = lazy(() => import("./features/roles/superadmin/components/DatabaseManagement"));
const BackupRestore = lazy(() => import("./features/roles/superadmin/components/BackupRestore"));

// Manager
const ManagerDashboard = lazy(() => import("./features/roles/manager/pages/DashboardPage"));
const UsersPage = lazy(() => import("./features/roles/manager/pages/UsersPage"));
const InventoryPage = lazy(() => import("./features/roles/manager/pages/InventoryPage"));
const InventoryReportPage = lazy(() => import("./features/roles/manager/pages/InventoryReportPage"));
const ManagerReports = lazy(() => import("./features/roles/manager/pages/ReportsPage"));
const AlertsPage = lazy(() => import("./features/roles/manager/pages/AlertsPage"));
const ManagerSettings = lazy(() => import("./features/roles/manager/pages/SettingPage"));
const AddItemPage = lazy(() => import("./features/roles/manager/pages/main-inventory/add-item"));
const DispatchFactoryPage = lazy(() => import("./features/roles/manager/pages/main-inventory/dispatch/dispatch-factory"));
const DispatchExternalPage = lazy(() => import("./features/roles/manager/pages/main-inventory/dispatch/dispatch-external"));
const SearchEditPage = lazy(() => import("./features/roles/manager/pages/main-inventory/search-edit"));
const ViewStockPage = lazy(() => import("./features/roles/manager/pages/main-inventory/view-stock"));
const DeleteFromStockPage = lazy(() => import("./features/roles/manager/pages/main-inventory/delete-from-stock"));
const DeleteFromFactoryPage = lazy(() => import("./features/roles/manager/pages/main-inventory/delete-from-factory"));
const DeleteFromExternalPage = lazy(() => import("./features/roles/manager/pages/main-inventory/delete-from-external"));
const TransferToPrintPage = lazy(() => import("./features/roles/manager/pages/main-inventory/transfer-to-print"));
const FactoryReturnPage = lazy(() => import("./features/roles/manager/pages/main-inventory/factory-return"));
const PrintStockManager = lazy(() => import("./features/roles/manager/pages/PrintStockManager"));
const AccessoriesViewStockPage = lazy(() => import("./features/roles/manager/pages/accessories/view-stock"));
const MonofyaAddItemPage = lazy(() => import("./features/roles/manager/pages/monofya/add-item"));
const MonofyaViewStockPage = lazy(() => import("./features/roles/manager/pages/monofya/view-stock"));
const InvoiceSystemPage = lazy(() => import("./features/roles/manager/pages/main-inventory/invoices/InvoiceSystem"));
const ItemMovementsPage = lazy(() => import("./features/roles/manager/pages/main-inventory/item-movements/ItemMovementsPage"));
const AccessoryManagementPage = lazy(() => import("./features/roles/manager/pages/accessories/AccessoryManagementPage"));
const StockAdjustmentPage = lazy(() => import("./features/roles/manager/pages/main-inventory/stock-adjustment/StockAdjustmentPage"));
const BatchOperationsPage = lazy(() => import("./features/roles/manager/pages/main-inventory/batch-operations/BatchOperationsPage"));
const LocationTransfersPage = lazy(() => import("./features/roles/manager/pages/main-inventory/location-transfers/LocationTransfersPage"));

// Supplier
const SupplierDashboard = lazy(() => import("./features/roles/supplier/pages/DashboardPage"));
const ProductsPage = lazy(() => import("./features/roles/supplier/pages/ProductsPage"));
const ShipmentsPage = lazy(() => import("./features/roles/supplier/pages/ShipmentsPage"));
const SupplierInvoicesPage = lazy(() => import("./features/roles/supplier/pages/InvoicesPage"));
const SupplierSettings = lazy(() => import("./features/roles/supplier/pages/SettingPage"));
const SupplierOrdersPage = lazy(() => import("./features/roles/supplier/pages/OrdersPage"));
const SupplierPerformancePage = lazy(() => import("./features/roles/supplier/pages/PerformancePage"));

// Worker
const WorkerDashboard = lazy(() => import("./features/roles/worker/pages/DashboardPage"));
const TasksPage = lazy(() => import("./features/roles/worker/pages/TasksPage"));
const ScanPage = lazy(() => import("./features/roles/worker/pages/ScanPage"));
const WorkerReports = lazy(() => import("./features/roles/worker/pages/ReportsPage"));
const WorkerSettings = lazy(() => import("./features/roles/worker/pages/SettingPage"));
const FactoryOperationsPage = lazy(() => import("./features/roles/worker/pages/FactoryOperationsPage"));
const QualityControlPage = lazy(() => import("./features/roles/worker/pages/QualityControlPage"));
const ProductionTrackingPage = lazy(() => import("./features/roles/worker/pages/ProductionTrackingPage"));
const MaintenancePage = lazy(() => import("./features/roles/worker/pages/MaintenancePage"));

// Buyer
const BuyerDashboard = lazy(() => import("./features/roles/buyer/pages/DashboardPage"));
const BuyerOrders = lazy(() => import("./features/roles/buyer/pages/OrdersPage"));
const BuyerSuppliers = lazy(() => import("./features/roles/buyer/pages/SuppliersPage"));
const BuyerReports = lazy(() => import("./features/roles/buyer/pages/ReportsPage"));
const BuyerSettings = lazy(() => import("./features/roles/buyer/pages/SettingPage"));
const PurchaseInvoicesPage = lazy(() => import("./features/roles/buyer/pages/PurchaseInvoicesPage"));
const SupplierManagementPage = lazy(() => import("./features/roles/buyer/pages/SupplierManagementPage"));
const ProcurementPage = lazy(() => import("./features/roles/buyer/pages/ProcurementPage"));
const BudgetManagementPage = lazy(() => import("./features/roles/buyer/pages/BudgetManagementPage"));

// Profile & Settings
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SecuritySettingsPage = lazy(() => import("./pages/SecuritySettingsPage"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));

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

// === Protected Layout Wrapper ===
const ProtectedLayout: React.FC = () => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <UnifiedLayout />
    </Suspense>
  </ErrorBoundary>
);

// === Role-based redirect paths ===
const ROLE_REDIRECT_PATHS = {
  [ROLES.SUPER_ADMIN]: "/superadmin/dashboard",
  [ROLES.MANAGER]: "/manager/dashboard",
  [ROLES.WORKER]: "/worker/dashboard",
  [ROLES.BUYER]: "/buyer/dashboard",
  [ROLES.SUPPLIER]: "/supplier/dashboard"
} as const;

// === Simplified Protected Route Component ===
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, initialized } = useAuth();
  
  if (loading || !initialized) {
    return <LoadingSpinner fullScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// === Public Route Component ===
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// === Main App Component ===
const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

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
            <ThemeProvider>
              {!isOnline && <OfflineBanner />}
              
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  {/* ================= PUBLIC ROUTES ================= */}
                  <Route path="/login" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <LoginPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/register" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <RegisterPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/verify-email" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <VerifyEmailPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/forgot-password" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <ForgotPasswordPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/reset-password" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <ResetPasswordPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/mfa-setup" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <MFASetupPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/mfa-verify" element={
                    <PublicRoute>
                      <PageTransitionWrapper>
                        <MFAVerifyPage />
                      </PageTransitionWrapper>
                    </PublicRoute>
                  } />
                  
                  <Route path="/unauthorized" element={
                    <PageTransitionWrapper>
                      <UnauthorizedPage />
                    </PageTransitionWrapper>
                  } />

                  {/* ================= PROTECTED ROUTES ================= */}
                  <Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
                    {/* Root redirect */}
                    <Route path="/" element={<RoleBasedDashboardRedirect />} />

                    {/* ================= SUPER ADMIN EXCLUSIVE ROUTES ================= */}
                    <Route path="/superadmin" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<PageTransitionWrapper><SuperAdminDashboard /></PageTransitionWrapper>} />
                      <Route path="users" element={<PageTransitionWrapper><UserManagement /></PageTransitionWrapper>} />
                      <Route path="roles" element={<PageTransitionWrapper><RoleManagement /></PageTransitionWrapper>} />
                      <Route path="system" element={<PageTransitionWrapper><SystemControl /></PageTransitionWrapper>} />
                      <Route path="monitoring" element={<PageTransitionWrapper><SystemMonitoring /></PageTransitionWrapper>} />
                      <Route path="audit-logs" element={<PageTransitionWrapper><AuditLogs /></PageTransitionWrapper>} />
                      <Route path="security-logs" element={<PageTransitionWrapper><SecurityLogs /></PageTransitionWrapper>} />
                      <Route path="system-config" element={<PageTransitionWrapper><SystemConfig /></PageTransitionWrapper>} />
                      <Route path="database" element={<PageTransitionWrapper><DatabaseManagement /></PageTransitionWrapper>} />
                      <Route path="backup" element={<PageTransitionWrapper><BackupRestore /></PageTransitionWrapper>} />
                    </Route>

                    {/* ================= MANAGER ROUTES (SUPER_ADMIN + MANAGER) ================= */}
                    <Route path="/manager" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<PageTransitionWrapper><ManagerDashboard /></PageTransitionWrapper>} />
                      <Route path="users" element={<PageTransitionWrapper><UsersPage /></PageTransitionWrapper>} />
                      <Route path="inventory" element={<PageTransitionWrapper><InventoryPage /></PageTransitionWrapper>} />
                      <Route path="inventory-report" element={<PageTransitionWrapper><InventoryReportPage /></PageTransitionWrapper>} />
                      <Route path="reports" element={<PageTransitionWrapper><ManagerReports /></PageTransitionWrapper>} />
                      <Route path="alerts" element={<PageTransitionWrapper><AlertsPage /></PageTransitionWrapper>} />
                      <Route path="settings" element={<PageTransitionWrapper><ManagerSettings /></PageTransitionWrapper>} />
                      
                      {/* Main Inventory Operations */}
                      <Route path="main-inventory/add-item" element={<PageTransitionWrapper><AddItemPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/dispatch/dispatch-factory" element={<PageTransitionWrapper><DispatchFactoryPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/dispatch/dispatch-external" element={<PageTransitionWrapper><DispatchExternalPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/search-edit" element={<PageTransitionWrapper><SearchEditPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/view-stock" element={<PageTransitionWrapper><ViewStockPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/invoices" element={<PageTransitionWrapper><InvoiceSystemPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/item-movements" element={<PageTransitionWrapper><ItemMovementsPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/stock-adjustment" element={<PageTransitionWrapper><StockAdjustmentPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/batch-operations" element={<PageTransitionWrapper><BatchOperationsPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/location-transfers" element={<PageTransitionWrapper><LocationTransfersPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/delete-from-stock" element={<PageTransitionWrapper><DeleteFromStockPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/delete-from-factory" element={<PageTransitionWrapper><DeleteFromFactoryPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/delete-from-external" element={<PageTransitionWrapper><DeleteFromExternalPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/transfer-to-print" element={<PageTransitionWrapper><TransferToPrintPage /></PageTransitionWrapper>} />
                      <Route path="main-inventory/factory-return" element={<PageTransitionWrapper><FactoryReturnPage /></PageTransitionWrapper>} />
                      
                      {/* Accessories Management */}
                      <Route path="accessories" element={<PageTransitionWrapper><AccessoryManagementPage /></PageTransitionWrapper>} />
                      <Route path="accessories/view-stock" element={<PageTransitionWrapper><AccessoriesViewStockPage /></PageTransitionWrapper>} />
                      
                      {/* Print & Monofya Management */}
                      <Route path="print/manager" element={<PageTransitionWrapper><PrintStockManager /></PageTransitionWrapper>} />
                      <Route path="monofya/add-item" element={<PageTransitionWrapper><MonofyaAddItemPage /></PageTransitionWrapper>} />
                      <Route path="monofya/view-stock" element={<PageTransitionWrapper><MonofyaViewStockPage /></PageTransitionWrapper>} />
                    </Route>

                    {/* ================= SUPPLIER ROUTES (SUPER_ADMIN + SUPPLIER) ================= */}
                    <Route path="/supplier" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.SUPPLIER]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<PageTransitionWrapper><SupplierDashboard /></PageTransitionWrapper>} />
                      <Route path="products" element={<PageTransitionWrapper><ProductsPage /></PageTransitionWrapper>} />
                      <Route path="shipments" element={<PageTransitionWrapper><ShipmentsPage /></PageTransitionWrapper>} />
                      <Route path="orders" element={<PageTransitionWrapper><SupplierOrdersPage /></PageTransitionWrapper>} />
                      <Route path="invoices" element={<PageTransitionWrapper><SupplierInvoicesPage /></PageTransitionWrapper>} />
                      <Route path="performance" element={<PageTransitionWrapper><SupplierPerformancePage /></PageTransitionWrapper>} />
                      <Route path="settings" element={<PageTransitionWrapper><SupplierSettings /></PageTransitionWrapper>} />
                    </Route>

                    {/* ================= WORKER ROUTES (SUPER_ADMIN + WORKER) ================= */}
                    <Route path="/worker" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.WORKER]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<PageTransitionWrapper><WorkerDashboard /></PageTransitionWrapper>} />
                      <Route path="tasks" element={<PageTransitionWrapper><TasksPage /></PageTransitionWrapper>} />
                      <Route path="scan" element={<PageTransitionWrapper><ScanPage /></PageTransitionWrapper>} />
                      <Route path="reports" element={<PageTransitionWrapper><WorkerReports /></PageTransitionWrapper>} />
                      <Route path="settings" element={<PageTransitionWrapper><WorkerSettings /></PageTransitionWrapper>} />
                      <Route path="factory-operations" element={<PageTransitionWrapper><FactoryOperationsPage /></PageTransitionWrapper>} />
                      <Route path="quality-control" element={<PageTransitionWrapper><QualityControlPage /></PageTransitionWrapper>} />
                      <Route path="production-tracking" element={<PageTransitionWrapper><ProductionTrackingPage /></PageTransitionWrapper>} />
                      <Route path="maintenance" element={<PageTransitionWrapper><MaintenancePage /></PageTransitionWrapper>} />
                    </Route>

                    {/* ================= BUYER ROUTES (SUPER_ADMIN + BUYER) ================= */}
                    <Route path="/buyer" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.BUYER]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<PageTransitionWrapper><BuyerDashboard /></PageTransitionWrapper>} />
                      <Route path="orders" element={<PageTransitionWrapper><BuyerOrders /></PageTransitionWrapper>} />
                      <Route path="suppliers" element={<PageTransitionWrapper><BuyerSuppliers /></PageTransitionWrapper>} />
                      <Route path="reports" element={<PageTransitionWrapper><BuyerReports /></PageTransitionWrapper>} />
                      <Route path="settings" element={<PageTransitionWrapper><BuyerSettings /></PageTransitionWrapper>} />
                      <Route path="purchase-invoices" element={<PageTransitionWrapper><PurchaseInvoicesPage /></PageTransitionWrapper>} />
                      <Route path="supplier-management" element={<PageTransitionWrapper><SupplierManagementPage /></PageTransitionWrapper>} />
                      <Route path="procurement" element={<PageTransitionWrapper><ProcurementPage /></PageTransitionWrapper>} />
                      <Route path="budget-management" element={<PageTransitionWrapper><BudgetManagementPage /></PageTransitionWrapper>} />
                    </Route>

                    {/* ================= UNIVERSAL SUPER_ADMIN ACCESS TO ALL ROUTES ================= */}
                    {/* SUPER_ADMIN can access ANY manager route directly */}
                    <Route path="/manager/*" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route path="*" element={
                        <Routes>
                          <Route path="dashboard" element={<PageTransitionWrapper><ManagerDashboard /></PageTransitionWrapper>} />
                          <Route path="users" element={<PageTransitionWrapper><UsersPage /></PageTransitionWrapper>} />
                          <Route path="inventory" element={<PageTransitionWrapper><InventoryPage /></PageTransitionWrapper>} />
                          <Route path="inventory-report" element={<PageTransitionWrapper><InventoryReportPage /></PageTransitionWrapper>} />
                          <Route path="reports" element={<PageTransitionWrapper><ManagerReports /></PageTransitionWrapper>} />
                          <Route path="alerts" element={<PageTransitionWrapper><AlertsPage /></PageTransitionWrapper>} />
                          <Route path="settings" element={<PageTransitionWrapper><ManagerSettings /></PageTransitionWrapper>} />
                          
                          {/* Main Inventory Operations */}
                          <Route path="main-inventory/add-item" element={<PageTransitionWrapper><AddItemPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/dispatch/dispatch-factory" element={<PageTransitionWrapper><DispatchFactoryPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/dispatch/dispatch-external" element={<PageTransitionWrapper><DispatchExternalPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/search-edit" element={<PageTransitionWrapper><SearchEditPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/view-stock" element={<PageTransitionWrapper><ViewStockPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/invoices" element={<PageTransitionWrapper><InvoiceSystemPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/item-movements" element={<PageTransitionWrapper><ItemMovementsPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/stock-adjustment" element={<PageTransitionWrapper><StockAdjustmentPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/batch-operations" element={<PageTransitionWrapper><BatchOperationsPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/location-transfers" element={<PageTransitionWrapper><LocationTransfersPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/delete-from-stock" element={<PageTransitionWrapper><DeleteFromStockPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/delete-from-factory" element={<PageTransitionWrapper><DeleteFromFactoryPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/delete-from-external" element={<PageTransitionWrapper><DeleteFromExternalPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/transfer-to-print" element={<PageTransitionWrapper><TransferToPrintPage /></PageTransitionWrapper>} />
                          <Route path="main-inventory/factory-return" element={<PageTransitionWrapper><FactoryReturnPage /></PageTransitionWrapper>} />
                          
                          {/* Accessories Management */}
                          <Route path="accessories" element={<PageTransitionWrapper><AccessoryManagementPage /></PageTransitionWrapper>} />
                          <Route path="accessories/view-stock" element={<PageTransitionWrapper><AccessoriesViewStockPage /></PageTransitionWrapper>} />
                          
                          {/* Print & Monofya Management */}
                          <Route path="print/manager" element={<PageTransitionWrapper><PrintStockManager /></PageTransitionWrapper>} />
                          <Route path="monofya/add-item" element={<PageTransitionWrapper><MonofyaAddItemPage /></PageTransitionWrapper>} />
                          <Route path="monofya/view-stock" element={<PageTransitionWrapper><MonofyaViewStockPage /></PageTransitionWrapper>} />
                        </Routes>
                      } />
                    </Route>

                    {/* SUPER_ADMIN can access ANY supplier route directly */}
                    <Route path="/supplier/*" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route path="*" element={
                        <Routes>
                          <Route path="dashboard" element={<PageTransitionWrapper><SupplierDashboard /></PageTransitionWrapper>} />
                          <Route path="products" element={<PageTransitionWrapper><ProductsPage /></PageTransitionWrapper>} />
                          <Route path="shipments" element={<PageTransitionWrapper><ShipmentsPage /></PageTransitionWrapper>} />
                          <Route path="orders" element={<PageTransitionWrapper><SupplierOrdersPage /></PageTransitionWrapper>} />
                          <Route path="invoices" element={<PageTransitionWrapper><SupplierInvoicesPage /></PageTransitionWrapper>} />
                          <Route path="performance" element={<PageTransitionWrapper><SupplierPerformancePage /></PageTransitionWrapper>} />
                          <Route path="settings" element={<PageTransitionWrapper><SupplierSettings /></PageTransitionWrapper>} />
                        </Routes>
                      } />
                    </Route>

                    {/* SUPER_ADMIN can access ANY worker route directly */}
                    <Route path="/worker/*" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route path="*" element={
                        <Routes>
                          <Route path="dashboard" element={<PageTransitionWrapper><WorkerDashboard /></PageTransitionWrapper>} />
                          <Route path="tasks" element={<PageTransitionWrapper><TasksPage /></PageTransitionWrapper>} />
                          <Route path="scan" element={<PageTransitionWrapper><ScanPage /></PageTransitionWrapper>} />
                          <Route path="reports" element={<PageTransitionWrapper><WorkerReports /></PageTransitionWrapper>} />
                          <Route path="settings" element={<PageTransitionWrapper><WorkerSettings /></PageTransitionWrapper>} />
                          <Route path="factory-operations" element={<PageTransitionWrapper><FactoryOperationsPage /></PageTransitionWrapper>} />
                          <Route path="quality-control" element={<PageTransitionWrapper><QualityControlPage /></PageTransitionWrapper>} />
                          <Route path="production-tracking" element={<PageTransitionWrapper><ProductionTrackingPage /></PageTransitionWrapper>} />
                          <Route path="maintenance" element={<PageTransitionWrapper><MaintenancePage /></PageTransitionWrapper>} />
                        </Routes>
                      } />
                    </Route>

                    {/* SUPER_ADMIN can access ANY buyer route directly */}
                    <Route path="/buyer/*" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN]}>
                        <Outlet />
                      </RequireRole>
                    }>
                      <Route path="*" element={
                        <Routes>
                          <Route path="dashboard" element={<PageTransitionWrapper><BuyerDashboard /></PageTransitionWrapper>} />
                          <Route path="orders" element={<PageTransitionWrapper><BuyerOrders /></PageTransitionWrapper>} />
                          <Route path="suppliers" element={<PageTransitionWrapper><BuyerSuppliers /></PageTransitionWrapper>} />
                          <Route path="reports" element={<PageTransitionWrapper><BuyerReports /></PageTransitionWrapper>} />
                          <Route path="settings" element={<PageTransitionWrapper><BuyerSettings /></PageTransitionWrapper>} />
                          <Route path="purchase-invoices" element={<PageTransitionWrapper><PurchaseInvoicesPage /></PageTransitionWrapper>} />
                          <Route path="supplier-management" element={<PageTransitionWrapper><SupplierManagementPage /></PageTransitionWrapper>} />
                          <Route path="procurement" element={<PageTransitionWrapper><ProcurementPage /></PageTransitionWrapper>} />
                          <Route path="budget-management" element={<PageTransitionWrapper><BudgetManagementPage /></PageTransitionWrapper>} />
                        </Routes>
                      } />
                    </Route>

                    {/* ================= COMMON PROFILE ROUTES (ALL AUTHENTICATED USERS) ================= */}
                    <Route path="/profile" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.WORKER, ROLES.BUYER, ROLES.SUPPLIER]}>
                        <PageTransitionWrapper><ProfilePage /></PageTransitionWrapper>
                      </RequireRole>
                    } />
                    
                    <Route path="/security" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.WORKER, ROLES.BUYER, ROLES.SUPPLIER]}>
                        <PageTransitionWrapper><SecuritySettingsPage /></PageTransitionWrapper>
                      </RequireRole>
                    } />
                    
                    <Route path="/notifications" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.WORKER, ROLES.BUYER, ROLES.SUPPLIER]}>
                        <PageTransitionWrapper><NotificationSettingsPage /></PageTransitionWrapper>
                      </RequireRole>
                    } />
                    
                    <Route path="/change-password" element={
                      <RequireRole allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.WORKER, ROLES.BUYER, ROLES.SUPPLIER]}>
                        <PageTransitionWrapper><ChangePasswordPage /></PageTransitionWrapper>
                      </RequireRole>
                    } />

                    {/* Catch all protected route */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* Redirect root to login for unauthenticated users */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  
                  {/* Catch all public route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AnimatePresence>
            </ThemeProvider>
          </AuthProvider>
        </Suspense>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App; 
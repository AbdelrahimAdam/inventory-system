import React from "react";
import { Outlet } from "react-router-dom";

// Exporting individual pages for routing
export { default as DashboardPage } from "./pages/DashboardPage";
export { default as UsersPage } from "./pages/UsersPage";
export { default as InventoryPage } from "./pages/InventoryPage";
export { default as ReportsPage } from "./pages/ReportsPage";
export { default as AlertsPage } from "./pages/AlertsPage";
export { default as SettingPage } from "./pages/SettingPage";

// Main container for ManagerPages
const ManagerPages: React.FC = () => <Outlet />;

export default ManagerPages;

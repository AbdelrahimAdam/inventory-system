import React from "react";
import { Outlet } from "react-router-dom";

export { default as DashboardPage } from "./pages/DashboardPage";
export { default as ProductsPage } from "./pages/ProductsPage";
export { default as ShipmentsPage } from "./pages/ShipmentsPage";

const SupplierPages = () => <Outlet />;
export default SupplierPages;

import React from "react";
import { Outlet } from "react-router-dom";

export { default as DashboardPage } from "./pages/DashboardPage";
export { default as ReportsPage } from "./pages/ReportsPage";
export { default as SettingPage } from "./pages/SettingPage";

const WorkerPages = () => <Outlet />;
export default WorkerPages;

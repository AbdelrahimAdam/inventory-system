import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/constants";

interface RequireRoleProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth(); // Assume useAuth provides loading state

  if (loading) {
    // Optionally, you could show a loading spinner while authentication state is being determined
    return <div>Loading...</div>;
  }

  if (!user) {
    // If there's no user (not logged in), redirect to login
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If the user's role is not in the allowedRoles array, redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>; // If role is valid, render the children components
};

export default RequireRole;

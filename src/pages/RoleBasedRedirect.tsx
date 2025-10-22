import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleBasedRedirect = () => {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, getRedirectPath } = useAuth();

  useEffect(() => {
    console.log("RoleBasedRedirect: useEffect triggered", { loading, isAuthenticated, user });
    // 🚫 Don't redirect until auth state is fully resolved
    if (loading) {
      console.log("RoleBasedRedirect: Still loading, skipping redirect");
      return;
    }

    // If not authenticated, stay on login
    if (!isAuthenticated || !user?.role_name) {
      console.log("RoleBasedRedirect: Not authenticated or no role, redirecting to /login", { isAuthenticated, user });
      navigate("/login", { replace: true });
      return;
    }

    // If authenticated, redirect based on role
    const redirectPath = getRedirectPath(user.role_name);
    console.log(`RoleBasedRedirect: Redirecting to ${redirectPath} for role ${user.role_name}`);
    navigate(redirectPath, { replace: true });
  }, [loading, isAuthenticated, user, navigate, getRedirectPath]);

  return null; // No UI, just redirect
};

export default RoleBasedRedirect;
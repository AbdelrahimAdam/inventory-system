import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleBasedDashboardRedirect = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth loading

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const path = {
      manager: "/manager/dashboard",
      supplier: "/supplier/dashboard",
      worker: "/worker/dashboard",
      buyer: "/buyer/dashboard",
    }[user.role] || "/unauthorized";

    navigate(path, { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return null;
};

export default RoleBasedDashboardRedirect;

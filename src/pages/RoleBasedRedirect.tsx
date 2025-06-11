// src/pages/RoleBasedRedirect.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleBasedRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");

      if (!user || !user.role) {
        navigate("/login");
        return;
      }

      switch (user.role) {
        case "manager":
          navigate("/manager");
          break;
        case "supplier":
          navigate("/supplier/dashboard");
          break;
        case "worker":
          navigate("/worker/dashboard");
          break;
        case "buyer":
          navigate("/buyer/dashboard");
          break;
        default:
          navigate("/unauthorized");
      }
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  return null;
};

export default RoleBasedRedirect;

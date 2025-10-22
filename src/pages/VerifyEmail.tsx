import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const VerifyEmail: React.FC = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("رمز التحقق مفقود.");
      return;
    }

    console.log("VerifyEmail: Sending verification request with token:", token);
    axios
      .post(`${import.meta.env.VITE_API_URL}/auth/verify-email`, { token })
      .then((res) => {
        console.log("VerifyEmail: Response:", res.data);
        setStatus("success");
        setMessage(res.data.message);
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        console.error("VerifyEmail: Error:", err.response?.data || err.message);
        setStatus("error");
        setMessage(err.response?.data?.message || "حدث خطأ أثناء التحقق من الرابط");
      });
  }, [location, navigate]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      {status === "loading" && <p className="text-lg">⏳ جاري التحقق من بريدك...</p>}
      {status === "success" && <p className="text-lg text-green-600">{message}</p>}
      {status === "error" && <p className="text-lg text-red-600">{message}</p>}
    </div>
  );
};

export default VerifyEmail;
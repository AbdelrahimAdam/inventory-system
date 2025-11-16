// src/pages/VerifyEmail.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { EmailVerificationService } from "../services/firebase";
import { CheckCircle, XCircle, Loader, Mail } from "lucide-react";

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const oobCode = searchParams.get("oobCode");
      const mode = searchParams.get("mode");
      const continueUrl = searchParams.get("continueUrl");

      console.log("🔍 VerifyEmail: Parameters received:", { 
        oobCode: oobCode ? "present" : "missing", 
        mode,
        continueUrl 
      });

      // Validate required parameters
      if (mode !== "verifyEmail" || !oobCode) {
        setStatus("error");
        setMessage("رابط التحقق غير صالح أو ناقص.");
        return;
      }

      try {
        console.log("🔄 VerifyEmail: Processing verification...");
        const result = await EmailVerificationService.verifyEmail(oobCode);
        
        console.log("✅ VerifyEmail: Verification result:", result);

        if (result.success) {
          setStatus("success");
          setMessage(result.message || "تم التحقق من البريد الإلكتروني بنجاح!");
          setEmail(result.user?.email || null);
          
          // Redirect after delay
          setTimeout(() => {
            const redirectUrl = continueUrl || "/dashboard";
            console.log(`🔄 Redirecting to: ${redirectUrl}`);
            navigate(redirectUrl, { replace: true });
          }, 3000);
        } else {
          setStatus("error");
          setMessage(result.message || "فشل التحقق من البريد الإلكتروني");
        }
      } catch (error: any) {
        console.error("❌ VerifyEmail: Unexpected error:", error);
        setStatus("error");
        setMessage("حدث خطأ غير متوقع أثناء التحقق من البريد الإلكتروني");
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleReturnToLogin = () => {
    navigate("/login", { replace: true });
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === "loading" && "جاري التحقق"}
              {status === "success" && "تم التحقق بنجاح"}
              {status === "error" && "فشل التحقق"}
            </h2>
          </div>

          {/* Content */}
          {status === "loading" && (
            <div className="space-y-4">
              <Loader className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
              <p className="text-lg text-gray-700">جاري التحقق من بريدك الإلكتروني...</p>
              <p className="text-sm text-gray-500">يرجى الانتظار قليلاً</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="text-lg text-gray-700 mb-2">{message}</p>
                {email && (
                  <p className="text-sm text-gray-600">
                    البريد الإلكتروني: <span className="font-medium">{email}</span>
                  </p>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  سيتم تحويلك تلقائياً إلى لوحة التحكم خلال 3 ثوانٍ
                </p>
              </div>
              <button
                onClick={handleGoToDashboard}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                الانتقال إلى لوحة التحكم الآن
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <p className="text-lg text-gray-700 mb-2">{message}</p>
                <p className="text-sm text-gray-500">
                  يرجى طلب رابط تحقق جديد من صفحة تسجيل الدخول
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleReturnToLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  العودة إلى تسجيل الدخول
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              إذا واجهتك أي مشكلة، يرجى التواصل مع الدعم الفني
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            نظام إدارة مخزون العطور © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
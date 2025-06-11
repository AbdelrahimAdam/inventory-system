import React from "react";

type AlertBoxProps = {
  message: string;
  type?: "warning" | "error" | "info";
};

const AlertBox: React.FC<AlertBoxProps> = ({ message, type = "warning" }) => {
  const bgColor =
    type === "error"
      ? "bg-red-100 text-red-800 border-red-300"
      : type === "info"
      ? "bg-blue-100 text-blue-800 border-blue-300"
      : "bg-yellow-100 text-yellow-800 border-yellow-300";

  return (
    <div
      className={`border rounded-xl px-4 py-3 shadow-md text-right text-sm font-medium mb-4 ${bgColor}`}
      dir="rtl"
    >
      ⚠️ {message}
    </div>
  );
};

export default AlertBox;

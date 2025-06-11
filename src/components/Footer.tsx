import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-4 text-center mt-10 rtl fixed bottom-0 w-full">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} جميع الحقوق محفوظة - نظام إدارة العطور
      </p>
    </footer>
  );
};

export default Footer;

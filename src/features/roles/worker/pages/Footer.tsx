import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-4 text-center mt-10 rtl">
      <p className="text-sm">
        &copy; {new Date().getFullYear()}  جميع الحقوق محفوظة - خليفه للعطور- نظام إدارة المخازن 
      </p>
    </footer>
  );
};

export default Footer;


// src/components/PageWrapper.tsx
import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface PageWrapperProps {
  children: React.ReactNode;
  title: string;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />
      <main className="flex-1 p-6 container mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-right">{title}</h1>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageWrapper;
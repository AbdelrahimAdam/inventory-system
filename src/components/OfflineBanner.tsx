// src/components/OfflineBanner.tsx
import React from "react";

const OfflineBanner: React.FC = () => (
  <div className="bg-red-600 text-white text-center py-2 text-sm fixed top-0 inset-x-0 z-50">
    أنت حالياً غير متصل بالإنترنت. بعض الميزات قد لا تعمل.
  </div>
);

export default OfflineBanner;

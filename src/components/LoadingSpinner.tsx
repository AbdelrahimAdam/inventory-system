import React from "react";

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 text-gray-600 dark:text-white">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sudan-500" />
  </div>
);

export default LoadingSpinner;

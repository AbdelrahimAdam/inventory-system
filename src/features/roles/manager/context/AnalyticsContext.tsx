import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';

interface AnalyticsContextType {
  metrics: Record<string, number>;
  refreshMetrics: () => Promise<void>;
  timeRange: string;
  setTimeRange: (range: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [timeRange, setTimeRange] = useState('7d');

  const refreshMetrics = async () => {
    if (!user) return;
    
    // Simulate API call
    const newMetrics = {
      inventoryCount: 1250,
      lowStockItems: 23,
      pendingOrders: 17,
      // ... other metrics
    };
    setMetrics(newMetrics);
  };

  return (
    <AnalyticsContext.Provider value={{ metrics, refreshMetrics, timeRange, setTimeRange }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
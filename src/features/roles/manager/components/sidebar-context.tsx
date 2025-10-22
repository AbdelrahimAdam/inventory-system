import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextProps {
  isMobile: boolean;
  toggleSidebar: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = window.innerWidth <= 768;

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <SidebarContext.Provider value={{ isMobile, toggleSidebar, sidebarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

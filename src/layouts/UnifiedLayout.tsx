import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ChevronLeft, Camera, LogOut, Sun, Moon, Menu } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../context/AuthContext';
import { ROLE_TITLES, ROLE_NAMES_AR, ROLE_COLORS, ROLE_ICONS, ROLES } from '../utils/constants';

import { AnalyticsProvider } from '../features/roles/manager/context/AnalyticsContext';
import { TaskProvider } from '../features/roles/worker/context/TaskContext';
import { ProductsProvider } from '../features/roles/supplier/context/ProductsContext';
import { OrdersProvider } from '../features/roles/buyer/context/OrdersContext';

import BarcodeScannerModal from '../components/BarcodeScannerModal';
import ErrorBoundary from '../components/ErrorBoundary';

import ManagerBottomNav from '../features/roles/manager/components/BottomNav';
import { SidebarProvider } from '../features/roles/manager/components/sidebar-context';

const LazyManagerNav = lazy(() => import('../components/navigation/ManagerNav'));
const LazySupplierNav = lazy(() => import('../components/navigation/SupplierNav'));
const LazyWorkerNav = lazy(() => import('../components/navigation/WorkerNav'));
const LazyBuyerNav = lazy(() => import('../components/navigation/BuyerNav'));
const LazyAdminNav = lazy(() => import('../components/navigation/AdminNav'));
const LazySuperAdminNav = lazy(() => import('../components/navigation/SuperAdminNav'));

const RoleContextWrapper: React.FC<{ role: string; children: React.ReactNode }> = ({ role, children }) => {
  switch (role) {
    case ROLES.MANAGER: return <AnalyticsProvider>{children}</AnalyticsProvider>;
    case ROLES.WORKER: return <TaskProvider>{children}</TaskProvider>;
    case ROLES.SUPPLIER: return <ProductsProvider>{children}</ProductsProvider>;
    case ROLES.BUYER: return <OrdersProvider>{children}</OrdersProvider>;
    default: return <>{children}</>;
  }
};

interface UnifiedLayoutProps {
  children?: React.ReactNode;
}

const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  // 🔥 Normalize role more robustly (remove spaces and underscores)
  let role = user?.role_name?.toLowerCase().replace(/ /g, '').replace(/_/g, '') || '';
  if (role === 'admin') role = 'manager';
  if (role.includes('superadmin')) role = 'superadmin'; // Fallback for variations

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen');
    return stored === null ? true : stored === 'true'; // Force open by default
  });

  const sidebarRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.body.style.fontFamily = `'Tajawal', sans-serif`;
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarOpen(true); // Force open on resize
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    localStorage.setItem('theme', theme);
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarCollapsed, theme, sidebarOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const toggleSidebarCollapse = () => setSidebarCollapsed(prev => !prev);

  const handleBarcodeScan = (barcode: string) => {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '{}');
    inventory[barcode] = (inventory[barcode] || 0) + 1;
    localStorage.setItem('inventory', JSON.stringify(inventory));
    toast.success(`تم تحديث الكمية للباركود: ${barcode}`);
  };

  if (!user || !role) return <Navigate to="/unauthorized" replace />;

  const navProps = {
    collapsed: sidebarCollapsed,
    onLinkClick: () => isMobile && setSidebarOpen(false),
    onCloseSidebar: () => isMobile && setSidebarOpen(false),
  };

  const renderNav = () => {
    switch (role) {
      case ROLES.MANAGER: return <LazyManagerNav {...navProps} />;
      case ROLES.SUPPLIER: return <LazySupplierNav {...navProps} />;
      case ROLES.WORKER: return <LazyWorkerNav {...navProps} />;
      case ROLES.BUYER: return <LazyBuyerNav {...navProps} />;
      case ROLES.ADMIN: return <LazyAdminNav {...navProps} />;
      case ROLES.SUPER_ADMIN: return <LazySuperAdminNav {...navProps} />;
      default: return <LazySuperAdminNav {...navProps} />; // Fallback to SuperAdminNav for unknown roles
    }
  };

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';

  return (
    <>
      <Helmet>
        <title>{`${ROLE_TITLES[role] || 'Super Admin'} - لوحة التحكم`}</title>
        <meta name="description" content={`لوحة تحكم ${ROLE_TITLES[role] || 'Super Admin'}`} />
      </Helmet>

      <div className="fixed inset-0 -z-10">
        <img src="/ripple-glass-bg.jpg" alt="background" className="w-full h-full object-cover" />
      </div>

      <div className="flex h-screen relative font-[Tajawal]" dir="rtl">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              ref={sidebarRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed top-16 right-0 z-30 h-[calc(100%-4rem)] bg-white text-gray-800 dark:bg-gray-900 dark:text-white ${sidebarWidth}`}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: ROLE_COLORS[role] }}>
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className={`transition-all duration-300 ${sidebarCollapsed ? 'w-6 h-6' : 'w-8 h-8'} rounded-full`} />
                  <span className="text-lg">{ROLE_ICONS[role]}</span>
                  {!sidebarCollapsed && <span className="font-bold text-sm">{ROLE_NAMES_AR[role]}</span>}
                </div>
                <button onClick={toggleSidebarCollapse} className="text-white">
                  {sidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>

              <nav className="overflow-y-auto h-full px-2 py-2">
                <Suspense fallback={<div className="text-white p-2">جاري التحميل...</div>}>
                  {renderNav()}
                </Suspense>
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {isMobile && !sidebarOpen && (
          <button
            className="fixed top-4 right-4 z-40 text-white bg-gray-800 p-2 rounded-full shadow-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu />
          </button>
        )}

        <SidebarProvider>
          <div className={`transition-all duration-300 flex flex-col w-full ${sidebarOpen && !isMobile ? (sidebarCollapsed ? 'mr-16' : 'mr-64') : ''}`}>
            <header className="fixed top-0 right-0 left-0 z-20 flex items-center justify-between px-4 py-3 shadow-md border-b border-white/30 dark:border-gray-700 bg-white/30 dark:bg-gray-800/30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                {!isMobile && (
                  <button onClick={() => setSidebarOpen(prev => !prev)} className="text-purple-900 dark:text-white">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
                <h1 className="text-lg font-semibold text-purple-900 dark:text-white">{`${ROLE_TITLES[role] || 'Super Admin'} - لوحة التحكم`}</h1>
              </div>

              <div className="flex items-center gap-4">
                <motion.button
                  onClick={() => setBarcodeModalOpen(true)}
                  className="p-2 rounded-full bg-white/20 dark:bg-white/10 border border-green-400 shadow-lg text-green-700 dark:text-green-300"
                  title="فتح الماسح الضوئي"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Camera className="w-6 h-6" />
                </motion.button>

                <button onClick={toggleTheme} className="text-yellow-500 dark:text-gray-200" title="تبديل الوضع">
                  {theme === 'light' ? <Moon /> : <Sun />}
                </button>

                <button onClick={logout} className="text-red-600 hover:text-red-800" title="تسجيل الخروج">
                  <LogOut />
                </button>
              </div>
            </header>

            <main ref={scrollRef} className="flex-1 overflow-y-auto pt-20 px-4 md:px-6 scroll-smooth z-0">
              <ErrorBoundary>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }} 
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <RoleContextWrapper role={role}>
                    <Suspense fallback={<div className="text-center py-10">جاري التحميل...</div>}>
                      {children || <Outlet />}
                    </Suspense>
                  </RoleContextWrapper>
                </motion.div>
              </ErrorBoundary>
            </main>

            {role === ROLES.MANAGER && <ManagerBottomNav scrollContainerRef={scrollRef} />}
          </div>
        </SidebarProvider>
      </div>

      <BarcodeScannerModal isOpen={barcodeModalOpen} onClose={() => setBarcodeModalOpen(false)} onScanSuccess={handleBarcodeScan} />
      <Toaster position="top-center" />
    </>
  );
};

export default UnifiedLayout;  
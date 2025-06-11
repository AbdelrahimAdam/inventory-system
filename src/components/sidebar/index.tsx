import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ManagerNav from '../navigation/ManagerNav';
import SupplierNav from '../navigation/SupplierNav';
import WorkerNav from '../navigation/WorkerNav';
import BuyerNav from '../navigation/BuyerNav';
import AdminNav from '../navigation/AdminNav';
import { ROLE_NAMES_AR } from '../../utils/constants';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'guest';

  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );

  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  const handleDragEnd = (_: any, info: any) => {
    const offsetX = info.offset.x;
    const threshold = 100;
    if (offsetX < -threshold && isMobile) onClose();
  };

  const renderNav = () => {
    const navProps = {
      onLinkClick: () => {
        onNavigate?.();
        if (isMobile) onClose();
      },
      collapsed,
    };

    switch (role) {
      case 'manager':
        return <ManagerNav {...navProps} />;
      case 'supplier':
        return <SupplierNav {...navProps} />;
      case 'worker':
        return <WorkerNav {...navProps} />;
      case 'buyer':
        return <BuyerNav {...navProps} />;
      case 'admin':
        return <AdminNav {...navProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="sidebar"
            drag={isMobile ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ x: isMobile ? '100%' : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? '100%' : 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className={`fixed top-0 right-0 h-full z-40 bg-white/20 backdrop-blur-md text-white shadow-xl transition-all duration-500 rounded-l-2xl flex flex-col ${
              collapsed ? 'w-16' : 'w-64'
            }`}
            aria-label="Sidebar Navigation"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 rtl:space-x-reverse">
                <LayoutDashboard className="w-5 h-5 text-white/90" />
                {!collapsed && (
                  <span className="font-semibold text-sm text-white/90 tracking-wide">
                    {ROLE_NAMES_AR[role] ?? 'مستخدم'}
                  </span>
                )}
              </div>
              <button
                onClick={toggleCollapse}
                className="text-white/70 hover:text-white transition"
                aria-label="Toggle Sidebar"
              >
                {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
              {renderNav()}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FAB button for opening sidebar (mobile) */}
      {!isOpen && (
        <button
          className="fixed top-4 right-4 z-50 text-white bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-full shadow-lg md:hidden"
          onClick={onClose}
          aria-label="Open Sidebar"
        >
          <FaBars />
        </button>
      )}
    </>
  );
};

export default Sidebar;

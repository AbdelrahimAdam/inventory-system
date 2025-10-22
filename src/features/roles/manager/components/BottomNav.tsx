import React, { useState, useEffect, useCallback, RefObject } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiBox,
  FiPackage,
  FiPrinter,
  FiBarChart2,
  FiMenu,
} from "react-icons/fi";
import { useSidebar } from "./sidebar-context";

interface BottomNavProps {
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

export default function BottomNav({ scrollContainerRef }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar, isMobile } = useSidebar();

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => setMounted(true), []);

  // Hide/show nav on scroll
  useEffect(() => {
    if (!scrollContainerRef?.current) return;
    const container = scrollContainerRef.current;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = container.scrollTop;
          setIsVisible(currentScrollY <= lastScrollY || currentScrollY <= 50);
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, scrollContainerRef]);

  const navItems = [
    { icon: FiHome, label: "الرئيسية", path: "/manager/dashboard" },
    { icon: FiBarChart2, label: "الإحصائيات", path: "/manager/reports" },
    { icon: FiBox, label: "المخزن", path: "/manager/inventory" },
    { icon: FiPackage, label: "الإكسسوارات", path: "/manager/main-inventory/add-item" },
    { icon: FiPrinter, label: "المطبعة", path: "/manager/main-inventory/transfer-to-print" },
  ];

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path || location.pathname.startsWith(path + "/"),
    [location.pathname]
  );

  if (!mounted || !isMobile) return null;

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-50 lg:hidden transform transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg h-16">
        <div className="grid grid-cols-6 h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center transition-all duration-200 ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon size={20} className={active ? "scale-110" : ""} />
                <span className="text-[10px] mt-1 font-medium truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="flex flex-col items-center justify-center transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FiMenu size={20} />
            <span className="text-[10px] mt-1 font-medium">القائمة</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

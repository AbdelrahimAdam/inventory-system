import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserMenu from './UserMenu';
import { Helmet } from 'react-helmet-async';
import { ROLE_TITLES } from '../../utils/constants';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_TITLES_AR: Record<string, string> = {
  dashboard: "لوحة التحكم",
  profile: "الملف الشخصي",
  settings: "الإعدادات",
  orders: "الطلبات",
  products: "المنتجات",
  add: "إضافة",
  view: "عرض",
  edit: "تعديل",
  users: "المستخدمين",
  analytics: "تحليلات",
  inventory: "المخزون",
};

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, logout } = useAuth();

  const getPageTitle = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment || lastSegment === role) {
      return PAGE_TITLES_AR["dashboard"];
    }
    return PAGE_TITLES_AR[lastSegment] || decodeURIComponent(lastSegment);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error("فشل تسجيل الخروج", error);
    }
  };

  if (!role || !user) return null;

  const title = getPageTitle();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-40 relative">
      <Helmet>
        <title>{title} | {ROLE_TITLES[role]}</title>
      </Helmet>

      <nav
        className="flex items-center justify-between px-4 py-3 md:px-6"
        role="navigation"
        aria-label="شريط العنوان"
      >
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden text-gray-600 dark:text-gray-300"
            aria-label="تبديل القائمة الجانبية"
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Page title */}
          <h1 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white">
            {title}
          </h1>
        </div>

        <UserMenu user={user} role={role} onLogout={handleLogout} />
      </nav>
    </header>
  );
};

export default Header;

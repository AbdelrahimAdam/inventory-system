import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaSignOutAlt,
  FaUsersCog,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { User } from "../../types"; // Update to match your actual User type

interface UserMenuProps {
  user: User;
  role: string;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, role, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const handleDashboardRedirect = () => {
    navigate(`/${role}`);
    setIsOpen(false);
  };

  const handleManageUsers = () => {
    navigate("/manager/users");
    setIsOpen(false);
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      !buttonRef.current?.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager": return "مدير";
      case "supplier": return "مورد";
      case "worker": return "عامل";
      case "buyer": return "مشتري";
      default: return "مستخدم";
    }
  };

  return (
    <div className="relative inline-block text-right" dir="rtl" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="user-menu"
      >
        <FaUserCircle className="text-xl text-gray-800 dark:text-white" />
        <span className="text-sm font-medium text-gray-800 dark:text-white">{user.name}</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          id="user-menu"
          role="menu"
          aria-label="قائمة المستخدم"
          className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
        >
          <div className="p-3 text-sm text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">
            <div><strong>البريد:</strong> {user.email}</div>
            <div><strong>الدور:</strong> {getRoleLabel(role)}</div>
          </div>

          <button
            onClick={handleDashboardRedirect}
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <MdDashboard />
            لوحة التحكم
          </button>

          {role === "manager" && (
            <button
              onClick={handleManageUsers}
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <FaUsersCog />
              إدارة المستخدمين
            </button>
          )}

          <button
            onClick={onLogout}
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/20 transition"
          >
            <FaSignOutAlt />
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

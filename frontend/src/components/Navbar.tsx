import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, LogIn, LogOut } from "lucide-react";
import { useModal } from "./ModalStack";
import { useNotifications } from "../hooks/useNotifications";
import { getFullName, getInitials } from "../utils/user";
import type { AuthUser } from "@shared/types";

interface NavbarProps {
  user: AuthUser | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const { openModal } = useModal();
  const { notifications } = useNotifications(!!user);
  const unreadCount = notifications.filter((n) => !n.is_read && n.status === "pending").length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <nav className="bg-gray-900 border-b border-gray-700 shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">
        <Link
          to="/"
          className="text-white transition-colors hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Task Manager
        </Link>
      </h1>

      {user ? (
        <div className="flex items-center gap-4">
          <button
            onClick={() => openModal("notifications")}
            className="relative p-2 rounded-full bg-gray-800 text-gray-200 hover:bg-gray-700"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center uppercase text-sm font-semibold">
                {getInitials(user)}
              </div>
              <ChevronDown size={16} className="text-gray-300" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-800 border border-gray-700 shadow-lg overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm font-semibold text-white">{getFullName(user)}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Link
          to="/signin"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <LogIn size={16} />
          Sign In
        </Link>
      )}
    </nav>
  );
}

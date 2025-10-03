import { Bell } from "lucide-react";
import { useModal } from "./ModalStack";
import { useNotifications } from "../hooks/useNotifications";
import { getFullName, getInitials } from "../utils/user";
import type { AuthUser } from "@shared/types";

interface NavbarProps {
  user: AuthUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Navbar({ user, onLoginClick, onLogout }: NavbarProps) {
  const { openModal } = useModal();
  const { notifications } = useNotifications(!!user);
  const unreadCount = notifications.filter((n) => !n.is_read && n.status === "pending").length;

  return (
    <nav className="bg-gray-900 border-b border-gray-700 shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">Task Manager</h1>

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
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center uppercase text-sm font-semibold">
              {getInitials(user)}
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold text-white">{getFullName(user)}</span>
              <span className="text-xs text-gray-400">@{user.username}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            Log out
          </button>
        </div>
      ) : (
        <button
          onClick={onLoginClick}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
        >
          Log In
        </button>
      )}
    </nav>
  );
}

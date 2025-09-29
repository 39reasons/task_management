import { useState } from "react";
import AuthModal from "./auth/AuthModal";

interface NavbarProps {
  user: any;
  onLogin: (user: any, token: string) => void;
  onLogout: () => void;
}

export default function Navbar({ user, onLogin, onLogout }: NavbarProps) {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <nav className="bg-gray-900 p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">Task Manager</h1>

      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-gray-300">{user.username}</span>
          <button
            onClick={onLogout}
            className="px-3 py-1 rounded bg-gray-700 text-white"
          >
            Log out
          </button>
        </div>
      ) : (
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
        >
          Log In
        </button>
      )}

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onLogin={(user, token) => {
          onLogin(user, token);
          setModalOpen(false); // close after login
        }}
      />
    </nav>
  );
}

import { useState } from "react";

export default function Navbar({
  user,
  onLoginClick,
  onLogout,
}: {
  user: { username: string } | null;
  onLoginClick: () => void;
  onLogout: () => void;
}) {
  return (
    <nav className="bg-gray-900 border-b border-gray-700 shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">Task Manager</h1>

      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-gray-300">{user.username}</span>
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

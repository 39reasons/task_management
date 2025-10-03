import { useEffect, useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignUpForm";
import type { AuthUser } from "@shared/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AuthUser, token: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (isOpen) setMode("login");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-96 ring-1 ring-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        {mode === "login" ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Log In</h2>
            <LoginForm
              onLogin={(user, token) => {
                localStorage.setItem("token", token);
                onLogin(user, token);
                onClose();
              }}
            />
            <p className="text-gray-400 text-sm mt-6 text-center">
              New here?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-blue-400 hover:underline"
              >
                Sign up
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign Up</h2>
            <SignupForm
              onSignUp={(user, token) => {
                localStorage.setItem("token", token);
                onLogin(user, token);
                onClose();
              }}
            />
            <p className="text-gray-400 text-sm mt-6 text-center">
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-blue-400 hover:underline"
              >
                Log in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";
import type { AuthUser } from "@shared/types";

interface SignInPageProps {
  onAuthenticated: (user: AuthUser, token: string) => void;
}

export default function SignInPage({ onAuthenticated }: SignInPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const locationState = (location.state as { from?: string } | null) ?? null;
  const redirectTarget = searchParams.get("redirect") || locationState?.from || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800/80 p-8 shadow-xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">Sign In</h1>
        <LoginForm
          onLogin={(user, token) => {
            localStorage.setItem("token", token);
            onAuthenticated(user, token);
            navigate(redirectTarget, { replace: true });
          }}
        />
        <p className="mt-6 text-center text-sm text-gray-400">
          New here?{" "}
          <Link to="/signup" className="text-blue-400 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

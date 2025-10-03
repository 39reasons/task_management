import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SignupForm from "../components/auth/SignUpForm";
import type { AuthUser } from "@shared/types";

interface SignUpPageProps {
  onAuthenticated: (user: AuthUser, token: string) => void;
}

export default function SignUpPage({ onAuthenticated }: SignUpPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTarget = searchParams.get("redirect") || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800/80 p-8 shadow-xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">Create Account</h1>
        <SignupForm
          onSignUp={(user, token) => {
            localStorage.setItem("token", token);
            onAuthenticated(user, token);
            navigate(redirectTarget, { replace: true });
          }}
        />
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/signin" className="text-blue-400 hover:underline">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}

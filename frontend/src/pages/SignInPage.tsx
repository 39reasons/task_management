import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";
import type { AuthUser } from "@shared/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Sign in</CardTitle>
          <CardDescription>
            Welcome back! Enter your credentials to access your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            onLogin={(user, token) => {
              localStorage.setItem("token", token);
              onAuthenticated(user, token);
              navigate(redirectTarget, { replace: true });
            }}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

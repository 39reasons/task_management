import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SignupForm from "../components/auth/SignUpForm";
import type { AuthUser } from "@shared/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui";

interface SignUpPageProps {
  onAuthenticated: (user: AuthUser, token: string) => void;
}

export default function SignUpPage({ onAuthenticated }: SignUpPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTarget = searchParams.get("redirect") || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Create an account</CardTitle>
          <CardDescription>
            Get started by setting up your profile details and a secure password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm
            onSignUp={(user, token) => {
              localStorage.setItem("token", token);
              onAuthenticated(user, token);
              navigate(redirectTarget, { replace: true });
            }}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/signin" className="font-medium text-primary hover:underline">
              Sign in instead
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

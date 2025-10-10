import { useState } from "react";
import { useMutation } from "@apollo/client";
import { LOGIN } from "../../graphql";
import InputField from "./InputField";
import { Button } from "../ui";
import { Loader2 } from "lucide-react";
import type { AuthUser } from "@shared/types";

interface LoginFormProps {
  onLogin: (user: AuthUser, token: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [login, { loading }] = useMutation(LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await login({ variables: { username, password } });
      onLogin(data.login.user, data.login.token);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <InputField
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />

      <InputField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <Button type="submit" className="w-full font-semibold" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging in…
          </>
        ) : (
          "Log In"
        )}
      </Button>
    </form>
  );
}

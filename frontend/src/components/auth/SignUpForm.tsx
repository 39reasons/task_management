import { useState } from "react";
import { useMutation } from "@apollo/client";
import { SIGN_UP } from "../../graphql";
import InputField from "./InputField";
import type { AuthUser } from "@shared/types";

interface SignupFormProps {
  onSignUp: (user: AuthUser, token: string) => void;
}

export default function SignupForm({ onSignUp }: SignupFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  
  const [signUp, { loading }] = useMutation(SIGN_UP);

  const normalizeName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const [firstChar, ...rest] = trimmed;
    return `${firstChar.toUpperCase()}${rest.join("")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match!");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please provide both a first and last name.");
      return;
    }
    try {
      const normalizedFirst = normalizeName(firstName);
      const normalizedLast = normalizeName(lastName);
      const { data } = await signUp({
        variables: {
          first_name: normalizedFirst,
          last_name: normalizedLast,
          username,
          password,
        },
      });
      onSignUp(data.signUp.user, data.signUp.token);
    } catch (err: any) {
      const rawMessage = err?.message ?? "";
      if (rawMessage.toLowerCase().includes("username is already taken")) {
        setError("That username is already taken. Please choose another.");
      } else {
        setError(rawMessage || "We couldn't complete your sign up right now. Please try again in a moment.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <div className="flex-1">
          <InputField
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => setFirstName(normalizeName(firstName))}
            autoComplete="given-name"
          />
        </div>
        <div className="flex-1">
          <InputField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onBlur={() => setLastName(normalizeName(lastName))}
            autoComplete="family-name"
          />
        </div>
      </div>

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
        autoComplete="new-password"
      />

      <InputField
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 
                   text-white font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}

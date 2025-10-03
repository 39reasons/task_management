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
      const { data } = await signUp({
        variables: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username,
          password,
        },
      });
      onSignUp(data.signUp.user, data.signUp.token);
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
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
            placeholder="Ada"
          />
        </div>
        <div className="flex-1">
          <InputField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Lovelace"
          />
        </div>
      </div>

      <InputField
        label="Username (unique handle)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Choose a unique username"
      />

      <InputField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="********"
      />

      <InputField
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="********"
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

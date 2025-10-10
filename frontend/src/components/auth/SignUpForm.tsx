import { useState } from "react";
import { useMutation } from "@apollo/client";
import { SIGN_UP } from "../../graphql";
import InputField from "./InputField";
import { Button } from "../ui";
import { Loader2 } from "lucide-react";
import type { AuthUser } from "@shared/types";

interface SignupFormProps {
  onSignUp: (user: AuthUser, token: string) => void;
}

const MAX_NAME_LENGTH = 32;
const MAX_USERNAME_LENGTH = 32;
const MAX_PASSWORD_LENGTH = 64;
const NAME_PATTERN = /^[A-Za-z]+$/;
const USERNAME_PATTERN = /^(?!.*[-_]{2})[A-Za-z0-9_-]+$/;

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
    setError("");

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedUsername = username.trim();

    if (!password.trim()) {
      setError("Please choose a password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match!");
      return;
    }
    if (!trimmedFirst || !trimmedLast) {
      setError("Please provide both a first and last name.");
      return;
    }
    if (trimmedFirst.length > MAX_NAME_LENGTH) {
      setError(`First name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    if (trimmedLast.length > MAX_NAME_LENGTH) {
      setError(`Last name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    if (!NAME_PATTERN.test(trimmedFirst)) {
      setError("First name can only contain letters.");
      return;
    }
    if (!NAME_PATTERN.test(trimmedLast)) {
      setError("Last name can only contain letters.");
      return;
    }
    if (!trimmedUsername) {
      setError("Please choose a username.");
      return;
    }
    if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
      setError(`Username cannot exceed ${MAX_USERNAME_LENGTH} characters.`);
      return;
    }
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError("Username can only contain letters, numbers, hyphens, or underscores.");
      return;
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setError(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`);
      return;
    }

    try {
      const normalizedFirst = normalizeName(trimmedFirst);
      const normalizedLast = normalizeName(trimmedLast);
      const { data } = await signUp({
        variables: {
          first_name: normalizedFirst,
          last_name: normalizedLast,
          username: trimmedUsername,
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
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <InputField
            label="First Name"
            value={firstName}
            onChange={(e) =>
              setFirstName(
                e.target.value
                  .replace(/[^A-Za-z]/g, "")
                  .slice(0, MAX_NAME_LENGTH)
              )
            }
            onBlur={() => setFirstName(normalizeName(firstName))}
            autoComplete="given-name"
            maxLength={MAX_NAME_LENGTH}
          />
        </div>
        <div>
          <InputField
            label="Last Name"
            value={lastName}
            onChange={(e) =>
              setLastName(
                e.target.value
                  .replace(/[^A-Za-z]/g, "")
                  .slice(0, MAX_NAME_LENGTH)
              )
            }
            onBlur={() => setLastName(normalizeName(lastName))}
            autoComplete="family-name"
            maxLength={MAX_NAME_LENGTH}
          />
        </div>
      </div>

      <InputField
        label="Username"
        value={username}
        onChange={(e) =>
          setUsername(
            e.target.value
              .replace(/[^A-Za-z0-9_-]/g, "")
              .replace(/([-_])\1+/g, "$1")
              .slice(0, MAX_USERNAME_LENGTH)
          )
        }
        autoComplete="username"
        maxLength={MAX_USERNAME_LENGTH}
      />

      <InputField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
        autoComplete="new-password"
        maxLength={MAX_PASSWORD_LENGTH}
      />

      <InputField
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
        autoComplete="new-password"
        maxLength={MAX_PASSWORD_LENGTH}
      />

      <Button type="submit" className="w-full font-semibold" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing up…
          </>
        ) : (
          "Sign Up"
        )}
      </Button>
    </form>
  );
}

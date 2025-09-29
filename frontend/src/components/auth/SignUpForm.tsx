import { useState } from "react";
import InputField from "./InputField";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }
    alert(`Sign up with: ${name} / ${username}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Display Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name or nickname"
      />

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
        className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 
                   text-white font-semibold transition-colors"
      >
        Sign Up
      </button>
    </form>
  );
}

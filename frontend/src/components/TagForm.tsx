import { useState } from "react";
import { useMutation } from "@apollo/client";
import { ADD_TAG } from "../graphql";
import { COLOR_WHEEL } from "../constants/colors";

export function TagForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(COLOR_WHEEL[0]);

  const [addTag, { loading }] = useMutation(ADD_TAG, {
    onCompleted: () => {
      setName("");
      setColor(COLOR_WHEEL[0]);
      if (onCreated) onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !color) return;
    addTag({ variables: { name: name.trim(), color } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Tag Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          className="w-full rounded-md border border-gray-600 bg-gray-900 text-white px-3 py-2"
          placeholder="Enter tag name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_WHEEL.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 ${
                color === c ? "border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!name.trim() || !color || loading}
        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Tag"}
      </button>
    </form>
  );
}

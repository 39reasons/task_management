import { type FormEvent, useState } from "react";
import { useMutation } from "@apollo/client";
import { Loader2 } from "lucide-react";
import { ADD_TAG } from "../graphql";
import { COLOR_WHEEL } from "../constants/colors";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !color) return;
    addTag({ variables: { name: name.trim(), color } });
  };

  const isDisabled = !name.trim() || !color || loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="tag-name">Tag name</Label>
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter tag name"
          maxLength={40}
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_WHEEL.map((value) => {
            const isSelected = color === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setColor(value)}
                className={cn(
                  "h-8 w-8 rounded-full border border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:border-border"
                )}
                style={{ backgroundColor: value }}
              >
                <span className="sr-only">Select color {value}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={isDisabled} className="gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating…
          </>
        ) : (
          "Create tag"
        )}
      </Button>
    </form>
  );
}

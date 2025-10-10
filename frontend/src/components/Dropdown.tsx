import { useState, useEffect } from "react";

interface DropdownProps {
  value: string | null;
  options: string[];
  onChange: (val: string | null) => void;
}

export function Dropdown({ value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    setHighlightIndex(value ? options.indexOf(value) : -1);
  }, [value, options]);

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground shadow-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {value ?? "Select..."}
      </button>

      {open && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {options.map((option, idx) => (
            <li
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                idx === highlightIndex
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

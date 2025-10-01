import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

export function Dropdown({ value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Keyboard handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev === null ? 0 : (prev + 1) % options.length
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev === null
            ? options.length - 1
            : (prev - 1 + options.length) % options.length
        );
      }

      if (e.key === "Enter" || e.key === " ") {
        if (highlightIndex !== null) {
          e.preventDefault();
          onChange(options[highlightIndex]);
          setOpen(false);
        }
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown, { capture: true });
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true } as any);
    };
  }, [open, highlightIndex, options, onChange]);

  // Click-outside handling
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); // just close, keep current value
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-sm">
      {/* Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setHighlightIndex(options.indexOf(value));
        }}
        className="inline-flex items-center px-2 py-1.5
                   rounded-lg bg-gray-900 text-white border border-gray-600
                   focus:ring-2 focus:ring-blue-500"
      >
        {value}
        <ChevronDown size={14} className="ml-1 text-gray-400" />
      </button>

      {/* Options */}
      {open && (
        <div className="absolute left-0 mt-1 w-max rounded-md bg-gray-800 border border-gray-600 shadow-lg z-10">
          {options.map((opt, idx) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlightIndex(idx)} // 👈 update highlight on hover
              className={`px-3 py-1.5 cursor-pointer 
                ${opt === value ? "text-blue-400" : "text-white"} 
                ${highlightIndex === idx ? "bg-gray-700" : ""}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

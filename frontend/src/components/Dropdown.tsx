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
        className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600 text-left"
      >
        {value ?? "Select..."}
      </button>

      {open && (
        <ul className="absolute mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10">
          {options.map((option, idx) => (
            <li
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer ${
                idx === highlightIndex ? "bg-blue-600 text-white" : "text-gray-200"
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

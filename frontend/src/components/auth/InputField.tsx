import { useId } from "react";

interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  helperText?: string;
  autoComplete?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  maxLength?: number;
}

export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  helperText,
  autoComplete,
  onBlur,
  maxLength,
}: InputFieldProps) {
  const inputId = useId();
  const placeholderText = placeholder ?? label;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholderText}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className="peer w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white placeholder-transparent focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-gray-700 px-1 text-sm text-gray-400 transition-all duration-150 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-blue-300 peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs"
        >
          {label}
        </label>
      </div>
      {helperText && (
        <p className="text-xs text-gray-400">{helperText}</p>
      )}
    </div>
  );
}

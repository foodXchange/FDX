'use client';
import { useRef, useState } from "react";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  placeholder?: string;
}

export default function ArrayInput({
  values,
  onChange,
  label,
  placeholder = "Add and press Enter",
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const val = raw
      .toLowerCase()
      .trim()
      .replace(/,+$/, "")
      .trim();
    if (!val || values.includes(val)) {
      setInputValue("");
      return;
    }
    onChange([...values, val]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(inputValue);
    } else if (e.key === "Backspace" && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <div
        className="flex flex-wrap gap-1.5 border border-gray-200 rounded-lg p-2 min-h-[44px] cursor-text focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1"
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(values.filter((x) => x !== v));
              }}
              className="text-orange-400 hover:text-orange-600 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) add(inputValue);
          }}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

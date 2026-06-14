"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CategoryOption = { id: string; name: string };

interface CategoryComboboxProps {
  value: string;
  categories: CategoryOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CategoryCombobox({
  value,
  categories,
  onChange,
  disabled,
  placeholder = "— select category —",
}: CategoryComboboxProps) {
  const [query, setQuery] = useState(
    () => categories.find((c) => c.id === value)?.name ?? ""
  );
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(categories.find((c) => c.id === value)?.name ?? "");
  }, [value, categories]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
        setQuery(categories.find((c) => c.id === value)?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, categories]);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(trimmed));
  }, [query, categories]);

  function selectCategory(cat: CategoryOption) {
    setQuery(cat.name);
    setOpen(false);
    setHighlightedIndex(-1);
    onChange(cat.id);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && highlightedIndex >= 0 && matches[highlightedIndex]) {
        e.preventDefault();
        selectCategory(matches[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      setQuery(categories.find((c) => c.id === value)?.name ?? "");
    }
  }

  function clear() {
    setQuery("");
    setOpen(false);
    setHighlightedIndex(-1);
    onChange("");
  }

  return (
    <div className="relative w-full max-w-xs text-xs" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50 disabled:text-gray-400"
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear category"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {matches.map((c, idx) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectCategory(c)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`block w-full px-3 py-1.5 text-left text-xs ${
                  idx === highlightedIndex
                    ? "bg-orange-100 text-orange-700"
                    : c.id === value
                    ? "bg-orange-50 font-semibold text-orange-700"
                    : "text-gray-700 hover:bg-orange-50"
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

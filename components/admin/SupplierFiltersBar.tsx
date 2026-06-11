"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WORLD_COUNTRIES } from "@/lib/constants/countries";

type Option = {
  value: string;
  label: string;
};

const COUNTRY_SEARCH_ALIASES: Record<string, string> = {
  UAE: "United Arab Emirates",
  US: "United States",
  USA: "United States",
};

type SupplierFiltersBarProps = {
  q: string;
  country: string;
  category: string;
  status: string;
  priority: string;
  page: number;
  perPage: number;
  totalCount: number;
  priorities: number[];
  categories: Option[];
};

export function SupplierFiltersBar({
  q,
  country,
  category,
  status,
  priority,
  page,
  perPage,
  totalCount,
  priorities,
  categories,
}: SupplierFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(q);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQuery(q);
  }, [q]);

  function buildSearchParams(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    if (next.get("page") === "0") next.delete("page");
    if (next.get("per_page") === "50") next.delete("per_page");

    return next;
  }

  function updateUrl(overrides: Record<string, string | undefined>) {
    const next = buildSearchParams(overrides);
    startTransition(() => {
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query === q) return;
      updateUrl({ q: query.trim(), page: "0" });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, q]);

  const hasActiveFilters =
    !!q || !!country || !!category || !!status || priority !== "";

  const showingStart = totalCount === 0 ? 0 : page * perPage + 1;
  const showingEnd = Math.min((page + 1) * perPage, totalCount);

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-4 mb-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex flex-col gap-3">
          <label className="sr-only" htmlFor="supplier-search">
            Search suppliers
          </label>
          <input
            id="supplier-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company name or website"
            className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <div className="flex flex-wrap gap-2">
            <CountryCombobox
              label="Country"
              value={country}
              countries={WORLD_COUNTRIES}
              onChange={(nextValue) => updateUrl({ country: nextValue, page: "0" })}
            />
            <SelectField
              label="Category"
              value={category}
              options={categories}
              onChange={(nextValue) => updateUrl({ category: nextValue, page: "0" })}
            />
            <SelectField
              label="Status"
              value={status}
              options={[
                { value: "", label: "All statuses" },
                { value: "approved", label: "Approved" },
                { value: "pending", label: "Pending" },
              ]}
              onChange={(nextValue) => updateUrl({ status: nextValue, page: "0" })}
            />
            <SelectField
              label="Priority"
              value={priority}
              options={[
                { value: "", label: "All priorities" },
                ...priorities.map((value) => ({ value: String(value), label: String(value) })),
              ]}
              onChange={(nextValue) => updateUrl({ priority: nextValue, page: "0" })}
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="text-sm text-gray-500">
            Showing {showingStart}–{showingEnd} of {totalCount.toLocaleString()} suppliers
          </p>
          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/suppliers/export${buildSearchParams({}).toString() ? `?${buildSearchParams({}).toString()}` : ""}`}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              ⬇ Export CSV
            </a>
            {hasActiveFilters && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              onClick={() => updateUrl({ q: "", country: "", category: "", status: "", priority: "", page: "0" })}
              disabled={isPending}
            >
              Clear filters
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CountryCombobox({
  label,
  value,
  countries,
  onChange,
}: {
  label: string;
  value: string;
  countries: string[];
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return countries;
    const needle = trimmed.toLowerCase();
    const aliasTarget = COUNTRY_SEARCH_ALIASES[trimmed.toUpperCase()];
    return countries.filter(
      (c) => c.toLowerCase().includes(needle) || (aliasTarget !== undefined && c === aliasTarget)
    );
  }, [query, countries]);

  function selectCountry(nextCountry: string) {
    setQuery(nextCountry);
    setOpen(false);
    onChange(nextCountry);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (next.trim() === "") onChange("");
  }

  function clear() {
    setQuery("");
    setOpen(false);
    onChange("");
  }

  return (
    <div className="relative min-w-40 text-xs text-slate-500" ref={containerRef}>
      <span className="mb-2 block font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="All countries"
          className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear country filter"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
          {matches.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => selectCountry(c)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                  c === value ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700"
                }`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-40 text-xs text-slate-500">
      <span className="mb-2 block font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

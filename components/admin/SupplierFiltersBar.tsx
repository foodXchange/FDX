"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = {
  value: string;
  label: string;
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
  countries: string[];
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
  countries,
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
            <SelectField
              label="Country"
              value={country}
              options={[{ value: "", label: "All countries" },
                ...countries.map((value) => ({ value, label: value }))]}
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

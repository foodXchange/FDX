"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getInitials } from "@/lib/admin/avatarPalette";
import { countryToFlag } from "@/lib/admin/countryFlag";
import type { PublicSupplierCard } from "@/app/en/suppliers/page";

interface Props {
  suppliers: PublicSupplierCard[];
}

const PAGE_SIZE = 24;

const pillBase =
  "text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap shrink-0 cursor-pointer";
const pillActive = "bg-orange-500 border-orange-500 text-white";
const pillInactive = "border-white/10 text-slate-400 hover:border-orange-500/40";

function SupplierLogo({
  logoUrl,
  companyName,
  size,
}: {
  logoUrl: string | null;
  companyName: string;
  size: number;
}) {
  if (logoUrl) {
    return (
      <div
        className="relative shrink-0 rounded-xl overflow-hidden border border-white/10 bg-white/5"
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={companyName} fill className="object-contain" sizes={`${size}px`} />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-xl border border-white/10 bg-slate-800 text-orange-400 flex items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(companyName)}
    </div>
  );
}

export default function SuppliersDirectoryClient({ suppliers }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [country, setCountry] = useState("All");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(suppliers.flatMap((s) => s.categories ?? []))).sort(),
    ],
    [suppliers]
  );

  const countries = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(suppliers.map((s) => s.country_of_origin).filter((c): c is string => Boolean(c)))
      ).sort(),
    ],
    [suppliers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (category !== "All" && !(s.categories ?? []).includes(category)) return false;
      if (country !== "All" && s.country_of_origin !== country) return false;
      if (q) {
        const haystack = `${s.company_name} ${s.product_description ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, search, category, country]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > paginated.length;

  function resetFilters() {
    setSearch("");
    setCategory("All");
    setCountry("All");
    setPage(1);
  }

  return (
    <>
      {/* SEARCH + COUNTRY FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search suppliers or products..."
          className="dark-input flex-1"
        />
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
          className="dark-input sm:w-56"
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All countries" : c}
            </option>
          ))}
        </select>
      </div>

      {/* CATEGORY PILLS */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={`${pillBase} ${category === cat ? pillActive : pillInactive}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* RESULTS COUNT */}
      <p className="text-sm text-slate-500 mb-4">
        {filtered.length} supplier{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg font-medium">No suppliers match your filters</p>
          <button
            onClick={resetFilters}
            className="mt-3 text-orange-400 text-sm hover:underline"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((s) => {
              const flag = countryToFlag(s.country_of_origin);
              const cats = s.categories ?? [];
              const certs = s.certifications ?? [];
              return (
                <Link
                  key={s.id}
                  href={`/en/suppliers/${s.id}`}
                  className="dark-card p-5 flex flex-col gap-3 hover:border-orange-400/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <SupplierLogo logoUrl={s.logo_url} companyName={s.company_name} size={48} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{s.company_name}</h3>
                      {s.country_of_origin && (
                        <p className="text-xs text-slate-400">
                          {flag ? `${flag} ` : ""}
                          {s.country_of_origin}
                        </p>
                      )}
                    </div>
                    {s.verified && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 shrink-0">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  {s.product_description && (
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                      {s.product_description}
                    </p>
                  )}

                  {cats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cats.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-300"
                        >
                          {c}
                        </span>
                      ))}
                      {cats.length > 3 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-400">
                          +{cats.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {certs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {certs.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="btn-ghost px-6 py-3 rounded-md font-medium"
              >
                Load more suppliers
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";
import {
  SECTORS,
  CATEGORIES,
  type Sector,
} from "@/lib/taxonomy/companyTaxonomy";

export type EcosystemPartnerRow = {
  id: string;
  company_name: string;
  sector: Sector | "other";
  business_role: string | null;
  taxonomy_category: string | null;
  country_of_origin: string | null;
  website: string | null;
  offerings_summary: string | null;
  product_description: string | null;
  capabilities: string[] | null;
  taxonomy_tags: string[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  logo_url: string | null;
  is_potential_buyer: boolean | null;
  created_at: string | null;
};

interface Props {
  initialPartners: EcosystemPartnerRow[];
  initialSector?: string;
  initialCategory?: string;
}

export const SECTOR_CONFIG: Record<
  string,
  { label: string; icon: string; desc: string; badge: string }
> = {
  packaging: {
    label: "Packaging & Containers",
    icon: "📦",
    desc: "Bottles, jars, cans, flexible films, closures, and OEM private-label printing",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  logistics_freight: {
    label: "Logistics & Cold Storage",
    icon: "🚚",
    desc: "Reefer transport, freight forwarders, cold storage, and port customs clearance",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
  },
  certification_lab: {
    label: "Labs & Kosher Supervision",
    icon: "🔬",
    desc: "Kosher supervision agencies, food testing labs, BRC/IFS auditing, and compliance",
    badge: "bg-purple-50 text-purple-800 border-purple-200",
  },
  machinery_equipment: {
    label: "Processing Machinery & Lines",
    icon: "⚙️",
    desc: "Industrial food processing equipment, commercial ovens, bottling lines, and refrigeration",
    badge: "bg-slate-100 text-slate-800 border-slate-300",
  },
  ingredients_additives: {
    label: "Ingredients & Raw Materials",
    icon: "🌾",
    desc: "Flavors, bulk raw materials, starches, proteins, texturizers, and manufacturing inputs",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  trade_promotion: {
    label: "Trade Consortia & Agencies",
    icon: "🏛️",
    desc: "Regional producer cooperatives, government export agencies, and international trade bodies",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
  },
  retail_fixtures_tech: {
    label: "Retail Tech & Equipment",
    icon: "🖥️",
    desc: "Supermarket shelving, display refrigeration, POS systems, and digital HACCP compliance",
    badge: "bg-violet-50 text-violet-800 border-violet-200",
  },
  tableware_disposables: {
    label: "Foodservice Disposables",
    icon: "🍽️",
    desc: "Disposable cutlery, paper goods, napkins, glassware, and tableware for food service",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
  },
  cleaning_hygiene: {
    label: "Industrial Hygiene & Sanitation",
    icon: "🧼",
    desc: "Food-grade sanitizers, facility cleaning chemicals, and industrial food hygiene solutions",
    badge: "bg-teal-50 text-teal-800 border-teal-200",
  },
  professional_services: {
    label: "Consulting & Trade Legal",
    icon: "💼",
    desc: "Food branding, international trade law, compliance, customs consulting, and trade finance",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  other: {
    label: "Other Complementary Partners",
    icon: "📁",
    desc: "Other complementary business entities and service providers supporting trade",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const PAGE_SIZE = 24;

export function EcosystemDirectoryClient({
  initialPartners,
  initialSector,
  initialCategory,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [partners] = useState<EcosystemPartnerRow[]>(initialPartners);
  const [selectedSector, setSelectedSector] = useState<string>(
    initialSector || searchParams.get("sector") || "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || searchParams.get("category") || "all"
  );
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Sync sector from URL query param
  useEffect(() => {
    const s = searchParams.get("sector");
    if (s && s !== selectedSector) {
      setSelectedSector(s);
      setSelectedCategory("all");
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Sector counts
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { all: partners.length };
    for (const p of partners) {
      const s = p.sector || "other";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [partners]);

  // Available categories for selected sector
  const availableCategories = useMemo(() => {
    if (selectedSector === "all") return [];
    const secKey = selectedSector as Sector;
    return CATEGORIES[secKey] ?? [];
  }, [selectedSector]);

  // Category counts within active sector
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of partners) {
      if (selectedSector !== "all" && p.sector !== selectedSector) continue;
      if (p.taxonomy_category) {
        counts[p.taxonomy_category] = (counts[p.taxonomy_category] ?? 0) + 1;
      }
    }
    return counts;
  }, [partners, selectedSector]);

  // Available countries
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const p of partners) {
      if (p.country_of_origin) set.add(p.country_of_origin);
    }
    return Array.from(set).sort();
  }, [partners]);

  // Filtered partners
  const filtered = useMemo(() => {
    let result = partners;

    if (selectedSector !== "all") {
      result = result.filter((p) => p.sector === selectedSector);
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.taxonomy_category === selectedCategory);
    }

    if (selectedCountry !== "all") {
      result = result.filter((p) => p.country_of_origin === selectedCountry);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => {
        return (
          p.company_name.toLowerCase().includes(q) ||
          (p.country_of_origin ?? "").toLowerCase().includes(q) ||
          (p.taxonomy_category ?? "").toLowerCase().includes(q) ||
          (p.offerings_summary ?? "").toLowerCase().includes(q) ||
          (p.contact_email ?? "").toLowerCase().includes(q) ||
          (p.capabilities ?? []).some((c) => c.toLowerCase().includes(q)) ||
          (p.taxonomy_tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [partners, selectedSector, selectedCategory, selectedCountry, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const updateSector = (sector: string) => {
    setSelectedSector(sector);
    setSelectedCategory("all");
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (sector === "all") {
      params.delete("sector");
    } else {
      params.set("sector", sector);
    }
    params.delete("category");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const activeSectorMeta = SECTOR_CONFIG[selectedSector] ?? null;

  return (
    <div className="space-y-6">
      {/* Sector Spotlight Header Banner */}
      {activeSectorMeta && selectedSector !== "all" ? (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-4xl p-3 bg-white/10 rounded-2xl backdrop-blur-xs shrink-0">
                {activeSectorMeta.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    Trade Partner Sector
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-xs font-mono text-slate-300">
                    {sectorCounts[selectedSector] ?? 0} Companies Available
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-0.5">
                  {activeSectorMeta.label}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {activeSectorMeta.desc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSector("all")}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition"
              >
                &larr; View All Sectors
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sector Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => updateSector("all")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              selectedSector === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>🌐 All Sectors</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedSector === "all"
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {sectorCounts.all}
            </span>
          </button>

          {Object.entries(SECTOR_CONFIG).map(([key, meta]) => {
            const count = sectorCounts[key] ?? 0;
            if (count === 0 && key !== "packaging" && key !== "logistics_freight" && key !== "certification_lab") {
              return null; // hide completely empty unused sectors
            }
            const isActive = selectedSector === key;
            return (
              <button
                key={key}
                onClick={() => updateSector(key)}
                className={`px-3 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-slate-700 text-white"
                      : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-Category Filter Pills (When a sector is selected) */}
        {availableCategories.length > 0 && selectedSector !== "all" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-slate-100 text-xs no-scrollbar">
            <span className="text-slate-400 font-semibold shrink-0 mr-1">Categories:</span>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                selectedCategory === "all"
                  ? "bg-orange-500 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Subcategories
            </button>
            {availableCategories.map((cat) => {
              const cCount = categoryCounts[cat] ?? 0;
              const isCatActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    isCatActive
                      ? "bg-orange-500 text-white font-bold shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{cat}</span>
                  {cCount > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded-full font-mono ${
                        isCatActive ? "bg-orange-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      {cCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search and Secondary Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search partners by name, capabilities, materials, country…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Country Selector */}
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none cursor-pointer focus:bg-white focus:border-orange-400"
          >
            <option value="all">🌍 All Countries ({countries.length})</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table View"
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((partner) => {
            const secMeta = SECTOR_CONFIG[partner.sector] ?? SECTOR_CONFIG.other;
            return (
              <div
                key={partner.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Logo, Company & Origin */}
                  <div className="flex items-start gap-3">
                    {partner.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={partner.logo_url}
                        alt=""
                        onClick={() => setLightboxImage(partner.logo_url)}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 cursor-pointer hover:opacity-90 shrink-0"
                      />
                    ) : (
                      (() => {
                        const { bg, text } = avatarColors(partner.company_name);
                        return (
                          <div
                            className={`w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-sm font-bold shrink-0 ${bg} ${text}`}
                          >
                            {getInitials(partner.company_name)}
                          </div>
                        );
                      })()
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {partner.company_name}
                        </h3>
                        {partner.website && (
                          <a
                            href={partner.website.startsWith("http") ? partner.website : `https://${partner.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-orange-600 transition text-xs shrink-0"
                            title="Visit official website"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>📍 {partner.country_of_origin || "Global"}</span>
                        {partner.business_role && (
                          <span className="text-[11px] text-slate-400 capitalize">
                            &bull; {partner.business_role.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sector & Category Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${secMeta.badge}`}
                    >
                      <span>{secMeta.icon}</span>
                      <span>{secMeta.label}</span>
                    </span>
                    {partner.taxonomy_category && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                        {partner.taxonomy_category}
                      </span>
                    )}
                    {partner.is_potential_buyer && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                        🎯 Potential Buyer Lead
                      </span>
                    )}
                  </div>

                  {/* Offerings Summary */}
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-3">
                    {partner.offerings_summary ||
                      partner.product_description ||
                      "Verified non-food trade ecosystem partner."}
                  </p>

                  {/* Capabilities Chips */}
                  {partner.capabilities && partner.capabilities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-3">
                      {partner.capabilities.slice(0, 4).map((cap, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium"
                        >
                          {cap}
                        </span>
                      ))}
                      {partner.capabilities.length > 4 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          +{partner.capabilities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Verified Contacts & Snapshot Link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {partner.contact_email ? (
                      <a
                        href={`mailto:${partner.contact_email}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition"
                        title={partner.contact_email}
                      >
                        ✉️
                      </a>
                    ) : null}

                    {partner.contact_phone ? (
                      <a
                        href={`tel:${partner.contact_phone}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition"
                        title={partner.contact_phone}
                      >
                        📞
                      </a>
                    ) : null}

                    {partner.contact_name && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                        👤 {partner.contact_name}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/admin/suppliers/${partner.id}`}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold hover:underline"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left w-12">Logo</th>
                  <th className="px-4 py-3 text-left min-w-[220px]">Company &amp; Origin</th>
                  <th className="px-4 py-3 text-left">Sector &amp; Category</th>
                  <th className="px-4 py-3 text-left max-w-sm">Offerings &amp; Equipment</th>
                  <th className="px-4 py-3 text-left">Verified Contacts</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((partner) => {
                  const secMeta = SECTOR_CONFIG[partner.sector] ?? SECTOR_CONFIG.other;
                  return (
                    <tr key={partner.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        {partner.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={partner.logo_url}
                            alt=""
                            onClick={() => setLightboxImage(partner.logo_url)}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                          />
                        ) : (
                          (() => {
                            const { bg, text } = avatarColors(partner.company_name);
                            return (
                              <div
                                className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold ${bg} ${text}`}
                              >
                                {getInitials(partner.company_name)}
                              </div>
                            );
                          })()
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{partner.company_name}</span>
                          {partner.website && (
                            <a
                              href={partner.website.startsWith("http") ? partner.website : `https://${partner.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-orange-600 transition text-xs"
                              title="Visit website"
                            >
                              ↗
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          📍 {partner.country_of_origin || "Global"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${secMeta.badge}`}
                        >
                          {secMeta.icon} {secMeta.label}
                        </span>
                        {partner.taxonomy_category && (
                          <div className="text-slate-600 font-medium">
                            {partner.taxonomy_category}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600 max-w-sm">
                        <p className="line-clamp-2 leading-relaxed">
                          {partner.offerings_summary || partner.product_description || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs space-y-1">
                        {partner.contact_email && (
                          <div className="font-mono text-slate-700">
                            <a href={`mailto:${partner.contact_email}`} className="hover:underline">
                              ✉️ {partner.contact_email}
                            </a>
                          </div>
                        )}
                        {partner.contact_phone && (
                          <div className="font-mono text-slate-500">
                            📞 {partner.contact_phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/suppliers/${partner.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-3xl">
          <div className="text-3xl mb-2">🔍</div>
          <h4 className="text-sm font-bold text-slate-800">No trade partners found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, sector, or category filter.
          </p>
        </div>
      )}

      {/* Pagination Footer */}
      {filtered.length > 0 && (
        <div className="px-6 py-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shadow-2xs">
          <div>
            Showing <span className="font-bold text-slate-800">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{filtered.length}</span> trade partners
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs cursor-pointer"
            >
              &larr; Previous
            </button>
            <span className="px-2 font-mono text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs cursor-pointer"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Lightbox for Logo */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

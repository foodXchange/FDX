"use client";

import { useState } from "react";
import Link from "next/link";

interface SourcingCategoryConfig {
  id: string;
  name: string;
  icon: string;
  factoriesCount: string;
  transitTime: string;
  sampleTime: string;
  certifications: string[];
  popularFormats: string;
}

const CATEGORIES: SourcingCategoryConfig[] = [
  {
    id: "canned_tomatoes",
    name: "Canned Tomatoes & Sauces",
    icon: "🥫",
    factoriesCount: "68+ Factories",
    transitTime: "7–10 days (Salerno/Napoli → Ashdod)",
    sampleTime: "3–4 days via DHL",
    certifications: ["BRC Grade AA", "IFS", "Chief Rabbinate", "Badatz"],
    popularFormats: "400g Tins, 2.5kg Foodservice, 220kg Aseptic Drums",
  },
  {
    id: "pasta_grains",
    name: "Durum Wheat Pasta & Grains",
    icon: "🍝",
    factoriesCount: "94+ Factories",
    transitTime: "8–12 days (Genoa/Bari → Haifa)",
    sampleTime: "3–5 days via FedEx",
    certifications: ["BRC", "IFS", "ISO 22000", "Kosher Pareve"],
    popularFormats: "500g Pillow Bags, 1kg Standup Pouch, Bulk Cartons",
  },
  {
    id: "olive_oil",
    name: "Extra Virgin Olive Oil & Oils",
    icon: "🫒",
    factoriesCount: "52+ Factories",
    transitTime: "6–9 days (Valencia/Piraeus → Ashdod)",
    sampleTime: "2–4 days via Express",
    certifications: ["BRC", "IFS", "DOP/PGI", "Chief Rabbinate"],
    popularFormats: "750ml Marasca Glass, 1L Pet, 5L Tin, Flexitank",
  },
  {
    id: "frozen_foods",
    name: "Frozen IQF Fruits & Vegetables",
    icon: "🫐",
    factoriesCount: "81+ Factories",
    transitTime: "12–16 days (Reefer Container)",
    sampleTime: "Dry-Ice Express",
    certifications: ["BRCGS", "HACCP", "Kosher Mehadrin", "Bio/Organic"],
    popularFormats: "400g Retail Bags, 2.5kg Foodservice, 10kg Octabins",
  },
  {
    id: "bakery_biscuits",
    name: "Private Label Biscuits & Confectionery",
    icon: "🍪",
    factoriesCount: "73+ Factories",
    transitTime: "10–14 days (Antwerp/Hamburg → Haifa)",
    sampleTime: "4–5 days via Express",
    certifications: ["IFS Food", "BRC", "Kosher Dairy / Chalav Yisrael"],
    popularFormats: "Flow-wrap 150g–300g, Display SRP Cartons",
  },
  {
    id: "tuna_seafood",
    name: "Canned Tuna & Seafood",
    icon: "🐟",
    factoriesCount: "38+ Factories",
    transitTime: "14–21 days (Direct Ocean Freight)",
    sampleTime: "Air sample dispatch",
    certifications: ["Friend of the Sea", "BRC", "Kosher Rabbanut / Mehadrin"],
    popularFormats: "80g / 160g 3-Packs, 1kg Pouches, Olive / Canola Oil",
  },
];

export default function InteractiveSourcingFinder() {
  const [selectedCatId, setSelectedCatId] = useState(CATEGORIES[0].id);
  const [volumeType, setVolumeType] = useState<"fcl" | "multi_fcl" | "trial">("fcl");

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCatId) || CATEGORIES[0];

  const targetUrl = `/en/buyers?category=${encodeURIComponent(
    currentCategory.name
  )}&volume=${volumeType}`;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden text-left">
      {/* Background glow accent */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Interactive Sourcing Estimator
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Explore Qualified European Manufacturers
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Select a category to view pre-screened factories, transit times, and compliance benchmarks for the Israeli market.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
          <span>🇮🇱 Direct to Haifa & Ashdod</span>
        </div>
      </div>

      {/* Category Pills Selector */}
      <div className="relative mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
          Select Sourcing Category:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedCatId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition text-left cursor-pointer border ${
                  isSelected
                    ? "bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20 font-bold"
                    : "bg-slate-800/60 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-base sm:text-lg">{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Volume Toggle */}
      <div className="relative mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Target Import Volume:
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "trial", label: "Trial Order / 1–2 Pallets (Air/LCL)" },
            { id: "fcl", label: "Full Container Load (1 FCL ~20–24 Tons)" },
            { id: "multi_fcl", label: "Annual Supply Contract (Multiple FCLs)" },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVolumeType(v.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                volumeType === v.id
                  ? "bg-slate-700 text-white border-slate-500"
                  : "bg-slate-800/40 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Benchmark Card */}
      <div className="relative bg-slate-800/80 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400">Verified Factories</div>
            <div className="text-lg font-bold text-orange-400">{currentCategory.factoriesCount}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400">Ocean Transit</div>
            <div className="text-sm font-semibold text-white truncate">{currentCategory.transitTime}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400">Sample Delivery</div>
            <div className="text-sm font-semibold text-white">{currentCategory.sampleTime}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400">Export Packaging</div>
            <div className="text-xs font-semibold text-slate-300 truncate">{currentCategory.popularFormats}</div>
          </div>
        </div>

        {/* Certifications preview */}
        <div className="mt-4 pt-3.5 border-t border-slate-700/60 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Compliance Standards:</span>
          {currentCategory.certifications.map((cert) => (
            <span
              key={cert}
              className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
            >
              ✓ {cert}
            </span>
          ))}
        </div>
      </div>

      {/* Action Gateway */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          <span>⚡ Direct factory pricing with normalized CIF Haifa/Ashdod calculation. Zero commitment.</span>
        </div>

        <Link
          href={targetUrl}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span>Find Factories for {currentCategory.name}</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}

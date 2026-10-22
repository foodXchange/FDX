"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { toCategorySlug } from "@/lib/products/categorySlug";
import { getHebrewCategoryMeta } from "@/lib/products/hebrewCategoryMap";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";
import type {
  PublicCatalogueProduct,
  CategoryImageData,
  ComputedCatStat,
} from "@/app/en/products/page";

interface Props {
  allCategories: string[];
  stats: Record<string, ComputedCatStat>;
  catImages: Record<string, CategoryImageData>;
}

const COUNTRY_NAMES_HE: Record<string, string> = {
  Spain: "ספרד",
  Italy: "איטליה",
  France: "צרפת",
  Portugal: "פורטוגל",
  Greece: "יוון",
  Turkey: "טורקיה",
  Morocco: "מרוקו",
  Israel: "ישראל",
  Germany: "גרמניה",
  Netherlands: "הולנד",
  Poland: "פולין",
  Belgium: "בלגיה",
  Ukraine: "אוקראינה",
  Romania: "רומניה",
  Bulgaria: "בולגריה",
};

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "🇪🇸",
  Italy: "🇮🇹",
  France: "🇫🇷",
  Portugal: "🇵🇹",
  Greece: "🇬🇷",
  Turkey: "🇹🇷",
  Morocco: "🇲🇦",
  Israel: "🇮🇱",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  Poland: "🇵🇱",
  Belgium: "🇧🇪",
  Ukraine: "🇺🇦",
  Romania: "🇷🇴",
  Bulgaria: "🇧🇬",
};

export default function ProductsHubClientHe({
  allCategories,
  stats,
  catImages,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKosherFilter, setSelectedKosherFilter] = useState<string>("all");
  const [privateLabelFilter, setPrivateLabelFilter] = useState(false);

  // Compute total platform metrics
  const totalProducts = useMemo(
    () => Object.values(stats).reduce((acc, s) => acc + s.count, 0),
    [stats]
  );

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      const meta = getHebrewCategoryMeta(cat);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const matchHe = meta.title.toLowerCase().includes(query);
      const matchDesc = meta.description.toLowerCase().includes(query);
      const matchEn = cat.toLowerCase().includes(query);
      return matchHe || matchDesc || matchEn;
    });
  }, [allCategories, searchQuery]);

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* ── HERO BANNER ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span>🇮🇱 קטלוג מוצרים ומאגר יצרנים אירופאיים</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            מעל <span className="text-orange-500">{totalProducts.toLocaleString()}+</span> מוצרי מזון
            <span className="block text-slate-200">ישירות ממפעלים מאושרים באירופה</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            איתור ממוקד של יצרנים לרשתות שיווק, סיטונאים ויבואני מזון בישראל:
            מותג פרטי (Private Label), בדיקת נתיבי כשרות רבנות ובד״ץ, תמחור CIF Haifa/Ashdod ישירות מהמקור.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש קטגוריה או מוצר (למשל: שמן זית, טונה, צ׳יפס, עגבניות, פסטה)..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 text-white placeholder-slate-500 rounded-2xl py-3.5 pr-11 pl-4 text-sm focus:outline-hidden transition shadow-inner"
              />
              <span className="absolute right-4 top-3.5 text-slate-400 text-base">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3.5 top-3.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Quick Tags */}
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <span className="text-slate-400 font-medium py-1">קטגוריות מבוקשות:</span>
            {[
              { label: "🫒 שמן זית", query: "שמן" },
              { label: "🥫 שימורי טונה", query: "טונה" },
              { label: "🍟 צ׳יפס קפוא", query: "קפוא" },
              { label: "🍅 עגבניות ורסק", query: "עגבניות" },
              { label: "🍝 פסטה איטלקית", query: "פסטה" },
              { label: "🍪 עוגיות ומאפים", query: "עוגיות" },
            ].map((tag) => (
              <button
                key={tag.label}
                onClick={() => setSearchQuery(tag.query)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS SUMMARY BAR ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-orange-400">
            {totalProducts.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">מוצרים מאושרים בקטלוג</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-white">
            {allCategories.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">ענפי מזון מובילים</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            15+
          </div>
          <div className="text-xs text-slate-400 mt-1">מדינות מקור באירופה</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-sky-400">
            100%
          </div>
          <div className="text-xs text-slate-400 mt-1">יבוא מותאם לרשתות בישראל</div>
        </div>
      </div>

      {/* ── CATEGORY GRID ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>🗂️</span>
            <span>ענפי מזון וקטגוריות ראשיות</span>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredCategories.length} קטגוריות)
            </span>
          </h2>

          <Link
            href="/he/sourcing"
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1"
          >
            <span>לא מצאתם? הגישו בקשת איתור אישית (RFQ)</span>
            <span>←</span>
          </Link>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-3">
            <span className="text-4xl block">🔍</span>
            <p className="text-slate-300 font-semibold text-base">
              לא נמצאו קטגוריות התואמות לחיפוש &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              אנו מבצעים סורסינג מותאם אישית (Bespoke Sourcing) לכל מוצר מזון באירופה. הגישו בקשת RFQ ונאתר עבורכם את המפעל המתאים.
            </p>
            <div className="pt-2">
              <Link
                href="/he/sourcing"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition"
              >
                <span>הגש בקשת איתור RFQ ←</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCategories.map((cat) => {
              const slug = toCategorySlug(cat);
              const meta = getHebrewCategoryMeta(cat);
              const stat = stats[cat];
              const img = catImages[cat];
              const catColor = CATEGORY_COLORS[cat] ?? "#888780";
              const gradientStyle =
                img?.gradient_from && img?.gradient_to
                  ? { background: `linear-gradient(135deg, ${img.gradient_from}, ${img.gradient_to})` }
                  : { background: `linear-gradient(135deg, ${catColor}cc, ${catColor}88)` };

              return (
                <Link
                  key={cat}
                  href={`/he/products/${slug}`}
                  className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/50 rounded-2xl overflow-hidden transition duration-300 flex flex-col justify-between shadow-lg hover:shadow-orange-500/5"
                >
                  {/* Category Image / Gradient Header */}
                  <div
                    style={gradientStyle}
                    className="relative h-36 w-full overflow-hidden"
                  >
                    {img?.image_url && (
                      <Image
                        src={img.image_url}
                        alt={meta.title}
                        fill
                        className="object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <span className="text-2xl filter drop-shadow">{meta.icon}</span>
                    </div>

                    <div className="absolute top-3 left-3 z-10">
                      {stat?.count > 0 && (
                        <span className="bg-slate-900/80 backdrop-blur-sm border border-white/10 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                          {stat.count.toLocaleString()} מוצרים
                        </span>
                      )}
                    </div>

                    {/* Category Title on image bottom */}
                    <div className="absolute bottom-3 right-3 left-3 z-10">
                      <h3 className="font-bold text-white text-base group-hover:text-orange-400 transition leading-snug">
                        {meta.title}
                      </h3>
                      <div className="text-[11px] text-slate-300/80 truncate font-mono">
                        {cat}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {meta.description}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {/* Countries */}
                      {stat?.top_countries && stat.top_countries.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="text-[11px] text-slate-500">מקור:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {stat.top_countries.slice(0, 4).map((c) => (
                              <span
                                key={c}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50"
                                title={c}
                              >
                                <span>{COUNTRY_FLAG[c] ?? "🌍"}</span>
                                <span>{COUNTRY_NAMES_HE[c] ?? c}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Kosher & PL indicators */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-emerald-400/90 font-medium flex items-center gap-1">
                          <span>✡️</span>
                          <span>{stat?.kosher_pct ?? 0}% נתיבי כשרות</span>
                        </span>
                        <span className="text-orange-400 group-hover:translate-x-[-2px] transition font-bold text-xs inline-flex items-center gap-1">
                          <span>צפה במוצרים</span>
                          <span>←</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CONVERSION & SOURCING BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-orange-950/20 to-slate-900 border border-orange-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-right max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span>🚀 סורסינג מותאם אישית (Bespoke Sourcing)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            מחפשים מותג פרטי או מפרט ייעודי שלא מופיע בקטלוג?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            העלו צילום של מוצר בנצ׳מרק קיים מהמדף בישראל, צלמו תווית רכיבים או תארו בעברית. אנו מצליבים את הדרישה מול 600+ יצרני מזון ומציגים כרטיס מפעל בתוך 24 שעות.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <Link
            href="/he/sourcing"
            className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-xl transition shadow-lg shadow-orange-500/25 text-center"
          >
            <span>העלה תמונת בנצ׳מרק (RFQ) ←</span>
          </Link>
          <a
            href="https://wa.me/972525222291?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%95%D7%93%D7%99%2C%20%D7%90%D7%A0%D7%99%20%D7%A7%D7%A0%D7%99%D7%99%D7%9F%20%D7%9E%D7%96%D7%95%D7%9F%20%D7%91%D7%99%D7%A9%D7%A8%D7%90%D7%9C%20%D7%95%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%9C%D7%91%D7%93%D7%95%D7%A7%20%D7%A1%D7%A4%D7%A7%20%D7%90%D7%99%D7%A8%D7%95%D7%A4%D7%90%D7%99%20%D7%9E%D7%AA%D7%90%D7%99%D7%9D."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-xl transition shadow-lg shadow-emerald-600/20 text-center"
          >
            <span>💬 שיחה בווטסאפ</span>
          </a>
        </div>
      </div>
    </div>
  );
}

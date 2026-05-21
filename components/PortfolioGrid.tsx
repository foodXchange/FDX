'use client';
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  hero_image: string | null;
  priority: number | null;
}

interface PortfolioGridProps {
  items: PortfolioItem[];
}

export default function PortfolioGrid({ items }: PortfolioGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = [
    "All",
    ...Array.from(
      new Set(
        items
          .map((i) => i.category)
          .filter((c): c is string => Boolean(c))
      )
    ).sort(),
  ];

  const filtered =
    activeCategory === "All"
      ? items
      : items.filter((i) => i.category === activeCategory);

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-lg font-medium">Scenarios coming soon</p>
      </div>
    );
  }

  return (
    <>
      {/* FILTER BAR */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span
                  className={`ml-1.5 text-xs ${
                    activeCategory === cat ? "text-orange-100" : "text-slate-400"
                  }`}
                >
                  ({items.filter((i) => i.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="text-slate-500 text-sm">No scenarios in this category yet.</p>
            <button
              onClick={() => setActiveCategory("All")}
              className="mt-3 text-orange-600 text-sm hover:underline"
            >
              View all scenarios
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.slug}
              className="group border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* IMAGE */}
              <Link href={`/en/portfolio/${item.slug}`} className="block">
                <div className="relative w-full h-48 overflow-hidden">
                  {item.hero_image ? (
                    <>
                      <Image
                        src={item.hero_image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        quality={78}
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-85 group-hover:opacity-95 transition" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-white text-base font-semibold leading-tight drop-shadow line-clamp-2">
                          {item.title}
                        </h2>
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full bg-slate-800 flex items-center justify-center">
                      {item.category && (
                        <span className="text-slate-400 text-sm font-medium">{item.category}</span>
                      )}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-white text-base font-semibold leading-tight line-clamp-2">
                          {item.title}
                        </h2>
                      </div>
                    </div>
                  )}
                </div>
              </Link>

              {/* CONTENT */}
              <div className="p-5">
                {item.category && (
                  <span className="inline-block bg-orange-100 text-orange-700 rounded-full px-3 py-1 text-xs font-medium mb-3">
                    {item.category}
                  </span>
                )}
                {item.summary && (
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">
                    {item.summary}
                  </p>
                )}
                <Link
                  href={`/en/portfolio/${item.slug}`}
                  className="inline-flex items-center text-orange-600 font-medium text-sm hover:text-orange-700 hover:underline focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 rounded"
                >
                  View scenario →
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}

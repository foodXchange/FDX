"use client";

import { useState } from "react";
import Link from "next/link";
import type { SourcingBoardRequest } from "@/app/en/sourcing-board/page";

interface Props {
  requests: SourcingBoardRequest[];
  categoryImageMap: Record<string, string>;
}

function daysAgo(dateStr: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function RequestCard({
  request,
  categoryImage,
}: {
  request: SourcingBoardRequest;
  categoryImage?: string;
}) {
  const productName = request.product_name ?? request.message?.slice(0, 60);
  const nonKosherCerts = (request.certifications ?? []).filter(
    (c) => !c.toLowerCase().includes("kosher")
  );

  const manufacturerHref = `/en/manufacturers?${new URLSearchParams({
    ...(request.product_name ? { product: request.product_name } : {}),
    ...(request.category ? { category: request.category } : {}),
  }).toString()}`;

  return (
    <div className="relative overflow-hidden border border-slate-200 rounded-2xl p-6 hover:border-orange-300 hover:shadow-md transition-all duration-200 bg-white flex flex-col">
      {categoryImage && (
        <img
          src={categoryImage}
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-32 object-contain opacity-10 pointer-events-none"
        />
      )}
      {/* Top row */}
      <div className="flex items-center justify-between mb-1">
        {request.category && (
          <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 text-xs font-medium">
            {request.category}
          </span>
        )}
        <span className="text-slate-400 text-xs ml-auto">
          {daysAgo(request.created_at)}
        </span>
      </div>

      {/* Product name */}
      <h3 className="text-xl font-bold text-slate-900 mt-3 mb-3 leading-snug">
        {productName}
      </h3>

      {/* Requirement chips */}
      <div className="flex flex-wrap gap-2">
        {request.kosher_required && request.kosher_type && (
          <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-xs">
            ✡️ {request.kosher_type}
          </span>
        )}
        {request.kosher_required && !request.kosher_type && (
          <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-xs">
            ✡️ Kosher required
          </span>
        )}
        {request.passover_kosher && (
          <span className="bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1 text-xs">
            🌿 Passover certified
          </span>
        )}
        {request.branding === "private_label" && (
          <span className="bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3 py-1 text-xs">
            🏷️ Private label
          </span>
        )}
        {request.branding === "supplier_brand" && (
          <span className="bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1 text-xs">
            ® Branded
          </span>
        )}
        {request.packaging_preference && (
          <span className="bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1 text-xs">
            📦 {request.packaging_preference}
          </span>
        )}
        {nonKosherCerts.map((cert) => (
          <span
            key={cert}
            className="bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1 text-xs"
          >
            {cert}
          </span>
        ))}
      </div>

      {/* Tags */}
      {(request.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {(request.tags ?? []).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-slate-50 text-slate-400 rounded px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-auto pt-4 border-t border-slate-50">
        <Link
          href={manufacturerHref}
          className="text-orange-600 hover:text-orange-700 text-sm font-medium transition"
        >
          I manufacture this →
        </Link>
      </div>
    </div>
  );
}

export default function SourcingBoardFilter({ requests, categoryImageMap }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");

  const uniqueCategories = [
    ...new Set(requests.map((r) => r.category).filter(Boolean)),
  ] as string[];

  const filtered =
    activeCategory === "all"
      ? requests
      : requests.filter((r) => r.category === activeCategory);

  return (
    <>
      {/* STICKY FILTER BAR */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-10 py-4 px-6">
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`text-sm px-4 py-2 rounded-full whitespace-nowrap transition flex-shrink-0 ${
              activeCategory === "all"
                ? "bg-orange-500 text-white"
                : "border border-slate-200 text-slate-600 hover:border-orange-300"
            }`}
          >
            All ({requests.length})
          </button>
          {uniqueCategories.map((cat) => {
            const count = requests.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-sm px-4 py-2 rounded-full whitespace-nowrap transition flex-shrink-0 ${
                  activeCategory === cat
                    ? "bg-orange-500 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-orange-300"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* REQUESTS GRID */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-3">🔍</p>
            <p className="text-slate-700 font-medium mb-2">
              No active requests right now
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Check back soon — new requests arrive weekly.
            </p>
            <Link
              href="/en/contact"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium transition"
            >
              Contact us →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                categoryImage={categoryImageMap[request.category ?? ""]}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

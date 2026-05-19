"use client";

import { useState } from "react";

type FAQItem = { q: string; a: string };

export default function FAQAccordion({
  items,
  title,
}: {
  items: FAQItem[];
  title?: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div>
      {title && (
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10">
          {title}
        </h2>
      )}
      <div className="space-y-3 max-w-3xl mx-auto">
        {items.map((item, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-2xl bg-white overflow-hidden"
          >
            <button
              className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              aria-expanded={openIdx === i}
            >
              <span className="font-semibold text-slate-900 text-sm leading-snug">
                {item.q}
              </span>
              <span
                className={`text-orange-500 flex-shrink-0 transition-transform duration-200 ${
                  openIdx === i ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            {openIdx === i && (
              <div className="px-6 pb-5 pt-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

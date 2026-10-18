"use client";

import SourcingRequestForm from "@/components/forms/SourcingRequestForm";

const BUYER_JOURNEY = [
  {
    step: "1",
    icon: "📸",
    title: "3 Photos or Voice",
    sub: "Benchmark label, pack & specs",
  },
  {
    step: "2",
    icon: "⚡",
    title: "1-Click Specs",
    sub: "Brand, pack, weight & kosher",
  },
  {
    step: "3",
    icon: "🎯",
    title: "AI Factory Match",
    sub: "25,000+ verified SKUs scanned",
  },
  {
    step: "4",
    icon: "🤝",
    title: "Direct Quotes",
    sub: "Samples & commercial terms",
  },
];

export default function BuyerRequestSection() {
  return (
    <div>
      {/* ── Visual Buyer Journey Strip (Minimal Words, High Clarity) ── */}
      <section className="px-6 py-6 border-b border-dark-border bg-slate-950/60">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BUYER_JOURNEY.map((item, idx) => (
              <div
                key={item.step}
                className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a]/90 px-3.5 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-lg">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                      Step {item.step}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.sub}
                  </p>
                </div>
                {idx < BUYER_JOURNEY.length - 1 && (
                  <span className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs z-10">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Trusted by:
            </span>
            <span>Shufersal</span>
            <span className="text-slate-600">·</span>
            <span>Yochananof</span>
            <span className="text-slate-600">·</span>
            <span>Rami Levy</span>
            <span className="text-slate-600">·</span>
            <span>Ta&apos;aman</span>
            <span className="text-slate-600">·</span>
            <span>H. Cohen</span>
            <span className="text-slate-600">·</span>
            <span>Leiman Schlussel</span>
          </div>
        </div>
      </section>

      <SourcingRequestForm
        source="buyers-page"
        showExamples
        heading="Start Your Sourcing Request"
        subheading="Upload photos, speak in Hebrew/English, or tap quick specs below."
      />
    </div>
  );
}

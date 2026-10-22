"use client";

import Link from "next/link";
import SourcingRequestForm from "@/components/forms/SourcingRequestForm";

interface Props {
  lang?: "en" | "he";
}

const BUYER_JOURNEY_EN = [
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

const BUYER_JOURNEY_HE = [
  {
    step: "1",
    icon: "📸",
    title: "3 תמונות או הקלטה",
    sub: "תווית מוצר, אריזה ומפרט",
  },
  {
    step: "2",
    icon: "⚡",
    title: "מפרט מהיר בקליק",
    sub: "מותג פרטי, כשרות ונפח מכולות",
  },
  {
    step: "3",
    icon: "🎯",
    title: "איתור מפעלים מותאם",
    sub: "סריקת 600+ יצרנים באירופה",
  },
  {
    step: "4",
    icon: "🤝",
    title: "הצעת מחיר ודוגמאות",
    sub: "תמחור CIF Haifa וטעימות",
  },
];

export default function BuyerRequestSection({ lang = "en" }: Props) {
  const isHe = lang === "he";
  const journey = isHe ? BUYER_JOURNEY_HE : BUYER_JOURNEY_EN;

  return (
    <div dir={isHe ? "rtl" : "ltr"}>
      {/* ── Visual Buyer Journey Strip (Minimal Words, High Clarity) ── */}
      <section className="px-6 py-6 border-b border-dark-border bg-slate-950/60">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {journey.map((item, idx) => (
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
                      {isHe ? `שלב ${item.step}` : `Step ${item.step}`}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.sub}
                  </p>
                </div>
                {idx < journey.length - 1 && (
                  <span className={`hidden md:block absolute ${isHe ? "-left-2.5" : "-right-2.5"} top-1/2 -translate-y-1/2 text-slate-600 text-xs z-10`}>
                    {isHe ? "←" : "→"}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              {isHe ? "ספקי מזון מובילים עבור:" : "Trusted by:"}
            </span>
            <span>שופרסל</span>
            <span className="text-slate-600">·</span>
            <span>יוחננוף</span>
            <span className="text-slate-600">·</span>
            <span>רמי לוי</span>
            <span className="text-slate-600">·</span>
            <span>ויקטורי</span>
            <span className="text-slate-600">·</span>
            <span>אושר עד</span>
            <span className="text-slate-600">·</span>
            <span>טעמן</span>
            <span className="text-slate-600">·</span>
            <span>ליימן דיפסל</span>
            <span className="text-slate-600">·</span>
            <span>ח. כהן</span>
          </div>

          {/* Sourcing Guidance & Trust Callout */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-400">
              <span className="text-orange-400 font-bold">
                {isHe ? "💡 הנחיות לקניין:" : "💡 Buyer Guidance:"}
              </span>
              <Link href={isHe ? "/he/import-guide" : "/en/help/tips-for-a-strong-sourcing-request"} className="hover:text-white underline decoration-slate-600 transition">
                {isHe ? "טיפים לבקשת רכש מדויקת" : "Tips for Strong Briefs"}
              </Link>
              <span className="text-slate-600">•</span>
              <Link href={isHe ? "/business-card/udi?lang=he" : "/en/help/how-sourcing-works"} className="hover:text-white underline decoration-slate-600 transition">
                {isHe ? "לוח זמנים לקבלת הצעות" : "Factory Outreach Timeline"}
              </Link>
              <span className="text-slate-600">•</span>
              <Link href={isHe ? "/he/import-guide" : "/en/import-guide"} className="hover:text-white underline decoration-slate-600 transition">
                {isHe ? "מדריך יבוא וכשרות" : "Israeli Import Guide"}
              </Link>
            </div>
            <Link href={isHe ? "/business-card/udi?lang=he" : "/en/help/working-with-foodxchange"} className="text-slate-400 hover:text-orange-400 font-medium transition flex items-center gap-1">
              <span>{isHe ? "🔒 סודיות והגנת מחירים מסחריים" : "🔒 Confidentiality & Price Protection"}</span>
              <span>{isHe ? "←" : "→"}</span>
            </Link>
          </div>
        </div>
      </section>

      <SourcingRequestForm
        source={isHe ? "buyers-page-he" : "buyers-page"}
        lang={lang}
        showExamples
        heading={isHe ? "הגשת בקשת רכש ממוקדת (RFQ)" : "Start Your Sourcing Request"}
        subheading={isHe ? "העלו 1–3 תמונות, דברו בעברית, או סמנו מפרט מהיר בקליק." : "Upload photos, speak in Hebrew/English, or tap quick specs below."}
      />
    </div>
  );
}

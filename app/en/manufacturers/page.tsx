import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import FAQAccordion from "@/components/FAQAccordion";
import SupplierWidget from "@/components/SupplierWidget";

export const metadata: Metadata = {
  title: "For Manufacturers | FoodXchange",
  description:
    "Export food products to Israel with the right local partner. We connect international manufacturers with Israeli retailers and handle the commercial alignment.",
  keywords: [
    "export food to Israel",
    "Israeli food market",
    "food manufacturer Israel",
    "kosher certification Israel",
    "private label Israel manufacturer",
    "food import Israel",
  ],
  openGraph: {
    title: "For Manufacturers | FoodXchange",
    description:
      "Israel imports over 70% of its food. For European and international manufacturers, this is a premium, growing market — if you have the right partner.",
    type: "website",
  },
};

const manufacturerFaqs = [
  {
    q: "Do I need kosher certification to start?",
    a: "Not necessarily. We assess your product and category first, then advise on the most practical certification pathway. Some categories have more flexible requirements than others — we'll give you an honest picture before any costs are involved.",
  },
  {
    q: "What volume do Israeli retailers typically require?",
    a: "It varies significantly by category and retailer. We'll give you realistic volume expectations before any introduction, so you can assess commercial viability on your end. There's no point in a meeting if the numbers don't work for you.",
  },
  {
    q: "How are you different from a broker?",
    a: "We don't take commissions on transactions. We build structured partnerships — which means we're motivated by the relationship working long-term, not by closing a deal. If we don't think it's the right fit, we'll tell you — and explain why.",
  },
  {
    q: "How long does it take to get a first introduction?",
    a: "It depends on how specific your category and requirements are. Once we've assessed fit, introductions typically happen within days — not weeks. The alignment work upfront is what makes the introduction meaningful.",
  },
];

export default async function ManufacturersPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <main id="main" className="bg-white text-slate-800">

        {/* ── HERO ── */}
        <section className="relative w-full overflow-hidden" style={{ minHeight: "600px" }}>
          <Image
            src="/images/hero-ashdod-port.png"
            alt="Shipping containers at Ashdod port, Israel's main food import gateway"
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-slate-900/75" />
          <div className="relative z-10 px-6 py-20 sm:py-24 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white max-w-3xl mx-auto">
              Enter the Israeli Food Market —{" "}
              <span className="text-orange-500">With a Real Local Partner</span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">
              Israel imports over 70% of its food products. For European and international
              manufacturers, this is a premium, growing market — but entry requires the right
              positioning and the right introduction.
            </p>

            <p className="mt-4 text-sm text-slate-400">
              We know entering a new market feels uncertain — that&apos;s exactly why we&apos;re here.
            </p>

            <a
              href="/en/sourcing-board"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-medium transition mt-8 mb-2"
            >
              <span>🔍</span>
              See what Israeli buyers are sourcing right now →
            </a>

            <div className="mt-4 flex gap-4 flex-wrap justify-center">
              <Link
                href="/en/contact"
                className="inline-flex bg-orange-500 text-white px-7 py-3.5 rounded-md font-semibold hover:bg-orange-600 transition shadow"
              >
                Tell us what you need →
              </Link>
              <a
                href="https://wa.me/972525222291"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex border border-white/40 text-white px-7 py-3.5 rounded-md font-semibold hover:bg-white/10 transition"
              >
                WhatsApp us
              </a>
            </div>
          </Reveal>
          </div>
        </section>

        {/* ── WIDGET ── */}
        <section className="max-w-2xl mx-auto px-6 -mt-8 pb-16 relative z-10">
          <SupplierWidget source="manufacturers-page" referral={ref} />
        </section>

        {/* ── PROOF STATEMENT BOX ── */}
        <section className="px-6 py-10 bg-orange-50 border-y border-orange-200">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="text-base md:text-lg text-orange-900 font-medium leading-relaxed">
                European manufacturers working with us have established container-level supply
                relationships with Israeli retailers across multiple categories.
              </p>
              <p className="text-sm text-orange-700 mt-3">
                Every manufacturer we work with gets honest feedback, not just enthusiasm.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── MANUFACTURING IMAGE + MARKET STATS ── */}
        <section className="px-6 py-20 bg-white">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: "320px" }}>
                <Image
                  src="/images/eu-manufacturing-facility.png"
                  alt="European food manufacturing facility with modern production line"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={85}
                />
              </div>
            </Reveal>

            <Reveal>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-5">
                The Israeli Market at a Glance
              </p>
              <div className="space-y-5">
                {[
                  ["9.8M", "consumers", "Growing premium segment with high per-capita spend"],
                  ["70%+", "of food imported", "High import dependency across almost every category"],
                  ["Kosher-dominant", "market", "Clear certification path required — we navigate this with you"],
                  ["24h", "port processing", "Ashdod and Haifa — efficient entry points once aligned"],
                ].map(([stat, label, detail], i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="shrink-0 text-right" style={{ minWidth: "80px" }}>
                      <span className="text-xl font-black text-orange-500">{stat}</span>
                      <span className="block text-xs text-slate-400">{label}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed border-l border-slate-200 pl-4 pt-0.5">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── WHAT MAKES A SUCCESSFUL ENTRY ── */}
        <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
                  What Makes a Successful Entry
                </h2>
                <p className="text-slate-500 mt-3 max-w-xl mx-auto">
                  We&apos;ve seen what works and what doesn&apos;t. Here&apos;s what the successful ones have in common.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: "01",
                  title: "Commercial Fit First",
                  body: "We match on MOQ, price point, and category before anything else. If the numbers don't work, the relationship won't either — and we'd rather know that early.",
                },
                {
                  n: "02",
                  title: "Kosher Pathway",
                  body: "We assess your certification options early so there are no surprises. Some categories require full kosher; others have a flexible path. We'll tell you exactly what applies to your product.",
                },
                {
                  n: "03",
                  title: "Long-Term Supply Mindset",
                  body: "Israeli retailers want reliability, not one-time shipments. If you're looking to sell once and move on, we're probably not the right fit — and we'll say so upfront.",
                },
              ].map((item, i) => (
                <Reveal key={i}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm h-full">
                    <span className="text-3xl font-black text-slate-200">{item.n}</span>
                    <h3 className="font-semibold text-slate-900 mt-3 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW WE SUPPORT YOU ── */}
        <section className="px-6 py-24 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                How We Support Your Market Entry
              </h2>
            </Reveal>

            <div className="space-y-5">
              {[
                {
                  title: "We listen before we act",
                  body: "We start by understanding your actual objective — not just your product list. What volume do you need to make this market viable? What&apos;s your kosher situation? What&apos;s your lead time? That shapes everything.",
                },
                {
                  title: "We assess fit honestly",
                  body: "Not every manufacturer is ready for the Israeli market — and that&apos;s fine. If we don&apos;t think the timing or fit is right, we&apos;ll tell you directly and explain why. No point in an introduction that goes nowhere.",
                },
                {
                  title: "We make the right introduction — once",
                  body: "We don&apos;t shotgun introductions to multiple retailers. We find the one that makes sense, prepare both sides, and make a meaningful connection. If we don&apos;t think it&apos;ll work, we won&apos;t do it.",
                },
                {
                  title: "We support the commercial discussion",
                  body: "We stay involved through the early stages — helping navigate expectations on both sides, answering questions, and keeping things moving. We&apos;re not just making an introduction and disappearing.",
                },
              ].map((item, i) => (
                <Reveal key={i}>
                  <div className="flex gap-5 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-orange-500 font-black text-xl shrink-0 mt-0.5">→</span>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── KOSHER & REGULATORY ── */}
        <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-4">
                Kosher &amp; Regulatory — Simplified
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
                We guide the process step by step and focus only on what really matters for
                your specific product and category.
              </p>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                "Kosher requirements clarified before any commitment",
                "Regulatory expectations aligned with your production setup",
                "Simple, focused process — no unnecessary complexity",
              ].map((item, i) => (
                <Reveal key={i}>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
                    <span className="text-orange-500 font-bold mr-2">✓</span>
                    {item}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SUPERMARKET IMAGE ── */}
        <section className="px-6 py-12 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: "360px" }}>
                <Image
                  src="/images/israeli-supermarket-aisle-premium-food-retail.png"
                  alt="Premium food products on Israeli supermarket shelf"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1024px"
                  quality={85}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 py-20 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <FAQAccordion
                title="Common Questions from Manufacturers"
                items={manufacturerFaqs}
              />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 py-24 bg-slate-900 text-white text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold mb-4">
              Start a Conversation
            </h2>
            <p className="text-slate-300 mb-3 max-w-xl mx-auto">
              Tell us about your product and what you&apos;re looking to achieve. We&apos;ll give you
              an honest view of whether the Israeli market makes sense for you right now.
            </p>
            <p className="text-sm text-slate-500 mb-10">
              Every inquiry is read personally. Response within 24 hours.
            </p>
            <Link
              href="/en/contact"
              className="inline-flex bg-orange-500 text-white px-8 py-3.5 rounded-md font-semibold hover:bg-orange-600 transition shadow"
            >
              Tell us what you need →
            </Link>
          </Reveal>
        </section>

      </main>
    </>
  );
}

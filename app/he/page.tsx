import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import FAQAccordion from "@/components/FAQAccordion";

export const metadata: Metadata = {
  title: "Source Food Products for Israeli Retailers | FoodXchange",
  description:
    "Find the right international food supplier for the Israeli market. We match Israeli buyers with European and global manufacturers based on fit, not just availability.",
  keywords: [
    "import food to Israel",
    "food supplier Israel",
    "Israeli food buyer",
    "private label Israel",
    "kosher food supplier",
    "frozen food supplier Israel",
  ],
  openGraph: {
    title: "Source Food Products for Israeli Retailers | FoodXchange",
    description:
      "Israeli buyers: find the supplier that actually fits — specs, kosher path, and volume capacity.",
    type: "website",
  },
};

const buyerFaqs = [
  {
    q: "How do you find suppliers that meet kosher requirements?",
    a: "We pre-screen for kosher certification pathways before any introduction. We only connect you with manufacturers who have a viable kosher path or existing certification — so there are no surprises late in the process.",
  },
  {
    q: "What categories do you work with?",
    a: "Frozen foods, ambient grocery, snacks, dairy alternatives, specialty and ethnic products — primarily from European and international manufacturers. If your category isn't listed, ask us. Our network is broader than the website suggests.",
  },
  {
    q: "How quickly do you respond?",
    a: "Within 24 business hours. Every inquiry is read personally — not by a bot, not by a junior assistant. You'll get a specific answer, not a template reply.",
  },
  {
    q: "Is there a fee to work with you?",
    a: "Our commercial model is based on successful partnerships, not upfront fees. Initial consultations are always free and confidential. We'll explain how we work before anything else.",
  },
];

export default function BuyersPage() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to content
      </a>

      <main id="main" className="bg-white text-slate-800">

        {/* ── HERO ── */}
        <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white max-w-3xl mx-auto">
              Source the Right Food Products for the{" "}
              <span className="text-orange-500">Israeli Market</span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">
              You don&apos;t need more supplier options. You need the supplier that fits — with the right
              specs, kosher path, and capacity for your volume. That&apos;s what we find.
            </p>

            <p className="mt-4 text-sm text-slate-400">
              Response within{" "}
              <span className="text-white font-semibold">24 hours</span>{" "}
              · We respond personally, not with an auto-reply.
            </p>

            <div className="mt-10 flex gap-4 flex-wrap justify-center">
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
        </section>

        {/* ── 3-STEP PROCESS ── */}
        <section className="px-6 py-20 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">How it works</p>
                <h2 className="text-3xl font-semibold text-slate-900">Three steps, no noise</h2>
                <p className="text-slate-500 mt-3 max-w-xl mx-auto">
                  We don&apos;t send you a list of 50 suppliers. We find one that actually fits.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  n: "1",
                  title: "Tell us what you need",
                  body: "Category, target volume, must-haves like kosher or format. The more specific you are, the faster we can work. A 5-minute message is enough.",
                },
                {
                  n: "2",
                  title: "We identify the right match",
                  body: "Not a list — a specific manufacturer. We check specs, capacity, certification pathway, and commercial terms before we introduce anyone.",
                },
                {
                  n: "3",
                  title: "You decide",
                  body: "Full transparency, no pressure. You get clear information about the supplier so you can make your own decision. We support the conversation from there.",
                },
              ].map((step, i) => (
                <Reveal key={i}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm h-full">
                    <div className="w-11 h-11 mb-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-black text-lg">
                      {step.n}
                    </div>
                    <h3 className="font-semibold text-slate-900 text-base mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="relative w-full mt-10 rounded-2xl overflow-hidden" style={{ minHeight: "280px" }}>
                <Image
                  src="/images/buyer-product-review.png"
                  alt="Israeli food buyer reviewing product samples"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  quality={85}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CASE STUDY ── */}
        <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-10">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">Real result</p>
                <h2 className="text-2xl font-semibold text-slate-900">What a real partnership looks like</h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-8">
              <Reveal>
                <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm h-full flex flex-col">
                  <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">OUTCOME</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-3">3–4 Containers per Month</h3>
                  <p className="text-sm text-slate-500 mt-1">Frozen private label — Belgium to Israel</p>

                  <div className="flex-1 mt-5 space-y-4 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Challenge</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        A major supermarket chain needed to expand its private label frozen range but had no reliable European supplier with the right specs and kosher path.
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Found a Belgian manufacturer with aligned specs, assessed kosher pathway, structured commercial terms, and facilitated the introduction with full context.
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Result</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Long-term supply relationship with consistent monthly volume — growing steadily since launch.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-6 pt-4 border-t border-slate-100">
                    Major Israeli Retail Chain · European Manufacturer
                  </p>
                </div>
              </Reveal>

              <Reveal>
                <div className="flex flex-col gap-5 h-full">
                  {[
                    { label: "What we checked", items: ["Category fit and volume match", "Kosher certification pathway", "Packaging spec alignment", "Price point vs. retailer expectations"] },
                    { label: "What you get", items: ["One specific recommendation, not a list", "Full context on the supplier before you meet", "Support through the commercial discussion"] },
                  ].map((block, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{block.label}</p>
                      <ul className="space-y-2">
                        {block.items.map((item, j) => (
                          <li key={j} className="flex gap-2 text-sm text-slate-600">
                            <span className="text-orange-500 font-bold shrink-0">✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section className="px-6 py-20 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <h2 className="text-2xl font-semibold text-slate-900 text-center mb-10">
                Categories we source regularly
              </h2>
            </Reveal>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["❄️", "Frozen foods", "Vegetables, fruit, ready meals, fish"],
                ["🍝", "Pasta & ambient", "Dry goods, sauces, jarred products"],
                ["🍪", "Snacks & innovation", "Better-for-you, ethnic, specialty"],
                ["🥛", "Dairy alternatives", "Plant-based, lactose-free"],
                ["🫙", "Specialty & organic", "Premium segments, premium pricing"],
                ["📦", "Private label", "Own-brand across all categories"],
              ].map(([icon, title, sub], i) => (
                <Reveal key={i}>
                  <div className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <span className="text-2xl shrink-0">{icon}</span>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <FAQAccordion
                title="Common Questions from Israeli Buyers"
                items={buyerFaqs}
              />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 py-24 bg-slate-900 text-white text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold mb-4">
              Just tell us what you&apos;re looking for
            </h2>
            <p className="text-slate-300 mb-3 max-w-xl mx-auto">
              We&apos;ll take it from there. No long forms, no commitments — just a real conversation
              about whether we can help.
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

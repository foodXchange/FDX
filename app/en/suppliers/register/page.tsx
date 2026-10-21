import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import SupplierRegistrationForm from "@/components/suppliers/SupplierRegistrationForm";
import FAQAccordion from "@/components/FAQAccordion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Become a Supplier — Export to Israeli Retailers | FoodXchange",
  description:
    "Register your food manufacturing company and products. Get matched with active retail buyer requests and private-label container orders from leading Israeli supermarket chains.",
  keywords: [
    "food manufacturer Israel",
    "export food to Israel",
    "supplier registration",
    "private label food Israel",
    "Israeli supermarket suppliers",
    "kosher certification food export",
  ],
  openGraph: {
    title: "Become a Verified Food Supplier | FoodXchange",
    description:
      "Connect your factory with Israeli supermarket chains, importers, and distributors. Direct purchase orders, zero listing fees.",
    type: "website",
  },
};

const SUPPLIER_FAQS = [
  {
    q: "Do I need Kosher certification before applying?",
    a: "No! Having Kosher certification is not required to register. We evaluate your products and market fit first. If an Israeli retail chain expresses interest in your products, we provide turn-key guidance on the most practical certification pathway with recognized Rabbinical authorities.",
  },
  {
    q: "What order volumes do Israeli buyers typically purchase?",
    a: "Israeli supermarket chains and major food distributors typically purchase in container-level quantities (20ft or 40ft FCL) for high-turnover categories (such as pasta, olive oil, tomato paste, tuna, biscuits, and frozen foods), and pallet-level trial orders for specialty items.",
  },
  {
    q: "Who handles shipping, port logistics, and customs clearance?",
    a: "Orders are typically executed on FOB or CIF terms. Israeli buyers and import houses handle local port clearance in Ashdod or Haifa, Ministry of Health import permits, and customs formalities.",
  },
  {
    q: "Are my commercial pricing and formulas protected?",
    a: "Absolutely. Your commercial terms, pricing quotes, and proprietary specifications are never published publicly. They are only shared directly with verified buyers after mutual interest is established.",
  },
  {
    q: "What are the fees to register as a supplier?",
    a: "Registration, catalog listing, and receiving algorithmic match opportunities are 100% free with zero upfront or monthly subscription fees. We align on commercial partnership terms only when real transactions succeed.",
  },
];

export default async function SupplierRegisterPage() {
  // Query active sourcing requests for the live demand ticker
  const [
    { count: activeRequestCount },
    { data: sampleRequests }
  ] = await Promise.all([
    supabase
      .from("sourcing_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "reviewed", "matched"]),
    supabase
      .from("sourcing_requests")
      .select("id, name, company, product_name, category, created_at")
      .not("product_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <main className="bg-slate-950 text-white min-h-screen">
      {/* ── VISUAL HERO WITH INDUSTRIAL PHOTOGRAPHY ── */}
      <section className="relative w-full overflow-hidden border-b border-white/10" style={{ minHeight: "440px" }}>
        <Image
          src="/images/food-factory-production.png"
          alt="Modern food manufacturing facility and export production"
          fill
          className="object-cover"
          priority
          quality={90}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950" />

        <div className="relative z-10 px-6 py-16 sm:py-20 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-400 mb-6">
            <span>🇮🇱</span>
            <span>Direct Access to Israel&apos;s $6.2B Food Import Market</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-4xl mx-auto">
            Expand Your Factory&apos;s Output to Israel.{" "}
            <span className="text-orange-500">Get Matched with Top Retailers.</span>
          </h1>

          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Israel imports over 70% of its food. Register your products to receive direct commercial inquiries,
            private-label RFQs, and container-volume purchase orders from verified retail chains and distributors.
          </p>

          {/* Quick Value Metrics Strip */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur-xs">
              <p className="text-lg sm:text-xl font-black text-orange-400">$6.2 Billion</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Annual Food Imports</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur-xs">
              <p className="text-lg sm:text-xl font-black text-white">70%+ Consumed</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Imported Products</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur-xs">
              <p className="text-lg sm:text-xl font-black text-emerald-400">{activeRequestCount ?? 200}+ Active</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Buyer Sourcing Requests</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur-xs">
              <p className="text-lg sm:text-xl font-black text-orange-400">100% Free</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Zero Listing Fees</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE RETAIL DEMAND RADAR ── */}
      <section className="px-6 py-6 border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Demand Watch: Verified Israeli Retailers Actively Sourcing
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Container quantities &amp; private label contracts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(sampleRequests ?? []).slice(0, 6).map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-white/10 bg-[#0f172a] p-3 flex items-start gap-3 text-left"
              >
                <div className="h-8 w-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  RFQ
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-orange-400 truncate">
                      {req.company || req.name || "Israeli Retailer"}
                    </span>
                    <span className="text-[10px] text-slate-500">Live</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 truncate mt-0.5">
                    {req.product_name || req.category || "Food Specialty"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Category: {req.category || "Grocery / Packaged"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Israeli retail logo strip */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500 text-[11px]">
              Direct Introductions to:
            </span>
            <span className="text-slate-300 font-medium">Shufersal</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">Yochananof</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">Rami Levy</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">Ta&apos;aman</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">H. Cohen</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">Leiman Schlussel</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">Diplomat</span>
          </div>
        </div>
      </section>

      {/* ── 3-STEP SUPPLIER JOURNEY ── */}
      <section className="px-6 py-12 border-b border-slate-800 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">How FoodXchange Works for Manufacturers</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Zero cold calling. We match your factory specifications with verified buyer purchase orders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-white/10 bg-[#0f172a] relative">
              <span className="text-2xl mb-3 block">🏭</span>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Step 1</p>
              <h3 className="text-sm font-bold text-white mb-1.5">Register Factory &amp; SKUs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide your core categories, formats, packaging, and certifications. Upload product images or a catalog.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#0f172a] relative">
              <span className="text-2xl mb-3 block">⚡</span>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Step 2</p>
              <h3 className="text-sm font-bold text-white mb-1.5">Algorithmic Buyer Match</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our engine automatically matches your product specs against active retail purchase requests and importer RFQs.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#0f172a] relative">
              <span className="text-2xl mb-3 block">🤝</span>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Step 3</p>
              <h3 className="text-sm font-bold text-white mb-1.5">Direct Orders &amp; RFQs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive commercial requests directly. We assist with kosher pathway guidance, sampling, and container contract terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ONBOARDING FORM SECTION ── */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Register Your Company</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Takes 4–5 minutes. Your submission is reviewed by our trading team within 48 hours.
            </p>
          </div>

          <SupplierRegistrationForm />
        </div>
      </section>

      {/* ── SUPPLIER FAQ & REASSURANCE ── */}
      <section className="px-6 py-16 border-t border-slate-800 bg-slate-900/60">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Frequently Asked Questions for Manufacturers</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Everything you need to know about exporting to Israel through FoodXchange.
            </p>
          </div>

          <FAQAccordion items={SUPPLIER_FAQS} />

          {/* Regulatory & Knowledge Base Hub Banner */}
          <div className="mt-10 p-6 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-slate-900 to-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">
                  <span>📚</span>
                  <span>Manufacturer Export Knowledge Base</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Need detailed guidance on Israeli food import regulations?
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Browse our library of 43 practical guides covering Hebrew labeling, Kosher agency audits, GFSI recognition, and customs clearance procedures.
                </p>
              </div>
              <Link
                href="/en/import-guide"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition shrink-0"
              >
                <span>Browse Import Guides (43) &rarr;</span>
              </Link>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <Link href="/en/import-guide/introduction-to-kosher-certification-for-food-exporters" className="text-slate-300 hover:text-orange-400 transition flex items-center gap-1.5">
                <span>✡️ Kosher Overview</span>
                <span className="text-slate-500">&rarr;</span>
              </Link>
              <Link href="/en/import-guide/brc-global-standard-do-israeli-buyers-require-it" className="text-slate-300 hover:text-orange-400 transition flex items-center gap-1.5">
                <span>🛡️ GFSI / BRC Requirements</span>
                <span className="text-slate-500">&rarr;</span>
              </Link>
              <Link href="/en/help/how-sourcing-requests-reach-suppliers" className="text-slate-300 hover:text-orange-400 transition flex items-center gap-1.5">
                <span>⚡ How RFQ Matching Works</span>
                <span className="text-slate-500">&rarr;</span>
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center p-6 rounded-2xl border border-white/10 bg-slate-900">
            <p className="text-sm font-bold text-white">Have a specific question before registering?</p>
            <p className="text-xs text-slate-400 mt-1">
              Connect directly with our international trading desk on WhatsApp.
            </p>
            <a
              href="https://wa.me/972525222291"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs transition-colors"
            >
              <span>💬</span>
              <span>Chat with Us on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

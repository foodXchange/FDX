import Image from "next/image";
import type { Metadata } from "next";
import ModernContactSection from "@/components/contact/ModernContactSection";

export const metadata: Metadata = {
  title: "Contact Trading Desk | FoodXchange",
  description:
    "Get in touch with the FoodXchange senior trading desk in Tel Aviv. Direct line to Israeli retail buyers, category managers, and verified international food manufacturers.",
  keywords: [
    "contact FoodXchange",
    "food sourcing Israel contact",
    "Israeli market inquiry",
    "food supplier contact",
    "Israeli food broker",
    "Tel Aviv food trading desk",
  ],
  openGraph: {
    title: "Contact FoodXchange Trading Desk",
    description:
      "Every message is read personally by our senior trading team. We respond within 24 hours with an actionable next step.",
    type: "website",
  },
};

export default function EnglishContactPage() {
  return (
    <main className="bg-slate-950 text-white min-h-screen">
      {/* ── VISUAL HERO WITH LOGISTICS & TRADING BACKDROP ── */}
      <section className="relative w-full overflow-hidden border-b border-white/10" style={{ minHeight: "380px" }}>
        <Image
          src="/images/hero-ashdod-port.png"
          alt="Ashdod Port and Israeli maritime logistics hub"
          fill
          className="object-cover"
          priority
          quality={90}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950" />

        <div className="relative z-10 px-6 py-16 sm:py-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 text-xs font-bold text-orange-400 mb-5">
            <span>🇮🇱</span>
            <span>FoodXchange Strategic Trading Desk · Tel Aviv</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Connect Directly with{" "}
            <span className="text-orange-500">Our Trading Team.</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Whether you are an Israeli retail buyer sourcing container volumes or an international manufacturer seeking distribution in Israel — reach our senior trading team directly.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Guaranteed personal review within 24 hours — no generic templates.</span>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTACT SECTION (#contact-form) ── */}
      <section id="contact-form" className="px-4 sm:px-6 py-12 sm:py-16 max-w-6xl mx-auto">
        <ModernContactSection />
      </section>

      {/* ── TRUSTED RETAIL NETWORK STRIP ── */}
      <section className="px-6 py-12 border-t border-slate-900 bg-slate-900/40">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Active Trading &amp; Commercial Relationships
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-400 font-medium">
            <span>Shufersal</span>
            <span className="text-slate-700">·</span>
            <span>Yochananof</span>
            <span className="text-slate-700">·</span>
            <span>Rami Levy</span>
            <span className="text-slate-700">·</span>
            <span>Ta&apos;aman</span>
            <span className="text-slate-700">·</span>
            <span>H. Cohen</span>
            <span className="text-slate-700">·</span>
            <span>Leiman Schlussel</span>
            <span className="text-slate-700">·</span>
            <span>Diplomat Group</span>
          </div>
        </div>
      </section>
    </main>
  );
}

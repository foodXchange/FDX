import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BuyerRequestSection from "@/components/buyers/BuyerRequestSection";

export const metadata: Metadata = {
  title: "Buyers — Find Verified Food Suppliers | FoodXchange",
  description:
    "Submit your sourcing request and we'll match it with verified international food suppliers. Upload a reference image or describe the product you need.",
  keywords: [
    "food sourcing Israel",
    "import food products Israel",
    "verified food suppliers",
    "food buyer Israel",
    "private label food Israel",
    "sourcing food products",
  ],
  openGraph: {
    title: "Buyers — Find Verified Food Suppliers | FoodXchange",
    description:
      "Submit your sourcing request and we'll match it with verified international food suppliers.",
    type: "website",
  },
};

export default function BuyersPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-dark-600 focus:text-dark-text-primary focus:px-4 focus:py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <main id="main">

        {/* ── COMPACT VISUAL HERO ── */}
        <section className="relative w-full overflow-hidden border-b border-white/10" style={{ minHeight: "280px" }}>
          <Image
            src="/images/buyer-product-review.png"
            alt="Buyer reviewing food product samples"
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950" />
          <div className="relative z-10 px-6 py-12 sm:py-16 text-center max-w-4xl mx-auto">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
                🇮🇱 For Israeli Importers &amp; Retail Buyers
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                Drop 3 Photos or Speak.{" "}
                <span className="text-orange-500">We Match Your Factory.</span>
              </h1>
              <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-slate-300">
                Upload a benchmark product or narrate in Hebrew / English — matched across 500+ verified manufacturers.
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span>Looking to sell instead?</span>
                <a href="/en/suppliers/register" className="text-orange-400 hover:text-orange-300 font-semibold underline">
                  Register as a supplier &rarr;
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <BuyerRequestSection />

      </main>
    </>
  );
}

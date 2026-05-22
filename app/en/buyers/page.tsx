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
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <main id="main" className="bg-white text-slate-800">

        {/* ── HERO ── */}
        <section className="relative w-full overflow-hidden" style={{ minHeight: "520px" }}>
          <Image
            src="/images/buyer-product-review.png"
            alt="Buyer reviewing food product samples"
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-slate-900/75" />
          <div className="relative z-10 px-6 py-20 sm:py-28 text-center">
            <Reveal>
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-4">
                For Israeli buyers &amp; importers
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white max-w-3xl mx-auto leading-tight">
                Source food products from{" "}
                <span className="text-orange-500">verified international suppliers</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">
                Tell us what you need. We match your request with pre-vetted European and
                international manufacturers — and handle the commercial alignment.
              </p>
            </Reveal>
          </div>
        </section>

        <BuyerRequestSection />

      </main>
    </>
  );
}

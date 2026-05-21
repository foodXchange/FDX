import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import SourcingWidget from "@/components/SourcingWidget";

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

        {/* ── WIDGET SECTION (primary CTA) ── */}
        <section className="px-6 py-16 bg-white">
          <div className="max-w-xl mx-auto">
            <Reveal>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                Tell us what you need to source
              </h2>
              <p className="text-slate-500 text-center mb-8 max-w-xl mx-auto">
                Upload a reference image or describe the product.
                We match your request with verified suppliers.
              </p>
              <SourcingWidget source="buyers-page" />
            </Reveal>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                How it works
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: "01",
                  title: "Submit your request",
                  body: "Describe the product you need or upload a reference image. Tell us volume, certifications, and market — as much or as little as you have.",
                },
                {
                  n: "02",
                  title: "We match suppliers",
                  body: "We review your request against our database of verified manufacturers and identify the best-fit options based on category, certifications, and commercial fit.",
                },
                {
                  n: "03",
                  title: "We make the introduction",
                  body: "Once we've found the right supplier, we prepare both sides and make a meaningful introduction — not a cold connection. We stay involved through the early commercial discussion.",
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

        {/* ── TRUST SIGNALS ── */}
        <section className="px-6 py-10 bg-orange-50 border-y border-orange-200">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="text-base md:text-lg text-orange-900 font-medium leading-relaxed">
                We only work with suppliers we&apos;ve assessed directly — kosher-ready,
                export-experienced, and capable of container-level supply.
              </p>
              <p className="text-sm text-orange-700 mt-3">
                Every request is reviewed personally. Response within 24 hours.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 py-20 bg-white border-t border-slate-100 text-center">
          <Reveal>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Prefer to talk first?
            </h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              If your requirement is complex or you&apos;d rather start with a conversation,
              reach us directly.
            </p>
            <div className="flex gap-4 flex-wrap justify-center">
              <Link
                href="/en/contact"
                className="inline-flex bg-orange-500 text-white px-7 py-3.5 rounded-md font-semibold hover:bg-orange-600 transition shadow"
              >
                Contact us →
              </Link>
              <a
                href="https://wa.me/972525222291"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex border border-slate-300 text-slate-700 px-7 py-3.5 rounded-md font-semibold hover:bg-slate-50 transition"
              >
                WhatsApp us
              </a>
            </div>
          </Reveal>
        </section>

      </main>
    </>
  );
}

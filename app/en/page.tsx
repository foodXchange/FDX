import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Manufacturers | FoodXchange",
  description:
    "Enter the Israeli market with structured alignment, real buyer access, and clear execution.",
};

export default function ManufacturersPage() {
  return (
    <>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <main id="main" className="bg-white text-slate-800">

        {/* HERO */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">

          <Reveal>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Enter the{" "}
              <span className="text-orange-500">Israeli Market</span>{" "}
              with Confidence
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-200 leading-relaxed">
              Entering a new market is not about sending offers.
              <br />
              It is about real demand, alignment, and execution.
            </p>

            <p className="mt-6 text-sm text-slate-300">
              Response within{" "}
              <span className="text-white font-semibold">24 hours</span> • Real buyers
            </p>

            <div className="mt-10">
              <Link
                href="/en/contact"
                className="inline-flex bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold transition shadow-sm w-full sm:w-auto"
              >
                Start a Conversation
              </Link>
            </div>
          </Reveal>

        </section>

        {/* MARKET */}
        <section className="px-6 py-20 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                Why the Israeli Market
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">

              {[
                "Strong import demand",
                "Private label development",
                "Continuous sourcing needs",
              ].map((item, i) => (
                <Reveal key={i}>
                  <div className="bg-slate-50 p-6 rounded-2xl border text-sm text-slate-600">
                    {item}
                  </div>
                </Reveal>
              ))}

            </div>

          </div>
        </section>

        {/* HOW WE HELP */}
        <section className="px-6 py-24">
          <div className="max-w-3xl mx-auto">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                How We Support You
              </h2>
            </Reveal>

            <div className="space-y-6 text-slate-600">

              {[
                "Access to real sourcing buyers",
                "Clear commercial alignment",
                "Structured and focused process",
              ].map((item, i) => (
                <Reveal key={i}>
                  <p>{item}</p>
                </Reveal>
              ))}

            </div>

          </div>
        </section>

        {/* REGULATION */}
        <section className="px-6 py-24 bg-slate-50 border-t">
          <div className="max-w-5xl mx-auto">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                Kosher & Regulatory — Simplified
              </h2>
            </Reveal>

            <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
              We guide the process step by step and focus only on what really matters for your product.
            </p>

            <div className="grid md:grid-cols-3 gap-6">

              {[
                "Kosher requirements clarified",
                "Regulatory expectations aligned",
                "Simple and focused process",
              ].map((item, i) => (
                <Reveal key={i}>
                  <div className="bg-white p-6 rounded-2xl border text-sm text-slate-600">
                    {item}
                  </div>
                </Reveal>
              ))}

            </div>

          </div>
        </section>

        {/* FIT */}
        <section className="px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold mb-10">
                Who This Is For
              </h2>
            </Reveal>

            <Reveal>
              <p className="text-slate-600">
                Export-ready manufacturers with strong production, consistent quality,
                and a long-term partnership mindset.
              </p>
            </Reveal>

          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-24 bg-slate-50 border-t">
          <div className="max-w-4xl mx-auto">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                Manufacturers FAQ
              </h2>
            </Reveal>

            <div className="space-y-4">

              {[
                [
                  "Do I need kosher certification?",
                  "Often yes, depending on product and buyer requirements.",
                ],
                [
                  "What documents are required?",
                  "Product specs, ingredients, packaging, and export readiness.",
                ],
                [
                  "How fast can we start?",
                  "Once aligned, discussions can begin quickly.",
                ],
              ].map(([q, a], i) => (
                <Reveal key={i}>
                  <details className="bg-white p-6 rounded-2xl border">
                    <summary className="font-semibold cursor-pointer">{q}</summary>
                    <p className="mt-3 text-slate-600 text-sm">{a}</p>
                  </details>
                </Reveal>
              ))}

            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 bg-slate-900 text-white text-center">

          <Reveal>
            <h2 className="text-3xl font-semibold mb-4">
              Start a Conversation
            </h2>

            <p className="text-slate-300 mb-6">
              Share your capabilities — we’ll guide the opportunity.
            </p>

            <Link
              href="/en/contact"
              className="bg-orange-500 px-6 py-3 rounded-md font-semibold hover:bg-orange-600"
            >
              Start →
            </Link>
          </Reveal>

        </section>

      </main>
    </>
  );
}

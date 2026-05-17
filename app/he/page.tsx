import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Buyers | FoodXchange",
  description:
    "Reliable sourcing for the Israeli market. Focused matching, structured process, and real supply partnerships.",
};

export default function BuyersPage() {
  return (
    <>
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to content
      </a>

      <main id="main" className="bg-white text-slate-800">

        {/* HERO */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Reliable Food Sourcing for the{" "}
              <span className="text-orange-500">Israeli Market</span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-200 leading-relaxed">
              You don’t need more supplier lists.
              <br />
              You need the right supplier — with clear fit and real execution.
            </p>

            <p className="mt-6 text-sm text-slate-300">
              Response within <span className="text-white font-semibold">24 hours</span> • Focused matching
            </p>

            <div className="mt-10">
              <Link
                href="/en/contact"
                className="inline-flex bg-orange-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-orange-600 transition"
              >
                Start a Conversation
              </Link>
            </div>
          </Reveal>
        </section>

        {/* PROOF */}
        <section className="px-6 py-16 border-t border-slate-100">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">

            {[
              "Active private label supply partnerships",
              "Container-level sourcing flows",
              "Ongoing manufacturer relationships",
            ].map((item, i) => (
              <Reveal
                key={i}
                className="bg-slate-50 p-6 rounded-2xl border text-sm text-slate-600 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                {item}
              </Reveal>
            ))}

          </div>
        </section>

        {/* BENEFITS */}
        <section className="px-6 py-24">
          <div className="max-w-3xl mx-auto">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold mb-12 text-center">
                What You Gain
              </h2>
            </Reveal>

            <div className="space-y-8 text-slate-600">
              {[
                [
                  "Right Supplier",
                  "We match you with suppliers that already fit your requirements.",
                ],
                [
                  "Clear Process",
                  "You always know what happens next.",
                ],
                [
                  "No Surprises",
                  "Pricing, capacity, and requirements are clear early.",
                ],
              ].map(([title, text], i) => (
                <Reveal key={i}>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>

          </div>
        </section>

        {/* STORY */}
        <section className="px-6 py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">

            <Reveal className="bg-white p-6 rounded-2xl border shadow-sm">
              <p className="text-xs text-orange-500 font-semibold uppercase">
                Outcome
              </p>

              <p className="mt-2 font-semibold">
                Frozen Private Label Supply
              </p>

              <p className="mt-4 text-2xl font-bold text-orange-500">
                🚢 3–4 Containers / Month
              </p>
            </Reveal>

            <Reveal className="bg-white p-6 rounded-2xl border shadow-sm text-sm text-slate-600 space-y-3">
              <p><strong>Challenge:</strong> Need for reliable supplier.</p>
              <p><strong>Action:</strong> Supplier matching + alignment.</p>
              <p><strong>Result:</strong> Long-term growing supply flow.</p>
            </Reveal>

          </div>
        </section>

        {/* CATEGORIES */}
        <section className="px-6 py-24">
          <div className="max-w-5xl mx-auto">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
                Category Examples
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">

              {[
                "Frozen food",
                "Pasta & ambient",
                "Snacks & innovation",
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

        {/* PROCESS */}
        <section className="px-6 py-24 bg-slate-50 border-t">
          <div className="max-w-5xl mx-auto text-center">

            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold mb-12">
                How It Works
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">

              {["Share need", "We match", "We connect"].map((step, i) => (
                <Reveal key={i}>
                  <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="w-10 h-10 mx-auto mb-3 bg-orange-500 text-white rounded-full flex items-center justify-center">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
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
              Tell us what you need — we’ll guide you forward.
            </p>

            <Link
              href="/en/contact"
              className="inline-flex bg-orange-500 px-6 py-3 rounded-md font-semibold"
            >
              Start →
            </Link>
          </Reveal>

        </section>

      </main>
    </>
  );
}

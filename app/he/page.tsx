import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyers | FoodXchange – Reliable Food Sourcing for the Israeli Market",
  description:
    "FoodXchange helps Israeli buyers and importers source reliable manufacturers with clarity, speed, and commercial fit. Focused matching, no generic lists, personal response within 24 hours.",
  openGraph: {
    title: "FoodXchange for Buyers",
    description:
      "Reliable sourcing for the Israeli market. Focused supplier matching, structured process, and fast personal response.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FoodXchange for Buyers",
    description:
      "Reliable sourcing for the Israeli market. Focused matching and fast personal response.",
  },
};

export default function BuyersPage() {
  return (
    <>
      {/* ✅ Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow"
      >
        Skip to content
      </a>

      <main id="main" className="flex flex-col bg-white text-slate-800">
        {/* HERO */}
        <header className="bg-gradient-to-b from-slate-900 via-slate-800 to-white px-6 py-20 sm:py-24 text-center">
          <h1 className="mb-5 text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Reliable Food Sourcing for the{" "}
            <span className="text-orange-500">Israeli Market</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-slate-200">
            You don’t need more supplier lists.
            <br />
            You need the <strong>right</strong> supplier — with clear fit, real capacity,
            and a path to execution.
          </p>

          {/* Trust line */}
          <p className="mt-6 text-sm text-slate-300">
            Personal response within{" "}
            <span className="font-semibold text-white">24 hours</span> • Focused matching • No generic lists
          </p>

          {/* Quick anchors (SEO + UX) */}
          <nav
            aria-label="Buyers page sections"
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <a href="#benefits" className="text-sm text-slate-200 hover:text-white underline underline-offset-4">
              Benefits
            </a>
            <a href="#story" className="text-sm text-slate-200 hover:text-white underline underline-offset-4">
              Real Buyer Story
            </a>
            <a href="#categories" className="text-sm text-slate-200 hover:text-white underline underline-offset-4">
              Categories
            </a>
            <a href="#process" className="text-sm text-slate-200 hover:text-white underline underline-offset-4">
              Process
            </a>
          </nav>

          {/* CTA */}
          <div className="mt-10 flex justify-center">
            <Link
              href="/en/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-md font-semibold shadow transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Start a Focused Conversation
            </Link>
          </div>
        </header>

        {/* PROOF STRIP */}
        <section
          aria-label="Credibility highlights"
          className="px-6 py-14 border-t border-slate-100"
        >
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-sm">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
              Active private label supply partnerships
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
              Container-level monthly sourcing flows
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
              Long-term relationships with export-ready manufacturers
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section id="benefits" aria-labelledby="benefits-title" className="px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2
              id="benefits-title"
              className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-12"
            >
              What You Gain
            </h2>

            <div className="space-y-10">
              <div className="flex gap-4">
                <span className="text-orange-500 text-xl" aria-hidden="true">✓</span>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Right Supplier. From the Start.
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    We don’t send “options”. We match you with suppliers that already fit your requirements —
                    so you save time and reduce risk.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-orange-500 text-xl" aria-hidden="true">✓</span>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Clear, Structured Process
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    You always know what happens next — requirements, fit, and next steps are handled clearly.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-orange-500 text-xl" aria-hidden="true">✓</span>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    No Surprises
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    We address constraints early — pricing reality, capacity, lead times, and must‑have requirements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REAL BUYER STORY (ANONYMIZED, HIGH TRUST) */}
        <section id="story" aria-labelledby="story-title" className="px-6 py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 id="story-title" className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                A Real Buyer Story (Private Label)
              </h2>
              <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
                A short example of how a sourcing request becomes a long-term supply flow.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Left: Outcome */}
              <article className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-lg transition">
                <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                  Outcome
                </span>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Frozen Vegetables & Fruits — Private Label Supply
                </h3>

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="text-3xl font-bold text-orange-500">🚢 3–4 Containers</p>
                  <p className="text-sm text-slate-500">per month • volumes grew gradually over time</p>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  <li>✔ European manufacturer (Belgium)</li>
                  <li>✔ Major Israeli retail chain</li>
                  <li>✔ Ongoing long-term cooperation</li>
                </ul>
              </article>

              {/* Right: Narrative */}
              <article className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Challenge → Action → Result
                </h3>

                <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <p>
                    <strong className="text-slate-900">Challenge:</strong> The buyer needed a reliable European supplier
                    for private label frozen items — with clear commercial fit and operational stability.
                  </p>

                  <p>
                    <strong className="text-slate-900">Action:</strong> We aligned requirements, validated supplier capability,
                    and structured the communication so both sides had clear expectations.
                  </p>

                  <p>
                    <strong className="text-slate-900">Result:</strong> The partnership moved into ongoing supply and scaled
                    into consistent container-level monthly shipments.
                  </p>
                </div>

                <p className="mt-6 text-xs text-slate-400">
                  (Names intentionally omitted — confidentiality is part of how we work.)
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section id="categories" aria-labelledby="categories-title" className="px-6 py-24 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <h2
              id="categories-title"
              className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-16"
            >
              Category Examples
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-1 transition">
                <h3 className="font-semibold text-slate-900 mb-3">Frozen Food</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Private label sourcing for vegetables and fruits, aligned with retail specs and supply continuity.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-1 transition">
                <h3 className="font-semibold text-slate-900 mb-3">Pasta & Ambient</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Premium and scalable solutions, including private label and branded alternatives.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-1 transition">
                <h3 className="font-semibold text-slate-900 mb-3">Snacks & Innovation</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Retail-ready formats and differentiated products, designed for real shelf performance.
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 mt-12 max-w-2xl mx-auto">
              We explore additional categories based on your exact need and commercial feasibility.
            </p>
          </div>
        </section>

        {/* BUYER PERSONA */}
        <section aria-labelledby="persona-title" className="px-6 py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 id="persona-title" className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">
              A Typical Buyer We Support
            </h2>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-lg font-semibold text-slate-900 mb-4">
                Private Label / Category Manager
              </p>

              <p className="text-slate-600 leading-relaxed mb-4">
                You manage a category and need reliable suppliers — but you can’t afford endless searching,
                weak follow-up, or suppliers that don’t fit.
              </p>

              <p className="text-slate-600 leading-relaxed">
                You want clarity, speed, and confidence — knowing that every option you receive is actually relevant.
              </p>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section id="process" aria-labelledby="process-title" className="px-6 py-20 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-5xl">
            <h2
              id="process-title"
              className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-12"
            >
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              {[
                "You share your need (category, specs, volumes).",
                "We identify the most relevant suppliers for your request.",
                "We support the connection and first commercial discussion.",
              ].map((step, i) => (
                <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div
                    className="mb-4 w-12 h-12 mx-auto rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </div>
                  <p className="text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section aria-label="Contact call to action" className="px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold mb-4 text-slate-900">
            Start a Focused Conversation
          </h2>

          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Tell us what you need — we’ll guide you in the right direction.
          </p>

          <p className="text-sm text-slate-500 mb-10">
            Personal response within <span className="font-semibold">24 hours</span>
          </p>

          <Link
            href="/en/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md font-semibold transition w-full sm:w-auto inline-block focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            Start the Conversation
          </Link>
        </section>
      </main>
    </>
  );
}
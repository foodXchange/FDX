import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manufacturers | Enter the Israeli Market with FoodXchange",
  description:
    "FoodXchange helps manufacturers enter the Israeli market with real buyer access, structured commercial alignment, and guidance on kosher & regulatory requirements. Personal response within 24 hours.",
  openGraph: {
    title: "Manufacturers | FoodXchange",
    description:
      "Enter the Israeli market with confidence: buyer access, structured alignment, and kosher & regulatory guidance.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Manufacturers | FoodXchange",
    description:
      "Enter the Israeli market with buyer access, structured alignment, and kosher & regulatory guidance.",
  },
};

export default function ManufacturersPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I need kosher certification to sell in Israel?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Many retail channels require kosher certification, but the required level depends on the product category and target buyers. FoodXchange helps you understand what is needed for your opportunity and guides the process step by step.",
        },
      },
      {
        "@type": "Question",
        name: "What documents do buyers typically expect from manufacturers?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Buyers commonly expect product specifications, ingredient and allergen information, certifications (when relevant), packaging details, shelf-life, and basic export documentation. FoodXchange helps you prepare and present what is needed clearly.",
        },
      },
      {
        "@type": "Question",
        name: "How long does it take to start commercial discussions?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Timing depends on category, readiness, and alignment. In many cases, once your offering and positioning are clear, we can move to targeted buyer discussions quickly. We respond within 24 business hours and guide the next step.",
        },
      },
      {
        "@type": "Question",
        name: "Do you work with private label (OEM/ODM) manufacturers?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. FoodXchange supports private label and long-term supply partnerships when the manufacturer is export-ready and aligned with buyer expectations.",
        },
      },
      {
        "@type": "Question",
        name: "What types of manufacturers are the best fit for FoodXchange?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Export-ready manufacturers with consistent quality, reliable capacity, and a partnership mindset. We focus on long-term relationships, not one-off transactions.",
        },
      },
    ],
  };

  return (
    <>
      {/* ✅ Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow"
      >
        Skip to content
      </a>

      {/* ✅ FAQ structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main id="main" className="flex flex-col bg-white text-slate-800">
        {/* HERO */}
        <header className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
          <h1 className="mb-6 text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Enter the <span className="text-orange-500">Israeli Market</span> with
            Confidence
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-slate-200">
            Entering a new market is not about sending offers.
            <br />
            It is about real buyer demand, clear alignment, and a structured process.
          </p>

          <p className="mt-6 text-sm text-slate-300">
            Personal response within{" "}
            <span className="font-semibold text-white">24 hours</span> • Real buyers
            • Structured next steps
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/en/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md font-semibold transition shadow w-full sm:w-auto"
            >
              Start a Focused Conversation
            </Link>
          </div>
        </header>

        {/* MARKET OPPORTUNITY */}
        <section className="px-6 py-20 border-t border-slate-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">
              Why the Israeli Market
            </h2>

            <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-600 text-left">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Strong import demand
                </h3>
                <p>
                  Limited local production creates consistent demand for imported
                  food products.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Private label growth
                </h3>
                <p>
                  Retailers actively develop private label programs and look for
                  reliable partners.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Ongoing sourcing needs
                </h3>
                <p>
                  New products and suppliers are continuously evaluated across
                  categories.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW WE HELP */}
        <section className="px-6 py-20 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-center text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              How We Support You
            </h2>

            <div className="space-y-8 text-slate-600 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Access to serious buyers
                </h3>
                <p>
                  We work with Israeli retailers, importers, and private label
                  teams actively sourcing — not just browsing options.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Structured commercial alignment
                </h3>
                <p>
                  We clarify expectations early: positioning, pricing reality,
                  capacity, lead times, and next steps.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Market readiness support
                </h3>
                <p>
                  We help you present your offer the way Israeli buyers expect —
                  clear, complete, and actionable.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* KOSHER & REGULATORY */}
        <section className="px-6 py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8 text-slate-900">
              Kosher & Regulatory — Made Simple
            </h2>

            <p className="text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              Many manufacturers worry that Israel is “too complex” because of
              kosher and regulation.
              <br />
              <br />
              You don’t need to solve everything alone. We guide the process step
              by step, and focus only on what is relevant for your product and
              opportunity.
            </p>

            <div className="grid md:grid-cols-3 gap-8 text-left text-sm">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
                <h3 className="font-semibold mb-3 text-slate-900">
                  Kosher certification
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Many retail channels require kosher. The level depends on category
                  and buyer needs. We help you understand what is required and how
                  to approach it.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
                <h3 className="font-semibold mb-3 text-slate-900">
                  Regulatory alignment
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Labeling, ingredients, allergens, and documentation must match
                  Israeli requirements. We clarify expectations early so you can
                  move forward smoothly.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition">
                <h3 className="font-semibold mb-3 text-slate-900">
                  Practical process
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Not every product needs the same path. We focus on the simplest
                  route that fits your opportunity.
                </p>
              </div>
            </div>

            <p className="mt-12 text-sm text-slate-500 max-w-xl mx-auto">
              Our role is to reduce uncertainty — so you can focus on building the
              right commercial relationship.
            </p>
          </div>
        </section>

        {/* WHAT WE LOOK FOR */}
        <section className="px-6 py-20 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-10 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              What We Look For
            </h2>

            <div className="space-y-4 text-slate-600">
              <p>Reliable production and export experience</p>
              <p>Consistent quality across batches</p>
              <p>Partnership mindset and long-term orientation</p>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="px-6 py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 text-center mb-12">
              Manufacturers FAQ
            </h2>

            <div className="space-y-4">
              <details className="bg-white border border-slate-200 rounded-2xl p-6">
                <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded">
                  Do I need kosher certification to sell in Israel?
                </summary>
                <p className="mt-3 text-slate-600">
                  Many retail channels require kosher certification, but the required level depends on the product category
                  and target buyers. We help you understand what is needed and guide the process step by step.
                </p>
              </details>

              <details className="bg-white border border-slate-200 rounded-2xl p-6">
                <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded">
                  What documents do buyers typically expect?
                </summary>
                <p className="mt-3 text-slate-600">
                  Typically: product specs, ingredients & allergens, packaging details, shelf life, certifications (when relevant),
                  and basic export documentation. We help you prepare and present what is needed clearly.
                </p>
              </details>

              <details className="bg-white border border-slate-200 rounded-2xl p-6">
                <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded">
                  How fast can we start commercial discussions?
                </summary>
                <p className="mt-3 text-slate-600">
                  Timing depends on category and readiness. Once your offering and positioning are clear, we move to targeted discussions.
                  We respond within 24 business hours and guide the next step.
                </p>
              </details>

              <details className="bg-white border border-slate-200 rounded-2xl p-6">
                <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded">
                  Do you work with private label (OEM/ODM) manufacturers?
                </summary>
                <p className="mt-3 text-slate-600">
                  Yes. We support private label and long-term supply partnerships when the manufacturer is export-ready and aligned with buyer expectations.
                </p>
              </details>

              <details className="bg-white border border-slate-200 rounded-2xl p-6">
                <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded">
                  What manufacturers are the best fit for FoodXchange?
                </summary>
                <p className="mt-3 text-slate-600">
                  Export-ready manufacturers with consistent quality, reliable capacity, and a partnership mindset.
                  We focus on long-term relationships, not one-off transactions.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 text-center bg-slate-900 text-white">
          <h2 className="text-3xl font-semibold mb-4">Start a Focused Conversation</h2>

          <p className="text-slate-300 mb-6 max-w-xl mx-auto">
            Share your capabilities — we’ll help you understand if there is a real opportunity in Israel.
          </p>

          <p className="text-sm text-slate-300 mb-10">
            Personal response within <span className="font-semibold text-white">24 hours</span>
          </p>

          <Link
            href="/en/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md font-semibold transition shadow w-full sm:w-auto inline-block"
          >
            Start the Conversation
          </Link>
        </section>
      </main>
    </>
  );
}
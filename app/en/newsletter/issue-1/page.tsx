import Link from "next/link";

export default function NewsletterIssue1() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "FoodXchange Market Notes — Issue #1",
    description:
      "Short sourcing insights from real activity in the Israeli food market — tomato paste cups, snacks, and private label pasta.",
    author: {
      "@type": "Person",
      name: "Udi Stryk",
    },
    publisher: {
      "@type": "Organization",
      name: "FoodXchange",
      logo: {
        "@type": "ImageObject",
        url: "https://fdx.trading/logo.png",
      },
    },
    url: "https://fdx.trading/en/newsletter/issue-1",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://fdx.trading/en/newsletter/issue-1",
    },
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
  };

  return (
    <>
      {/* ✅ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="bg-white text-slate-900">

        {/* ✅ HERO */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16 px-6">
          <div className="max-w-3xl mx-auto">

            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
              FoodXchange Market Notes
            </p>

            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Issue #1 — Sourcing Signals from the Market
            </h1>

            <p className="mt-4 text-slate-300 text-sm">
              Short insights from ongoing sourcing activity — focused, practical, and real.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              By FoodXchange · May 2026
            </p>
          </div>
        </section>

        {/* ✅ CONTENT */}
        <section className="max-w-3xl mx-auto px-6 py-14">

          <div className="space-y-6 text-slate-800 leading-relaxed">

            <p>Hi,</p>

            <p>
              Sharing a few short sourcing signals we’re seeing across current projects.
              Nothing theoretical — just practical patterns that keep repeating.
            </p>
          </div>

          {/* ✅ BLOCK 1 */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-3">
              Tomato paste cups — packaging is the real risk
            </h2>

            <p className="text-slate-700 mb-4">
              When reviewing suppliers, the product itself is usually consistent.
              The real variability shows up in cup structure, sealing quality,
              and barrier performance.
            </p>

            <p className="text-slate-700 mb-4">
              These gaps often appear later — during shelf life or retail handling.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm">
              <strong>Takeaway:</strong> validate packaging early, not after production.
            </div>

            <Link
              href="/en/blog/tomato-paste-cups-israel"
              className="inline-block mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              Read full guide →
            </Link>
          </div>

          {/* ✅ BLOCK 2 */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-3">
              Snack imports — execution matters more than price
            </h2>

            <p className="text-slate-700 mb-4">
              We repeatedly see strong snack products fail due to execution:
              labeling readiness, documentation, and lead-time alignment.
            </p>

            <p className="text-slate-700 mb-4">
              These issues impact speed to market more than raw product quality.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm">
              <strong>Takeaway:</strong> the best supplier is not the cheapest — it’s the most reliable.
            </div>

            <Link
              href="/en/blog/import-snacks-israel"
              className="inline-block mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              Read full guide →
            </Link>
          </div>

          {/* ✅ BLOCK 3 */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-3">
              Premium pasta — quality is not branding
            </h2>

            <p className="text-slate-700 mb-4">
              Many suppliers position themselves as “premium”, but consistency
              depends on raw material specs and drying processes — not brand story.
            </p>

            <p className="text-slate-700 mb-4">
              Without technical validation, pricing discussions are not meaningful.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm">
              <strong>Takeaway:</strong> ask for specs and production evidence — not claims.
            </div>

            <Link
              href="/en/blog/premium-pasta-private-label"
              className="inline-block mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              Read full guide →
            </Link>
          </div>

          {/* ✅ CTA */}
          <div className="mt-14 border-t pt-10">

            <h3 className="text-lg font-semibold mb-3">
              Want to explore this further?
            </h3>

            <p className="text-slate-600 mb-6">
              If any of these categories are relevant — share a few details and we’ll
              move quickly into concrete options.
            </p>

            <ul className="text-sm text-slate-700 mb-6 space-y-1">
              <li>• Category</li>
              <li>• Target pack size / format</li>
              <li>• Private label — yes / no</li>
            </ul>

            <div className="flex gap-4 flex-wrap">

              <Link
                href="/en/contact"
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-md font-medium transition"
              >
                Start a conversation →
              </Link>

              <Link
                href="/en/newsletter"
                className="border border-slate-300 hover:border-slate-400 px-5 py-2 rounded-md text-sm transition"
              >
                Subscribe →
              </Link>

            </div>

          </div>

        </section>

      </main>
    </>
  );
}

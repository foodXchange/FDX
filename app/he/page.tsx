import Link from "next/link";

export default function BuyersPage() {
  return (
    <main className="flex flex-col bg-white text-slate-800">

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-white px-6 py-24 text-center">
        
        <h1 className="mb-6 text-4xl md:text-5xl font-bold text-white">
          Reliable Food Sourcing for the{" "}
          <span className="text-orange-500">Israeli Market</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-slate-200 mb-10">
          Finding the right supplier shouldn’t feel uncertain or time-consuming.
          We listen carefully, understand your exact requirements, and connect you with
          trusted manufacturers that truly fit your needs.
        </p>

      </section>

      {/* VALUE */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-3xl">

          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            What You Gain Working With Us
          </h2>

          <div className="space-y-8">

            {/* VALUE 1 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Precision Supplier Matching
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  We don’t just introduce suppliers — we carefully match you
                  with manufacturers aligned with your specifications, standards,
                  and commercial reality.
                </p>
              </div>
            </div>

            {/* VALUE 2 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Structured, Hands-On Support
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  From the first conversation to final agreement,
                  we help guide communication, reduce misunderstandings,
                  and ensure a smooth process.
                </p>
              </div>
            </div>

            {/* VALUE 3 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Commercial Clarity & Transparency
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  No surprises. We focus on realistic pricing, clear expectations,
                  and building partnerships that work long-term.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-4xl">

          <h2 className="mb-16 text-center text-3xl font-bold text-slate-900">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-10">

            {/* STEP 1 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white text-xl font-bold">
                1
              </div>
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                You Share Your Needs
              </h3>
              <p className="text-slate-600">
                Tell us your requirements, standards, and commercial targets.
              </p>
            </div>

            {/* STEP 2 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white text-xl font-bold">
                2
              </div>
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                We Identify the Right Match
              </h3>
              <p className="text-slate-600">
                We leverage our network to source the most relevant manufacturers.
              </p>
            </div>

            {/* STEP 3 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white text-xl font-bold">
                3
              </div>
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                We Connect and Support
              </h3>
              <p className="text-slate-600">
                We facilitate introductions and support discussions toward a successful partnership.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-white text-center">

        <h2 className="mb-6 text-3xl font-bold text-slate-900">
          Let’s Explore the Right Fit for You
        </h2>

        <p className="mb-10 text-lg text-slate-600 max-w-xl mx-auto">
          Share your sourcing needs with us, and we’ll help you identify the most
          relevant, reliable partners for your business.
        </p>

        <Link href="/en/contact">
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md font-semibold transition transform hover:scale-105 shadow">
            Start a Conversation
          </button>
        </Link>

      </section>

    </main>
  );
}
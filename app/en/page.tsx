import Link from "next/link";

export default function ManufacturersPage() {
  return (
    <main className="flex flex-col bg-white text-slate-800">

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-24 text-center">
        
        <h1 className="mb-6 text-4xl md:text-5xl font-bold text-white">
          Enter the{" "}
          <span className="text-orange-500">Israeli Market</span>{" "}
          with the Right Partner
        </h1>

        <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-slate-200 mb-10">
          Building meaningful relationships with buyers in Israel requires more than
          introductions. It requires alignment, trust, and a clear understanding of
          commercial reality.
          <br />
          <br />
          We work with manufacturers ready to build serious, long-term partnerships —
          not one-off transactions.
        </p>

      </section>

      {/* HOW WE HELP */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-3xl">

          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            How We Support You
          </h2>

          <div className="space-y-8">

            {/* 1 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Access to Serious Buyers
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  We work with established Israeli retailers, importers, and private label
                  teams actively looking for reliable manufacturing partners — not just browsing options.
                </p>
              </div>
            </div>

            {/* 2 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Structured Commercial Process
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  From initial positioning through negotiation and alignment,
                  we ensure expectations are clear, discussions are productive,
                  and deals are built on solid foundations.
                </p>
              </div>
            </div>

            {/* 3 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Market Positioning & Readiness
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  We help you translate your strengths into what Israeli buyers need —
                  from pricing expectations to communication and documentation.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* WHAT WE LOOK FOR */}
      <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-3xl">

          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            What We Look For
          </h2>

          <div className="space-y-8">

            {/* 1 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">★</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Proven Reliability
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Established production, export experience, certifications,
                  and a consistent track record of meeting commitments.
                </p>
              </div>
            </div>

            {/* 2 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">★</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Consistent Quality
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Reliable product standards across batches —
                  aligned with buyer expectations and long-term supply needs.
                </p>
              </div>
            </div>

            {/* 3 */}
            <div className="flex gap-4">
              <span className="text-orange-500 text-2xl">★</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Partnership Mindset
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  A willingness to build ongoing relationships,
                  adapt to market needs, and grow together over time.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-slate-900 text-center text-white">

        <h2 className="mb-6 text-3xl font-bold">
          Let’s Explore the Opportunity Together
        </h2>

        <p className="mb-10 text-lg text-slate-300 max-w-xl mx-auto">
          Share your capabilities, your products, and your ambition.
          We’ll help you understand where the real opportunity lies.
        </p>

        <Link href="/en/contact">
          <button className="bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-md font-semibold transition transform hover:scale-105 shadow">
            Start the Conversation
          </button>
        </Link>

      </section>

    </main>
  );
}
``
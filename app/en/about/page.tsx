import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="bg-white text-slate-800">

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-24 text-center">

        <h1 className="mb-6 text-4xl md:text-5xl font-bold text-white">
          About{" "}
          <span className="text-orange-500">FoodXchange</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg md:text-xl text-slate-200 leading-relaxed">
          We build sourcing partnerships that work in reality — not just on paper.
          <br />
          <br />
          FoodXchange exists to connect the right manufacturers with the right buyers,
          in a way that is structured, transparent, and built for long-term success.
        </p>

      </section>

      {/* WHO WE ARE */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-2xl font-semibold mb-6 text-slate-900">
            What We Do Differently
          </h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Many sourcing platforms focus on volume — more leads, more introductions,
            more conversations.
          </p>

          <p className="text-slate-600 leading-relaxed mb-6">
            At FoodXchange, we focus on alignment.
          </p>

          <p className="text-slate-600 leading-relaxed">
            Every connection we facilitate is carefully considered —
            based on capability, commercial fit, expectations, and long-term potential.
          </p>

        </div>
      </section>

      {/* APPROACH */}
      <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-2xl font-semibold mb-10 text-slate-900">
            Our Approach
          </h2>

          <div className="space-y-6 text-slate-600">

            <p>
              We operate as a bridge between global manufacturers and the Israeli market,
              but more importantly — we operate as a filter.
            </p>

            <p>
              We help buyers avoid the risk of working with the wrong suppliers,
              and manufacturers avoid wasted time with the wrong opportunities.
            </p>

            <p>
              Our role is to make sure that when a connection happens —
              it is meaningful, relevant, and worth pursuing.
            </p>

          </div>

        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-2xl font-semibold mb-10 text-slate-900">
            What We Stand For
          </h2>

          <div className="grid md:grid-cols-2 gap-8">

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Precision Over Volume
              </h3>
              <p className="text-slate-600">
                We focus on the right match, not the most options.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Transparency Always
              </h3>
              <p className="text-slate-600">
                Clear expectations, no surprises, no hidden dynamics.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Commercial Reality
              </h3>
              <p className="text-slate-600">
                Every decision is grounded in what actually works in the market.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Long-Term Partnerships
              </h3>
              <p className="text-slate-600">
                We prioritize relationships that can grow and scale over time.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-slate-900 text-white text-center">

        <h2 className="mb-6 text-3xl font-bold">
          Let’s Explore the Right Fit
        </h2>

        <p className="mb-10 text-lg text-slate-300 max-w-xl mx-auto">
          Whether you are a buyer or a manufacturer, we focus on building the
          right partnership — not just making introductions.
        </p>

        <Link href="/en/contact">
          <button className="bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-md font-semibold transition transform hover:scale-105">
            Start a Conversation
          </button>
        </Link>

      </section>

    </main>
  );
}
``
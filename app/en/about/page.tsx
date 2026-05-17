import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="bg-white text-slate-800">

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-24 text-center">
        <h1 className="mb-6 text-4xl md:text-5xl font-bold text-white tracking-tight">
          About <span className="text-orange-500">FoodXchange</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg md:text-xl text-slate-200 leading-relaxed">
          We build sourcing partnerships that work in reality — not just on paper.
          <br /><br />
          FoodXchange connects manufacturers and buyers through structured alignment,
          commercial clarity, and long-term execution.
        </p>

        <div className="mt-10">
          <Link
            href="/en/contact"
            className="inline-flex items-center justify-center rounded-md bg-orange-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md"
          >
            Start a Focused Conversation
          </Link>
          <p className="mt-3 text-sm text-slate-300">
            We personally respond within <span className="font-semibold text-white">24 hours</span> (business days).
          </p>
        </div>
      </section>

      {/* REALITY / PROOF STRIP */}
      <section className="px-6 py-16 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-600">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              Active private label supply partnerships
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              Container‑level monthly supply flows
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              Ongoing cooperation across multiple food categories
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO DIFFERENTLY */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-slate-900">
            What We Do Differently
          </h2>

          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              Many sourcing platforms optimize for volume — more leads, more introductions, more noise.
            </p>
            <p>
              FoodXchange optimizes for alignment: capability, commercial fit, expectations, and long‑term potential.
            </p>
            <p>
              When a connection happens, it is meaningful, actionable, and worth pursuing.
            </p>
          </div>
        </div>
      </section>

      {/* TIMELINE (REFINED MILESTONES) */}
      <section className="px-6 py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold mb-10 text-slate-900">
            Milestones & Track Record
          </h2>

          <div className="grid md:grid-cols-2 gap-8">

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
              <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                2006 → Present
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                Founded & led FoodXchange / FDX Trading
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                End‑to‑end commercial execution: sourcing, negotiations, pricing, logistics, and retail integration. [2](https://foodxchange.sharepoint.com/Shared%20Documents/Forms/DispForm.aspx?ID=283&web=1)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
              <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                Retail execution
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                Long‑term work with major Israeli retail chains
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Direct multi‑year cooperation across food categories, supporting sustainable import programs. [2](https://foodxchange.sharepoint.com/Shared%20Documents/Forms/DispForm.aspx?ID=283&web=1)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
              <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                2023
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                MBA — marketing & digital transformation focus
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Business education supporting modern, structured execution and platform thinking. [2](https://foodxchange.sharepoint.com/Shared%20Documents/Forms/DispForm.aspx?ID=283&web=1)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
              <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                Core expertise
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                Private label • Pricing • Trade • Kosher/Regulation
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Commercial negotiations, profitability, private label development, regulatory and kosher alignment. [2](https://foodxchange.sharepoint.com/Shared%20Documents/Forms/DispForm.aspx?ID=283&web=1)
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FOUNDER (PHOTO + TEXT, APPLE-LIKE) */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          {/* PHOTO CARD */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-sm ring-1 ring-black/5 transition duration-300 ease-out hover:shadow-xl hover:scale-[1.01]">
              <Image
                src="/founder-udi.jpg"
                alt="Udi Stryk"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 288px, 288px"
                priority
              />
            </div>
          </div>

          {/* TEXT */}
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
              Udi Stryk — Founder & Operator
            </h2>

            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                FoodXchange was founded by Udi Stryk, a commercial operator with 15+ years of experience
                in international food trade, sourcing, and supply chain execution. [2](https://foodxchange.sharepoint.com/Shared%20Documents/Forms/DispForm.aspx?ID=283&web=1)
              </p>
              <p>
                Udi has led full-cycle processes — from sourcing and negotiations, through regulatory alignment
                and logistics, to placing products on retail shelves in Israel. [2](https://foodxchange.sharepoint.com/Shared%20Documents/Forms/DispForm.aspx?ID=283&web=1)
              </p>
              <p>
                FoodXchange reflects this hands-on approach: precision, execution, and partnerships that scale.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/in/udi-stryk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
              >
                View LinkedIn →
              </a>

              <Link
                href="/en/contact"
                className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Contact →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-slate-900 text-white text-center">
        <h2 className="mb-4 text-3xl font-bold">Start a Focused Conversation</h2>
        <p className="mb-6 text-lg text-slate-300 max-w-xl mx-auto">
          Share your objective — we’ll help you evaluate the right direction.
        </p>
        <p className="text-sm text-slate-300 mb-10">
          We personally respond within <span className="text-white font-semibold">24 hours</span>.
        </p>

        <Link
          href="/en/contact"
          className="inline-flex items-center justify-center rounded-md bg-orange-500 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md"
        >
          Start the Conversation
        </Link>
      </section>

    </main>
  );
}
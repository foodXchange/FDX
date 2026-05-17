import Link from "next/link";

export default function HomePage() {
  const phone = "972525222291";

  const buyerMessage = encodeURIComponent(
    "Hi, I’m a buyer/importer interested in sourcing products through FoodXchange. Could you share relevant options?"
  );

  const manufacturerMessage = encodeURIComponent(
    "Hi, I’m a manufacturer interested in entering the Israeli market through FoodXchange. Let’s discuss collaboration."
  );

  return (
    <main className="bg-white text-slate-800">

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 bg-gradient-to-b from-slate-900 to-slate-800">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
          Strategic Food Sourcing for the{" "}
          <span className="text-orange-500">Israeli Market</span>
        </h1>

        <p className="max-w-2xl text-lg text-slate-200 mb-8">
          We help international food manufacturers and Israeli retailers build reliable,
          scalable sourcing partnerships — with commercial alignment and long‑term execution.
        </p>

        {/* TRUST LINE (fast response + trust signal) */}
        <p className="text-sm text-slate-300 mb-10">
          Typical response time: <span className="font-semibold text-white">within 24 hours</span>{" "}
          (business days) • Private label • Long‑term supply flow
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          {/* Buyer */}
          <a
            href={`https://wa.me/${phone}?text=${buyerMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold shadow transition transform hover:scale-105"
            aria-label="WhatsApp buyers"
          >
            I’m a Buyer
          </a>

          {/* Manufacturer */}
          <a
            href={`https://wa.me/${phone}?text=${manufacturerMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center border border-white text-white px-6 py-3 rounded-md font-semibold hover:bg-white hover:text-slate-900 transition"
            aria-label="WhatsApp manufacturers"
          >
            I’m a Manufacturer
          </a>
        </div>
      </section>

      {/* CASE STUDY (CORE PROOF) */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">How We Helped</h2>
            <p className="text-slate-500">
              Real sourcing partnerships — built for scale and long‑term success
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* LEFT – RESULT CARD */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                Private Label Supply
              </span>

              <h3 className="text-lg font-semibold text-slate-900 mt-2 mb-4">
                Frozen Vegetables & Fruits
              </h3>

              <ul className="space-y-2 text-sm text-slate-600">
                <li>✔ Belgium → Israel sourcing</li>
                <li>✔ Long-term commercial cooperation</li>
              </ul>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-3xl font-bold text-orange-500">🚢 3–4 Containers</p>
                <p className="text-sm text-slate-500">per month — growing steadily</p>
              </div>
            </div>

            {/* RIGHT – STORY */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Challenge</h4>
              <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                A major Israeli supermarket chain sought to expand its private label frozen category,
                but lacked a reliable European supplier aligned with its operational and commercial needs.
              </p>

              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Action</h4>
              <ul className="text-slate-600 mb-4 text-sm space-y-1">
                <li>• Identified a Belgian manufacturer aligned with requirements</li>
                <li>• Structured product and commercial alignment</li>
                <li>• Facilitated partnership development</li>
              </ul>

              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Result</h4>
              <ul className="text-slate-600 text-sm space-y-1">
                <li>• Long-term supply relationship established</li>
                <li>• Gradual scaling of volumes over time</li>
                <li>• Consistent multi-container monthly shipments</li>
              </ul>

              <p className="text-xs text-slate-400 mt-6">
                Major Israeli Retail Chain | European Manufacturer
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-12">
            We regularly support similar sourcing partnerships across multiple categories and markets.
          </p>
        </div>
      </section>

      {/* MARKET OPPORTUNITY */}
      <section className="px-6 py-24 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            A High‑Opportunity Import Market
          </h2>

          <p className="text-slate-600 max-w-3xl mx-auto mb-12">
            Israel presents a unique opportunity for international food manufacturers — combining strong demand,
            diverse consumer segments, and continuous reliance on imported products.
          </p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-2">Strong Import Dependence</h3>
              <p className="text-sm text-slate-600">
                Limited domestic production and high consumption create consistent demand for imported food products.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-2">Diverse Consumer Segments</h3>
              <p className="text-sm text-slate-600">
                Multiple dietary and cultural segments: kosher (standard and high-level), halal,
                and broad international flavor preferences.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-2">Ongoing Growth in Demand</h3>
              <p className="text-sm text-slate-600">
                A young and growing population, combined with retail expansion, drives continuous sourcing demand.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-12 max-w-2xl mx-auto">
            This combination creates long-term opportunity for manufacturers who align with market expectations and execution needs.
          </p>
        </div>
      </section>

      {/* WHO WE WORK WITH (ANONYMIZED) */}
      <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Who We Work With</h2>

          <p className="text-slate-600 max-w-2xl mx-auto mb-10">
            We collaborate with retailers and manufacturers across Europe and Israel,
            building long-term sourcing partnerships based on real demand and execution.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Major Israeli Retail Chains</h3>
              <p className="text-sm text-slate-500">
                Private label and sourcing programs across frozen, ambient, and grocery categories.
              </p>
              <p className="text-xs text-slate-400 mt-3">
                Example: National multi-format retailer with multi-store coverage
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">European Manufacturers</h3>
              <p className="text-sm text-slate-500">
                Export-ready producers across Italy, Belgium, Spain, and Central Europe.
              </p>
              <p className="text-xs text-slate-400 mt-3">
                Example: Private label capability + scalable production
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Private Label Programs</h3>
              <p className="text-sm text-slate-500">
                Structured supply partnerships with consistent container-level volumes.
              </p>
              <p className="text-xs text-slate-400 mt-3">
                Example: Long-term supply relationships with growing demand
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-10">
            Partnerships are built around commercial alignment, operational reliability, and sustainable volume growth.
          </p>
        </div>
      </section>

      {/* WHY CHOOSE FOODXCHANGE (DIFFERENTIATION) */}
      <section className="px-6 py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Choose FoodXchange</h2>

          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Fit Over Volume</h3>
              <p className="text-sm text-slate-600">
                We focus on the right match — not just any supplier. Every introduction is grounded in real commercial fit.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Structured Process</h3>
              <p className="text-sm text-slate-600">
                We guide alignment from requirements to commercial terms — reducing friction and uncertainty.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Market Access + Execution</h3>
              <p className="text-sm text-slate-600">
                We operate with buyer demand in mind and help move discussions into actionable next steps.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Built for Long‑Term Supply</h3>
              <p className="text-sm text-slate-600">
                We optimize for continuity and scaling volumes — not one‑off transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONVERSION FLOW */}
      <section className="px-6 py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">What Happens Next</h2>

          <p className="text-slate-600 max-w-2xl mx-auto mb-14">
            A simple, structured process designed to move from initial contact to real commercial discussions.
          </p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-500 text-white font-bold mb-4">
                1
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Initial Contact</h3>
              <p className="text-sm text-slate-600">
                You share your needs, capability, or sourcing objective (message or call).
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-500 text-white font-bold mb-4">
                2
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Alignment & Qualification</h3>
              <p className="text-sm text-slate-600">
                We clarify fit, expectations, and scope to ensure the next step is focused and relevant.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-500 text-white font-bold mb-4">
                3
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Targeted Introduction</h3>
              <p className="text-sm text-slate-600">
                We connect you with the right partner and support initial discussions toward collaboration.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-14 max-w-2xl mx-auto">
            Every engagement is designed for commercial alignment — not generic introductions.
          </p>
        </div>
      </section>

      {/* FINAL CTA (TWEAKED FOR HIGHER CONVERSION) */}
      <section className="text-center px-6 py-24 bg-slate-900 text-white">
        <h2 className="text-3xl font-semibold mb-4">
          Start a Focused Conversation
        </h2>

        <p className="text-slate-300 mb-6">
          Share your needs — we’ll respond personally and guide the next step.
        </p>

        <p className="text-sm text-slate-300 mb-10">
          Typical response time: <span className="font-semibold text-white">within 24 hours</span> (business days)
        </p>

        <Link href="/en/contact">
          <button className="bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-md font-semibold shadow">
            Contact Us
          </button>
        </Link>
      </section>

    </main>
  );
}
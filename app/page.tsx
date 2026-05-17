import Link from "next/link";

export default function HomePage() {
  const phone = "972525222291";

  const buyerMessage = encodeURIComponent(
    "Hi, I’m a buyer interested in sourcing products through FoodXchange. Could you share relevant options?"
  );

  const manufacturerMessage = encodeURIComponent(
    "Hi, I’m a manufacturer interested in entering the Israeli market through FoodXchange. Let’s discuss collaboration."
  );

  return (
    <main className="bg-white text-slate-800">

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 bg-gradient-to-b from-slate-900 to-slate-800">

        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
          Strategic Food Sourcing for the{" "}
          <span className="text-orange-500">Israeli Market</span>
        </h1>

        <p className="max-w-2xl text-lg text-slate-200 mb-8">
          We help international food manufacturers and Israeli retailers
          build reliable, scalable sourcing partnerships — with full commercial alignment
          and long-term vision.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">

          {/* Buyer */}
          <a
            href={`https://wa.me/${phone}?text=${buyerMessage}`}
            target="_blank"
          >
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold shadow transition transform hover:scale-105">
              I'm a Buyer
            </button>
          </a>

          {/* Manufacturer */}
          <a
            href={`https://wa.me/${phone}?text=${manufacturerMessage}`}
            target="_blank"
          >
            <button className="border border-white text-white px-6 py-3 rounded-md font-semibold hover:bg-white hover:text-slate-900 transition">
              I'm a Manufacturer
            </button>
          </a>

        </div>
      </section>

      {/* POSITIONING */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center bg-white">
        <h2 className="text-2xl font-semibold mb-6 text-slate-900">
          More Than a Connector
        </h2>

        <p className="text-slate-600 leading-relaxed">
          FoodXchange operates as a dedicated sourcing and commercial partner —
          not just an intermediary.  
          We ensure every partnership is commercially viable, operationally realistic,
          and built for long-term success.
        </p>
      </section>

      {/* WHAT WE DO */}
      <section className="px-6 py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">

          <h2 className="text-2xl font-semibold mb-10 text-center text-slate-900">
            What We Do
          </h2>

          <div className="grid md:grid-cols-2 gap-8 text-slate-600">
            <div>• Identify the right manufacturing partners</div>
            <div>• Align specifications and commercial terms</div>
            <div>• Support private label and sourcing projects</div>
            <div>• Facilitate efficient market entry</div>
          </div>

        </div>
      </section>

      {/* BUYERS */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-semibold mb-6 text-slate-900">
          For Buyers & Importers
        </h2>

        <p className="text-slate-600 leading-relaxed">
          We help you source reliable, high-quality manufacturing partners —
          reducing risk, saving time, and ensuring the right commercial fit.
        </p>
      </section>

      {/* MANUFACTURERS */}
      <section className="max-w-5xl mx-auto px-6 py-20 bg-slate-50 border-t border-slate-100">
        <h2 className="text-2xl font-semibold mb-6 text-slate-900">
          For Manufacturers
        </h2>

        <p className="text-slate-600 leading-relaxed">
          We support manufacturers entering the Israeli market —
          helping align your offering with buyer expectations and realities.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-24 bg-slate-900 text-white">
        <h2 className="text-3xl font-semibold mb-6">
          Let’s Build the Right Partnership
        </h2>

        <p className="text-slate-300 mb-8">
          Share your needs and let’s explore the right direction together.
        </p>

        <Link href="/en/contact">
          <button className="bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-md font-semibold">
            Contact Us
          </button>
        </Link>
      </section>

    </main>
  );
}
``
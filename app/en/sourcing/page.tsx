import type { Metadata } from "next";
import SourcingWidget from "@/components/SourcingWidget";

export const metadata: Metadata = {
  title: "Source Food Products for Israel | FoodXchange",
  description:
    "Tell us what you need to source for the Israeli market. Upload a reference image or describe your product — we find matching suppliers.",
  alternates: {
    canonical: "https://fdx.trading/en/sourcing",
  },
};

export default function SourcingPage() {
  return (
    <main className="bg-white text-slate-800">

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-4">
          For Buyers
        </p>
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl mx-auto leading-tight">
          Tell us what you need to source
        </h1>
        <p className="text-slate-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
          Upload a reference photo or describe your product. We match your request with the
          right suppliers — you only hear from us when there is a real fit.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {["No account needed", "Free to submit", "Response within 48 hours"].map((badge) => (
            <span
              key={badge}
              className="bg-white/10 text-slate-300 text-xs px-3 py-1 rounded-full"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* WIDGET */}
      <div className="max-w-xl mx-auto px-6 -mt-8 pb-16 relative z-10">
        <SourcingWidget source="sourcing-page" />
      </div>

      {/* HOW IT WORKS */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-100">
        <h2 className="text-2xl font-semibold text-slate-900 mb-10 text-center">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "Upload or describe",
              body: "You show us what you need — a photo, a description, or both.",
            },
            {
              n: "02",
              title: "We review and match",
              body: "We check our supplier network and validate the fit internally.",
            },
            {
              n: "03",
              title: "You hear from us",
              body: "We follow up only when we have a relevant match — no noise.",
            },
          ].map((item) => (
            <div key={item.n} className="text-center md:text-left">
              <span className="text-3xl font-black text-orange-500">{item.n}</span>
              <h3 className="font-semibold text-slate-900 mt-2 mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-slate-50 border-t border-slate-100 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 mb-8 text-center">
            Why buyers work with FoodXchange
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Validated suppliers only — we vet every manufacturer before recommending them",
              "No commitment — submit a request with zero obligation",
              "Israeli market expertise — we know what meets local standards and buyer expectations",
            ].map((point, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600 leading-relaxed"
              >
                <span className="text-orange-500 font-bold mr-2">✓</span>
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}

"use client";

import SourcingRequestForm from "@/components/forms/SourcingRequestForm";

export default function BuyerRequestSection() {
  return (
    <div>
      {/* ── 1. Onboarding Steps ── */}
      <section className="px-6 py-14 border-b border-dark-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "①",
                title: "Upload 3 Benchmark Photos or Speak",
                body: "Drop 1–3 photos of a benchmark product (e.g. Hellmann's or Heinz) or simply speak in Hebrew or English. Our AI extracts the exact specs.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                n: "②",
                title: "AI Guides & Builds Your Brief",
                body: "Our AI Concierge asks 1-click questions for any missing details (packaging, catering pump, weight, kosher, gluten-free, diabetic, private label) and writes a warm Seller Brief.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                ),
              },
              {
                n: "③",
                title: "Precision Benchmark Matching",
                body: "Your brief is automatically matched against 24,900+ verified products across 500+ manufacturers so only truly similar suppliers are selected.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div key={i} className="dark-card flex flex-col items-start gap-3 p-6">
                {step.icon}
                <div>
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">{step.n}</p>
                  <h3 className="font-semibold text-dark-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Social Proof Strip ── */}
      <section className="px-6 py-8 border-b border-dark-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Trusted by Israel&apos;s leading retailers and importers
          </p>
          <p className="text-sm text-slate-400 font-medium">
            Shufersal &nbsp;·&nbsp; Yochananof &nbsp;·&nbsp; Rami Levy &nbsp;·&nbsp; Ta&apos;aman &nbsp;·&nbsp; H. Cohen Import &nbsp;·&nbsp; Leiman Schlussel
          </p>
          <p className="mt-4 text-xs text-slate-500">
            500+ verified manufacturers &nbsp;·&nbsp; 17 product categories &nbsp;·&nbsp; 24h response time
          </p>
        </div>
      </section>

      <SourcingRequestForm source="buyers-page" showExamples />
    </div>
  );
}

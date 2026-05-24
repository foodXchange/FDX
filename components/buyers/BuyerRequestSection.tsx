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
                title: "Submit your request",
                body: "Upload a photo or describe what you need. Takes 2 minutes.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                n: "②",
                title: "We find matches",
                body: "Our system searches 500+ verified European manufacturers. You get results within 24 hours.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                  </svg>
                ),
              },
              {
                n: "③",
                title: "We make the introduction",
                body: "We handle the commercial alignment and stay involved through the early commercial discussion.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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

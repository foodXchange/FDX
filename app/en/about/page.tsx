import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "About | FoodXchange",
  description:
    "FoodXchange connects manufacturers and Israeli buyers through structured sourcing, commercial alignment, and long-term execution. Led by founder Udi Stryk.",
  keywords: [
    "FoodXchange",
    "Israeli market",
    "food sourcing",
    "private label sourcing",
    "import to Israel",
    "manufacturers",
    "retail buyers",
    "kosher sourcing",
  ],
  openGraph: {
    title: "About FoodXchange",
    description:
      "Structured sourcing partnerships for the Israeli market — commercial clarity, execution, and long-term supply thinking.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "About FoodXchange",
    description:
      "Structured sourcing partnerships for the Israeli market — commercial clarity, execution, and long-term supply thinking.",
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "FoodXchange",
        description:
          "Structured sourcing partnerships connecting manufacturers and Israeli buyers through commercial alignment and long-term execution.",
        sameAs: ["https://www.linkedin.com/in/udi-stryk/"],
      },
      {
        "@type": "Person",
        name: "Udi Stryk",
        jobTitle: "Founder & Operator",
        sameAs: ["https://www.linkedin.com/in/udi-stryk/"],
      },
    ],
  };

  return (
    <>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow"
      >
        Skip to content
      </a>

      {/* SEO structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main" className="bg-white text-slate-800">
        {/* HERO */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
          <Reveal>
            <h1 className="h1 text-white">
              About <span className="text-orange-500">FoodXchange</span>
            </h1>

            <p className="body mt-6 max-w-2xl mx-auto text-slate-200">
              We build sourcing partnerships that work in reality — not just on paper.
              <br />
              <br />
              Connecting manufacturers and buyers through structure, alignment, and execution.
            </p>

            <div className="mt-10">
              <Link href="/en/contact" className="btn-primary px-6 py-3 w-full sm:w-auto">
                Start a Conversation
              </Link>

              <p className="muted mt-3 text-slate-300">
                Response within <span className="text-white font-semibold">24 hours</span>
              </p>
            </div>
          </Reveal>
        </section>

        {/* PROOF */}
        <section className="px-6 py-16 border-t border-slate-100">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              "Active private label partnerships",
              "Container-level sourcing flow",
              "Long-term cooperation",
            ].map((item, i) => (
              <Reveal key={i}>
                <div className="card p-6 hover-lift text-sm text-slate-600">{item}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* DIFFERENCE */}
        <section className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="h2 mb-6">What We Do Differently</h2>
            </Reveal>

            <Reveal className="body space-y-4">
              <p>Most sourcing platforms focus on volume.</p>
              <p>We focus on alignment — fit, capability, and long-term success.</p>
              <p>Every connection is meaningful and actionable.</p>
            </Reveal>
          </div>
        </section>

        {/* FOUNDER (PREMIUM CARD + BIGGER RESPONSIVE IMAGE + TESTIMONIAL) */}
        <section className="px-6 py-24 border-t border-slate-100">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* IMAGE (1.5x bigger, responsive) */}
            <Reveal className="flex justify-center md:justify-start">
              <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] lg:w-[432px] lg:h-[432px] rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition hover:scale-[1.02]">
                <Image
                  src="/founder-udi.jpeg"
                  alt="Udi Stryk, FoodXchange founder"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 280px, (max-width: 1024px) 360px, 432px"
                  quality={82}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-md text-xs font-semibold bg-white/90 text-slate-900 shadow">
                  15+ years
                </div>
              </div>
            </Reveal>

            {/* TEXT CARD */}
            <Reveal>
              <div className="card p-8 hover-lift">
                <h2 className="h2 mb-4">Udi Stryk — Founder & Operator</h2>

                <div className="body space-y-3">
                  <p>15+ years in international food sourcing and trade.</p>
                  <p>End-to-end execution — from sourcing to retail shelf.</p>
                  <p>Focused on structured partnerships and long-term supply.</p>
                </div>

                {/* TESTIMONIAL LINE */}
                <p className="mt-6 text-sm text-slate-600 italic">
                  “Trusted by buyers and manufacturers across multiple categories — with confidentiality as a core principle.”
                </p>

                {/* STATS */}
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">15+</p>
                    <p className="muted">Years</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Multi</p>
                    <p className="muted">Categories</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Ongoing</p>
                    <p className="muted">Supply</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 flex gap-3 flex-wrap">
                  <Link href="/en/contact" className="btn-primary px-4 py-2">
                    Contact →
                  </Link>

                  <a
                    href="https://www.linkedin.com/in/udi-stryk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary px-4 py-2"
                  >
                    LinkedIn →
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 bg-slate-900 text-white text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold mb-4">Start a Conversation</h2>

            <p className="text-slate-300 mb-6">
              Tell us your objective — we’ll guide you clearly.
            </p>

            <Link href="/en/contact" className="btn-primary px-6 py-3">
              Start →
            </Link>
          </Reveal>
        </section>
      </main>
    </>
  );
}
``
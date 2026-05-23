import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "About FoodXchange | Food Sourcing for the Israeli Market",
  description:
    "FoodXchange is led by Udi Stryk — 15 years building real sourcing partnerships for the Israeli food market. We make introductions we believe in, not introductions we're paid for.",
  keywords: [
    "FoodXchange",
    "Udi Stryk",
    "Israeli market food sourcing",
    "food sourcing partnership",
    "import to Israel",
    "kosher sourcing partner",
  ],
  openGraph: {
    title: "About FoodXchange",
    description:
      "15 years building real sourcing partnerships — not just sending introductions and hoping for the best.",
    type: "website",
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
          "Sourcing partnerships connecting manufacturers and Israeli buyers through commercial alignment and long-term execution.",
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow"
      >
        Skip to content
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main">

        {/* ── HERO ── */}
        <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              About <span className="text-orange-500">FoodXchange</span>
            </h1>

            <p className="body mt-6 max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">
              We build sourcing partnerships that work in reality — not just on paper.
              We only make introductions we believe in, and we&apos;ll tell you honestly
              when something isn&apos;t the right fit.
            </p>

            <div className="mt-10">
              <Link
                href="/en/contact"
                className="inline-flex bg-orange-500 hover:bg-orange-600 text-white px-7 py-3.5 rounded-md font-semibold transition shadow"
              >
                Tell us what you need →
              </Link>
              <p className="text-sm mt-3 text-slate-400">
                Response within <span className="text-white font-semibold">24 hours</span>
                {" "}— personally, not by a bot.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── PROOF CARDS ── */}
        <section className="px-6 py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              { stat: "15+", label: "years", detail: "In international food sourcing and trade" },
              { stat: "Container-level", label: "volumes", detail: "Active private label partnerships in place" },
              { stat: "Long-term", label: "supply", detail: "We build for continuity, not one-off deals" },
            ].map((item, i) => (
              <Reveal key={i}>
                <div className="dark-card p-6 hover:-translate-y-0.5 transition text-center">
                  <div className="text-2xl font-black text-orange-500">{item.stat}</div>
                  <div className="text-sm font-semibold mt-0.5">{item.label}</div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── WHAT WE DO DIFFERENTLY ── */}
        <section className="px-6 py-20 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-2xl md:text-3xl font-semibold mb-8">What We Do Differently</h2>
            </Reveal>

            <Reveal>
              <div className="space-y-5 text-base leading-relaxed opacity-85">
                <p>
                  Most sourcing platforms focus on volume — getting as many connections in front of
                  as many people as possible. We focus on fit.
                </p>
                <p>
                  Every connection we make is grounded in real commercial alignment. We check specs,
                  volume, kosher requirements, and pricing expectations before any introduction
                  happens — so when we do introduce two parties, both sides already know it makes sense.
                </p>
                <p>
                  If we don&apos;t think it&apos;s the right fit, we&apos;ll say so. That honesty is what builds
                  the long-term relationships that make this market work.
                </p>
              </div>
            </Reveal>

            {/* Pull quote */}
            <Reveal>
              <div className="mt-12 border-l-4 border-orange-500 pl-8 py-2">
                <span className="block text-5xl text-orange-400 font-serif leading-none mb-2">&ldquo;</span>
                <p className="text-xl italic leading-relaxed font-medium">
                  The market is small enough that reputation matters above everything.
                  We only make introductions we believe in.
                </p>
                <p className="mt-4 text-sm text-slate-400 font-semibold">— Udi Stryk, Founder</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FOUNDER ── */}
        <section className="px-6 py-24 border-t border-white/10">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <Reveal className="flex justify-center md:justify-start">
              <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] lg:w-[432px] lg:h-[432px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition hover:scale-[1.02]">
                <Image
                  src="/founder-udi.jpeg"
                  alt="Udi Stryk, FoodXchange founder"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 280px, (max-width: 1024px) 360px, 432px"
                  quality={82}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-md text-xs font-semibold bg-white/90 text-slate-900 shadow">
                  15 years in food sourcing
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="dark-card p-8 hover:-translate-y-0.5 transition">
                <h2 className="text-2xl font-bold mb-5">Udi Stryk — Founder &amp; Operator</h2>

                <div className="space-y-3 text-sm leading-relaxed opacity-85">
                  <p>
                    15 years building real sourcing partnerships — not just sending introductions
                    and hoping for the best.
                  </p>
                  <p>
                    End-to-end execution: from understanding what a buyer actually needs, to
                    finding the manufacturer that genuinely fits, to supporting the commercial
                    discussion until it actually moves forward.
                  </p>
                  <p>
                    Focused on structured partnerships and long-term supply — because that&apos;s
                    what makes the Israeli market work for both sides.
                  </p>
                </div>

                <p className="mt-6 text-sm italic border-l-2 border-orange-400 pl-4 opacity-85">
                  "Trusted by buyers and manufacturers across multiple categories — with
                  confidentiality as a core principle."
                </p>

                <div className="grid grid-cols-3 gap-4 mt-6 text-center border-t border-white/10 pt-6">
                  <div>
                    <p className="text-lg font-bold text-orange-500">15+</p>
                    <p className="text-xs text-slate-400 mt-0.5">Years</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-500">Multi</p>
                    <p className="text-xs text-slate-400 mt-0.5">Categories</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-500">Ongoing</p>
                    <p className="text-xs text-slate-400 mt-0.5">Supply</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 flex-wrap">
                  <Link href="/en/contact" className="inline-flex items-center justify-center rounded-md font-semibold transition bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 text-sm shadow-sm">
                    Contact →
                  </Link>
                  <a
                    href="https://www.linkedin.com/in/udi-stryk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex items-center justify-center rounded-md font-semibold px-4 py-2 text-sm"
                  >
                    LinkedIn →
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── HOW WE WORK ── */}
        <section className="px-6 py-20 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-semibold">How We Work</h2>
                <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                  Three steps. No noise. A real answer at the end of each one.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: "1",
                  title: "We listen",
                  body: "Understand your actual objective — not just your product list. What volume makes this market viable for you? What's your kosher situation? What timeline are you working with?",
                },
                {
                  n: "2",
                  title: "We assess",
                  body: "Category fit, pricing reality, kosher requirements, capacity. We give you an honest picture of whether the Israeli market makes sense for you right now — not what you want to hear.",
                },
                {
                  n: "3",
                  title: "We introduce",
                  body: "A specific, qualified match — with full context on both sides. We stay involved through the commercial discussion until things are actually moving.",
                },
              ].map((step, i) => (
                <Reveal key={i}>
                  <div className="dark-card p-7 h-full">
                    <div className="w-11 h-11 mb-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-black text-lg">
                      {step.n}
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── MARKET IMAGE ── */}
        <section className="px-6 py-12 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: "320px" }}>
                <Image
                  src="/images/telaviv-aerial.png"
                  alt="Tel Aviv city aerial view with Mediterranean coastline"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={85}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 py-24 bg-slate-900 text-white text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold mb-4">Start a Conversation</h2>
            <p className="text-slate-300 mb-3 max-w-xl mx-auto">
              Tell us your objective — we&apos;ll give you a clear, honest answer about whether
              and how we can help.
            </p>
            <p className="text-sm text-slate-500 mb-10">
              Every message is read personally. Response within 24 hours.
            </p>
            <Link
              href="/en/contact"
              className="inline-flex bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-md font-semibold transition shadow"
            >
              Tell us what you need →
            </Link>
          </Reveal>
        </section>

      </main>
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Food Sourcing for the Israeli Market | FoodXchange",
  description:
    "FoodXchange connects Israeli food retailers with international manufacturers. Private label, frozen foods, ambient grocery — real partnerships, not just introductions.",
  keywords: [
    "food sourcing Israel",
    "Israeli food import",
    "private label Israel",
    "food manufacturer Israel",
    "kosher supplier",
    "frozen food Israel",
  ],
  openGraph: {
    title: "Food Sourcing for the Israeli Market | FoodXchange",
    description:
      "Real sourcing partnerships for Israeli retailers and international food manufacturers. Container-level volumes, private label, and long-term supply.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="bg-slate-900">

      {/* ── HERO ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 bg-gradient-to-b from-slate-900 to-slate-800">
        <Reveal>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Find the Right Food Supplier for the{" "}
            <span className="text-orange-500">Israeli Market</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-300 mt-6 leading-relaxed">
            We connect Israeli retailers and international food manufacturers — not just introductions,
            but real partnerships built on making sure you're the right match before anyone wastes time.
          </p>

          {/* Trust bar */}
          <div className="mt-8 flex items-center justify-center gap-0 flex-wrap">
            <div className="px-6 py-3 text-center">
              <div className="text-2xl font-bold text-orange-400">15+</div>
              <div className="text-xs text-slate-400 mt-0.5">Years in food sourcing</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="px-6 py-3 text-center">
              <div className="text-2xl font-bold text-orange-400">Multi-category</div>
              <div className="text-xs text-slate-400 mt-0.5">Frozen, ambient, specialty</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="px-6 py-3 text-center">
              <div className="text-2xl font-bold text-orange-400">24h</div>
              <div className="text-xs text-slate-400 mt-0.5">Typical response time</div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            We respond personally — not with an auto-reply.
          </p>

          <div className="flex gap-4 flex-wrap justify-center mt-10">
            <Link
              href="/en/buyers"
              className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-7 py-3.5 rounded-md font-semibold shadow transition"
            >
              I&apos;m a Buyer →
            </Link>
            <Link
              href="/en/manufacturers"
              className="inline-flex items-center justify-center border border-white/40 text-white px-7 py-3.5 rounded-md font-semibold hover:bg-white/10 transition"
            >
              I&apos;m a Manufacturer →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── RESULTS THAT SPEAK ── */}
      <section className="px-6 py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">
                Proof of work
              </p>
              <h2 className="text-3xl font-bold text-white">
                Food Sourcing That Actually Works
              </h2>
              <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                Here&apos;s what a real partnership looks like — not a one-off introduction, but a supply flow that grew over time.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <Reveal>
              <div className="bg-slate-900 text-white rounded-2xl p-8">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-4">
                  Frozen Private Label · Belgium → Israel
                </p>
                <div className="text-6xl font-black text-orange-400 leading-none">
                  3–4
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  containers per month
                </div>
                <p className="text-slate-400 text-sm mt-3">
                  Growing steadily — started with one trial shipment.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-orange-400">200+</div>
                    <div className="text-xs text-slate-500 mt-0.5">Sourcing Requests</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-400">Long-term</div>
                    <div className="text-xs text-slate-500 mt-0.5">Supply contract</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-400">Private label</div>
                    <div className="text-xs text-slate-500 mt-0.5">Own brand range</div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: "320px" }}>
                <Image
                  src="/images/belgium-israel-container-shipping.png"
                  alt="Shipping containers in transit between Belgium and Israel representing container-level food supply"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={85}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW WE HELPED (full case study) ── */}
      <section className="px-6 py-20 bg-slate-800 border-t border-slate-700">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">How We Made It Happen</h2>
              <p className="text-slate-400 mt-3">
                Every partnership starts with understanding what each side actually needs.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8">
            <Reveal>
              <div className="bg-slate-700/50 border border-slate-700 rounded-2xl p-7 h-full">
                <span className="text-xs font-semibold text-orange-500 uppercase tracking-widest">
                  OUTCOME
                </span>
                <h3 className="text-xl font-bold text-white mt-3 mb-2">
                  3–4 Containers per Month
                </h3>
                <p className="text-sm text-slate-400 mb-5">
                  Frozen vegetables &amp; fruits, private label, Belgium → Israel
                </p>
                <div className="border-t border-slate-700 pt-5 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Long-term supply</span>
                    <p className="text-sm text-slate-300 mt-0.5">Commercial cooperation still growing — from first trial to consistent monthly volume.</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Private label</span>
                    <p className="text-sm text-slate-300 mt-0.5">Full retailer own-brand range with aligned specs and kosher certification.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-6">Major Israeli Retail Chain · European Manufacturer</p>
              </div>
            </Reveal>

            <Reveal>
              <div className="bg-slate-700/50 border border-slate-700 rounded-2xl p-7 h-full">
                <div className="space-y-5 text-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Challenge</span>
                    <p className="text-slate-300 mt-2 leading-relaxed">
                      A major Israeli supermarket chain needed to expand its private label frozen range
                      but had no reliable European supplier aligned with its commercial and operational requirements.
                    </p>
                  </div>
                  <div className="border-t border-slate-700 pt-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">What we did</span>
                    <ul className="text-slate-300 mt-2 space-y-1.5">
                      <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Found a Belgian manufacturer that actually fit — specs, capacity, and price point</li>
                      <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Made sure both sides were aligned before any introduction happened</li>
                      <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Supported the commercial discussion through to first order</li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-700 pt-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Result</span>
                    <ul className="text-slate-300 mt-2 space-y-1.5">
                      <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Long-term supply relationship with consistent monthly shipments</li>
                      <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Volume scaled from trial to 3–4 containers per month</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <p className="text-center text-sm text-slate-400 mt-10">
              We run similar partnerships across multiple categories. Tell us what you need.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── MARKET OPPORTUNITY ── */}
      <section className="px-6 py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white mb-5">
              A High-Opportunity Import Market
            </h2>
            <p className="text-slate-300 max-w-3xl mx-auto mb-12">
              Israel imports over 70% of its food products. For manufacturers, that&apos;s consistent demand.
              For buyers, that means a wide supplier base — if you know where to look.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              {
                title: "Strong Import Dependence",
                body: "Limited domestic production and high consumption create consistent, year-round demand for imported food across all categories.",
              },
              {
                title: "Diverse Consumer Segments",
                body: "Kosher (standard and premium), halal, and broad international flavor preferences — a market that rewards quality and specificity.",
              },
              {
                title: "Growing Demand",
                body: "A young, growing population combined with retail expansion means this isn&apos;t a static opportunity — it&apos;s a growing one.",
              },
            ].map((item, i) => (
              <Reveal key={i}>
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl h-full">
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE WORK WITH ── */}
      <section className="px-6 py-20 bg-slate-800 border-t border-slate-700">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white mb-4">Who We Work With</h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-10">
              Israeli retailers looking for the right supplier. European manufacturers ready to export.
              We&apos;re the bridge that makes sure both sides are actually ready for each other.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              {
                title: "Major Israeli Retail Chains",
                body: "Private label and sourcing programs across frozen, ambient, and grocery categories.",
                note: "National multi-format retailers with consistent volume requirements",
              },
              {
                title: "European Manufacturers",
                body: "Export-ready producers across Italy, Belgium, Spain, and Central Europe — with private label capability.",
                note: "Scalable production, competitive pricing, real export capacity",
              },
              {
                title: "Private Label Programs",
                body: "Structured supply partnerships with container-level volumes and growing demand over time.",
                note: "Long-term relationships — not one-off transactions",
              },
            ].map((item, i) => (
              <Reveal key={i}>
                <div className="bg-slate-700/50 border border-slate-700 rounded-2xl p-6 h-full flex flex-col">
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed flex-1">{item.body}</p>
                  <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-700">{item.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE FOODXCHANGE ── */}
      <section className="px-6 py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Why Choose FoodXchange</h2>
              <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                There are a lot of directories and databases. We&apos;re not one of them.
                Here&apos;s the actual difference.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              {
                title: "Fit over volume",
                body: "We focus on the right match — not any match. Every introduction is grounded in real commercial fit, not just geographic availability.",
              },
              {
                title: "Honest feedback, both ways",
                body: "If we don&apos;t think it&apos;s the right fit, we&apos;ll tell you — and explain why. We don&apos;t waste your time or ours.",
              },
              {
                title: "No surprises on specs or price",
                body: "We work to surface requirements early — kosher path, MOQ, packaging, pricing — so there are no late-stage deal-breakers.",
              },
              {
                title: "Built for long-term supply",
                body: "We optimize for continuity and scaling volumes — not closing a single deal. If it&apos;s not going to last, it&apos;s not the right introduction.",
              },
            ].map((item, i) => (
              <Reveal key={i}>
                <div className="flex gap-4">
                  <span className="text-orange-500 font-black text-xl mt-0.5 shrink-0">→</span>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: "360px" }}>
              <Image
                src="/images/supermarket-premium-shelf.png"
                alt="Premium food products on Israeli supermarket shelf"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1024px"
                quality={85}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="text-center px-6 py-24 bg-slate-900 text-white">
        <Reveal>
          <h2 className="text-3xl font-semibold mb-4">
            Tell us what you&apos;re looking for
          </h2>
          <p className="text-slate-300 mb-3 max-w-xl mx-auto">
            We&apos;ll take it from there. A real reply, within 24 hours, from a person who&apos;s read your message.
          </p>
          <p className="text-sm text-slate-500 mb-10">
            We respond personally — not with an auto-reply.
          </p>
          <Link
            href="/en/contact"
            className="inline-flex bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-md font-semibold shadow transition"
          >
            Tell us what you need →
          </Link>
        </Reveal>
      </section>

    </main>
  );
}

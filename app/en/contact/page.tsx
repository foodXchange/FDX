import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";
import MatchingWidget from "@/components/MatchingWidget";

export const metadata: Metadata = {
  title: "Contact FoodXchange | Start a Sourcing Conversation",
  description:
    "Get in touch with FoodXchange — we respond within 24 hours personally. Buyers looking for suppliers and manufacturers entering the Israeli market are both welcome.",
  keywords: [
    "contact FoodXchange",
    "food sourcing Israel contact",
    "Israeli market inquiry",
    "food supplier contact",
  ],
  openGraph: {
    title: "Contact FoodXchange | Start a Sourcing Conversation",
    description:
      "Every message is read personally by Udi. We respond within 24 hours with a specific answer — not a template.",
    type: "website",
  },
};

export default function EnglishContactPage() {
  return (
    <main className="bg-slate-900">

      {/* ── REASSURANCE BAR ── */}
      <div className="bg-slate-800 text-white px-6 py-5 text-center border-b border-slate-700">
        <p className="text-sm text-slate-300 max-w-2xl mx-auto">
          Every message is read personally by Udi.{" "}
          <span className="text-white font-semibold">
            We respond within 24 hours with a specific answer — not a template.
          </span>
        </p>
      </div>

      {/* ── HERO ── */}
      <section className="px-6 py-16 text-center border-b border-slate-800">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Let&apos;s Start a Conversation
        </h1>
        <p className="mt-4 text-slate-300 max-w-xl mx-auto leading-relaxed">
          Whether you&apos;re a buyer looking for the right supplier, or a manufacturer exploring
          the Israeli market — tell us what you&apos;re looking for and we&apos;ll take it from there.
        </p>
      </section>

      {/* ── CONTACT OPTION CARDS ── */}
      <section className="px-6 py-12 bg-slate-800 border-b border-slate-700">
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">

          {/* WhatsApp */}
          <div className="bg-slate-700/50 border-2 border-green-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💬</span>
              <h2 className="font-bold text-white">Prefer a quick conversation?</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Message us on WhatsApp — it&apos;s the fastest way to reach us and we respond
              personally. Ideal if you have a quick question or want to share a brief overview.
            </p>
            <a
              href="https://wa.me/972525222291"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition"
            >
              Open WhatsApp →
            </a>
          </div>

          {/* Email form */}
          <div className="bg-slate-700/50 border-2 border-orange-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✉️</span>
              <h2 className="font-bold text-white">Prefer to write it out?</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Use the form below. Tell us what you&apos;re looking for and we&apos;ll reply with a
              clear next step — not a generic response, a specific one based on your situation.
            </p>
            <a
              href="#contact-form"
              className="inline-flex items-center justify-center w-full bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition"
            >
              Use the form below ↓
            </a>
          </div>

        </div>
      </section>

      {/* ── FORM ── */}
      <section id="contact-form" className="px-6 py-16">
        <div className="max-w-lg mx-auto">
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-2">
              Find relevant scenarios
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Describe what you are sourcing — we will show similar work we have done.
            </p>
            <MatchingWidget placeholder="e.g. tomato paste in cups, private label, kosher, for retail" />
          </div>
          <LeadForm />
        </div>
      </section>

    </main>
  );
}

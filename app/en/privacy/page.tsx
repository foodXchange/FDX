import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | FoodXchange",
  description: "How FoodXchange collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
        <p className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Privacy Policy
        </h1>
        <div className="w-16 h-1 bg-orange-500 mx-auto mt-5 rounded-full" />
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
          How we collect, use, and protect your personal information.
        </p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* Company info */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Company</p>
            <p className="text-slate-300 text-lg leading-relaxed">
              <strong className="text-white">FOODZXCHANGE</strong><br />
              Tel Aviv, Israel<br />
              Company ID / VAT: 516970936<br />
              <a href="mailto:info@foodz-x.com" className="text-orange-400 hover:text-orange-300 transition font-medium">
                info@foodz-x.com
              </a>
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Information we collect */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Information We Collect
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We collect information you provide through our website forms, including
              your name, email address, company name, and message content. We do not
              collect sensitive personal data beyond what is necessary to respond to
              your inquiry.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* How we use it */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              How We Use Your Information
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "Respond to your sourcing and partnership inquiries",
                "Manage ongoing supplier and buyer relationships",
                "Send commercial updates — only with your explicit consent",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-300 text-lg leading-relaxed">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Data storage */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Data Storage
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We use trusted, industry-standard providers to store and process your
              data — including Supabase for database storage and Resend for email
              delivery. All providers are bound by data protection agreements.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Your rights */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Your Rights
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              You have the right to access, correct, or request deletion of any
              personal data we hold about you. To exercise these rights, contact us
              at the address below and we will respond within 30 days.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Contact
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              For any privacy-related questions or requests:
            </p>
            <a
              href="mailto:info@foodz-x.com"
              className="inline-flex items-center gap-2 mt-4 text-orange-400 hover:text-orange-300 font-medium text-lg transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              info@foodz-x.com
            </a>
          </div>

        </div>
      </section>

    </main>
  );
}

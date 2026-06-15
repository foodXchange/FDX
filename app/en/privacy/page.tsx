import type { Metadata } from "next";
import Link from "next/link";

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
        <p className="mt-4 text-sm text-white/40">Last updated: June 2026</p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* Company info */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Company</p>
            <p className="text-slate-300 text-lg leading-relaxed">
              <strong className="text-white">Foodz.X Ltd</strong> (FoodXchange)<br />
              Tel Aviv, Israel<br />
              Company ID / VAT: 516970936<br />
              <a href="mailto:info@foodz-x.com" className="text-orange-400 hover:text-orange-300 transition font-medium">
                info@foodz-x.com
              </a>
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* What data is collected */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              What Data We Collect
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We collect the information you provide directly to us, including company and
              contact details (name, email address, phone number, company name, role), sourcing
              requests and product specifications, match and pipeline activity on the platform,
              and the content of communications exchanged through FoodXchange — including
              messages, RFQs, and quotes between Buyers and Suppliers.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* How we use it */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We use this information to operate the matching and sourcing platform — connecting
              Buyers with relevant Suppliers and facilitating RFQs and quotes — to run core
              platform operations such as account access and admin coordination, to analyze
              platform usage so we can improve the service, and to send email notifications
              related to your sourcing requests, matches, RFQs, and account activity.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Data sharing */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Data Sharing
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We share your information only with the other party in a Match — for example, a
              Supplier&apos;s product and pricing details with a matched Buyer, or a Buyer&apos;s
              sourcing request with a matched Supplier — and only as part of the introduction and
              quoting process described in our{" "}
              <Link href="/en/terms" className="text-orange-400 hover:text-orange-300 underline">
                Terms of Service
              </Link>
              . We do not sell your personal data to third parties. We use trusted,
              industry-standard service providers — including Supabase for database storage and
              Resend for email delivery — who are bound by data protection agreements and only
              process data on our behalf.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Cookies */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Cookies
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We use cookies for analytics purposes only — to understand how visitors use our
              website and improve it over time. We do not use cookies for advertising or sell
              cookie data to advertising networks.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Data retention */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Data Retention
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We retain data for active accounts for as long as the account remains active. If
              you request deletion of your account, we will delete or anonymize your personal
              data within 90 days, except where retention is required to meet legal, regulatory,
              or accounting obligations (for example, records relating to commission on a
              Transaction).
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Your rights */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Your Rights
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              You have the right to access, correct, or request deletion of any personal data we
              hold about you. To exercise these rights, email us at{" "}
              <a href="mailto:info@foodz-x.com" className="text-orange-400 hover:text-orange-300 underline">
                info@foodz-x.com
              </a>{" "}
              and we will respond within 30 days.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Israeli law */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Compliance with Israeli Law
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We process personal data in accordance with the Israeli Privacy Protection Law,
              5741-1981, and its regulations.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Contact
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              For any privacy-related questions or requests:
            </p>
            <a
              href="mailto:info@foodz-x.com"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium text-lg transition"
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

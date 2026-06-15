import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | FoodXchange",
  description: "Terms and conditions for using the FoodXchange B2B sourcing platform.",
};

export default function TermsPage() {
  return (
    <main>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
        <p className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Terms of Service
        </h1>
        <div className="w-16 h-1 bg-orange-500 mx-auto mt-5 rounded-full" />
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
          Please read these terms carefully before using the FoodXchange platform.
        </p>
        <p className="mt-4 text-sm text-white/40">Last updated: June 2026</p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* 1. Platform Overview */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              1. Platform Overview
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              FoodXchange (operated by Foodz.X Ltd, &quot;FoodXchange&quot;, &quot;we&quot;, &quot;us&quot;) operates a
              B2B sourcing platform connecting international food manufacturers and suppliers
              (&quot;Suppliers&quot;) with Israeli buyers and retailers (&quot;Buyers&quot;).
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              FoodXchange acts as a facilitator and intermediary. We are not a party to, and do
              not guarantee, any commercial transaction, contract, or agreement entered into
              between a Buyer and a Supplier introduced through the platform.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 2. Commission Structure */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              2. Commission Structure
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              A sourcing commission of <strong className="text-white">3% of order value</strong>{" "}
              applies to any commercial transaction between a Buyer and a Supplier that were
              introduced to one another via FoodXchange. This commission applies for a period of{" "}
              <strong className="text-white">24 months</strong> from the date of the first
              introduction, regardless of whether the resulting transaction occurs immediately
              or later within that period.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              An &quot;Introduction&quot; means any Match, RFQ (request for quotation), or
              communication between a Buyer and a Supplier that is facilitated, initiated, or
              recorded through the FoodXchange platform — including but not limited to platform
              messages, supplier matches, RFQ responses, and quote exchanges.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              The sourcing commission is payable by the Buyer within{" "}
              <strong className="text-white">30 days</strong> of the date of each shipment
              invoice issued in connection with a Transaction.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              Buyers and Suppliers may not circumvent the platform — directly or indirectly —
              in order to avoid payment of the sourcing commission on a Transaction resulting
              from an Introduction (the &quot;anti-circumvention clause&quot;). This includes
              continuing or renewing a commercial relationship outside of the platform after an
              Introduction has taken place.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 3. Definitions */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              3. Definitions
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">&quot;Match&quot;</strong> means an instance where
              FoodXchange connects a Buyer&apos;s sourcing request with a Supplier&apos;s product
              offering.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">&quot;Introduction&quot;</strong> means the first
              facilitated contact between a Buyer and a Supplier via the platform, in any form.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">&quot;Transaction&quot;</strong> means any purchase
              order, contract, or other commercial agreement resulting, directly or indirectly,
              from a Match.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              <strong className="text-white">&quot;Platform&quot;</strong> means fdx.trading and
              all related websites, applications, and services operated by FoodXchange.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 4. User Obligations */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              4. User Obligations
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              By using the platform, you agree to provide accurate and up-to-date company and
              product information, and to keep this information current.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              You agree to respond to RFQs and other communications facilitated through the
              platform within a reasonable timeframe.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              You agree to report to FoodXchange all Transactions resulting from Introductions
              made through the platform, including order values and shipment dates, so that the
              applicable sourcing commission can be calculated.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              You agree not to share contact information for Buyers or Suppliers obtained through
              the platform with any third party without prior written consent from FoodXchange.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 5. Confidentiality */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              5. Confidentiality
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Buyer identities are not revealed to Suppliers until explicitly authorized by
              FoodXchange administration as part of the matching and introduction process.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Supplier pricing, quotes, and other commercial terms shared via the platform are
              confidential and intended solely for the relevant Buyer and Supplier — they may not
              be disclosed to any other party.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              Data made available through the platform — including but not limited to supplier
              listings, pricing, contact details, and sourcing requests — may not be scraped,
              exported, copied, or shared with third parties.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 6. Limitation of Liability */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              6. Limitation of Liability
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              FoodXchange does not guarantee the quality, safety, regulatory compliance,
              delivery, or overall performance of any product or Supplier introduced through the
              platform.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              FoodXchange is not liable for any dispute, loss, or damage arising between a Buyer
              and a Supplier in connection with a Transaction, including disputes relating to
              quality, delivery, payment, or contractual terms.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              To the fullest extent permitted by law, FoodXchange&apos;s maximum aggregate
              liability to any user, for any claim arising from or relating to the platform or
              these terms, is limited to the total sourcing commission fees paid by that user to
              FoodXchange in the preceding 12 months.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 7. Dispute Resolution */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              7. Dispute Resolution
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              These terms, and any dispute arising from or relating to the platform or these
              terms, are governed by the laws of the State of Israel.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Any dispute shall first be referred to mediation in Tel Aviv, Israel, before either
              party initiates litigation.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              In the event of a dispute concerning whether a Transaction resulted from an
              Introduction made via the platform, FoodXchange will provide its internal platform
              records (including Match, RFQ, and communication logs) as evidence of the
              Introduction.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 8. Data & Privacy */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              8. Data &amp; Privacy
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Your personal and company data is processed in accordance with our{" "}
              <Link href="/en/privacy" className="text-orange-400 hover:text-orange-300 underline">
                Privacy Policy
              </Link>{" "}
              and the Israeli Privacy Protection Law, 5741-1981.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 9. Modifications */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              9. Modifications
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              FoodXchange may update these terms from time to time. We will provide at least 30
              days&apos; notice of any material change. Continued use of the platform after such
              notice constitutes acceptance of the updated terms.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* 10. Contact */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              10. Contact
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-2">
              Questions about these terms? Reach us at:
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              FoodXchange / Foodz.X Ltd<br />
              Tel Aviv, Israel
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

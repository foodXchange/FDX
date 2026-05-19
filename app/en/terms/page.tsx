import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | FoodXchange",
  description: "Terms and conditions for using the FoodXchange website and services.",
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
          Terms of Use
        </h1>
        <div className="w-16 h-1 bg-orange-500 mx-auto mt-5 rounded-full" />
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
          Please read these terms carefully before using our website and services.
        </p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* About */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              About FoodXchange
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              <strong className="text-slate-800">FOODZXCHANGE</strong> provides strategic
              sourcing and commercial partnership services connecting global food
              manufacturers with Israeli buyers. By using this website, you agree to
              these terms of use.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* No guarantees */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              No Guarantees
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              FoodXchange does not guarantee specific commercial outcomes, pricing
              agreements, regulatory approvals, or partnership results. We facilitate
              introductions and sourcing processes but cannot commit to outcomes
              dependent on third-party decisions.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Use of website */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Use of This Website
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              By using this site you agree to use it responsibly, provide accurate
              information in any forms you complete, and not engage in any activity
              that could harm the site, its users, or FoodXchange's reputation. We
              reserve the right to restrict access if these conditions are violated.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Intellectual property */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Intellectual Property
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              All content on this website — including text, graphics, logos, and code —
              is the property of FOODZXCHANGE and may not be reproduced without prior
              written permission.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Limitation of liability */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              To the fullest extent permitted by law, FoodXchange is not liable for
              any indirect, incidental, or consequential losses arising from use of
              this website or reliance on information provided herein.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Contact
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Questions about these terms? Reach us at:
            </p>
            <a
              href="mailto:info@foodz-x.com"
              className="inline-flex items-center gap-2 mt-4 text-orange-600 hover:text-orange-700 font-medium text-lg transition"
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

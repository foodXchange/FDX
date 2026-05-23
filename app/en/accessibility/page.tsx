import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement | FoodXchange",
  description: "Our commitment to making FoodXchange accessible to all users.",
};

export default function AccessibilityPage() {
  return (
    <main>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
        <p className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Accessibility Statement
        </h1>
        <div className="w-16 h-1 bg-orange-500 mx-auto mt-5 rounded-full" />
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
          Our commitment to making FoodXchange accessible to every user.
        </p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* Commitment */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Our Commitment
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              FOODZXCHANGE is committed to ensuring this website is accessible to
              all users, including those with disabilities. We aim to meet the Web
              Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Features */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Accessibility Features
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "Full keyboard navigation — every interactive element is reachable without a mouse",
                "Clear heading structure and semantic HTML for screen reader compatibility",
                "High-contrast color combinations meeting WCAG AA ratios",
                "Descriptive alt text on all meaningful images",
                "Skip-to-content link available on all pages",
                "Responsive layout that works across devices and zoom levels",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-300 text-lg leading-relaxed">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Known issues */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Known Limitations
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We are continuously improving accessibility across the site. Some
              third-party embedded content may not yet fully meet our standards.
              If you encounter a barrier, please let us know and we will address
              it promptly.
            </p>
          </div>

          <hr className="border-t border-slate-800" />

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-semibold text-white border-l-4 border-orange-500 pl-4 mb-4">
              Report an Issue
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              If you experience an accessibility issue on any page of our site,
              we want to hear from you. Contact us and we will respond within
              3 business days.
            </p>

            <div className="mt-6 bg-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-5 h-5 text-orange-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a
                  href="mailto:info@foodz-x.com"
                  className="text-orange-400 hover:text-orange-300 font-medium text-lg transition"
                >
                  info@foodz-x.com
                </a>
              </div>
              <p className="text-slate-400 text-sm">
                Response within 3 business days
              </p>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}

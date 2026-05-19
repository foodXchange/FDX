import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Notice | FoodXchange",
  description: "How FoodXchange uses cookies and how you can control them.",
};

export default function CookiesPage() {
  return (
    <main>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
        <p className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Cookie Notice
        </h1>
        <div className="w-16 h-1 bg-orange-500 mx-auto mt-5 rounded-full" />
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
          How we use cookies and how you can control them.
        </p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* What are cookies */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              What Are Cookies
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Cookies are small text files placed on your device when you visit a
              website. They help us provide core functionality, remember your
              preferences, and understand how visitors use our site.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* How we use them */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              How We Use Cookies
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "Essential cookies to make the website function correctly",
                "Analytics cookies to understand aggregate usage patterns",
                "Preference cookies to remember your settings",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600 text-lg leading-relaxed">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-slate-600 text-lg leading-relaxed">
              We do not use cookies for targeted advertising or sell cookie data
              to third parties.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Control cookies */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Control Your Cookies
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              You can modify or disable cookies through your browser settings at any
              time. Most browsers allow you to block or delete cookies. Note that
              disabling essential cookies may affect website functionality.
            </p>
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest mb-3">
                Browser guides
              </p>
              <ul className="space-y-2 text-slate-600 text-base">
                {[
                  "Chrome: Settings → Privacy and security → Cookies",
                  "Firefox: Settings → Privacy & Security → Cookies",
                  "Safari: Preferences → Privacy → Manage Website Data",
                  "Edge: Settings → Cookies and site permissions",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Questions
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              For any questions about our use of cookies:
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

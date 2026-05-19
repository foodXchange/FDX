import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing & Newsletter Policy | FoodXchange",
  description: "We only contact users who explicitly opted in. Unsubscribe anytime.",
};

export default function MarketingPage() {
  return (
    <main>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20 sm:py-24 text-center">
        <p className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Marketing &amp; Newsletter Policy
        </h1>
        <div className="w-16 h-1 bg-orange-500 mx-auto mt-5 rounded-full" />
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
          We only contact users who explicitly opted in. No spam, ever.
        </p>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">

          {/* Our commitment */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Our Commitment
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              FoodXchange sends newsletters and commercial updates only to users who
              have explicitly opted in through our website forms. We never add contacts
              to mailing lists without clear consent, and we never sell or share your
              email address with third parties.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* What we send */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              What We Send
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "Sourcing market updates and insights",
                "New product and supplier opportunities",
                "Industry news relevant to the Israeli food market",
                "FoodXchange service announcements",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600 text-lg leading-relaxed">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Unsubscribe */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-4">
              Unsubscribe
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              You can unsubscribe at any time by clicking the unsubscribe link in any
              email we send, or by contacting us directly. We will process your request
              immediately — you will not receive further emails after confirming.
            </p>
          </div>

          <hr className="border-t border-slate-100" />

          {/* Contact card */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 border-l-4 border-orange-500 pl-4 mb-6">
              Contact Us
            </h2>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest mb-6">
                Get in touch
              </p>

              <div className="flex items-center gap-3 mb-6">
                {/* Mail icon */}
                <svg className="w-5 h-5 text-orange-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a
                  href="mailto:info@foodz-x.com"
                  className="text-orange-600 hover:text-orange-700 font-medium text-lg transition"
                >
                  info@foodz-x.com
                </a>
              </div>

              <a
                href="https://wa.me/972525222291"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md font-semibold transition shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </a>

              <p className="mt-4 text-slate-400 text-sm">
                Response within 24 business hours
              </p>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}

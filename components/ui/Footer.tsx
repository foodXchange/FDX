import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">

      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">

        {/* BRAND */}
        <div>
          <h3 className="text-white font-semibold text-lg mb-4">
            FoodXchange
          </h3>

          <p className="text-sm text-slate-400 leading-relaxed">
            Strategic sourcing and commercial partnerships connecting global
            food manufacturers with the Israeli market.
          </p>

          <p className="text-xs text-slate-500 mt-4">
            Taste. Verified.
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h4 className="text-white font-semibold mb-4">Navigation</h4>

          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-white">Home</Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">About</Link>
            </li>
            <li>
              <Link href="/buyers" className="hover:text-white">Buyers</Link>
            </li>
            <li>
              <Link href="/manufacturers" className="hover:text-white">Manufacturers</Link>
            </li>
          </ul>
        </div>

        {/* RESOURCES */}
        <div>
          <h4 className="text-white font-semibold mb-4">Resources</h4>

          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/en/blog" className="hover:text-white">Blog</Link>
            </li>
            <li>
              <Link href="/en/newsletter" className="hover:text-white">Newsletter</Link>
            </li>
            <li>
              <a
                href="https://kb.fdx.trading"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white flex items-center gap-1.5"
              >
                Knowledge Base
                <span className="bg-orange-500 text-white text-[10px] px-1 py-0.5 rounded font-bold leading-none">KB</span>
              </a>
            </li>
          </ul>

          <div className="mt-6">
            <input
              placeholder="Email address"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />

            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <input type="checkbox" />
              <span>
                I agree to receive updates from FOODZXCHANGE. I can unsubscribe at any time.
              </span>
            </div>

            <button className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-md text-sm">
              Subscribe
            </button>

            <p className="text-xs text-slate-500 mt-3">
              No spam. 1–2 updates per month.
            </p>
          </div>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-white font-semibold mb-4">Contact</h4>

          <p className="text-sm mb-4">
            info@foodz-x.com
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="#"
              className="bg-green-500 hover:bg-green-600 text-white text-sm text-center py-2 rounded-md"
            >
              WhatsApp
            </a>

            <a
              href="/contact"
              className="border border-slate-600 text-white text-sm text-center py-2 rounded-md hover:bg-slate-800"
            >
              Contact →
            </a>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW */}
      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">

        <p>
          © 2026 FOODZXCHANGE · Tel Aviv, Israel · Company ID / VAT: 516970936
        </p>

        {/* LINKS */}
        <div className="mt-2 flex justify-center gap-4 flex-wrap">
          <Link href="/en/privacy" className="hover:text-white transition">Privacy</Link>
          <Link href="/en/terms" className="hover:text-white transition">Terms</Link>
          <Link href="/en/accessibility" className="hover:text-white transition">Accessibility</Link>
          <Link href="/en/cookies" className="hover:text-white transition">Cookies</Link>
          <Link href="/en/marketing" className="hover:text-white transition">Marketing</Link>

          {/* INTERNAL ACCESS LINK (DISCREET) */}
          <Link
            href="/en/admin/upload"
            className="text-slate-400 hover:text-slate-300 transition"
          >
            Internal
          </Link>
        </div>

      </div>

    </footer>
  );
}
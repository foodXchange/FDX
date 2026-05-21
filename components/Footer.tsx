"use client";

import Link from "next/link";
import FooterSubscribe from "@/components/FooterSubscribe";

export default function Footer() {
  const phone = "972525222291";

  const message = encodeURIComponent(
    "Hi, I came across FoodXchange and would like to explore potential collaboration."
  );

  const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

  return (
    <footer className="bg-slate-900 text-slate-300 mt-28">

      <div className="max-w-6xl mx-auto px-6 py-20 grid gap-14 md:grid-cols-4">

        {/* BRAND */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">FoodXchange</h2>

          <p className="text-sm text-slate-400 leading-relaxed">
            Strategic sourcing and commercial partnerships connecting global food manufacturers with the Israeli market.
          </p>

          <p className="text-xs text-slate-500">
            Taste. Verified.
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h3 className="text-white font-medium mb-5">Navigation</h3>

          <ul className="space-y-3 text-sm">
            <li><Link href="/en" className="hover:text-white">Home</Link></li>
            <li><Link href="/en/about" className="hover:text-white">About</Link></li>
            <li><Link href="/en/buyers" className="hover:text-white">Buyers</Link></li>
            <li><Link href="/en/manufacturers" className="hover:text-white">Manufacturers</Link></li>
          </ul>
        </div>

        {/* RESOURCES */}
        <div>
          <h3 className="text-white font-medium mb-5">Resources</h3>

          <ul className="space-y-3 text-sm mb-6">
            <li><Link href="/en/blog" className="hover:text-white">Blog</Link></li>
            <li><Link href="/en/newsletter" className="hover:text-white">Newsletter</Link></li>
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

          <div className="pt-4 border-t border-slate-800">
            <FooterSubscribe lang="en" />
          </div>
        </div>

        {/* CONTACT */}
        <div>
          <h3 className="text-white font-medium mb-5">Contact</h3>

          <p className="text-sm text-slate-400 mb-6">
            info@foodz-x.com
          </p>

          <div className="flex flex-col gap-3">

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-md text-sm font-semibold transition hover:scale-[1.02] shadow-md"
            >
              💬 WhatsApp
            </a>

            <Link
              href="/en/contact"
              className="inline-flex items-center justify-center border border-slate-600 hover:border-white text-slate-300 hover:text-white px-4 py-3 rounded-md text-sm transition"
            >
              Contact →
            </Link>

          </div>
        </div>

      </div>

      {/* ✅ LEGAL + COPYRIGHT BLOCK */}
      <div className="border-t border-slate-800 text-xs text-slate-500 text-center py-6 space-y-2">

        <div>
          © {new Date().getFullYear()} FOODZXCHANGE · Tel Aviv, Israel · Company ID / VAT: 516970936
        </div>

        <div className="flex justify-center gap-4 flex-wrap">

          <Link href="/en/privacy" className="hover:text-white">
            Privacy
          </Link>

          <Link href="/en/terms" className="hover:text-white">
            Terms
          </Link>

          <Link href="/en/accessibility" className="hover:text-white">
            Accessibility
          </Link>

          <Link href="/en/cookies" className="hover:text-white">
            Cookies
          </Link>

          <Link href="/en/marketing" className="hover:text-white">
            Marketing
          </Link>

        </div>

      </div>

    </footer>
  );
}

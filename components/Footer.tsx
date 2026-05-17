'use client';

import Link from "next/link";

export default function Footer() {

  const phone = "972525222291";

  const message = encodeURIComponent(
    "Hi, I came across FoodXchange and would like to explore potential collaboration as a buyer/importer or manufacturer. Could you share more details?"
  );

  const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">

      <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-12">

        {/* BRAND */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            FoodXchange
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Strategic sourcing and commercial partnerships connecting  
            global food manufacturers with the Israeli market.
          </p>

          <p className="text-sm text-slate-500">
            Taste. Verified.
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h3 className="text-white font-medium mb-4">Navigation</h3>

          <ul className="space-y-2 text-sm">

            <li>
              <Link href="/" className="hover:text-white transition">
                Home
              </Link>
            </li>

            <li>
              <Link href="/en/about" className="hover:text-white transition">
                About
              </Link>
            </li>

            <li>
              <Link href="/he" className="hover:text-white transition">
                Buyers
              </Link>
            </li>

            <li>
              <Link href="/en" className="hover:text-white transition">
                Manufacturers
              </Link>
            </li>

          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h3 className="text-white font-medium mb-4">Contact</h3>

          <p className="text-sm text-slate-400 mb-3">
            info@foodz-x.com
          </p>

          {/* ✅ STRONG WHATSAPP CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition shadow"
          >
            💬 Chat on WhatsApp
          </a>

        </div>

      </div>

      {/* BOTTOM */}
      <div className="border-t border-slate-800 text-center text-sm text-slate-500 py-6">
        © {new Date().getFullYear()} FoodXchange. All rights reserved.
      </div>

    </footer>
  );
}

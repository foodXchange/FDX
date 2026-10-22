import Link from "next/link";

interface FooterProps {
  lang?: "en" | "he";
}

export default function Footer({ lang = "en" }: FooterProps) {
  const isHe = lang === "he";

  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300" dir={isHe ? "rtl" : "ltr"}>

      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">

        {/* BRAND */}
        <div>
          <h3 className="text-white font-semibold text-lg mb-4">
            FoodXchange
          </h3>

          <p className="text-sm text-slate-400 leading-relaxed">
            {isHe
              ? "חיבור ישיר ומאומת בין יצרני מזון אירופאים מובילים לרשתות השיווק והיבואנים בישראל. מותג פרטי, כשרות (רבנות/בד״ץ) ואיכות אירופאית."
              : "Strategic sourcing and commercial partnerships connecting global food manufacturers with the Israeli market."}
          </p>

          <p className="text-xs text-orange-400 font-semibold mt-4">
            {isHe ? "טעמים · איכות · אמינות מסחרית" : "Taste. Verified."}
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h4 className="text-white font-semibold mb-4">
            {isHe ? "ניווט באתר" : "Navigation"}
          </h4>

          <ul className="space-y-2 text-sm">
            <li>
              <Link href={isHe ? "/he" : "/"} className="hover:text-white transition">
                {isHe ? "דף הבית" : "Home"}
              </Link>
            </li>
            <li>
              <Link href={isHe ? "/he" : "/en/buyers"} className="hover:text-white transition">
                {isHe ? "לקניינים ורשתות שיווק" : "Buyers"}
              </Link>
            </li>
            <li>
              <Link href={isHe ? "/he/products" : "/en/products"} className="hover:text-white transition">
                {isHe ? "קטלוג מוצרים" : "Products"}
              </Link>
            </li>
            <li>
              <Link href={isHe ? "/business-card/udi?lang=he" : "/business-card/udi"} className="hover:text-white transition">
                {isHe ? "כרטיס ביקור דיגיטלי" : "Digital Business Card"}
              </Link>
            </li>
          </ul>
        </div>

        {/* RESOURCES */}
        <div>
          <h4 className="text-white font-semibold mb-4">
            {isHe ? "מידע ותובנות" : "Resources"}
          </h4>

          <ul className="space-y-2 text-sm">
            <li>
              <Link href={isHe ? "/he/blog" : "/en/blog"} className="hover:text-white transition">
                {isHe ? "בלוג מקצועי" : "Blog"}
              </Link>
            </li>
            <li>
              <Link href={isHe ? "/he/newsletter" : "/en/newsletter"} className="hover:text-white transition">
                {isHe ? "עדכוני שוק והזדמנויות" : "Newsletter"}
              </Link>
            </li>
            <li>
              <Link href={isHe ? "/he/calculator" : "/en/calculator"} className="hover:text-white transition flex items-center gap-1.5">
                {isHe ? "מחשבון עלות נחיתה ורווחיות" : "Landed Cost Calculator"}
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] px-1 py-0.5 rounded font-bold leading-none">
                  {isHe ? "חישוב מדף" : "Tool"}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href={isHe ? "/he/import-guide" : "/en/import-guide"}
                className="hover:text-white flex items-center gap-1.5 transition"
              >
                {isHe ? "מדריך יבוא וכשרות" : "Knowledge Base"}
                <span className="bg-orange-500 text-white text-[10px] px-1 py-0.5 rounded font-bold leading-none">KB</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-white font-semibold mb-4">
            {isHe ? "יצירת קשר" : "Contact"}
          </h4>

          <p className="text-sm text-slate-300 font-mono mb-4">
            udi@fdx.trading
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/972525222291?text=${encodeURIComponent(
                isHe
                  ? "שלום אודי, אני קניין/יבואן מזון בישראל ומעוניין לבדוק יצרנים אירופאים מתאימים."
                  : "Hi Udi, I saw FoodXchange and want to discuss sourcing European food products."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold text-center py-2.5 rounded-xl shadow transition"
            >
              {isHe ? "וואטסאפ ישיר" : "WhatsApp"}
            </a>

            <Link
              href={isHe ? "/he/contact" : "/en/contact"}
              className="border border-slate-700 hover:border-orange-500/50 text-white text-sm font-medium text-center py-2.5 rounded-xl hover:bg-slate-800 transition"
            >
              {isHe ? "טופס פנייה מהיר ←" : "Contact →"}
            </Link>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW */}
      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">

        <p>
          {isHe
            ? "© 2026 FoodXchange · תל אביב, ישראל · ח.פ: 516970936"
            : "© 2026 FOODZXCHANGE · Tel Aviv, Israel · Company ID / VAT: 516970936"}
        </p>

        {/* LINKS */}
        <div className="mt-2 flex justify-center gap-4 flex-wrap">
          <Link href="/en/privacy" className="hover:text-white transition">{isHe ? "מדיניות פרטיות" : "Privacy"}</Link>
          <Link href="/en/terms" className="hover:text-white transition">{isHe ? "תנאי שימוש" : "Terms"}</Link>
          <Link href="/en/accessibility" className="hover:text-white transition">{isHe ? "הצהרת נגישות" : "Accessibility"}</Link>
          <Link href="/en/cookies" className="hover:text-white transition">{isHe ? "עוגיות" : "Cookies"}</Link>

          {/* INTERNAL ACCESS LINK (DISCREET) */}
          <Link
            href="/admin"
            className="text-slate-400 hover:text-slate-300 transition"
          >
            Internal
          </Link>
        </div>

      </div>

    </footer>
  );
}
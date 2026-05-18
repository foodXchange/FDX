import Link from "next/link";

export default function BlogCTA({ lang = "en" }: { lang?: string }) {
  const isHebrew = lang === "he";

  return (
    <div className="mt-16 p-8 bg-slate-100 rounded-2xl text-center shadow-sm">

      <h3 className="text-2xl font-semibold mb-3 text-slate-900">
        {isHebrew
          ? "רוצים להתחיל פרויקט סורסינג לישראל?"
          : "Need help sourcing or entering the Israeli market?"}
      </h3>

      <p className="text-slate-600 mb-6 max-w-xl mx-auto">
        {isHebrew
          ? "שתפו אותנו בצורך שלכם — נחזור אליכם עם כיוון מקצועי וספקים מתאימים."
          : "Share your requirement — we’ll review and respond within 24 business hours with the right supplier direction."}
      </p>

      <div className="flex justify-center gap-4 flex-wrap">

        <Link
          href={isHebrew ? "/he/contact" : "/en/contact"}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
        >
          {isHebrew ? "יצירת קשר" : "Contact us"}
        </Link>

        <a
          href="https://wa.me/972525222291"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-slate-400 rounded-lg hover:border-slate-600 transition font-medium"
        >
          WhatsApp
        </a>

      </div>
    </div>
  );
}
``
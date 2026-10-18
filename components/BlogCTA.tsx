import Link from "next/link";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function BlogCTA({ lang = "en" }: { lang?: string }) {
  const isHebrew = lang === "he";

  return (
    <div className="p-8 sm:p-10 bg-slate-900 border border-white/10 rounded-3xl text-center shadow-2xl relative overflow-hidden">
      {/* Subtle ambient accent glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto">
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          {isHebrew
            ? "רוצים להתחיל פרויקט סורסינג לישראל?"
            : "Need help sourcing or entering the Israeli market?"}
        </h3>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
          {isHebrew
            ? "שתפו אותנו בצורך שלכם — נחזור אליכם עם כיוון מקצועי וספקים מתאימים תוך 24 שעות."
            : "Share your requirement — we’ll review and respond within 24 business hours with the right supplier direction."}
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href={isHebrew ? "/he/contact" : "/en/contact"}
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-semibold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
          >
            {isHebrew ? "יצירת קשר" : "Contact us"}
            <span aria-hidden="true">→</span>
          </Link>

          <a
            href="https://wa.me/972525222291"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition font-semibold text-sm shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2.5 hover:scale-[1.02]"
          >
            <WhatsAppIcon />
            <span>{isHebrew ? "וואטסאפ" : "WhatsApp"}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
``
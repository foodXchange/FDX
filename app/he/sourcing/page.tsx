import type { Metadata } from "next";
import SourcingRequestForm from "@/components/forms/SourcingRequestForm";

export const metadata: Metadata = {
  title: "איתור יצרני מזון ומפעלים באירופה (RFQ) | FoodXchange",
  description:
    "ספרו לנו מה אתם צריכים לייבא לשוק הישראלי. העלו תמונת מוצר בנצ'מרק או תארו מפרט בעברית — אנו מאתרים עבורכם יצרנים מאומתים.",
  alternates: {
    canonical: "https://fdx.trading/he/sourcing",
  },
  openGraph: {
    title: "איתור יצרני מזון ומפעלים באירופה (RFQ) | FoodXchange",
    description:
      "הגשת בקשת רכש מהירה (RFQ) למותג פרטי, כשרות ויבוא מזון לישראל.",
    type: "website",
  },
};

export default function HebrewSourcingPage() {
  return (
    <main className="bg-slate-900">
      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16 px-6 text-center">
        <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-4">
          לקניינים ורשתות שיווק
        </p>
        <h1 className="text-3xl md:text-5xl font-bold max-w-3xl mx-auto leading-tight">
          ספרו לנו מה אתם צריכים לייבא
        </h1>
        <p className="text-slate-300 text-base md:text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
          העלו תמונת מוצר בנצ&apos;מרק או תארו את המפרט המבוקש. אנו מצליבים את הבקשה מול רשת היצרנים המאומתים שלנו — ותקבלו מענה ממוקד ישירות למייל או לווטסאפ.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {[
            "ללא צורך בהרשמה מראש",
            "שירות ללא עלות לקניינים",
            "מענה מקצועי בתוך 24–48 שעות",
          ].map((badge) => (
            <span
              key={badge}
              className="bg-white/10 text-slate-300 text-xs px-3.5 py-1.5 rounded-full"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* ── FORM CONTAINER ── */}
      <div className="max-w-xl mx-auto px-6 -mt-8 pb-16 relative z-10">
        <SourcingRequestForm
          lang="he"
          source="sourcing-page-he"
          heading="הגשת בקשת רכש ואיתור מפעל (RFQ)"
          subheading="העלו תמונה, הקליטו או הקלידו. סייר ה-AI והצוות המקצועי יאתרו עבורכם את המפעל המתאים ביותר."
          showExamples={false}
        />
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-800">
        <h2 className="text-2xl font-semibold text-white mb-10 text-center">
          איך התהליך עובד?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "מעלים תמונה או מתארים",
              body: "מציגים לנו מה אתם צריכים — צילום מוצר מהמדף, מפרט טכני או תיאור קולי.",
            },
            {
              n: "02",
              title: "בדיקת היתכנות והתאמה",
              body: "אנו בודקים כשרות, תקני איכות (BRC/IFS), כמויות מינימום ויכולת ייצור למותג פרטי.",
            },
            {
              n: "03",
              title: "קבלת הצעות ויצירת קשר",
              body: "אנחנו חוזרים אליכם רק כשיש התאמה ממשית והצעת מחיר ריאלית — בלי ספאם ובלי רעש.",
            },
          ].map((item) => (
            <div key={item.n} className="text-center md:text-right">
              <span className="text-3xl font-black text-orange-500">{item.n}</span>
              <h3 className="font-semibold text-white mt-2 mb-1">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUST & VALUE ── */}
      <section className="bg-slate-800 border-t border-slate-700 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-8 text-center">
            למה קניינים ורשתות בישראל עובדים עם FoodXchange?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              "יצרנים מאומתים בלבד — בדיקת איכות, בטיחות מזון ותקני BRC / IFS לפני כל המלצה",
              "אפס התחייבות — הגשת בקשה ללא עלות וללא סיכון",
              "מומחיות בשוק הישראלי — ידע מעמיק בדרישות כשרות (רבנות ראשית / בד״ץ), סימון ותקנים",
            ].map((point, i) => (
              <div
                key={i}
                className="bg-slate-700/50 border border-slate-700 rounded-xl p-5 text-sm text-slate-300 leading-relaxed"
              >
                <span className="text-orange-500 font-bold ml-2">✓</span>
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

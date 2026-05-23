import NewsletterForm from '@/components/NewsletterForm';

export default function HebrewNewsletterPage() {
  return (
    <main dir="rtl" className="flex flex-col bg-slate-900">
      {/* Hero Section */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl md:text-6xl font-bold tracking-tight text-white">
            נשמור על הקשר
          </h1>

          <p className="mb-12 text-lg md:text-xl leading-relaxed text-slate-300">
            הירשם לעדכונים שלנו כדי להיות בחזית הפרטנרships החדשים,
            הטרנדים בשוק, והזדמנויות. נשלח לך בדיוק מה שצריך לדעת—לא ספאם.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="px-6 py-20 bg-slate-800 border-t border-slate-700">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            קבל עדכונים ממנו
          </h2>
          <p className="mb-10 text-lg text-slate-300">
            בואו נשנות קשר. כתוב את הדוא״ל שלך, והתחילו לשמוע מאתנו.
          </p>

          <NewsletterForm lang="he" />
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-6 py-20 bg-slate-900 border-t border-slate-800">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">
            למה להצטרף?
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <span className="shrink-0 text-2xl">📊</span>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  עדכונים בשוק
                </h3>
                <p className="text-slate-300">
                  מגמות, הזדמנויות, וחדשות מהשוק בישראל ואירופה.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="shrink-0 text-2xl">🤝</span>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  סיפורים של הצלחה
                </h3>
                <p className="text-slate-300">
                  סיפורים על partnerships שיצרו ערך, וטיפים מעשיים.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="shrink-0 text-2xl">🎯</span>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  ללא ספאם
                </h3>
                <p className="text-slate-300">
                  רק מה שחשוב. אחת—שתיים גם בחודש, לא כל יום.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

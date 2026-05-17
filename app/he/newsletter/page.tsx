import NewsletterForm from '@/components/NewsletterForm';

export default function HebrewNewsletterPage() {
  return (
    <main dir="rtl" className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl md:text-6xl font-bold tracking-tight text-white">
            נשמור על הקשר
          </h1>

          <p className="mb-12 text-lg md:text-xl leading-relaxed text-slate-200">
            הירשם לעדכונים שלנו כדי להיות בחזית הפרטנרships החדשים, 
            הטרנדים בשוק, והזדמנויות. נשלח לך בדיוק מה שצריך לדעת—לא ספאם.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            קבל עדכונים ממנו
          </h2>
          <p className="mb-10 text-lg text-slate-600">
            בואו נשנות קשר. כתוב את הדוא״ל שלך, והתחילו לשמוע מאתנו.
          </p>

          <NewsletterForm lang="he" />
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-slate-900">
            למה להצטרף?
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <span className="flex-shrink-0 text-2xl">📊</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  עדכונים בשוק
                </h3>
                <p className="text-slate-600">
                  מגמות, הזדמנויות, וחדשות מהשוק בישראל ואירופה.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex-shrink-0 text-2xl">🤝</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  סיפורים של הצלחה
                </h3>
                <p className="text-slate-600">
                  סיפורים על partnerships שיצרו ערך, וטיפים מעשיים.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex-shrink-0 text-2xl">🎯</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  ללא ספאם
                </h3>
                <p className="text-slate-600">
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

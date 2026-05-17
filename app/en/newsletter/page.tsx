import NewsletterForm from '@/components/NewsletterForm';

export default function EnglishNewsletterPage() {
  return (
    <main className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl md:text-6xl font-bold tracking-tight text-white">
            Stay Connected
          </h1>

          <p className="mb-12 text-lg md:text-xl leading-relaxed text-slate-200">
            Subscribe to our updates and be among the first to hear about new partnerships, 
            market opportunities, and insights. We send only what matters— no noise, just value.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            Join the Conversation
          </h2>
          <p className="mb-10 text-lg text-slate-600">
            Let's keep in touch. Give us your email, and we'll share updates worth your time.
          </p>

          <NewsletterForm lang="en" />
        </div>
      </section>

      {/* Value Section */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-slate-900">
            Why Subscribe?
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <span className="flex-shrink-0 text-2xl">📊</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Market Insights
                </h3>
                <p className="text-slate-600">
                  Trends, opportunities, and news from the Israeli and European food markets.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex-shrink-0 text-2xl">🤝</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Success Stories
                </h3>
                <p className="text-slate-600">
                  Real partnerships that created real value, plus practical tips for yours.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex-shrink-0 text-2xl">🎯</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No Spam Policy
                </h3>
                <p className="text-slate-600">
                  Only what matters. Once or twice a month, not every day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

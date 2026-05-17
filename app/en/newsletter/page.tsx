import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import ButtonLink from "@/components/ui/ButtonLink";
import Reveal from "@/components/Reveal";
import NewsletterForm from "@/components/NewsletterForm";

export default function EnglishNewsletterPage() {
  return (
    <main className="bg-white text-slate-800">

      {/* HERO */}
      <Section
        variant="dark"
        className="bg-gradient-to-b from-slate-900 to-slate-800 text-center"
      >
        <Reveal>
          <h1 className="h1 text-white">
            Stay Connected
          </h1>

          <p className="body mt-6 max-w-2xl mx-auto text-slate-200">
            Get updates on sourcing opportunities, partnerships, and market insights.
            <br />
            Only what matters — no noise.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href="#form" className="px-6 py-3">
              Subscribe →
            </ButtonLink>

            <ButtonLink
              href="/en/contact"
              variant="secondary"
              className="px-6 py-3"
            >
              Contact first →
            </ButtonLink>
          </div>
        </Reveal>
      </Section>

      {/* FORM */}
      <Section id="form" variant="alt">

        <div className="text-center max-w-2xl mx-auto">
          <Reveal>
            <h2 className="h2 mb-4">
              Join the Conversation
            </h2>

            <p className="body mb-10">
              Share your email — we’ll send updates worth your time.
            </p>
          </Reveal>

          <Reveal>
            <div className="card p-6 hover-lift">
              <NewsletterForm lang="en" />
            </div>
          </Reveal>
        </div>

      </Section>

      {/* VALUE */}
      <Section>

        <div className="max-w-3xl mx-auto">

          <Reveal>
            <h2 className="h2 text-center mb-12">
              Why Subscribe?
            </h2>
          </Reveal>

          <div className="space-y-6">

            {[
              [
                "📊 Market Insights",
                "Trends and opportunities in the Israeli and European food markets.",
              ],
              [
                "🤝 Real Cases",
                "Examples of sourcing partnerships that created real value.",
              ],
              [
                "🎯 No Spam",
                "One or two updates per month. Focused, practical, relevant.",
              ],
            ].map(([title, text], i) => (
              <Reveal key={i}>
                <Card className="p-6 flex gap-4 items-start hover-lift">
                  <div className="text-2xl">{title.split(" ")[0]}</div>
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">
                      {title.replace(/^.+?\s/, "")}
                    </p>
                    <p className="text-slate-600 text-sm">{text}</p>
                  </div>
                </Card>
              </Reveal>
            ))}

          </div>

        </div>

      </Section>

      {/* FINAL CTA */}
      <Section variant="alt" className="text-center">

        <Reveal>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Not Ready Yet?
          </h2>

          <p className="muted mb-6">
            You can also start a direct conversation — no subscription needed.
          </p>

          <ButtonLink href="/en/contact" className="px-6 py-3">
            Contact →
          </ButtonLink>
        </Reveal>

      </Section>

    </main>
  );
}
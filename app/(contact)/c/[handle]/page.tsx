import { notFound } from "next/navigation";
import Script from "next/script";
import type { Metadata } from "next";
import { getCard } from "@/lib/contactCards";
import { ContactCard } from "@/components/ContactCard";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const card = getCard(handle);
  if (!card) return { title: "Contact Not Found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodz-x.com";
  const cardUrl = `${siteUrl}/c/${handle}`;
  const ogImageUrl = `${siteUrl}/c/${handle}/opengraph-image`;

  return {
    title: `${card.name} | ${card.company}`,
    description: `${card.title} at ${card.company}. ${card.tagline}`,
    openGraph: {
      title: `${card.name} — ${card.title}`,
      description: `${card.title} at ${card.company}. ${card.tagline}`,
      url: cardUrl,
      siteName: "FoodXchange",
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: card.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.name} — ${card.title}`,
      description: `${card.title} at ${card.company}. ${card.tagline}`,
      images: [ogImageUrl],
    },
  };
}

export default async function ContactCardPage({ params }: PageProps) {
  const { handle } = await params;
  const card = getCard(handle);
  if (!card) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodz-x.com";
  const cardUrl = `${siteUrl}/c/${handle}`;

  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <main className="flex items-center justify-center px-4 py-12 min-h-screen">
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.tagged-events.js"
        />
      )}
      <ContactCard card={card} cardUrl={cardUrl} />
    </main>
  );
}

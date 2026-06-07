import { notFound } from "next/navigation";
import Script from "next/script";
import type { Metadata } from "next";
import { getCard } from "@/lib/contactCards";
import type { ContactCard } from "@/lib/contactCards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CardView, type CardViewData, type CardViewPhoto } from "@/components/contact/CardView";

interface PageProps {
  params: Promise<{ handle: string }>;
}

type DBCard = {
  handle: string;
  name: string;
  title: string | null;
  company: string | null;
  tagline: string | null;
  pitch: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_buyer: string | null;
  whatsapp_manufacturer: string | null;
  website: string | null;
  linkedin: string | null;
  photos: CardViewPhoto[] | null;
  active_sourcing: string[] | null;
};

function dbCardToViewData(db: DBCard): CardViewData {
  return {
    handle: db.handle,
    name: db.name,
    title: db.title ?? "",
    company: db.company ?? "",
    tagline: db.tagline ?? "",
    pitch: db.pitch ?? undefined,
    email: db.email ?? "",
    phone: db.phone ?? "",
    whatsappBuyer: (db.whatsapp_buyer ?? "").replace(/^\+/, ""),
    whatsappManufacturer: (db.whatsapp_manufacturer ?? "").replace(/^\+/, ""),
    website: db.website ?? "",
    linkedin: db.linkedin ?? undefined,
    photos: (db.photos ?? []).map((p) => ({
      src: p.src,
      alt: p.alt,
      caption: p.caption,
      offsetX: p.offsetX ?? 0,
      offsetY: p.offsetY ?? 0,
    })),
    activeSourcing: db.active_sourcing ?? [],
  };
}

function legacyCardToViewData(card: ContactCard): CardViewData {
  return {
    handle: card.handle,
    name: card.name,
    title: card.title,
    company: card.company,
    tagline: card.tagline,
    pitch: card.pitch,
    email: card.email,
    phone: card.phone,
    whatsappBuyer: card.whatsapp,
    whatsappManufacturer: card.whatsapp,
    website: card.website,
    linkedin: card.linkedin,
    photos: (card.photos ?? []).map((p) => ({
      src: p.src,
      alt: p.alt,
      caption: p.caption,
      offsetX: 0,
      offsetY: 0,
    })),
    activeSourcing: card.currentlySourcing ?? [],
  };
}

async function loadCard(handle: string): Promise<CardViewData | null> {
  const { data: dbCard } = await supabaseAdmin
    .from("contact_cards")
    .select("*")
    .eq("handle", handle)
    .eq("published", true)
    .single<DBCard>();

  if (dbCard) return dbCardToViewData(dbCard);

  const legacy = getCard(handle);
  if (!legacy) return null;
  return legacyCardToViewData(legacy);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const card = await loadCard(handle);
  if (!card) return { title: "Contact Not Found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodz-x.com";
  const cardUrl = `${siteUrl}/business-card/${handle}`;
  const ogImageUrl = `${siteUrl}/business-card/${handle}/opengraph-image`;

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
  const card = await loadCard(handle);
  if (!card) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodz-x.com";
  const cardUrl = `${siteUrl}/business-card/${handle}`;
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
      <CardView card={card} cardUrl={cardUrl} />
    </main>
  );
}

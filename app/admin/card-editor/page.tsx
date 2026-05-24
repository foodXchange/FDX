import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CardEditorClient } from "./CardEditorClient";
import type { CardEditorData } from "./CardEditorClient";

export const metadata: Metadata = { title: "Card Editor | Admin" };
export const dynamic = "force-dynamic";

export default async function CardEditorPage() {
  const { data } = await supabaseAdmin
    .from("contact_cards")
    .select("*")
    .eq("handle", "udi")
    .single<CardEditorData>();

  const initial: CardEditorData = data ?? {
    handle: "udi",
    name: "Udi Stryk",
    title: "Founder & Operator",
    company: "FoodXchange",
    tagline: "Connecting European manufacturers with the Israeli food market.",
    pitch:
      "I help Israeli food buyers find the right European manufacturer — pre-screened for specs, kosher path, and volume capacity. And I help European manufacturers enter Israel with a local partner who knows the market.",
    email: "info@foodz-x.com",
    phone: "+972525222291",
    whatsapp_buyer: "+972525222291",
    whatsapp_manufacturer: "+972525222291",
    website: "https://fdx.trading",
    linkedin: "https://www.linkedin.com/in/udi-stryk/",
    photos: [
      { src: "/founder-udi.jpeg", alt: "Udi Stryk — FoodXchange", caption: "", offsetX: 0, offsetY: 0 },
      { src: "/udi-tradeshow.jpg", alt: "International food trade show", caption: "International food trade show", offsetX: 0, offsetY: 0 },
      { src: "/udi-factory.jpg", alt: "Supplier facility visit", caption: "Supplier facility visit", offsetX: 0, offsetY: 0 },
    ],
    active_sourcing: [
      "Kosher EVOO 750ml — Chief Rabbinate",
      "Organic granola — Badatz",
      "Frozen potato wedges — kosher",
      "Canned tuna 185g — Chief Rabbinate",
      "Tomato paste retail cups — kosher",
    ],
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fdx.trading";

  return <CardEditorClient initialData={initial} siteUrl={siteUrl} />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  AssortmentDeckViewer,
  type DeckData,
  type FactoryItem,
} from "@/components/deck/AssortmentDeckViewer";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const { token } = await params;
  const sp = searchParams ? await searchParams : {};
  const isHe = sp?.lang === "he";

  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select("title, buyer_company, buyer_name")
    .eq("token", token)
    .single();

  const title = proposal?.title
    ? `${proposal.title} | ${isHe ? "מצגת בחירת מפעלים מאירופה" : "FoodXchange B2B Assortment Deck"}`
    : isHe
    ? "מצגת בחירת יצרני מזון מאירופה | FoodXchange"
    : "European Manufacturer Assortment Selection | FoodXchange";

  return {
    title,
    description: isHe
      ? "מצגת סודית של יצרני מזון ומפעלים באירופה שנבדקו מראש: מפרטי איכות, כשרות, ומחירי CIF לישראל."
      : "Confidential European manufacturer selection pre-screened for specifications, kosher pathway, and CIF Haifa economics.",
    robots: { index: false, follow: false },
  };
}

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { token } = await params;
  const sp = searchParams ? await searchParams : {};
  const initialLang = sp?.lang === "he" ? "he" : "en";

  const { data: proposal, error } = await supabaseAdmin
    .from("proposals")
    .select("*")
    .eq("token", token)
    .eq("status", "active")
    .single();

  if (error || !proposal) {
    const isHe = initialLang === "he";
    return (
      <main
        dir={isHe ? "rtl" : "ltr"}
        className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6 py-16 text-center"
      >
        <p className="text-5xl mb-4">📦</p>
        <h1 className="text-2xl font-bold text-white mb-2">
          {isHe ? "מצגת הספקים פגה או לא נמצאה" : "Assortment Deck Expired or Not Found"}
        </h1>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          {isHe
            ? "מצגת סודית זו אינה פעילה כרגע. צרו קשר ישיר עם אודי סטריק בווטסאפ לקבלת מבחר ספקים מעודכן."
            : "This confidential sourcing selection has expired or moved. Contact Udi Stryk directly on WhatsApp to receive an updated selection."}
        </p>
        <div className="flex gap-3">
          <a
            href={
              isHe
                ? "https://wa.me/972525222291?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%95%D7%93%D7%99%2C%20%D7%A0%D7%99%D7%A1%D7%99%D7%AA%D7%99%20%D7%9C%D7%92%D7%A9%D7%AA%20%D7%9C%D7%9E%D7%A6%D7%92%D7%AA%20%D7%A1%D7%A4%D7%A7%D7%99%D7%9D%20%D7%A9%D7%A4%D7%92%D7%94."
                : "https://wa.me/972525222291?text=Hi%20Udi%2C%20I%20am%20trying%20to%20access%20a%20FoodXchange%20Assortment%20Deck%20that%20has%20expired."
            }
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1DA851] hover:bg-[#189a47] text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition"
          >
            {isHe ? "שיחה עם אודי בווטסאפ" : "WhatsApp Udi"}
          </a>
          <Link
            href="/business-card/udi"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-xs transition"
          >
            {isHe ? "כרטיס ביקור דיגיטלי" : "View Digital Business Card"}
          </Link>
        </div>
      </main>
    );
  }

  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(proposal.personal_message || "{}");
  } catch {
    parsedPayload = {};
  }

  const factories = (parsedPayload.factories as FactoryItem[]) || [];

  const deckData: DeckData = {
    token: proposal.token,
    title: proposal.title || "European Manufacturer Assortment Selection",
    buyer_name: proposal.buyer_name || "Retail Buyer",
    buyer_company: (proposal.buyer_company || parsedPayload.target_retailer || "Retail Desk") as string,
    category: (parsedPayload.category as string) || "Specialty Sourcing",
    personal_note: parsedPayload.personal_note as string | undefined,
    factories,
    pdfUrl: `/api/deck/${proposal.token}/pdf`,
  };

  return <AssortmentDeckViewer deck={deckData} initialLang={initialLang} />;
}

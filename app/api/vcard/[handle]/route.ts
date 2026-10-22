import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCard } from "@/lib/contactCards";
import { generateVCard } from "@/lib/vcard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  // Try database first
  const { data: dbCard } = await supabaseAdmin
    .from("contact_cards")
    .select("*")
    .eq("handle", handle)
    .eq("published", true)
    .single();

  const legacy = getCard(handle);

  if (!dbCard && !legacy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lang = _req.nextUrl.searchParams.get("lang")?.toLowerCase() || "en";
  const isHebrew = lang === "he";

  const rawName = isHebrew
    ? (legacy?.nameHe || "אודי סטריק")
    : (dbCard?.name || legacy?.name || "Udi Stryk");

  let firstName = "Udi";
  let lastName = "Stryk";
  if (isHebrew) {
    firstName = "אודי";
    lastName = "סטריק";
  } else {
    const nameParts = rawName.split(" ");
    firstName = nameParts[0] || "Udi";
    lastName = nameParts.slice(1).join(" ") || "Stryk";
  }

  const title = isHebrew
    ? (legacy?.titleHe || "מייסד ומנהל")
    : (dbCard?.title || legacy?.title || "Founder & Operator");

  const company = isHebrew
    ? "FoodXchange (פודאקסצ'יינג')"
    : (dbCard?.company || legacy?.company || "FoodXchange");

  const tagline = isHebrew
    ? (legacy?.taglineHe || "מחברים יצרני מזון אירופאים עם רשתות השיווק בישראל.")
    : (dbCard?.tagline || legacy?.tagline || "Connecting European manufacturers with the Israeli food market.");

  const pitch = isHebrew
    ? (legacy?.pitchHe || "איתור יצרני מזון אירופאים מובילים לרשתות השיווק בישראל — מותג פרטי, כשרות (רבנות/בד״ץ) ואיכות אירופאית.")
    : (dbCard?.pitch || legacy?.pitch || undefined);

  const cardForVcf = {
    handle: dbCard?.handle || legacy?.handle || handle,
    persona: legacy?.persona || "default",
    name: rawName,
    firstName,
    lastName,
    title,
    company,
    tagline,
    pitch,
    email: dbCard?.email || legacy?.email || "udi@fdx.trading",
    phone: dbCard?.phone || legacy?.phone || "+972525222291",
    whatsapp: (dbCard?.whatsapp_buyer || legacy?.whatsapp || "+972525222291").replace(/^\+/, ""),
    website: dbCard?.website || legacy?.website || "https://fdx.trading",
    linkedin: dbCard?.linkedin || legacy?.linkedin || "https://www.linkedin.com/in/udi-stryk/",
    ctaButtons: legacy?.ctaButtons || [],
  };

  let photoBase64: string | undefined;
  const photoSrc = dbCard?.photos?.[0]?.src || legacy?.imageUrl;
  if (photoSrc) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fdx.trading";
      const imgUrl = photoSrc.startsWith("http")
        ? photoSrc
        : `${siteUrl}${photoSrc.startsWith("/") ? "" : "/"}${photoSrc}`;
      const res = await fetch(imgUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        photoBase64 = Buffer.from(buf).toString("base64");
      }
    } catch {
      /* skip photo on error */
    }
  }

  const vcf = await generateVCard(cardForVcf, photoBase64);
  const downloadFilename = isHebrew
    ? "Udi-Stryk-FoodXchange-Hebrew.vcf"
    : `${firstName}-${lastName}.vcf`;

  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${downloadFilename}"`,
      "Cache-Control": "no-store",
    },
  });
}

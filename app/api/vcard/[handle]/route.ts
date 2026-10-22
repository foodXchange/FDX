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

  const name = dbCard?.name || legacy?.name || "Udi Stryk";
  const nameParts = name.split(" ");
  const firstName = nameParts[0] || "Udi";
  const lastName = nameParts.slice(1).join(" ") || "Stryk";

  const cardForVcf = {
    handle: dbCard?.handle || legacy?.handle || handle,
    persona: legacy?.persona || "default",
    name,
    firstName,
    lastName,
    title: dbCard?.title || legacy?.title || "Founder & Operator",
    company: dbCard?.company || legacy?.company || "FoodXchange",
    tagline: dbCard?.tagline || legacy?.tagline || "Connecting European manufacturers with the Israeli food market.",
    pitch: dbCard?.pitch || legacy?.pitch || undefined,
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
  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${firstName}-${lastName}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}

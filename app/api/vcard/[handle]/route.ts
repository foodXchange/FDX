import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCard } from "@/lib/contactCards";
import { generateVCard } from "@/lib/vcard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const card = getCard(handle);
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let photoBase64: string | undefined;
  if (card.imageUrl) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodz-x.com";
      const imgUrl = card.imageUrl.startsWith("http")
        ? card.imageUrl
        : `${siteUrl}${card.imageUrl}`;
      const res = await fetch(imgUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        photoBase64 = Buffer.from(buf).toString("base64");
      }
    } catch { /* skip photo on error */ }
  }

  const vcf = await generateVCard(card, photoBase64);
  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.firstName}-${card.lastName}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}

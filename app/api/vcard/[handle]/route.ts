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

  return new NextResponse(generateVCard(card), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.firstName}-${card.lastName}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}

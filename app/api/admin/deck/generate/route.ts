import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FactorySchema = z.object({
  company_name: z.string().min(1, "Factory name required"),
  country: z.string().min(1, "Country required"),
  flag: z.string().default("🇪🇺"),
  region: z.string().optional().default(""),
  product_name: z.string().min(1, "Product name required"),
  format: z.string().optional().default(""),
  certifications: z.array(z.string()).default([]),
  kosher_type: z.string().default("Chief Rabbinate of Israel"),
  indicative_price: z.string().optional().default(""),
  moq: z.string().optional().default(""),
  lead_time: z.string().optional().default(""),
  image_url: z.string().optional().default(""),
  specs: z.array(z.string()).default([]),
});

const DeckGenerateSchema = z.object({
  title: z.string().min(2, "Presentation title required"),
  buyer_name: z.string().min(1, "Buyer name / title required"),
  buyer_company: z.string().optional().default(""),
  category: z.string().default("Specialty Food Sourcing"),
  personal_note: z.string().optional().default(""),
  factories: z.array(FactorySchema).min(1, "At least 1 factory is required"),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeckGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  const { title, buyer_name, buyer_company, category, personal_note, factories } = parsed.data;

  // Generate 12-char token
  const token = crypto.randomBytes(6).toString("hex");

  const payload = {
    deck_type: "assortment_deck",
    version: "1.0",
    category,
    target_retailer: buyer_company || buyer_name,
    buyer_contact: buyer_name,
    personal_note,
    factories,
  };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day validity

  const { data: proposal, error: insertErr } = await supabaseAdmin
    .from("proposals")
    .insert({
      token,
      buyer_name,
      buyer_company: buyer_company || null,
      title,
      personal_message: JSON.stringify(payload),
      product_ids: [],
      status: "active",
      expires_at: expiresAt.toISOString(),
    })
    .select("id, token")
    .single();

  if (insertErr || !proposal) {
    console.error("Failed to insert proposal deck:", insertErr);
    return NextResponse.json({ error: "Failed to generate proposal deck" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: proposal.token,
    deckUrl: `/deck/${proposal.token}`,
    pdfUrl: `/api/deck/${proposal.token}/pdf`,
  });
}

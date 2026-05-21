import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";

const Schema = z.object({
  product_name: z.string().min(1),
  category: z.string().min(1),
  country_of_origin: z.string().default(""),
  format: z.string().default(""),
  certifications: z.array(z.string()).default([]),
  style_preference: z.string().optional(),
});

const SYSTEM_PROMPT = `You are a premium food brand naming expert.
You create plausible, professional brand names for food products that will be presented to Israeli retail buyers as sourcing ideas.

The brand names must:
- Sound like real established brands
- Feel premium and European/Mediterranean
- Be suitable for Israeli retail market
- Never be generic or obviously fake
- Work well on product labels

You also write Ideogram/Midjourney prompts for generating product label mockup images.

Return JSON only. No explanation.`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "AI not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { product_name, category, country_of_origin, format, certifications, style_preference } = parsed.data;

  const userPrompt = `Create a brand identity for this food product:

Product: ${product_name}
Category: ${category}
Origin: ${country_of_origin || "European"}
Format: ${format || "not specified"}
Certifications: ${certifications.join(", ") || "none"}
Style preference: ${style_preference ?? "premium"}

Return ONLY this JSON:
{
  "brand_name": "the brand name (1-2 words max)",
  "tagline": "short brand tagline (max 6 words)",
  "rationale": "one sentence why this name works",
  "label_style": "description of label design style",
  "image_prompt": "detailed Ideogram prompt for generating a professional product photo. Include: product type, packaging format, label style, colors, lighting, pure white background, photography style. Format: Professional food photography of a ${format || "product"} of ${product_name}, pure white background, studio lighting, [label_style], brand name [brand_name] on label, photorealistic, high resolution, no shadows"
}

Brand name examples by category:
Olive oil: Valloria, Terra Selva, Oleandro, Montefiore, Castellan
Tuna/Seafood: Mareblu, Atlantico, Mare Aperto, Oceanus, Pelagus
Balsamic/Vinegar: Modena Ducale, Acetaia Nobile, Villa Rossa
Harissa/Sauces: Medina Gold, Riad, Sahara Kitchen, Casbah
Spices: Bazaar, Levant, Spice Route, Mashreq
Canned/Preserved: Conserva, La Bottega, Cantina`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: "AI returned unparseable response" }, { status: 500 });
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(match[0]);
    } catch {
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      brand_name: result.brand_name ?? null,
      tagline: result.tagline ?? null,
      rationale: result.rationale ?? null,
      label_style: result.label_style ?? null,
      image_prompt: result.image_prompt ?? null,
    });
  } catch (err) {
    console.error("generate-brand error:", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}

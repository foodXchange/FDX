import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const InputSchema = z.object({
  imageUrl: z.string().url(),
  description: z.string().max(2000).optional(),
});

const AnalysisSchema = z.object({
  product_name: z.string().nullable(),
  category: z.string().nullable(),
  packaging_format: z.string().nullable(),
  approximate_size: z.string().nullable(),
  certifications_visible: z.array(z.string()),
  brand_positioning: z.string().nullable(),
  private_label_suitable: z.boolean().nullable(),
  key_features: z.array(z.string()),
  sourcing_keywords: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

export type ImageAnalysis = z.infer<typeof AnalysisSchema>;

const SYSTEM_PROMPT =
  "You are a food industry product identification expert. " +
  "Analyse food product images to help match buyers with suppliers. Be practical and specific. " +
  "Output ONLY valid JSON — no explanation, no markdown, no code blocks.";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { ok: true, analysis: null, message: "AI analysis not available" },
      { status: 200 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { imageUrl, description } = parsed.data;

  const userPrompt = `Analyse this food product image and extract sourcing-relevant details.
${description ? `The buyer also wrote: "${description}"\nUse this to confirm or add context to what you see.` : ""}

Return ONLY this exact JSON structure — no other text:
{
  "product_name": "specific product name or null",
  "category": "one of: Tomato Products | Pasta & Grains | Snacks | Dairy | Beverages | Sauces & Condiments | Canned Foods | Frozen Foods | Other",
  "packaging_format": "e.g. glass jar, plastic cup, tin can, pouch, box, or null",
  "approximate_size": "e.g. 115g, 500ml, 1kg or null if unclear",
  "certifications_visible": ["list any kosher, organic, halal, or other certification symbols visible"],
  "brand_positioning": "premium or mid-range or budget or unclear",
  "private_label_suitable": true or false,
  "key_features": ["up to 4 key product features"],
  "sourcing_keywords": ["up to 8 short keywords for matching"],
  "confidence": 0.0 to 1.0,
  "notes": "anything else useful for sourcing or null"
}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    let analysis: ImageAnalysis | null = null;

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      const parsedJson = JSON.parse(jsonStr);
      const validated = AnalysisSchema.safeParse(parsedJson);
      if (validated.success) {
        analysis = validated.data;
      }
    } catch {
      console.error("Failed to parse AI response:", raw);
    }

    if (analysis) {
      Promise.resolve(
        supabaseAdmin
          .from("request_images")
          .update({ ai_analysis: analysis })
          .eq("url", imageUrl)
      ).catch(console.error);
    }

    return Response.json({ ok: true, analysis });
  } catch (err) {
    console.error("Anthropic vision error:", err);
    return Response.json({ ok: true, analysis: null }, { status: 200 });
  }
}

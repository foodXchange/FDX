import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import buildImageExtractionPrompt from "@/lib/ai/imageExtractionPrompt";
import type { ImageExtraction } from "@/lib/pip/pipTypes";

const SYSTEM_PROMPT =
  "You are a food-product visual extraction assistant. Output only the JSON requested by the user and nothing else.";

const AttrSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    status: z.enum(["observed", "inferred", "unknown"]),
    confidence: z.number().min(0).max(1),
    evidence: z.string().nullable(),
  });

const CategoryAttrSchema = z.object({
  value: z.string().nullable(),
  category_name: z.string().nullable(),
  status: z.enum(["observed", "inferred", "unknown"]),
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable(),
});

const Schema = z.object({
  image_id: z.string().nullable(),
  group_key: z.string(),
  category: CategoryAttrSchema,
  product_noun: AttrSchema(z.string()),
  brand: AttrSchema(z.string()),
  product_name: AttrSchema(z.string()),
  size: AttrSchema(z.string()),
  format: AttrSchema(z.string()),
  packaging: AttrSchema(z.string()),
  processing_state: AttrSchema(z.string()),
  temperature_regime: AttrSchema(z.string()),
  certifications_visible: AttrSchema(z.array(z.string())),
  kosher_marks_visible: AttrSchema(z.array(z.string())),
  organic_claim: AttrSchema(z.boolean()),
  origin_country: AttrSchema(z.string()),
  label_languages: AttrSchema(z.array(z.string())),
  label_claims: AttrSchema(z.array(z.string())),
  overall_quality: z.enum(["clear", "partial", "poor"]),
  flags: z.array(z.string()),
});

export async function extractImage(opts: {
  imageUrl: string;
  imageId?: string | null;
  description?: string | null;
  dryRun?: boolean;
}): Promise<ImageExtraction | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .order("name");

  const basePrompt = buildImageExtractionPrompt(categories ?? []);
  const userPrompt = `${basePrompt}\n\nImage URL: ${opts.imageUrl}${
    opts.description ? `\nBuyer note: ${opts.description}` : ""
  }`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: opts.imageUrl },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });

    const raw = response.content?.[0]?.type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr);

    const validated = Schema.safeParse(parsed);
    if (!validated.success) {
      console.warn("Image extraction validation failed:", validated.error.issues);
      return null;
    }

    const result = validated.data as unknown as ImageExtraction;

    // Always use the caller-supplied imageId — never the model's URL-parsed guess.
    // The grouping_decision provenance map requires real request_images.id UUIDs.
    result.image_id = opts.imageId ?? "";

    // Build group_key from category_name + product_noun (size/format/packaging excluded by rule)
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, "")
        .trim()
        .replace(/\s+/g, "_");

    const categoryForKey = result.category?.category_name ?? "unknown";
    const productNoun = result.product_noun?.value ?? "unknown";
    result.group_key = `${normalize(categoryForKey)}::${normalize(productNoun)}`;

    if (!opts.dryRun) {
      const updateBody = { ai_analysis: result };
      if (opts.imageId) {
        try {
          await supabaseAdmin.from("request_images").update(updateBody).eq("id", opts.imageId);
        } catch (e) {
          console.error("Failed to persist ai_analysis by id:", e);
        }
      } else {
        try {
          await supabaseAdmin.from("request_images").update(updateBody).eq("url", opts.imageUrl);
        } catch (e) {
          console.error("Failed to persist ai_analysis by url:", e);
        }
      }
    }

    return result;
  } catch (err) {
    console.error("extractImage error:", err);
    return null;
  }
}

export default extractImage;

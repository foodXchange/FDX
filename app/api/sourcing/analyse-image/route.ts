import { z } from "zod";
import { extractImage } from "@/lib/ai/extractImage";

const InputSchema = z.object({
  imageUrl: z.string().url(),
  imageId: z.string().optional(),
  description: z.string().max(2000).optional(),
});

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

  const { imageUrl, imageId, description } = parsed.data;

  try {
    const analysis = await extractImage({ imageUrl, imageId, description });
    return Response.json({ ok: true, analysis });
  } catch (err) {
    console.error("Image extraction error:", err);
    return Response.json({ ok: true, analysis: null }, { status: 200 });
  }
}

export type ImageAnalysis = {
  product_name: string | null;
  category: string | null;
  packaging_format: string | null;
  approximate_size: string | null;
  certifications_visible: string[];
  brand_positioning: string | null;
  private_label_suitable: boolean | null;
  key_features: string[];
  sourcing_keywords: string[];
  confidence: number;
  notes: string | null;
};

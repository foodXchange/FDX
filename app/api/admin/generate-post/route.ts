import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const Schema = z.object({
  requestId: z.string().uuid(),
  platform: z.enum(["linkedin", "whatsapp", "email"]).default("linkedin"),
});

const SYSTEM_PROMPT = `You are a LinkedIn content expert specialising in B2B food industry sourcing posts.

FoodXchange is a strategic sourcing company connecting global food manufacturers with Israeli buyers (retailers, importers, foodservice).

Udi Stryk (the founder) has 35,000 LinkedIn followers in the food industry. Posts are written in first person as Udi.

Post style:
- Professional but conversational
- Direct and specific — no vague language
- Always show real demand signals
- Never reveal the buyer name or company
- Position Udi as the connector with real mandates
- Short paragraphs, lots of line breaks
- End with a clear CTA
- 150-250 words maximum
- Always include relevant hashtags at the end`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const validSession = session ? await verifySession(session) : false;

  if (!validSession) {
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

  const { requestId, platform } = parsed.data;

  const { data: request, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const product = (request.product_name as string | null) ?? "food product";
  const category = (request.category as string | null) ?? "food";
  const kosherType = (request.kosher_type as string | null) ?? null;
  const passover = (request.passover_kosher as boolean | null) ?? false;
  const branding = (request.branding as string | null) ?? null;
  const packaging = (request.packaging_preference as string | null) ?? null;
  const certifications = (request.certifications as string[] | null) ?? [];
  const tags = (request.tags as string[] | null) ?? [];

  let userPrompt: string;

  if (platform === "linkedin") {
    userPrompt = `Write a LinkedIn post for this active sourcing request:

Product: ${product}
Category: ${category}
Kosher required: ${kosherType ?? "not required"}
Passover kosher: ${passover ? "yes" : "no"}
Branding: ${branding ?? "not specified"}
Packaging: ${packaging ?? "not specified"}
Other certifications: ${certifications.filter(c => !c.toLowerCase().includes("kosher")).join(", ") || "none"}
Keywords: ${tags.slice(0, 5).join(", ") || "none"}

The post should:
1. Open with "🔍 Active sourcing —" then the product
2. List key requirements as bullet points using relevant emojis:
   📦 Format/packaging (if specified)
   ✡️ Kosher certification (if required)
   🏷️ Branding type (if specified)
   🇮🇱 Market: Israeli retail/foodservice
3. Invite manufacturers to reach out: "If you produce [product] and export to Israel — or want to — drop a comment or DM."
4. End with: "Visit the link in my bio to submit your product range directly."
5. Add 8-10 relevant hashtags

After the post, on a new line write:
IMAGE: A one-sentence description of the ideal image to accompany this post for Midjourney or Ideogram.

Then on another new line write:
WHATSAPP: A shorter version (3-4 lines) for WhatsApp broadcast to supplier lists. Informal, direct, no hashtags.`;
  } else if (platform === "whatsapp") {
    userPrompt = `Write a concise WhatsApp broadcast message (3-4 lines) for this sourcing requirement:

Product: ${product}
Category: ${category}
Kosher: ${kosherType ?? "not required"}
Packaging: ${packaging ?? "not specified"}

Informal, direct, phone-friendly. No hashtags. Include a clear CTA to reply or contact.`;
  } else {
    userPrompt = `Write a professional outreach email to send to a supplier list about this active requirement:

Product: ${product}
Category: ${category}
Kosher required: ${kosherType ?? "not required"}
Branding: ${branding ?? "not specified"}
Packaging: ${packaging ?? "not specified"}

Start with a subject line on the first line (format: "Subject: ...").
Then write the email body — professional, 150 words max.
Include a clear CTA to reply with their product details.`;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const fullText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const linkedinPost = fullText.split("IMAGE:")[0].split("WHATSAPP:")[0].trim();

    const imageBriefMatch = fullText.match(/IMAGE:\s*([\s\S]+?)(?=\nWHATSAPP:|\n\n|$)/);
    const imageBrief = imageBriefMatch?.[1]?.trim() ?? null;

    const whatsappMatch = fullText.match(/WHATSAPP:\s*([\s\S]+?)$/);
    const whatsappVersion = whatsappMatch?.[1]?.trim() ?? null;

    return Response.json({
      ok: true,
      post: platform === "linkedin" ? linkedinPost : fullText.trim(),
      imageBrief: platform === "linkedin" ? imageBrief : null,
      whatsappVersion: platform === "linkedin" ? whatsappVersion : null,
      platform,
    });
  } catch (err) {
    console.error("generate-post error:", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}

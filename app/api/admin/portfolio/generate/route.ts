import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const Schema = z.object({
  description: z.string().min(1).max(3000),
  tone: z.enum(["Professional", "Detailed", "Concise", "Technical", "Story-driven"]),
});

const SYSTEM_PROMPT = `You are an expert food sourcing analyst and B2B content writer for the Israeli food import market. You create compelling, accurate sourcing scenario content for FoodXchange — a platform connecting Israeli food buyers with verified European manufacturers.

Your writing style:
- Direct and confident — no fluff
- Story-driven but data-grounded
- Shows deep market knowledge
- Honest about challenges and gaps
- Written for food industry professionals who can spot vague or generic content

Israeli market context you always apply:
- Israel imports 70%+ of food products
- Chief Rabbinate is minimum kosher for mainstream retail
- Badatz required for Haredi market
- BRC or IFS mandatory for major chains
- Private label dominates Israeli retail
- Ashdod and Haifa are main import ports
- Lead times: Spain 6-8 weeks, Italy 8-10 weeks, Eastern Europe 4-6 weeks
- Key buyers: Shufersal, Yochananof, Rami Levy, Ta'aman, H. Cohen, Leiman Schlussel, Osher Ad
- Key sourcing countries by category:
  Olive oil: Spain, Italy, Greece
  Tomato: Italy, Spain, Turkey
  Fish: Ecuador, Thailand, Spain
  Frozen: Poland, Belgium, Netherlands
  Snacks: Poland, Germany, Netherlands
  Organic: Italy, Germany, Netherlands

Tone options:
- Professional: formal, precise
- Story-driven: narrative arc, tension and resolution, reads like a case study
- Technical: specs-focused, certifications, supply chain details
- Concise: shorter, punchy, scannable
- Detailed: comprehensive, exhaustive`;

function buildUserPrompt(description: string, tone: string): string {
  return `Generate a complete sourcing scenario for FoodXchange based on this description:

${description}

Tone: ${tone}

Return ONLY valid JSON (no markdown, no backticks, no preamble, no explanation):
{
  "title": "Professional scenario title — format: [Product] — [Format/Context] e.g. Extra Virgin Olive Oil — 750ml Retail",
  "slug": "url-slug-like-this",
  "category": "exact category from: Tomato Products, Oils & Fats, Canned Foods, Snacks, Pasta & Grains, Frozen Foods, Bakery, Sauces & Condiments, Fish & Seafood, Dairy, Beverages, Spices & Herbs, Organic & Natural, Other",
  "summary": "2-3 sentences. What is being sourced, for what market, what makes it complex.",
  "certifications": ["Kosher", "BRC"],
  "formats": ["Bottle 750ml"],
  "tags": ["tag1", "tag2", "tag3"],
  "priority": 85,
  "private_label": true,
  "markets": ["Retail"],
  "countries": ["Spain", "Italy"],
  "sourcing_brief": "150-200 words. What exactly is needed. Product spec, formats, certifications, volume, origin preference, timeline. Written as a professional sourcing brief.",
  "market_challenge": "120-150 words. What makes this category hard in Israel. Kosher complications, labeling law, pricing pressure, supplier landscape gaps. Honest and specific.",
  "what_we_validated": "120-150 words. What FoodXchange checks for this category before making introductions. Written as a numbered or structured list of validation criteria.",
  "what_we_found": "120-150 words. The supplier landscape. Which countries win and why. What surprised us. Where the gaps are. Written as market intelligence.",
  "key_takeaways": "5 bullet points. The most important things a buyer needs to know before sourcing this product. Practical, specific, not generic. Each point 1-2 sentences. Format as plain text with each point on a new line starting with a dash."
}`;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "AI not configured", message: "Add ANTHROPIC_API_KEY to environment variables" },
      { status: 503 }
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(parsed.data.description, parsed.data.tone),
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : rawText;

    let data: unknown;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      return Response.json({ ok: false, error: "Parse failed", raw: rawText }, { status: 500 });
    }

    return Response.json({ ok: true, data });
  } catch (err) {
    console.error("Portfolio generate error:", err);
    return Response.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }
}

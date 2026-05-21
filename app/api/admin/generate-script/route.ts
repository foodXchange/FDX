import { z } from "zod";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";

const ScriptSchema = z.object({
  topic: z.string().min(1).max(500),
  audience: z.enum(["buyers", "manufacturers", "both"]),
  language: z.enum(["hebrew", "english", "both"]),
  format: z.enum(["short", "medium", "long"]).default("medium"),
  tone: z.enum(["authoritative", "conversational", "provocative"]).default("conversational"),
  product_context: z.string().max(500).optional(),
});

const SYSTEM_PROMPT = `You are a video script writer for Udi Stryk, founder of FoodXchange — a strategic food sourcing company connecting European food manufacturers with Israeli buyers.

Udi's profile:
- 44 years old, Israeli, based in Tel Aviv
- 35,000 LinkedIn followers in food industry
- Deep expertise in kosher food regulations, Israeli retail market, and European food manufacturing
- Speaks Hebrew natively, English fluently
- Confident, direct, knowledgeable tone
- Camera presence: warm but authoritative

Script format rules:
- Always start with a hook that creates immediate curiosity or challenges a common belief
- Write exactly as Udi would speak — natural, not corporate
- Include [PAUSE] markers where Udi should pause for emphasis
- Include [SHOW: description] markers where Udi should hold up a product or point to something
- Mark delivery notes in brackets: [SLOW], [EMPHATIC], [SMILE]
- End with ONE clear call to action
- Hebrew scripts: use modern Israeli business Hebrew, not formal
- English scripts: use natural spoken English, contractions allowed

Word counts by format:
short (60s): 120-150 words
medium (90s): 180-220 words
long (3min): 480-520 words`;

const AUDIENCE_CONTEXT: Record<string, string> = {
  buyers: `Target audience: Israeli food buyers — category managers at retail chains (Shufersal, Dor Alon, Rami Levy), importers, and foodservice buyers. They care about: price, availability, kosher certification, shelf life, private label options, and what is trending in European markets.`,
  manufacturers: `Target audience: European food manufacturers — export managers, CEOs, and sales directors at food factories in Italy, Spain, Greece, Poland, Turkey. They care about: how to enter the Israeli market, kosher requirements, what Israeli buyers actually want, and how FoodXchange can help them.`,
  both: `Target audience: both Israeli buyers and European manufacturers watching your LinkedIn content.`,
};

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  hebrew: "Write ONLY in Hebrew (עברית). Natural spoken Israeli Hebrew.",
  english: "Write ONLY in English.",
  both: "Write TWO versions — first in Hebrew, then in English. Label each clearly: '=== HEBREW VERSION ===' and '=== ENGLISH VERSION ==='",
};

const FORMAT_CONTEXT: Record<string, string> = {
  short: "60-second Instagram/TikTok format. Fast-paced. Hook in first 3 seconds. No fluff.",
  medium: "90-second LinkedIn video format. Professional but personal. Room for one key insight.",
  long: "3-minute YouTube format. Can go deeper. Include an example or story.",
};

const TONE_GUIDE: Record<string, string> = {
  authoritative: "Expert positioning. Udi speaks as THE authority on Israeli food sourcing. Confident, no hedging.",
  conversational: "Friendly and direct. Like talking to a colleague who happens to be an expert.",
  provocative: "Start with a bold or controversial claim. Challenge assumptions. Make people think.",
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? "";
  if (!(await verifySession(session))) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ScriptSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { topic, audience, language, format, tone, product_context } = parsed.data;

  const userPrompt = `Write a video script for Udi Stryk.

TOPIC: ${topic}
FORMAT: ${FORMAT_CONTEXT[format]}
AUDIENCE: ${AUDIENCE_CONTEXT[audience]}
LANGUAGE: ${LANGUAGE_INSTRUCTION[language]}
TONE: ${TONE_GUIDE[tone]}${product_context ? `\nPRODUCT CONTEXT: ${product_context}` : ""}

Structure the script exactly like this:

HOOK (first 5-8 seconds):
[The opening line — must grab attention immediately]

BODY:
[The main content with [PAUSE], [SHOW:], [SLOW], [EMPHATIC], [SMILE] markers]

CTA (last 10 seconds):
[One clear call to action]

---
DELIVERY NOTES:
[3-5 practical tips for recording this video — camera angle, energy level, hand gestures, props to hold, etc.]

CAPTION:
[Ready-to-post social media caption for this video — includes relevant hashtags. Hebrew caption for Hebrew scripts, English caption for English scripts.]`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("generate-script error:", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const GenerateSchema = z.object({
  topic: z.string().min(1).max(300),
  category: z.string().min(1),
  categoryTitle: z.string().min(1),
});

const SYSTEM_PROMPT = `You are an expert on Israeli food import regulations, writing authoritative guides for food manufacturers and importers who want to sell products in Israel.

Your articles are:
- Accurate and practical (based on real Israeli regulations)
- Written for food industry professionals
- Structured with clear headings and actionable information
- Between 800-1200 words
- Never promotional — purely informational

FoodXchange is a strategic sourcing company that connects global food manufacturers with Israeli buyers. These articles appear on fdx.trading/en/import-guide.

Key regulatory bodies to reference where relevant:
- Israeli Ministry of Health (MOH)
- Standards Institution of Israel (SII / Moked)
- Israeli Plant Protection and Inspection Services (PPIS)
- Israeli Customs Authority
- Chief Rabbinate of Israel (for kosher)

Always end articles with a brief practical summary and 3-5 key takeaways.`;

function buildUserPrompt(topic: string, categoryTitle: string): string {
  return `Write a comprehensive, practical guide article about:
${topic}

Category: ${categoryTitle}

Structure the article with:
1. A brief introduction (2-3 sentences) explaining why this topic matters for importers
2. Main content with clear H2 headings (use ## markdown)
3. Specific requirements, procedures, or regulations
4. Practical tips and common mistakes to avoid
5. A 'Key takeaways' section at the end with 3-5 bullet points

Also provide at the END of your response, after the article, a JSON block in this exact format (after the article text):

---JSON---
{
  "summary": "[2-3 sentence summary for the article card]",
  "tags": ["tag1", "tag2", "tag3"],
  "meta_title": "[SEO title under 60 chars]",
  "meta_description": "[SEO description, max 155 chars]",
  "reading_time_mins": 5
}
---END JSON---

Write in clear, professional English. Be specific — cite actual requirements where known. Do not use vague filler text.`;
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

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { topic, categoryTitle } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: "AI not configured",
        message: "Add ANTHROPIC_API_KEY to environment variables",
      },
      { status: 503 }
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(topic, categoryTitle) }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

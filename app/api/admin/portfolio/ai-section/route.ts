import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const Schema = z.object({
  sectionName: z.enum(["brief", "challenge", "validated", "findings", "takeaways", "image-prompt"]),
  title: z.string().min(1).max(300),
  category: z.string().default(""),
  tags: z.array(z.string()).default([]),
  markets: z.array(z.string()).default([]),
  formats: z.array(z.string()).default([]),
});

type Input = z.infer<typeof Schema>;

const SYSTEM_PROMPT = `You are a strategic food sourcing expert writing content for a B2B portfolio case study page. The portfolio shows sourcing work done for buyers without revealing client or supplier names. Write in first person plural (we/our). Be specific and practical — no vague marketing language. Focus on process, validation, and market insight.`;

function buildUserPrompt(sectionName: string, d: Input): string {
  const marketsStr = d.markets.length ? d.markets.join(", ") : "not specified";
  const formatsStr = d.formats.length ? d.formats.join(", ") : "not specified";
  const tagsStr = d.tags.length ? d.tags.join(", ") : "not specified";
  const cat = d.category || "food";

  switch (sectionName) {
    case "brief":
      return `Write the sourcing brief section for a portfolio scenario about "${d.title}" in the ${cat} category. Target markets: ${marketsStr}. Formats: ${formatsStr}. Describe what was needed in 2-3 paragraphs. Do not mention any client or buyer name.`;
    case "challenge":
      return `Write the market challenge section for "${d.title}". What makes sourcing ${cat} genuinely complex? What do most importers get wrong? What risks exist in this category? Write 2-3 paragraphs showing deep expertise.`;
    case "validated":
      return `Write the 'what we validated' section for "${d.title}". Tags to reference: ${tagsStr}. List specific things that were tested and verified: packaging, certifications, specs, compliance, etc. Write as flowing paragraphs, not just a bullet list.`;
    case "findings":
      return `Write the 'what we found' section for "${d.title}". Describe the supplier landscape without naming any specific suppliers. Which countries or regions perform best? What are common gaps in this category? What surprised you? 2-3 paragraphs.`;
    case "takeaways":
      return `Write 4-5 key takeaways for buyers considering sourcing "${d.title}". Format as bullet points starting with •. Each point should be a specific, actionable insight. No generic advice — only category-specific wisdom.`;
    case "image-prompt":
      return `Write a detailed AI image generation prompt (for Midjourney or DALL-E) for a professional portfolio case study about "${d.title}" in the ${cat} category. Markets: ${marketsStr}. Formats: ${formatsStr}. Requirements: professional food product photography, commercial B2B style, clean studio lighting, no text in image, no people. Include: product appearance, packaging style, color palette, lighting setup, composition style, mood. Keep under 120 words. Output the prompt only — no explanation, no labels.`;
    default:
      return `Write content for the ${sectionName} section about "${d.title}".`;
  }
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

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(parsed.data.sectionName, parsed.data) }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
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

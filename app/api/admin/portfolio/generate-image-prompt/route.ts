import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const Schema = z.object({
  scenario: z.string().min(1).max(500),
  style: z.enum(["Product photography", "Editorial", "Lifestyle", "Industrial/factory"]),
});

const SYSTEM_PROMPT = `You are a professional photo editing manager and art director for a premium international food trade magazine. You create detailed, precise image generation prompts for AI image tools. Your prompts always result in professional, commercially viable food photography.`;

function buildUserPrompt(scenario: string, style: string): string {
  return `Generate a professional image prompt for this B2B food sourcing scenario:

${scenario}

Style preference: ${style}

The prompt MUST follow this exact three-part structure:

PART 1: Start with exactly the words "generate an image;" followed by a detailed visual scene description (3-5 sentences). Be specific about: the product, setting, props, lighting direction, composition, background.

PART 2: Start with "Act as a professional photo editing manager for a premium food trade magazine." Then specify: mood/feeling, photography style, lighting style, color palette, camera and lens, post-processing approach, intended use (B2B hero banner).

PART 3: Start with "Format:" and specify: 16:9 landscape, 1920x1080px minimum, no text overlays, no logos, no people's faces, suitable for commercial B2B use.

Return only the complete three-part prompt — no preamble, no explanation, no labels for the parts.`;
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
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(parsed.data.scenario, parsed.data.style),
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Strip any accidental leading "generate an image" variation so we don't double-prepend
    const stripped = raw.replace(/^generate an image[;:,.]?\s*/i, "");
    const prompt = `generate an image; ${stripped}`;

    return Response.json({ ok: true, prompt });
  } catch (err) {
    console.error("Image prompt generate error:", err);
    return Response.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }
}

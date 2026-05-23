import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";

const SYSTEM_PROMPT = `You are an SEO specialist for a B2B food sourcing platform called FoodXchange that connects European food manufacturers with Israeli retailers and importers. You write image alt text that is:
- Descriptive and accurate
- 80-120 characters long
- Contains relevant keywords: kosher, Israel, European, the specific food category
- Written for screen readers first, SEO second
- Never starts with "Image of" or "Photo of"`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie || !(await verifySession(cookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    imageUrl: string;
    scenarioTitle: string;
    category: string;
  };
  const { imageUrl, scenarioTitle, category } = body;

  if (!imageUrl || !scenarioTitle) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Write alt text for a hero image for this sourcing scenario:\nTitle: ${scenarioTitle}\nCategory: ${category ?? "food"}\n\nFoodXchange sourcing platform for Israeli food market.\n\nReturn only the alt text string. 80-120 characters.`,
      },
    ],
  });

  const alt =
    msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

  return NextResponse.json({ ok: true, alt });
}

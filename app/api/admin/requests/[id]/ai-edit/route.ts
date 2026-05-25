import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Anthropic from "@anthropic-ai/sdk";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let authed: boolean;
    try {
      authed = await checkAuth();
    } catch (err) {
      console.error("ai-edit: auth check threw:", err);
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!authed) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let request: {
      product_name: string | null;
      message: string | null;
      category: string | null;
      certifications: unknown;
      ai_analysis: unknown;
    } | null;
    try {
      const { data, error } = await supabaseAdmin
        .from("sourcing_requests")
        .select("product_name, message, category, certifications, ai_analysis")
        .eq("id", id)
        .single();
      if (error) {
        console.error("ai-edit: supabase fetch error:", error.message);
        return Response.json({ error: "Request not found" }, { status: 404 });
      }
      request = data;
    } catch (err) {
      console.error("ai-edit: supabase threw:", err);
      return Response.json({ error: "Database error" }, { status: 500 });
    }

    if (!request) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    const ai = request.ai_analysis as { sourcing_keywords?: string[] } | null;

    const userPrompt = `Edit this Israeli buyer sourcing request for the public sourcing board:

Product: "${request.product_name ?? ""}"
Description: "${request.message ?? ""}"
Category: "${request.category ?? ""}"
Certifications: ${JSON.stringify(request.certifications ?? [])}
AI Analysis keywords: ${JSON.stringify(ai?.sourcing_keywords ?? [])}

Return JSON:
{
  "product_name": "Clean product name, max 60 chars, English, no personal info, specific",
  "public_message": "2-3 sentences for European manufacturers. Professional B2B tone. What the buyer needs, key specs, certifications required. Remove any personal info (emails, phones, names)."
}`;

    let responseText: string;
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system:
          "You are a B2B content editor for FoodXchange, a food sourcing platform. Clean up buyer sourcing requests for display to European food manufacturers. Output ONLY valid JSON, no markdown.",
        messages: [{ role: "user", content: userPrompt }],
      });
      const raw =
        response.content[0].type === "text" ? response.content[0].text : "";
      // Strip markdown code fences the model occasionally adds despite instructions
      responseText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    } catch (err) {
      console.error("ai-edit: Anthropic call threw:", err);
      return Response.json({ error: "AI request failed" }, { status: 500 });
    }

    let parsed: { product_name: string; public_message: string };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("ai-edit: model returned non-JSON:", responseText.slice(0, 200));
      return Response.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      product_name: parsed.product_name,
      public_message: parsed.public_message,
    });
  } catch (err) {
    console.error("ai-edit: unhandled error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

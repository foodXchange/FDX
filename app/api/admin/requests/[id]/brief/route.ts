import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/requests/[id]/brief — Save manual edits to seller_brief
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      sellerBrief?: string;
      benchmarkBrand?: string;
    };

    if (typeof body.sellerBrief !== "string" || !body.sellerBrief.trim()) {
      return NextResponse.json(
        { ok: false, error: "sellerBrief text is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { ok: false, error: "Request not found" },
        { status: 404 }
      );
    }

    const currentAi = (existing.ai_analysis as Record<string, unknown> | null) ?? {};
    const updatedAi: Record<string, unknown> = {
      ...currentAi,
      seller_brief: body.sellerBrief.trim(),
      seller_brief_updated_at: new Date().toISOString(),
      ...(body.benchmarkBrand !== undefined
        ? { benchmark_brand: body.benchmarkBrand.trim() || null }
        : {}),
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({ ai_analysis: updatedAi })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      sellerBrief: body.sellerBrief.trim(),
      benchmarkBrand: updatedAi.benchmark_brand ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/requests/[id]/brief — AI-generate or AI-edit the seller_brief
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      instruction?: string;
      currentBrief?: string;
    };

    const { data: requestRow, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !requestRow) {
      return NextResponse.json(
        { ok: false, error: "Request not found" },
        { status: 404 }
      );
    }

    const currentAi = (requestRow.ai_analysis as Record<string, unknown> | null) ?? {};
    const pip = (requestRow.intent_json as Record<string, unknown> | null) ?? {};
    const existingBrief =
      body.currentBrief?.trim() ||
      (typeof currentAi.seller_brief === "string" ? currentAi.seller_brief : "") ||
      "";

    const productName =
      (requestRow.product_name as string | null) ||
      ((pip.product as Record<string, { value?: string }> | undefined)?.title?.value ?? "Food Product");
    const category = (requestRow.category as string | null) || "Food & Beverage";
    const message = (requestRow.message as string | null) || "";
    const packaging = (requestRow.packaging_preference as string | null) || "Standard retail or foodservice packaging";
    const certs = Array.isArray(requestRow.certifications)
      ? (requestRow.certifications as string[]).join(", ")
      : "Standard export quality (BRC / IFS / ISO)";
    const privateLabel =
      requestRow.private_label === true
        ? "Private Label (Buyer's Brand)"
        : requestRow.private_label === false
          ? "Branded with Supplier's Brand"
          : "Open to Private Label or Supplier Brand";
    const benchmarkBrand =
      (typeof currentAi.benchmark_brand === "string" ? currentAi.benchmark_brand : null) ||
      ((pip.product as Record<string, { value?: string }> | undefined)?.brand_hint?.value ?? null);

    const instruction =
      body.instruction?.trim() ||
      "Write a warm, appealing, friendly, and clear Wholesale / Seller Agent Sourcing Brief that helps a manufacturer or sourcing agent immediately understand the exact product, benchmark reference, packaging format, dietary/kosher requirements, and branding mode.";

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `You are a senior B2B food sourcing specialist at FoodXchange.
Your job is to write or refine a Wholesale / Seller Agent Sourcing Brief for a buyer request so that international food manufacturers and sourcing agents find it warm, appealing, crystal-clear, and actionable.

REQUEST CONTEXT:
- Product Name: ${productName}
- Category: ${category}
- Benchmark Brand Reference: ${benchmarkBrand ?? "Not specified"}
- Packaging & Dispensing Preference: ${packaging}
- Branding Mode: ${privateLabel}
- Certifications & Dietary Specs: ${certs}
- Buyer Notes / Original Description: ${message}

CURRENT BRIEF DRAFT (if any):
${existingBrief || "(None yet — generate a fresh brief from the request context)"}

ADMIN AI EDIT INSTRUCTION:
"${instruction}"

GUIDELINES:
- Keep the tone warm, friendly, professional, and appealing to a manufacturer or wholesale sourcing agent.
- Clearly highlight the target product, any benchmark brand similarity (e.g. Hellmann's, Heinz, Mutti, Balconi), packaging format & hardware (e.g. bottle, glass jar, 5kg catering box with dispenser pump, sachets), unit weight, branding mode (Private Label vs Supplier Brand), and Kosher/dietary requirements.
- Do NOT include internal buyer contact details (phone/email) so this brief can be safely shared or printed as a PDF for suppliers and agents.
- Output plain text only (2–4 well-structured paragraphs or bullet highlights, no markdown code fences).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.35,
      },
    });

    const newBrief = (response.text ?? "").trim();
    if (!newBrief) {
      return NextResponse.json(
        { ok: false, error: "AI returned an empty brief" },
        { status: 500 }
      );
    }

    const updatedAi: Record<string, unknown> = {
      ...currentAi,
      seller_brief: newBrief,
      seller_brief_updated_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from("sourcing_requests")
      .update({ ai_analysis: updatedAi })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      sellerBrief: newBrief,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "AI brief edit failed" },
      { status: 500 }
    );
  }
}

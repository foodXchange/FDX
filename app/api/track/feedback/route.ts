import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

const FeedbackSchema = z.object({
  tracking_code: z.string().min(3).max(100),
  decision: z.enum(["approved", "rejected", "more_samples"]),
  buyer_tasting_feedback: z.string().max(3000).optional().or(z.literal("")),
  sensory_scores: z.object({
    taste: z.number().min(1).max(5),
    texture: z.number().min(1).max(5),
    packaging: z.number().min(1).max(5),
    viability: z.number().min(1).max(5),
  }),
});

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { tracking_code, decision, buyer_tasting_feedback, sensory_scores } = parsed.data;

  // Handle demo tracking code
  if (
    tracking_code.toUpperCase().includes("DEMO") ||
    tracking_code.toUpperCase() === "FDX-SMP-DEMO88"
  ) {
    return NextResponse.json({
      success: true,
      is_demo: true,
      message: "Demo sensory scorecard received successfully!",
    });
  }

  try {
    // 1. Fetch rows matching this tracking code
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, name, company, whatsapp, email, product_name, ai_analysis")
      .ilike("ai_analysis->>tracking_code", `%${tracking_code}%`);

    if (fetchErr || !rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No sample request found for this tracking reference." },
        { status: 404 }
      );
    }

    const scoresList = [
      sensory_scores.taste,
      sensory_scores.texture,
      sensory_scores.packaging,
      sensory_scores.viability,
    ];
    const avgScore = Number((scoresList.reduce((a, b) => a + b, 0) / scoresList.length).toFixed(1));

    const finalSampleStatus =
      decision === "approved"
        ? "feedback_approved"
        : decision === "rejected"
        ? "feedback_rejected"
        : "delivered";

    // 2. Update each row in the sample kit
    for (const r of rows) {
      const currentAi = (r.ai_analysis ?? {}) as Record<string, unknown>;
      const updatedAi: Record<string, unknown> = {
        ...currentAi,
        sample_status: finalSampleStatus,
        buyer_tasting_feedback: buyer_tasting_feedback || "",
        tasting_decision: decision,
        sensory_scores: {
          taste: sensory_scores.taste,
          texture: sensory_scores.texture,
          packaging: sensory_scores.packaging,
          viability: sensory_scores.viability,
          overall: avgScore,
          submitted_at: new Date().toISOString(),
        },
      };

      await supabaseAdmin
        .from("sourcing_requests")
        .update({
          ai_analysis: updatedAi,
          status: decision === "approved" ? "matched" : "closed",
        })
        .eq("id", r.id);
    }

    // 3. Dispatch alert to Deal Desk
    const leadName = rows[0]?.name || "Retail Buyer";
    const leadCompany = rows[0]?.company || "Retail Partner";
    const leadPhone = rows[0]?.whatsapp || "N/A";
    const decisionHebrew =
      decision === "approved"
        ? "✅ מאושר ע״י הקניין (נכונות להזמנת מכולה)"
        : decision === "rejected"
        ? "❌ לא עומד בציפיות הקניין"
        : "🔄 דרושות דוגמאות חלופיות / פורמט שונה";

    sendLeadNotification({
      name: leadName,
      email: `${rows[0]?.email || "N/A"} (WhatsApp: ${leadPhone})`,
      company: leadCompany,
      message: `משוב טעימות התקבל עבור ערכה #${tracking_code}:
סטטוס החלטה: ${decisionHebrew}
ציון משוקלל: ${avgScore} מתוך 5.0
• טעם וארומה: ${sensory_scores.taste}/5
• מרקם: ${sensory_scores.texture}/5
• אריזה: ${sensory_scores.packaging}/5
• התאמה מסחרית למדף: ${sensory_scores.viability}/5
הערות הקניין: ${buyer_tasting_feedback || "ללא הערות מילוליות"}`,
      intentSummary: `Tasting Scorecard: ${decision.toUpperCase()} (Score ${avgScore}/5) - ${leadCompany}`,
      matchedItems: rows.map((r) => ({ title: r.product_name, slug: "sample-tasting" })),
      submittedAt: new Date().toISOString(),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      updated_count: rows.length,
      average_score: avgScore,
      decision,
    });
  } catch (error) {
    console.error("Sensory feedback submission error:", error);
    return NextResponse.json(
      { error: "Internal server error submitting sensory scorecard." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SAMPLE_ARTWORK_PRESETS,
  analyzeLabelCompliance,
  type LabelComplianceReport,
} from "@/lib/compliance/labelComplianceEngine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (!sessionCookie || !(await verifySession(sessionCookie))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      presetKey,
      productName = "Custom Imported Food",
      category,
      isLiquid = false,
      nutrition,
      hebrewTextFound,
      dealId,
    } = body;

    let report: LabelComplianceReport;

    if (presetKey && SAMPLE_ARTWORK_PRESETS[presetKey]) {
      report = {
        ...SAMPLE_ARTWORK_PRESETS[presetKey].report,
        reviewedAt: new Date().toISOString(),
      };
    } else if (nutrition) {
      report = await analyzeLabelCompliance({
        productName,
        category,
        isLiquid,
        nutrition,
        hebrewTextFound,
      });
    } else {
      // Default to sample preset if no data provided
      report = {
        ...SAMPLE_ARTWORK_PRESETS["canned-tomatoes"].report,
        reviewedAt: new Date().toISOString(),
      };
    }

    // If linked to a deal / sourcing match, persist to match_breakdown and match_messages
    if (dealId) {
      const { data: match } = await supabaseAdmin
        .from("sourcing_matches")
        .select("id, match_breakdown")
        .eq("id", dealId)
        .single();

      if (match) {
        const existingBreakdown = (match.match_breakdown as Record<string, any>) ?? {};
        const updatedBreakdown = {
          ...existingBreakdown,
          label_compliance: {
            ...report,
            updated_at: new Date().toISOString(),
          },
        };

        await supabaseAdmin
          .from("sourcing_matches")
          .update({
            match_breakdown: updatedBreakdown,
          })
          .eq("id", dealId);

        // Record in platform_events
        await supabaseAdmin.from("platform_events").insert({
          event_type: "label_compliance_reviewed",
          metadata: {
            match_id: dealId,
            score: report.overallScore,
            status: report.status,
            red_badges_count: report.redLabels.count,
          },
        });

        // Insert message into match_messages
        const redBadgeSummary = report.redLabels.count > 0
          ? `⚠️ Red Badges Required: ${[
              report.redLabels.highSodium ? "Sodium" : null,
              report.redLabels.highSugar ? "Sugar" : null,
              report.redLabels.highSaturatedFat ? "Saturated Fat" : null,
            ].filter(Boolean).join(", ")}`
          : "✅ Clean Label (0 Red Badges)";

        const auditMessage =
          `🏷️ Packaging Artwork Audit Completed:\n` +
          `• Product: ${report.productNameHebrew}\n` +
          `• Compliance Score: ${report.overallScore}/100 (${report.status})\n` +
          `• Front-of-Package Badges: ${redBadgeSummary}\n` +
          `• Designer Notes: ${report.correctionsForDesigner[0] || "Approved"}`;

        await supabaseAdmin.from("match_messages").insert({
          match_id: dealId,
          sender_type: "admin",
          message: auditMessage,
          metadata: {
            type: "label_compliance_audit",
            report_score: report.overallScore,
            status: report.status,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze packaging compliance." },
      { status: 500 }
    );
  }
}

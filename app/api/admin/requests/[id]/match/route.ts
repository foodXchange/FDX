import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  matchSupplierProducts,
  formatWhatsAppMatch,
} from "@/lib/matching/matchSuppliers";
import type { MatchRequestInput } from "@/lib/matching/matchSuppliers";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

// GET — return saved matches for a request
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      "id, supplier_id, match_score, product_name, company_name, country, match_summary, whatsapp_message, match_breakdown, status, approved_at, rejected_at"
    )
    .eq("request_id", id)
    .neq("status", "rejected")
    .order("match_score", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, matches: data ?? [] });
}

// POST — run matching and persist results
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the sourcing request
  const { data: request, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  // Fetch already-rejected supplier IDs so they are excluded
  const { data: rejectedRows } = await supabaseAdmin
    .from("sourcing_matches")
    .select("supplier_id")
    .eq("request_id", id)
    .eq("status", "rejected");

  const rejectedIds = (rejectedRows ?? []).map(
    (r) => (r as { supplier_id: string }).supplier_id
  );

  // Build match input from request fields
  const aiAnalysis = request.ai_analysis as Record<string, unknown> | null;
  const aiTags = Array.isArray(aiAnalysis?.sourcing_keywords)
    ? (aiAnalysis!.sourcing_keywords as string[])
    : [];

  const input: MatchRequestInput = {
    product_name: (request.product_name as string | null) ?? null,
    category: (request.category as string | null) ?? null,
    certifications: (request.certifications as string[] | null) ?? [],
    target_market: (request.target_market as string | null) ?? null,
    private_label: (request.private_label as boolean | null) ?? null,
    ai_analysis: aiAnalysis,
    tags: [
      ...((request.certifications as string[] | null) ?? []),
      (request.product_name as string | null) ?? "",
      (request.category as string | null) ?? "",
      ...aiTags,
    ].filter(Boolean) as string[],
    formats: aiAnalysis?.packaging_format
      ? [aiAnalysis.packaging_format as string]
      : [],
    product_type:
      aiAnalysis?.is_primary_product === true ? "pure_ingredient" : null,
  };

  // Run product-level matching with rejection exclusions
  const allMatches = await matchSupplierProducts(input, 10, rejectedIds);
  const top10 = allMatches.filter((m) => m.score >= 30);

  // Delete existing non-rejected matches (we'll replace them)
  await supabaseAdmin
    .from("sourcing_matches")
    .delete()
    .eq("request_id", id)
    .neq("status", "rejected");

  if (top10.length > 0) {
    await supabaseAdmin.from("sourcing_matches").insert(
      top10.map((m, idx) => ({
        request_id: id,
        supplier_id: m.supplier_id,
        match_score: Math.round(m.score),
        product_name: m.product_name,
        company_name: m.company_name,
        country: m.country_of_origin,
        match_summary: m.match_summary ?? null,
        whatsapp_message: formatWhatsAppMatch(
          {
            product_name: request.product_name as string | null,
            company: request.company as string | null,
          },
          m,
          idx + 1
        ),
        match_breakdown: {
          reasons: m.match_reasons,
          summary: m.match_summary,
          kosher_types: m.kosher_types,
          certifications: m.certifications,
        },
        status: "pending",
      }))
    );

    // Update request stats
    await supabaseAdmin
      .from("sourcing_requests")
      .update({
        last_matched_at: new Date().toISOString(),
        best_match_score: Math.round(top10[0].score),
        match_count: top10.length,
        status: "matched",
      })
      .eq("id", id);
  }

  const topMatch = top10[0];
  return Response.json({
    ok: true,
    matches: top10.length,
    top_match: topMatch
      ? {
          company: topMatch.company_name,
          score: Math.round(topMatch.score),
          summary: topMatch.match_summary ?? null,
        }
      : null,
  });
}

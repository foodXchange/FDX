import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { matchProducts, formatProductMatchWhatsApp } from "@/lib/matching/matchProducts";
import type { SourcingRequest } from "@/lib/matching/matchProducts";

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

  // Derive kosher requirement from certifications array
  const certs = (request.certifications as string[] | null) ?? [];
  const kosherCert = certs.find((c) => c.toLowerCase().includes("kosher"));
  const kosher_required = Boolean(kosherCert);
  const kosher_type = kosherCert
    ? kosherCert.replace(/^kosher[- ]*/i, "").trim() || "Chief Rabbinate"
    : null;

  const aiAnalysis = request.ai_analysis as Record<string, unknown> | null;

  const srRequest: SourcingRequest = {
    id: request.id as string,
    product_name: (request.product_name as string | null) ?? "",
    category: (request.category as string | null) ?? null,
    kosher_type,
    kosher_required,
    company: (request.company as string | null) ?? null,
    formats: aiAnalysis?.packaging_format
      ? [aiAnalysis.packaging_format as string]
      : [],
  };

  // Run product-level matching with rejection exclusions
  const top10 = await matchProducts(srRequest, 10, rejectedIds);

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
        match_score: m.total_score,
        product_name: m.product_name,
        company_name: m.company_name,
        country: m.country,
        match_summary: m.match_summary,
        whatsapp_message: formatProductMatchWhatsApp(
          {
            product_name: srRequest.product_name,
            company: srRequest.company,
          },
          m,
          idx + 1
        ),
        match_breakdown: {
          reasons: m.match_reasons,
          summary: m.match_summary,
          score_breakdown: m.score_breakdown,
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
        best_match_score: top10[0].total_score,
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
          score: topMatch.total_score,
          summary: topMatch.match_summary,
        }
      : null,
  });
}

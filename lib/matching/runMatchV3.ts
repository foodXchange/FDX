import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { MatchV1Row, RunMatchV1Result } from "./runMatchV1";

export type { MatchV1Row as MatchV3Row };
export type { RunMatchV1Result as RunMatchV3Result };

export async function runMatchV3(requestId: string): Promise<RunMatchV1Result> {
  const { data, error } = await supabaseAdmin.rpc("match_v3", {
    request_uuid: requestId,
    limit_n: 30,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MatchV1Row[];
  if (rows.length === 0) return { inserted: 0, topScore: 0, matches: [] };

  // Keep best-scoring product per supplier
  const bestPerSupplier = new Map<string, MatchV1Row>();
  for (const row of rows) {
    const existing = bestPerSupplier.get(row.supplier_id);
    if (!existing || row.score > existing.score) {
      bestPerSupplier.set(row.supplier_id, row);
    }
  }

  const top = Array.from(bestPerSupplier.values()).sort((a, b) => b.score - a.score);

  await supabaseAdmin.from("sourcing_matches").upsert(
    top.map((m) => ({
      request_id: requestId,
      supplier_id: m.supplier_id,
      match_score: Math.round(m.score),
      product_name: m.product_name,
      company_name: m.company_name,
      country: m.country,
      match_summary: m.summary,
      match_breakdown: m.breakdown,
      status: "suggested",
    })),
    { onConflict: "request_id,supplier_id" }
  );

  await supabaseAdmin
    .from("sourcing_requests")
    .update({
      match_count: top.length,
      best_match_score: Math.round(top[0].score),
      last_matched_at: new Date().toISOString(),
      status: "matched",
    })
    .eq("id", requestId);

  return {
    inserted: top.length,
    topScore: Math.round(top[0].score),
    matches: top,
  };
}

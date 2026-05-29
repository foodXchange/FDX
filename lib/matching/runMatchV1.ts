import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type MatchV1Row = {
  supplier_id: string;
  product_id: string;
  product_name: string;
  company_name: string;
  country: string | null;
  score: number;
  breakdown: {
    category: number;
    format: number;
    compliance: number;
    evidence: number;
  };
  summary: string;
};

export type RunMatchV1Result = {
  inserted: number;
  topScore: number;
  matches: MatchV1Row[];
};

export async function runMatchV1(requestId: string): Promise<RunMatchV1Result> {
  const { data, error } = await supabaseAdmin.rpc("match_v1", {
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

  // Upsert into sourcing_matches — preserves approved_at, rejected_at, sent_at, whatsapp_message
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

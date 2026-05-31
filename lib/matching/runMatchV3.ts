import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { embedText } from "@/lib/ai/embed";

// breakdown key 'category' replaces 'similarity'; 'vector' is new (separate term).
export type MatchV3Row = {
  supplier_id: string;
  product_id: string;
  product_name: string;
  company_name: string;
  country: string | null;
  score: number;
  breakdown: {
    category: number;
    vector: number;
    format: number;
    compliance: number;
    evidence: number;
  };
  summary: string;
};

export type RunMatchV3Result = {
  inserted: number;
  topScore: number;
  matches: MatchV3Row[];
};

// ── Embed string helpers ──────────────────────────────────────────────────────

const HARD_CONSTRAINT_TOKENS = new Set([
  "kosher",
  "kosher_passover",
  "organic",
  "halal",
  "private_label",
]);

const SOFT_PREFIXES = [
  "sub_type:",
  "nutrition:",
  "free_from:",
  "cert:",
  "processing_state:",
  "temperature_regime:",
];

function stripSoftToken(token: string): string | null {
  if (HARD_CONSTRAINT_TOKENS.has(token)) return null;
  if (token.startsWith("category:")) return null;  // UUID — not a descriptor
  if (token.startsWith("kosher:")) return null;     // hard constraint
  if (token.startsWith("channel:")) return null;    // hard constraint
  for (const prefix of SOFT_PREFIXES) {
    if (token.startsWith(prefix)) return token.slice(prefix.length).trim();
  }
  return token;
}

function buildRequestEmbedString(
  productText: string,
  niceToHave: string[]
): string {
  const descriptors = niceToHave
    .map(stripSoftToken)
    .filter((t): t is string => t !== null && t.length > 0)
    .join(". ");

  const parts = [productText.trim(), descriptors]
    .filter((p) => p.length > 0)
    .join(". ");

  return parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".";
}

// ── PIP reader ────────────────────────────────────────────────────────────────

function safeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((t): t is string => typeof t === "string");
}

function extractFromPip(
  pipJson: Record<string, unknown> | null,
  fallbackProductName: string | null
): { productText: string; niceToHave: string[] } {
  if (!pipJson) {
    return { productText: fallbackProductName ?? "", niceToHave: [] };
  }

  // Support both v2 (MergedAttr: { value }) and v1 (plain string) product name fields
  const productNode = (pipJson.product as Record<string, unknown> | undefined)?.name;
  const rawAttrValue = (productNode as Record<string, unknown> | undefined)?.value;
  const productText: string =
    typeof rawAttrValue === "string" ? rawAttrValue
    : typeof productNode === "string" ? productNode
    : fallbackProductName ?? "";

  const mc = pipJson.match_config as Record<string, unknown> | undefined;
  const niceToHave = safeStringArray(mc?.nice_to_have);

  return { productText, niceToHave };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runMatchV3(requestId: string): Promise<RunMatchV3Result> {
  // Fetch v2 image PIP and sourcing_request in parallel.
  const [pipResult, srResult] = await Promise.all([
    supabaseAdmin
      .from("pips")
      .select("data_json")
      .eq("sourcing_request_id", requestId)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .maybeSingle(),
    supabaseAdmin
      .from("sourcing_requests")
      .select("intent_json, product_name")
      .eq("id", requestId)
      .single(),
  ]);

  if (srResult.error) throw new Error(srResult.error.message);

  const pipJson =
    (pipResult.data?.data_json as Record<string, unknown> | null) ??
    (srResult.data?.intent_json as Record<string, unknown> | null) ??
    null;

  const { productText, niceToHave } = extractFromPip(
    pipJson,
    srResult.data?.product_name as string | null
  );

  const embedString = buildRequestEmbedString(productText, niceToHave);

  // Embed with input_type "query" (asymmetric vs supplier "document" embeddings).
  // Returns null if Voyage is down — SQL uses neutral pts_vector=10, never throws.
  const requestEmbedding = embedString.trim().length > 1
    ? await embedText(embedString, "query")
    : null;

  // All constraint derivation (kosher hierarchy, temperature, channel, organic, halal)
  // happens inside the match_v3 SQL function via the pip_c CTE.
  const { data, error } = await supabaseAdmin.rpc("match_v3", {
    request_uuid: requestId,
    limit_n:      30,
    request_emb:  requestEmbedding,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MatchV3Row[];
  if (rows.length === 0) return { inserted: 0, topScore: 0, matches: [] };

  // Keep best-scoring product per supplier
  const bestPerSupplier = new Map<string, MatchV3Row>();
  for (const row of rows) {
    const existing = bestPerSupplier.get(row.supplier_id);
    if (!existing || row.score > existing.score) {
      bestPerSupplier.set(row.supplier_id, row);
    }
  }

  const top = Array.from(bestPerSupplier.values()).sort((a, b) => b.score - a.score);

  await supabaseAdmin.from("sourcing_matches").upsert(
    top.map((m) => ({
      request_id:       requestId,
      supplier_id:      m.supplier_id,
      match_score:      Math.round(m.score),
      product_name:     m.product_name,
      company_name:     m.company_name,
      country:          m.country,
      match_summary:    m.summary,
      match_breakdown:  m.breakdown,
      status:           "suggested",
    })),
    { onConflict: "request_id,supplier_id" }
  );

  await supabaseAdmin
    .from("sourcing_requests")
    .update({
      match_count:       top.length,
      best_match_score:  Math.round(top[0].score),
      last_matched_at:   new Date().toISOString(),
      status:            "matched",
    })
    .eq("id", requestId);

  return {
    inserted: top.length,
    topScore: Math.round(top[0].score),
    matches:  top,
  };
}

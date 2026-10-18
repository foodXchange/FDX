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
    kosher_status?: "certified" | "not_listed" | "unknown";
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
  if (token.startsWith("category:")) return null; // UUID — not a descriptor
  if (token.startsWith("kosher:")) return null; // hard constraint
  if (token.startsWith("channel:")) return null; // hard constraint
  for (const prefix of SOFT_PREFIXES) {
    if (token.startsWith(prefix)) return token.slice(prefix.length).trim();
  }
  return token;
}

export function buildRequestEmbedString(
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

export type RequestFallbackFields = {
  productName: string | null;
  category: string | null;
  message: string | null;
};

function composeFallbackText(fallback: RequestFallbackFields): string {
  return [fallback.productName, fallback.category, fallback.message]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 1)
    .join(". ");
}

export function extractFromPip(
  pipJson: Record<string, unknown> | null,
  fallback: RequestFallbackFields
): { productText: string; niceToHave: string[] } {
  const composedFallback = composeFallbackText(fallback);

  if (!pipJson) {
    return { productText: composedFallback, niceToHave: [] };
  }

  const productNode = (pipJson.product as Record<string, unknown> | undefined)?.name;
  const rawAttrValue = (productNode as Record<string, unknown> | undefined)?.value;
  const pipProductName: string =
    typeof rawAttrValue === "string"
      ? rawAttrValue
      : typeof productNode === "string"
        ? productNode
        : "";

  const rawDescription = (pipJson.product as Record<string, unknown> | undefined)
    ?.raw_description;
  const pipRawDescription = typeof rawDescription === "string" ? rawDescription : "";

  const productText =
    pipProductName.trim().length > 1
      ? pipProductName
      : pipRawDescription.trim().length > 1
        ? pipRawDescription
        : composedFallback;

  const mc = pipJson.match_config as Record<string, unknown> | undefined;
  const niceToHave = safeStringArray(mc?.nice_to_have);

  return { productText, niceToHave };
}

// ── Cosine Similarity & Product-Noun Precision Reranker ──────────────────────

const STOP_WORDS = new Set([
  "similar",
  "product",
  "products",
  "looking",
  "source",
  "sourcing",
  "private",
  "label",
  "kosher",
  "chief",
  "rabbinate",
  "badatz",
  "mehadrin",
  "certification",
  "certified",
  "bottle",
  "plastic",
  "glass",
  "catering",
  "retail",
  "foodservice",
  "pack",
  "packaging",
  "size",
  "sizes",
  "tons",
  "year",
  "approx",
  "approximately",
  "under",
  "supplier",
  "brand",
  "with",
  "from",
  "shufersal",
  "yochananof",
  "taaman",
  "proplus",
  "rami",
  "levy",
]);

function extractCoreKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    )
  ).slice(0, 6);
}

function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      return JSON.parse(raw) as number[];
    } catch {
      return null;
    }
  }
  return null;
}

function cosineSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0.5;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? Math.max(0, Math.min(1, dot / denom)) : 0.5;
}

async function runFastCategoryAndKeywordHybridMatch(opts: {
  categoryId: string | null;
  categoryText: string | null;
  productText: string;
  privateLabelRequired: boolean | null;
  kosherRequired: boolean;
  reqFormats: string[];
  requestEmbedding: number[] | null;
  limitN: number;
}): Promise<MatchV3Row[]> {
  const coreKeywords = extractCoreKeywords(opts.productText);
  const primaryNoun = coreKeywords[0] ?? "";

  type CandidateProduct = {
    id: string;
    product_name: string;
    category: string | null;
    category_id: string | null;
    formats: string[] | null;
    certifications: string[] | null;
    kosher_types: string[] | null;
    kosher_level: string | null;
    private_label: boolean | null;
    manually_verified: boolean | null;
    embedding: unknown;
    supplier_id: string;
    supplier: {
      id: string;
      company_name: string;
      country_of_origin: string | null;
      verified: boolean | null;
      israeli_market_fit: string | null;
      certifications: string[] | null;
      status: string | null;
    } | null;
  };

  const selectCols =
    "id, product_name, category, category_id, formats, certifications, kosher_types, kosher_level, private_label, manually_verified, embedding, supplier_id, supplier:supplier_offerings!inner(id, company_name, country_of_origin, verified, israeli_market_fit, certifications, status)";

  const queries = [];

  // 1. Direct keyword matches on product_name across top core nouns (ensures exact product matches like "Mayonnaise" or "Sunflower Oil" are ALWAYS captured)
  const topNouns = coreKeywords.filter((k) => k.length >= 3).slice(0, 3);
  if (topNouns.length > 0) {
    let qNoun = supabaseAdmin
      .from("supplier_products")
      .select(selectCols)
      .eq("supplier.status", "approved")
      .eq("needs_review", false)
      .or(topNouns.map((k) => `product_name.ilike.%${k}%`).join(","));
    if (opts.privateLabelRequired === true) {
      qNoun = qNoun.eq("private_label", true);
    }
    queries.push(qNoun.limit(300));
  }

  // 2. Category UUID matches
  if (opts.categoryId) {
    let qCat = supabaseAdmin
      .from("supplier_products")
      .select(selectCols)
      .eq("supplier.status", "approved")
      .eq("needs_review", false)
      .eq("category_id", opts.categoryId);
    if (opts.privateLabelRequired === true) {
      qCat = qCat.eq("private_label", true);
    }
    queries.push(qCat.limit(400));
  } else if (opts.categoryText) {
    let qCatText = supabaseAdmin
      .from("supplier_products")
      .select(selectCols)
      .eq("supplier.status", "approved")
      .eq("needs_review", false)
      .ilike("category", `%${opts.categoryText}%`);
    if (opts.privateLabelRequired === true) {
      qCatText = qCatText.eq("private_label", true);
    }
    queries.push(qCatText.limit(300));
  }

  if (queries.length === 0) return [];
  const results = await Promise.all(queries);
  const candidateMap = new Map<string, CandidateProduct>();
  for (const res of results) {
    for (const row of (res.data ?? []) as unknown as CandidateProduct[]) {
      candidateMap.set(row.id, row);
    }
  }

  const candidates = Array.from(candidateMap.values());
  const scored: MatchV3Row[] = [];

  for (const c of candidates) {
    const sup = Array.isArray(c.supplier) ? c.supplier[0] : c.supplier;
    if (!sup) continue;

    const nameLower = c.product_name.toLowerCase();
    const nounHits = coreKeywords.filter((kw) => nameLower.includes(kw)).length;

    // pts_category (up to 35) + product noun alignment
    let ptsCategory = 18;
    if (opts.categoryId && c.category_id === opts.categoryId) {
      ptsCategory = nounHits > 0 ? 35 : 26;
    } else if (nounHits > 0) {
      ptsCategory = 32;
    }

    // pts_vector (up to 40)
    const prodVec = parseVector(c.embedding);
    let ptsVector = 20;
    if (opts.requestEmbedding && prodVec) {
      const sim = cosineSimilarity(opts.requestEmbedding, prodVec);
      ptsVector = Math.round(sim * 40 * 100) / 100;
    }
    if (nounHits >= 2) ptsVector = Math.min(40, ptsVector + 5);
    else if (nounHits === 1) ptsVector = Math.min(40, ptsVector + 3);

    // pts_format (up to 15)
    const prodFormats = (c.formats ?? []).map((f) => f.toLowerCase());
    let ptsFormat = 8;
    if (opts.reqFormats.length > 0) {
      const hasFormatHit = opts.reqFormats.some((rf) => {
        const rfLower = rf.toLowerCase();
        return (
          prodFormats.some((pf) => pf.includes(rfLower) || rfLower.includes(pf)) ||
          nameLower.includes(rfLower)
        );
      });
      ptsFormat = hasFormatHit ? 15 : 4;
    }

    // pts_compliance (up to 10)
    const kosherTypes = c.kosher_types ?? [];
    const hasKosher =
      kosherTypes.length > 0 ||
      c.kosher_level === "regular" ||
      c.kosher_level === "mehadrin" ||
      c.kosher_level === "badatz";
    const ptsCompliance = opts.kosherRequired ? (hasKosher ? 10 : 0) : 5;

    // pts_evidence (up to 10)
    const ptsEvidence =
      (sup.verified ? 4 : 0) +
      (c.manually_verified ? 3 : 0) +
      (sup.israeli_market_fit ? 2 : 0) +
      ((sup.certifications ?? []).length > 0 ? 1 : 0);

    const totalScore = ptsCategory + ptsVector + ptsFormat + ptsCompliance + ptsEvidence;

    const kosherStatus: "certified" | "not_listed" | "unknown" =
      c.kosher_level === "regular" || c.kosher_level === "mehadrin" || c.kosher_level === "badatz"
        ? "certified"
        : c.kosher_level === "none"
          ? "not_listed"
          : "unknown";

    scored.push({
      supplier_id: sup.id,
      product_id: c.id,
      product_name: c.product_name,
      company_name: sup.company_name,
      country: sup.country_of_origin,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        category: ptsCategory,
        vector: ptsVector,
        format: ptsFormat,
        compliance: ptsCompliance,
        evidence: ptsEvidence,
        kosher_status: kosherStatus,
      },
      summary: `${sup.company_name}${sup.country_of_origin ? ` · ${sup.country_of_origin}` : ""}`,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, opts.limitN);
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
      .select("intent_json, product_name, category, message, private_label, certifications, packaging_preference, embedding")
      .eq("id", requestId)
      .single(),
  ]);

  if (srResult.error) throw new Error(srResult.error.message);

  const pipJson =
    (pipResult.data?.data_json as Record<string, unknown> | null) ??
    (srResult.data?.intent_json as Record<string, unknown> | null) ??
    null;

  const { productText, niceToHave } = extractFromPip(pipJson, {
    productName: (srResult.data?.product_name as string | null) ?? null,
    category: (srResult.data?.category as string | null) ?? null,
    message: (srResult.data?.message as string | null) ?? null,
  });

  const embedString = buildRequestEmbedString(productText, niceToHave);

  // Reuse existing stored embedding if present, otherwise generate with Voyage AI ("query")
  let requestEmbedding: number[] | null = parseVector(srResult.data?.embedding);
  if (!requestEmbedding && embedString.trim().length > 1) {
    requestEmbedding = await embedText(embedString, "query");
    if (requestEmbedding) {
      const { error: embErr } = await supabaseAdmin
        .from("sourcing_requests")
        .update({ embedding: requestEmbedding as unknown as string })
        .eq("id", requestId);
      if (embErr) {
        console.error("[runMatchV3] failed to store request embedding:", embErr.message);
      }
    }
  }

  const pipCategoryNode = pipJson?.category as Record<string, unknown> | undefined;
  const rawCatId =
    (pipCategoryNode?.category_id as Record<string, unknown> | undefined)?.value ??
    pipCategoryNode?.category_id;
  const resolvedCategoryId = typeof rawCatId === "string" && rawCatId.length > 10 ? rawCatId : null;

  const reqFormats: string[] = [];
  if (typeof srResult.data?.packaging_preference === "string" && srResult.data.packaging_preference) {
    reqFormats.push(srResult.data.packaging_preference);
  }

  // Run fast category + keyword + Voyage AI vector hybrid scorer (~120ms)
  const fastRows = await runFastCategoryAndKeywordHybridMatch({
    categoryId: resolvedCategoryId,
    categoryText: (srResult.data?.category as string | null) ?? null,
    productText,
    privateLabelRequired: (srResult.data?.private_label as boolean | null) ?? null,
    kosherRequired: Array.isArray(srResult.data?.certifications) && srResult.data.certifications.length > 0,
    reqFormats,
    requestEmbedding,
    limitN: 30,
  });

  // Apply product-noun boost so exact product matches rank #1
  const coreKeywords = extractCoreKeywords(productText);
  const combined = fastRows.map((row) => {
    const prodLower = row.product_name.toLowerCase();
    const hitCount = coreKeywords.filter((kw) => prodLower.includes(kw)).length;
    const nounBonus = hitCount >= 2 ? 8 : hitCount === 1 ? 5 : 0;
    return {
      ...row,
      score: row.score + nounBonus,
    };
  });

  if (combined.length === 0) return { inserted: 0, topScore: 0, matches: [] };

  // Keep best-scoring product per supplier
  const bestPerSupplier = new Map<string, MatchV3Row>();
  for (const row of combined) {
    const existing = bestPerSupplier.get(row.supplier_id);
    if (!existing || row.score > existing.score) {
      bestPerSupplier.set(row.supplier_id, row);
    }
  }

  const top = Array.from(bestPerSupplier.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  await supabaseAdmin
    .from("sourcing_matches")
    .delete()
    .eq("request_id", requestId);

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
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "request_id,supplier_id", ignoreDuplicates: false }
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

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
    temperature?: number;
    origin?: number;
    exclusion?: number;
    kosher_status?: "certified" | "not_listed" | "unknown";
    certifications?: string[];
    kosher_types?: string[];
    matched_certifications?: string[];
    cert_boost?: number;
    website?: string | null;
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
  niceToHave: string[],
  benchmarkBrand?: string | null
): string {
  const descriptors = niceToHave
    .map(stripSoftToken)
    .filter((t): t is string => t !== null && t.length > 0)
    .join(". ");

  const benchmarkPart = benchmarkBrand?.trim() ? `Benchmarked against ${benchmarkBrand.trim()}` : "";

  const parts = [productText.trim(), benchmarkPart, descriptors]
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
  layeredProducts?: Array<{
    product_name?: string;
    sub_type?: string;
    packaging_format?: string;
    brand_name?: string;
  }> | null;
};

function composeFallbackText(fallback: RequestFallbackFields): string {
  const skuParts: string[] = [];
  if (fallback.layeredProducts && fallback.layeredProducts.length > 0) {
    for (const p of fallback.layeredProducts) {
      const desc = [p.sub_type, p.product_name]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .join(" ");
      if (desc) skuParts.push(desc);
    }
  }
  const parts = [...skuParts, fallback.productName, fallback.category, fallback.message];
  return parts
    .filter((v): v is string => typeof v === "string" && v.trim().length > 1)
    .join(". ");
}

export function extractFromPip(
  pipJson: Record<string, unknown> | null,
  fallback: RequestFallbackFields
): { productText: string; niceToHave: string[] } {
  const composedFallback = composeFallbackText(fallback);

  const layerSkus = (fallback.layeredProducts || [])
    .map((p) =>
      [p.product_name, p.sub_type, p.brand_name]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .join(" ")
    )
    .filter((s) => s.length > 0)
    .join(". ");

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

  const baseText =
    pipProductName.trim().length > 1
      ? pipProductName
      : pipRawDescription.trim().length > 1
        ? pipRawDescription
        : composedFallback;

  const productText = [baseText, layerSkus].filter((s) => s.length > 0).join(". ");

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
  // Dietary & general non-noun descriptors (scored via compliance/dietary boost instead)
  "free",
  "sugar",
  "gluten",
  "keto",
  "organic",
  "vegan",
  "natural",
  "non",
  "gmo",
  "branded",
  "dietary",
  "item",
  "items",
  "seeking",
  "contact",
  "european",
  "israeli",
  "zero",
  "high",
  "low",
  // Brief template & commercial boilerplate words
  "target",
  "market",
  "israel",
  "buyer",
  "account",
  "foodxchange",
  "importer",
  "distributor",
  "commercial",
  "scope",
  "logistics",
  "requirements",
  "category",
  "confectionery",
  "benchmark",
  "reference",
  "brands",
  "branding",
  "model",
  "factory",
  "temperature",
  "regime",
  "chilled",
  "ambient",
  "frozen",
  "format",
  "shelf",
  "packs",
  "consolidated",
  "mixed",
  "container",
  "estimated",
  "volume",
  "order",
  "cadence",
  "month",
  "pallets",
  "required",
  "claims",
  "quality",
  "certifications",
  "friendly",
  "brc",
  "ifs",
  "lineup",
  "formulation",
  "specifications",
  "skus",
  "sku",
  "sub",
  "type",
  "stand",
  "pouch",
  "net",
  "weight",
  "unit",
  "added",
  "synthesis",
  "summary",
  "guidance",
  "premium",
  "packaged",
  "pouches",
  "matching",
  "carb",
  "http",
  "https",
  "www",
  "com",
  "choczero",
]);

function extractCoreKeywords(text: string): string[] {
  const withoutUrls = text.replace(/https?:\/\/\S+/gi, " ");
  return Array.from(
    new Set(
      withoutUrls
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
  reqCertifications: string[];
  reqFormats: string[];
  reqTemperature?: string | null;
  reqPreferredOrigins?: string[];
  reqExcludedIngredients?: string[];
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
    temperature: string | null;
    is_gluten_free: boolean | null;
    is_sugar_free: boolean | null;
    is_organic: boolean | null;
    is_halal: boolean | null;
    private_label: boolean | null;
    manually_verified: boolean | null;
    embedding: unknown;
    supplier_id: string;
    supplier: {
      id: string;
      company_name: string;
      country_of_origin: string | null;
      website?: string | null;
      verified: boolean | null;
      israeli_market_fit: string | null;
      certifications: string[] | null;
      kosher_types?: string[] | null;
      status: string | null;
    } | null;
  };

  const selectCols =
    "id, product_name, category, category_id, formats, certifications, kosher_types, kosher_level, temperature, is_gluten_free, is_sugar_free, is_organic, is_halal, private_label, manually_verified, embedding, supplier_id, supplier:supplier_offerings!inner(id, company_name, country_of_origin, website, verified, israeli_market_fit, certifications, kosher_types, status)";

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

  // 3. Dedicated Dietary / Sugar-Free / Keto / Gluten-Free candidate retrieval
  // Ensures specialized functional producers (even if categorized under "Snacks" or "Other") are never cut off by limit(300)
  const reqCertLower = opts.reqCertifications.map((c) => c.toLowerCase());
  const wantsSugarFreeOrKeto = reqCertLower.some((c) => c.includes("sugar") || c.includes("keto"));
  const wantsGlutenFree = reqCertLower.some((c) => c.includes("gluten"));

  if (wantsSugarFreeOrKeto) {
    let qFunctional = supabaseAdmin
      .from("supplier_products")
      .select(selectCols)
      .eq("supplier.status", "approved")
      .eq("needs_review", false)
      .or(
        "is_sugar_free.eq.true,product_name.ilike.%sugar%,product_name.ilike.%keto%,product_name.ilike.%zusto%,product_name.ilike.%zùsto%,product_name.ilike.%stevia%"
      );
    if (opts.privateLabelRequired === true) {
      qFunctional = qFunctional.eq("private_label", true);
    }
    queries.push(qFunctional.limit(300));
  } else if (wantsGlutenFree) {
    let qGf = supabaseAdmin
      .from("supplier_products")
      .select(selectCols)
      .eq("supplier.status", "approved")
      .eq("needs_review", false)
      .eq("is_gluten_free", true);
    if (opts.privateLabelRequired === true) {
      qGf = qGf.eq("private_label", true);
    }
    queries.push(qGf.limit(250));
  }

  if (queries.length === 0) return [];
  const results = await Promise.all(queries);
  const candidateMap = new Map<string, CandidateProduct>();
  const queryErrors: string[] = [];

  for (const res of results) {
    if (res.error) {
      queryErrors.push(res.error.message);
    }
    for (const row of (res.data ?? []) as unknown as CandidateProduct[]) {
      candidateMap.set(row.id, row);
    }
  }

  if (candidateMap.size === 0 && queryErrors.length > 0) {
    throw new Error(`Candidate query failed: ${queryErrors.join("; ")}`);
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

    // ── Dietary & Audit Certifications Match & Beneficial Boost ──────────
    // Non-mandatory: Never excludes or penalizes uncertified candidates.
    // Candidates possessing requested tags receive beneficial score bonuses.
    const prodCerts = (c.certifications ?? []).map((x: string) => String(x).trim());
    const supCerts = (sup.certifications ?? []).map((x: string) => String(x).trim());
    const allCerts = Array.from(new Set([...prodCerts, ...supCerts]));
    const prodKosher = (c.kosher_types ?? []).map((x: string) => String(x).trim());
    const supKosher = (sup.kosher_types ?? []).map((x: string) => String(x).trim());
    const allKosher = Array.from(new Set([...prodKosher, ...supKosher]));

    const textCorpus = [
      c.product_name,
      ...allCerts,
      ...allKosher,
      c.kosher_level ?? "",
    ].join(" ").toLowerCase();

    const matchedCertifications: string[] = [];

    for (const tag of opts.reqCertifications) {
      const tagLower = tag.toLowerCase().trim();
      if (!tagLower) continue;

      let isHit = false;

      // Kosher variants
      if (tagLower.includes("badatz")) {
        isHit =
          c.kosher_level === "badatz" ||
          allKosher.some((k) => k.toLowerCase().includes("badatz")) ||
          textCorpus.includes("badatz");
      } else if (tagLower.includes("kosher") || tagLower.includes("rabbinate")) {
        isHit =
          c.kosher_level === "regular" ||
          c.kosher_level === "mehadrin" ||
          c.kosher_level === "badatz" ||
          allKosher.length > 0 ||
          textCorpus.includes("kosher") ||
          textCorpus.includes("kasher") ||
          textCorpus.includes("casher") ||
          textCorpus.includes("mehadrin") ||
          textCorpus.includes("rabbinate") ||
          textCorpus.includes("ou") ||
          textCorpus.includes("star-k") ||
          textCorpus.includes("badatz");
      }
      // Food safety audit certs
      else if (tagLower === "brc") {
        isHit = allCerts.some((ct) => ct.toLowerCase().includes("brc")) || textCorpus.includes("brc");
      } else if (tagLower === "ifs") {
        isHit = allCerts.some((ct) => ct.toLowerCase().includes("ifs")) || textCorpus.includes("ifs");
      }
      // Dietary attributes
      else if (tagLower.includes("gluten")) {
        isHit =
          textCorpus.includes("gluten free") ||
          textCorpus.includes("gluten-free") ||
          textCorpus.includes("senza glutine") ||
          textCorpus.includes("sin gluten") ||
          Boolean((c as Record<string, unknown>).is_gluten_free);
      } else if (tagLower.includes("sugar")) {
        isHit =
          textCorpus.includes("sugar free") ||
          textCorpus.includes("sugar-free") ||
          textCorpus.includes("no sugar") ||
          textCorpus.includes("no added sugar") ||
          textCorpus.includes("0% added sugar") ||
          textCorpus.includes("0g sugar") ||
          textCorpus.includes("without added sugar") ||
          textCorpus.includes("without sugar") ||
          textCorpus.includes("reduced sugar") ||
          textCorpus.includes("zero sugar") ||
          textCorpus.includes("zuckerfrei") ||
          textCorpus.includes("senza zucchero") ||
          textCorpus.includes("sin azucar") ||
          textCorpus.includes("sans sucre") ||
          textCorpus.includes("zusto") ||
          textCorpus.includes("zùsto") ||
          Boolean((c as Record<string, unknown>).is_sugar_free);
      } else if (tagLower.includes("organic")) {
        isHit =
          textCorpus.includes("organic") ||
          textCorpus.includes("bio") ||
          textCorpus.includes("biologico") ||
          textCorpus.includes("ecologico") ||
          textCorpus.includes("organico");
      } else if (tagLower.includes("vegan")) {
        isHit = textCorpus.includes("vegan") || textCorpus.includes("plant-based");
      } else if (tagLower.includes("keto")) {
        isHit = textCorpus.includes("keto");
      } else if (tagLower.includes("non-gmo") || tagLower.includes("gmo")) {
        isHit = textCorpus.includes("non-gmo") || textCorpus.includes("gmo free") || textCorpus.includes("no gmo");
      } else {
        // Fallback generic tag matching
        isHit = allCerts.some((ct) => ct.toLowerCase().includes(tagLower)) || textCorpus.includes(tagLower);
      }

      if (isHit) {
        matchedCertifications.push(tag);
      }
    }

    // pts_compliance: Baseline 5 points (NON-MANDATORY - never penalizes to 0).
    // Plus beneficial boost: +4 points per matched requested tag (up to +15 bonus points)
    const certBooster = Math.min(15, matchedCertifications.length * 4);
    const ptsCompliance = 5 + certBooster;

    // ── Functional Formulation & Product Form Alignment ─────────────────
    // When buyer explicitly requests Sugar-Free or Keto, reward actual Sugar-Free/Keto
    // formulations and penalize conventional sugary items so audit certs alone cannot outrank
    // true dietary formulation matches.
    let formulationAdjustment = 0;
    const matchedLower = matchedCertifications.map((m) => m.toLowerCase());
    const hasSugarFreeHit = matchedLower.some((m) => m.includes("sugar"));
    const hasKetoHit = matchedLower.some((m) => m.includes("keto"));
    if (wantsSugarFreeOrKeto) {
      if (hasSugarFreeHit) formulationAdjustment += 8;
      if (hasKetoHit) formulationAdjustment += 6;
      if (!hasSugarFreeHit && !hasKetoHit) {
        formulationAdjustment -= 10;
      }
    }

    // Form-factor precision: when sourcing solid chocolate (bark, bar, tablet),
    // penalize spreads, peanut butter, muffins, cookies, biscuits, wafers, and beverage powders.
    const reqTextLower = opts.productText.toLowerCase();
    const wantsSolidChocolate =
      (reqTextLower.includes("bark") || reqTextLower.includes("chocolate bar") || reqTextLower.includes("tablet")) &&
      !reqTextLower.includes("spread") &&
      !reqTextLower.includes("cookie") &&
      !reqTextLower.includes("muffin") &&
      !reqTextLower.includes("wafer");

    if (wantsSolidChocolate) {
      if (
        nameLower.includes("spread") ||
        nameLower.includes("peanut butter") ||
        nameLower.includes("muffin") ||
        nameLower.includes("cookie") ||
        nameLower.includes("biscuit") ||
        nameLower.includes("wafer") ||
        nameLower.includes("powder") ||
        nameLower.includes("drinking") ||
        nameLower.includes("beverage") ||
        nameLower.includes("syrup") ||
        nameLower.includes("granola")
      ) {
        formulationAdjustment -= 14;
      } else if (
        nameLower.includes("bar") ||
        nameLower.includes("bark") ||
        nameLower.includes("tablet") ||
        nameLower.includes("chocolate")
      ) {
        formulationAdjustment += 5;
      }
    }

    // pts_evidence (up to 10)
    // Global GFSI / Food safety audit cert presence gives +2 points confidence
    const hasAuditedCert = allCerts.some((ct) => {
      const ctl = ct.toLowerCase();
      return (
        ctl.includes("brc") ||
        ctl.includes("ifs") ||
        ctl.includes("fssc") ||
        ctl.includes("iso 22000") ||
        ctl.includes("haccp")
      );
    });

    const ptsEvidence =
      (sup.verified ? 4 : 0) +
      (c.manually_verified ? 3 : 0) +
      (sup.israeli_market_fit ? 2 : 0) +
      (hasAuditedCert ? 2 : allCerts.length > 0 ? 1 : 0);

    // Temperature regime bonus/penalty
    let tempBonus = 0;
    if (opts.reqTemperature && c.temperature) {
      if (opts.reqTemperature.toLowerCase() === c.temperature.toLowerCase()) {
        tempBonus = 5;
      } else if (
        (opts.reqTemperature.toLowerCase() === "frozen" && c.temperature.toLowerCase() !== "frozen") ||
        (opts.reqTemperature.toLowerCase() !== "frozen" && c.temperature.toLowerCase() === "frozen")
      ) {
        tempBonus = -15; // Incompatible cold-chain
      }
    }

    // Preferred origins bonus/penalty
    let originBonus = 0;
    if (opts.reqPreferredOrigins && opts.reqPreferredOrigins.length > 0) {
      const supCountry = (sup.country_of_origin ?? "").toLowerCase().trim();
      const isPreferred = opts.reqPreferredOrigins.some((po) => {
        const poLower = po.toLowerCase().trim();
        return (
          supCountry === poLower ||
          (poLower.length >= 2 && supCountry.includes(poLower)) ||
          (supCountry.length >= 2 && poLower.includes(supCountry))
        );
      });
      originBonus = isPreferred ? 8 : -5;
    }

    // Excluded ingredients penalty
    let exclusionPenalty = 0;
    if (opts.reqExcludedIngredients && opts.reqExcludedIngredients.length > 0) {
      const fullText = `${c.product_name} ${textCorpus}`.toLowerCase();
      const hasExcluded = opts.reqExcludedIngredients.some((ex) => {
        const exLower = ex.toLowerCase().trim();
        return exLower.length >= 3 && fullText.includes(exLower);
      });
      if (hasExcluded) {
        exclusionPenalty = -30; // Heavy penalty for containing an excluded ingredient
      }
    }

    const totalScore = Math.max(
      0,
      Math.min(
        99,
        ptsCategory +
          ptsVector +
          ptsFormat +
          ptsCompliance +
          ptsEvidence +
          tempBonus +
          originBonus +
          exclusionPenalty +
          formulationAdjustment
      )
    );

    const hasKosher =
      allKosher.length > 0 ||
      c.kosher_level === "regular" ||
      c.kosher_level === "mehadrin" ||
      c.kosher_level === "badatz" ||
      textCorpus.includes("kosher") ||
      textCorpus.includes("kasher");

    const kosherStatus: "certified" | "not_listed" | "unknown" =
      c.kosher_level === "regular" || c.kosher_level === "mehadrin" || c.kosher_level === "badatz"
        ? "certified"
        : hasKosher
          ? "certified"
          : c.kosher_level === "none"
            ? "not_listed"
            : "unknown";

    let summaryExtra =
      matchedCertifications.length > 0
        ? ` · ⭐ Boosted: ${matchedCertifications.join(", ")}`
        : "";
    if (originBonus > 0) summaryExtra += " · 🌍 Preferred Origin";
    if (exclusionPenalty < 0) summaryExtra += " · ⚠️ Excluded Ingredient";

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
        temperature: tempBonus,
        origin: originBonus,
        exclusion: exclusionPenalty,
        kosher_status: kosherStatus,
        certifications: allCerts,
        kosher_types: allKosher,
        matched_certifications: matchedCertifications,
        cert_boost: certBooster,
        website: sup.website ?? null,
      },
      summary: `${sup.company_name}${sup.country_of_origin ? ` · ${sup.country_of_origin}` : ""}${summaryExtra}`,
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
      .select("intent_json, product_name, category, message, private_label, certifications, packaging_preference, embedding, ai_analysis, temperature_regime, dietary_requirements, preferred_origins, excluded_ingredients")
      .eq("id", requestId)
      .single(),
  ]);

  if (srResult.error) throw new Error(srResult.error.message);

  const pipJson =
    (pipResult.data?.data_json as Record<string, unknown> | null) ??
    (srResult.data?.intent_json as Record<string, unknown> | null) ??
    null;

  const rawAiAnalysis = srResult.data?.ai_analysis as Record<string, unknown> | null;
  const layeredAnalysis = rawAiAnalysis?.layered_analysis as Record<string, unknown> | undefined;
  const layeredProducts = (layeredAnalysis?.products as any[]) || [];

  const benchmarkBrand =
    (rawAiAnalysis?.benchmark_brand as string | undefined) ||
    (rawAiAnalysis?.brand as string | undefined) ||
    layeredProducts[0]?.brand_name ||
    null;

  const { productText, niceToHave } = extractFromPip(pipJson, {
    productName: (srResult.data?.product_name as string | null) ?? null,
    category: (srResult.data?.category as string | null) ?? null,
    message: (srResult.data?.message as string | null) ?? null,
    layeredProducts,
  });

  const embedString = buildRequestEmbedString(productText, niceToHave, benchmarkBrand);

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
  for (const lp of layeredProducts) {
    if (typeof lp.packaging_format === "string" && lp.packaging_format.trim()) {
      reqFormats.push(lp.packaging_format.trim());
    }
  }

  const reqCertifications: string[] = Array.isArray(srResult.data?.certifications)
    ? (srResult.data.certifications as string[])
    : [];

  const srDietary = Array.isArray((srResult.data as any)?.dietary_requirements)
    ? ((srResult.data as any).dietary_requirements as string[])
    : [];
  const combinedCertAndDietary = Array.from(new Set([...reqCertifications, ...srDietary]));

  const reqTemperature =
    ((srResult.data as any)?.temperature_regime as string | null) ||
    ((rawAiAnalysis?.layered_analysis as Record<string, unknown> | undefined)?.shared_dna as any)?.temperature_regime ||
    null;

  const reqPreferredOrigins: string[] = Array.isArray((srResult.data as any)?.preferred_origins)
    ? ((srResult.data as any).preferred_origins as string[])
    : [];

  const reqExcludedIngredients: string[] = Array.isArray((srResult.data as any)?.excluded_ingredients)
    ? ((srResult.data as any).excluded_ingredients as string[])
    : [];

  // Run fast category + keyword + Voyage AI vector hybrid scorer (~120ms)
  const fastRows = await runFastCategoryAndKeywordHybridMatch({
    categoryId: resolvedCategoryId,
    categoryText: (srResult.data?.category as string | null) ?? null,
    productText,
    privateLabelRequired: (srResult.data?.private_label as boolean | null) ?? null,
    reqCertifications: combinedCertAndDietary,
    reqFormats,
    reqTemperature,
    reqPreferredOrigins,
    reqExcludedIngredients,
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
      score: Math.min(99, Math.round((row.score + nounBonus) * 100) / 100),
    };
  });

  if (combined.length === 0) return { inserted: 0, topScore: 0, matches: [] };

  // Keep best-scoring product per supplier (deduplicating by supplier_id, normalized company_name, and website domain)
  const bestPerSupplier = new Map<string, MatchV3Row>();
  const seenDomains = new Map<string, string>();
  for (const row of combined) {
    let cleanCompany = row.company_name;
    if (/^https?:\/\//i.test(cleanCompany)) {
      try {
        const host = new URL(cleanCompany).hostname.replace(/^www\./i, "").split(".")[0];
        cleanCompany = host.charAt(0).toUpperCase() + host.slice(1);
      } catch {}
    }
    const normalizedRow: MatchV3Row = { ...row, company_name: cleanCompany };

    let domainKey = "";
    if (row.breakdown.website) {
      try {
        const rawW = /^https?:\/\//i.test(row.breakdown.website)
          ? row.breakdown.website
          : `https://${row.breakdown.website}`;
        domainKey = new URL(rawW).hostname.replace(/^www\./i, "").toLowerCase();
      } catch {}
    }

    const nameKey = cleanCompany ? cleanCompany.trim().toLowerCase() : row.supplier_id;
    const dedupKey = (domainKey && seenDomains.get(domainKey)) || nameKey;
    if (domainKey && !seenDomains.has(domainKey)) {
      seenDomains.set(domainKey, dedupKey);
    }

    const existing = bestPerSupplier.get(dedupKey);
    if (!existing || normalizedRow.score > existing.score) {
      bestPerSupplier.set(dedupKey, normalizedRow);
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

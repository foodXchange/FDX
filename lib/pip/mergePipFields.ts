import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1Full, type PipV1, type SourcingRequestInput } from "@/lib/pip/buildPipV1";
import type { ImageExtraction, MergedAttr, PipV2DataJson } from "@/lib/pip/pipTypes";

// ── Confidence gates (placeholders — tune from match-outcome data) ──
const AUTO_FILL_GATE = 0.75;  // image field written to data_json
const PROMOTION_GATE = 0.85;  // image field promoted to must_have/dealbreakers

// ── Controlled vocabularies ──
const PROCESSING_STATES   = ["raw", "semi_processed", "processed", "ready_to_eat", "frozen"] as const;
const FORMATS             = ["bottle", "can", "pouch", "jar", "box", "bag", "tray", "bulk", "other"] as const;
const PACKAGINGS          = ["retail", "foodservice", "bulk", "gift", "other"] as const;
const TEMPERATURE_REGIMES = ["ambient", "chilled", "frozen"] as const;
const ALLERGEN_PROFILE    = ["gluten", "dairy", "nuts", "soy", "eggs", "fish", "shellfish", "sesame", "mustard", "celery", "sulphites"] as const;

function inVocab<T extends string>(value: string | null | undefined, vocab: readonly T[]): T | null {
  if (!value) return null;
  const norm = value.toLowerCase().trim() as T;
  return (vocab as readonly string[]).includes(norm) ? norm : null;
}

// ── MergedAttr constructors ──
function fromText(value: unknown): MergedAttr {
  return { value, source: "text", status: "observed", confidence: 1.0, evidence: null };
}

function fromImage(attr: { value: unknown; status: "observed" | "inferred" | "unknown"; confidence: number; evidence: string | null }): MergedAttr {
  return {
    value: attr.value,
    source: "image",
    status: attr.status,
    confidence: attr.confidence,
    evidence: attr.evidence ?? `image extraction (confidence ${attr.confidence})`,
  };
}

function conflictAttr(textVal: unknown, imgAttr: { value: unknown; confidence: number; evidence: string | null }): MergedAttr {
  return {
    value: { text: textVal, image: imgAttr.value },
    source: "merged",
    status: "observed",
    confidence: Math.min(1.0, imgAttr.confidence),
    evidence: imgAttr.evidence ?? `conflicting text vs image (confidence ${imgAttr.confidence})`,
  };
}

// ── Best qualifying image attr for a scalar field ──
function bestImageAttr<T>(
  extractions: ImageExtraction[],
  pick: (ex: ImageExtraction) => { value: T | null; status: "observed" | "inferred" | "unknown"; confidence: number; evidence: string | null },
): { value: T | null; status: "observed" | "inferred" | "unknown"; confidence: number; evidence: string | null } | null {
  let best: { value: T | null; status: "observed" | "inferred" | "unknown"; confidence: number; evidence: string | null } | null = null;
  for (const ex of extractions) {
    const attr = pick(ex);
    if (attr.status === "observed" && attr.confidence >= AUTO_FILL_GATE) {
      if (!best || attr.confidence > best.confidence) best = attr;
    }
  }
  return best;
}

// ── Scalar merge (Rule 2 + Rule 5) ──
// Returns the merged attr and appends fieldName to conflicts[] if Rule 5 fired.
function mergeScalar(
  fieldName: string,
  textValue: unknown,
  bestImg: { value: unknown; status: "observed" | "inferred" | "unknown"; confidence: number; evidence: string | null } | null,
  conflicts: string[],
): MergedAttr {
  if (!bestImg || bestImg.value === null || bestImg.value === undefined) {
    return fromText(textValue);
  }
  const imgVal = bestImg.value;
  const textStr = String(textValue ?? "").toLowerCase().trim();
  const imgStr = String(imgVal).toLowerCase().trim();
  // Rule 5: both sides have non-null values that disagree
  if (textValue !== null && textValue !== undefined && textStr !== "" && imgStr !== "" && textStr !== imgStr) {
    conflicts.push(fieldName);
    return conflictAttr(textValue, bestImg);
  }
  // Rule 2: image wins
  return fromImage(bestImg);
}

// ── Set-valued union (Rule 3) ──
function mergeSet(
  textItems: string[],
  extractions: ImageExtraction[],
  pick: (ex: ImageExtraction) => { value: string[] | null; status: "observed" | "inferred" | "unknown"; confidence: number; evidence: string | null },
  vocab?: readonly string[],
): MergedAttr[] {
  const seen = new Map<string, MergedAttr>();

  // Text items first (Rule 4: text values always included)
  for (const item of textItems) {
    const v = vocab ? inVocab(item, vocab) : item;
    if (v && !seen.has(v)) seen.set(v, fromText(v));
  }

  // Image items (union, never overwrite existing text-sourced)
  for (const ex of extractions) {
    const attr = pick(ex);
    if (attr.status !== "observed" || attr.confidence < AUTO_FILL_GATE) continue;
    for (const raw of attr.value ?? []) {
      const v = vocab ? inVocab(raw, vocab) : raw;
      if (v && !seen.has(v)) {
        seen.set(v, fromImage({ value: v, status: attr.status, confidence: attr.confidence, evidence: attr.evidence }));
      }
    }
  }

  return [...seen.values()];
}

// ── Pure merge core ──
export function mergeTextAndImages(
  textPip: PipV1,
  imageExtractions: ImageExtraction[],
): { dataJson: PipV2DataJson; conflicts: string[] } {
  const conflicts: string[] = [];

  // ── category ──
  // category_id / category_name: image wins if observed + ≥0.75 (Rule 2)
  const bestCat = bestImageAttr(imageExtractions, (ex) => ({
    value: ex.category.value,
    status: ex.category.status,
    confidence: ex.category.confidence,
    evidence: ex.category.evidence,
  }));
  const bestCatName = bestImageAttr(imageExtractions, (ex) => ({
    value: ex.category.category_name,
    status: ex.category.status,
    confidence: ex.category.confidence,
    evidence: ex.category.evidence,
  }));

  const categoryId = mergeScalar("category.category_id", textPip.category.category_id, bestCat, conflicts);
  const categoryName = mergeScalar("category.category_name", textPip.category.category_name, bestCatName, conflicts);

  // ── specifications.formats[] (Rule 3 union, controlled vocab) ──
  const formats = mergeSet(
    textPip.specifications.formats,
    imageExtractions,
    (ex) => ({
      value: ex.format.value ? [ex.format.value] : [],
      status: ex.format.status,
      confidence: ex.format.confidence,
      evidence: ex.format.evidence,
    }),
    FORMATS,
  );

  // ── specifications.sizes[] (Rule 3 union — semi-critical, no strict vocab) ──
  const sizes = mergeSet(
    textPip.specifications.sizes,
    imageExtractions,
    (ex) => ({
      value: ex.size.value ? [ex.size.value] : [],
      status: ex.size.status,
      confidence: ex.size.confidence,
      evidence: ex.size.evidence,
    }),
  );

  // ── specifications.packaging (Rule 2, controlled vocab) ──
  const bestPkg = bestImageAttr(imageExtractions, (ex) => ({
    value: inVocab(ex.packaging.value, PACKAGINGS),
    status: ex.packaging.status,
    confidence: ex.packaging.confidence,
    evidence: ex.packaging.evidence,
  }));
  const packaging = mergeScalar(
    "specifications.packaging",
    inVocab(textPip.specifications.packaging, PACKAGINGS),
    bestPkg,
    conflicts,
  );

  // ── specifications.processing_state (Rule 2, controlled vocab) ──
  const bestPs = bestImageAttr(imageExtractions, (ex) => ({
    value: inVocab(ex.processing_state.value, PROCESSING_STATES),
    status: ex.processing_state.status,
    confidence: ex.processing_state.confidence,
    evidence: ex.processing_state.evidence,
  }));
  const processing_state = mergeScalar("specifications.processing_state", null, bestPs, conflicts);

  // ── specifications.temperature_regime (Rule 2, controlled vocab) ──
  const bestTemp = bestImageAttr(imageExtractions, (ex) => ({
    value: inVocab(ex.temperature_regime.value, TEMPERATURE_REGIMES),
    status: ex.temperature_regime.status,
    confidence: ex.temperature_regime.confidence,
    evidence: ex.temperature_regime.evidence,
  }));
  const temperature_regime = mergeScalar("specifications.temperature_regime", null, bestTemp, conflicts);

  // ── compliance.* — Rule 1: text always wins; image only adds nice_to_have hints ──
  const kosher_required = fromText(textPip.compliance.kosher_required);
  const kosher_types: MergedAttr[] = textPip.compliance.kosher_types.map(fromText);

  // Image kosher marks: only as nice_to_have hints (handled below in match_config)
  const imageKosherHints: string[] = [];
  for (const ex of imageExtractions) {
    const attr = ex.kosher_marks_visible;
    if (attr.status === "observed" && attr.confidence >= AUTO_FILL_GATE) {
      imageKosherHints.push(...(attr.value ?? []));
    }
  }

  const halal = fromText(textPip.compliance.halal);
  const organic = fromText(textPip.compliance.organic);

  // Image organic: nice_to_have hint only
  const imageOrganicHint = imageExtractions.some(
    (ex) => ex.organic_claim.status === "observed" && ex.organic_claim.confidence >= AUTO_FILL_GATE && ex.organic_claim.value === true
  );

  // certifications: Rule 3 union (text certs + image certs_visible)
  const certifications = mergeSet(
    textPip.compliance.certifications,
    imageExtractions,
    (ex) => ({
      value: ex.certifications_visible.value ?? [],
      status: ex.certifications_visible.status,
      confidence: ex.certifications_visible.confidence,
      evidence: ex.certifications_visible.evidence,
    }),
  );

  // allergen_profile: text-only (ImageExtraction has no direct allergen field)
  const allergen_profile: MergedAttr[] = [];

  // ── commercial.* — Rule 1: text always wins ──
  const private_label = fromText(textPip.commercial.private_label);
  const volume        = fromText(textPip.commercial.volume);
  const budget        = fromText(textPip.commercial.budget);
  const target_market = fromText(textPip.commercial.target_market);
  const urgency       = fromText(textPip.commercial.urgency);

  // ── origin_country (Rule 2) ──
  const bestOrigin = bestImageAttr(imageExtractions, (ex) => ({
    value: ex.origin_country.value,
    status: ex.origin_country.status,
    confidence: ex.origin_country.confidence,
    evidence: ex.origin_country.evidence,
  }));
  const origin_country = mergeScalar("origin_country", null, bestOrigin, conflicts);

  // ── product metadata ──
  const product_name = fromText(textPip.product.name);
  const raw_description = fromText(textPip.product.raw_description);
  const raw_text = fromText(textPip.category.raw_text);

  // ── match_config — promotion gates ──
  const must_have: string[] = [...textPip.match_config.must_have];

  // Image-promoted must_have: observed + confidence >= PROMOTION_GATE
  // Processing state promotion
  if (
    bestPs &&
    bestPs.value &&
    bestPs.status === "observed" &&
    bestPs.confidence >= PROMOTION_GATE
  ) {
    const psStr = `processing_state:${bestPs.value}`;
    if (!must_have.includes(psStr)) must_have.push(psStr);
  }

  // Temperature regime promotion
  if (
    bestTemp &&
    bestTemp.value &&
    bestTemp.status === "observed" &&
    bestTemp.confidence >= PROMOTION_GATE
  ) {
    const tempStr = `temperature_regime:${bestTemp.value}`;
    if (!must_have.includes(tempStr)) must_have.push(tempStr);
  }

  // Category promotion
  if (
    bestCat &&
    bestCat.value &&
    bestCat.status === "observed" &&
    bestCat.confidence >= PROMOTION_GATE
  ) {
    const catStr = `category:${bestCat.value}`;
    if (!must_have.includes(catStr)) must_have.push(catStr);
  }

  const dealbreakers: string[] = [...textPip.match_config.dealbreakers];

  // nice_to_have: text-stated + image attrs observed but below PROMOTION_GATE
  const nice_to_have: string[] = [...textPip.match_config.nice_to_have];

  // Image certifications (observed, below promotion gate) → nice_to_have
  for (const ex of imageExtractions) {
    const attr = ex.certifications_visible;
    if (attr.status === "observed" && attr.confidence >= AUTO_FILL_GATE && attr.confidence < PROMOTION_GATE) {
      for (const cert of attr.value ?? []) {
        const hint = `cert:${cert}`;
        if (!nice_to_have.includes(hint)) nice_to_have.push(hint);
      }
    }
  }

  // Image organic hint → nice_to_have (never override text, Rule 1)
  if (imageOrganicHint && !textPip.compliance.organic) {
    if (!nice_to_have.includes("organic")) nice_to_have.push("organic");
  }

  // Image kosher hints → nice_to_have (never override text, Rule 1)
  if (imageKosherHints.length > 0 && !textPip.compliance.kosher_required) {
    if (!nice_to_have.includes("kosher")) nice_to_have.push("kosher");
  }

  const dataJson: PipV2DataJson = {
    version: "2.0",
    merged_at: new Date().toISOString(),
    product: { name: product_name, raw_description },
    category: { category_id: categoryId, category_name: categoryName, raw_text },
    specifications: { formats, packaging, sizes, processing_state, temperature_regime },
    compliance: { kosher_required, kosher_types, halal, organic, certifications, allergen_profile },
    commercial: { private_label, volume, budget, target_market, urgency },
    origin_country,
    match_config: { must_have, nice_to_have, dealbreakers },
    sourcing_difficulty: null,
    ...(conflicts.length > 0 ? { review_reasons: ["conflicting_text_image_values"] } : {}),
  };

  return { dataJson, conflicts };
}

// ── Async DB orchestrator ──
export async function mergePip(
  pipId: string,
  requestId: string,
  imageExtractions: ImageExtraction[],
): Promise<{ dataJson: PipV2DataJson; conflictsDetected: boolean }> {
  // Fetch text side — prefer existing v1 PIP data_json
  const { data: v1Pip } = await supabaseAdmin
    .from("pips")
    .select("data_json")
    .eq("sourcing_request_id", requestId)
    .eq("pip_version", 1)
    .eq("created_from", "text")
    .maybeSingle();

  let textPip: PipV1;
  if (v1Pip?.data_json && (v1Pip.data_json as { version?: string }).version === "1.0") {
    textPip = v1Pip.data_json as PipV1;
  } else {
    // No v1 PIP — build from sourcing_requests row
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("product_name, message, category, certifications, target_market, private_label, ai_analysis")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr || !req) {
      throw new Error(`mergePip: failed to fetch sourcing_requests row for ${requestId}: ${reqErr?.message ?? "not found"}`);
    }
    textPip = await buildPipV1Full(req as SourcingRequestInput);
  }

  const { dataJson, conflicts } = mergeTextAndImages(textPip, imageExtractions);

  // Write data_json; escalate to needs_review on conflict
  const updatePayload: Record<string, unknown> = { data_json: dataJson };
  if (conflicts.length > 0) updatePayload.status = "needs_review";

  const { error: updateErr } = await supabaseAdmin
    .from("pips")
    .update(updatePayload)
    .eq("id", pipId);
  if (updateErr) throw new Error(`mergePip: failed to update pip ${pipId}: ${updateErr.message}`);

  return { dataJson, conflictsDetected: conflicts.length > 0 };
}

// ── Manual-edit helpers (used by pip/save and pip/generate admin routes) ──

export function buildManualAttr(value: unknown): MergedAttr {
  return { value, source: "manual", status: "observed", confidence: 1.0, evidence: null };
}

// Converts a PipV1 (text-based) into a PipV2DataJson where every field is
// tagged source:"manual". Used when an admin saves edits via pip/save —
// the edited values override any prior image-merged provenance.
export function pipV1ToManualV2DataJson(pip: PipV1): PipV2DataJson {
  return {
    version: "2.0",
    merged_at: new Date().toISOString(),
    product: {
      name: buildManualAttr(pip.product.name),
      raw_description: buildManualAttr(pip.product.raw_description),
    },
    category: {
      category_id: buildManualAttr(pip.category.category_id),
      category_name: buildManualAttr(pip.category.category_name),
      raw_text: buildManualAttr(pip.category.raw_text),
    },
    specifications: {
      formats: pip.specifications.formats.map(buildManualAttr),
      packaging: buildManualAttr(pip.specifications.packaging),
      sizes: pip.specifications.sizes.map(buildManualAttr),
      processing_state: buildManualAttr(null), // not present in PipV1
      temperature_regime: buildManualAttr(null), // not present in PipV1
    },
    compliance: {
      kosher_required: buildManualAttr(pip.compliance.kosher_required),
      kosher_types: pip.compliance.kosher_types.map(buildManualAttr),
      halal: buildManualAttr(pip.compliance.halal),
      organic: buildManualAttr(pip.compliance.organic),
      certifications: pip.compliance.certifications.map(buildManualAttr),
      allergen_profile: [],
    },
    commercial: {
      private_label: buildManualAttr(pip.commercial.private_label),
      volume: buildManualAttr(pip.commercial.volume),
      budget: buildManualAttr(pip.commercial.budget),
      target_market: buildManualAttr(pip.commercial.target_market),
      urgency: buildManualAttr(pip.commercial.urgency),
    },
    origin_country: buildManualAttr(null),
    match_config: {
      must_have: pip.match_config.must_have,
      nice_to_have: pip.match_config.nice_to_have,
      dealbreakers: pip.match_config.dealbreakers,
    },
    sourcing_difficulty: null,
  };
}

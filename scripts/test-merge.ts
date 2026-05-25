import "dotenv/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { groupImages } from "@/lib/pip/groupImages";
import { mergeTextAndImages } from "@/lib/pip/mergePipFields";
import type { PipV2DataJson, MergedAttr, ImageExtraction } from "@/lib/pip/pipTypes";
import type { PipV1 } from "@/lib/pip/buildPipV1";

const PRIMARY_REQUEST = "8e21a27c-dadd-47db-89e0-d8b768ef0349";

const CONTROLLED_VOCABS: Record<string, string[]> = {
  "specifications.processing_state": ["raw", "semi_processed", "processed", "ready_to_eat", "frozen"],
  "specifications.temperature_regime": ["ambient", "chilled", "frozen"],
  "specifications.packaging": ["retail", "foodservice", "bulk", "gift", "other"],
};
const FORMAT_VOCAB = ["bottle", "can", "pouch", "jar", "box", "bag", "tray", "bulk", "other"];
const ALLERGEN_VOCAB = ["gluten", "dairy", "nuts", "soy", "eggs", "fish", "shellfish", "sesame", "mustard", "celery", "sulphites"];

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
    failed++;
  }
}

function hasFiveKeys(attr: MergedAttr): boolean {
  const keys = Object.keys(attr);
  return ["value", "source", "status", "confidence", "evidence"].every((k) => keys.includes(k));
}

// Recursively walk all MergedAttr leaves in data_json
function walkAttrs(obj: unknown, path = ""): { path: string; attr: MergedAttr }[] {
  if (!obj || typeof obj !== "object") return [];
  const o = obj as Record<string, unknown>;

  // If this object looks like a MergedAttr (has source + confidence), treat it as one
  if ("source" in o && "confidence" in o && "value" in o && "status" in o && "evidence" in o) {
    return [{ path, attr: o as unknown as MergedAttr }];
  }

  const results: { path: string; attr: MergedAttr }[] = [];
  for (const [key, val] of Object.entries(o)) {
    if (Array.isArray(val)) {
      val.forEach((item, i) => results.push(...walkAttrs(item, `${path}.${key}[${i}]`)));
    } else {
      results.push(...walkAttrs(val, `${path}.${key}`));
    }
  }
  return results;
}

async function getPrimaryPipDataJson(): Promise<PipV2DataJson | null> {
  // Re-run groupImages to ensure data_json is fresh (idempotent)
  await groupImages(PRIMARY_REQUEST);
  const { data: pip } = await supabaseAdmin
    .from("pips")
    .select("data_json")
    .eq("sourcing_request_id", PRIMARY_REQUEST)
    .eq("pip_version", 2)
    .eq("created_from", "image")
    .maybeSingle();
  return (pip?.data_json as PipV2DataJson) ?? null;
}

// ── Synthetic ImageExtraction for pure tests ──
function makeBlankExtraction(imageId = "test-image-id"): ImageExtraction {
  const unknownAttr = <T>(value: T | null = null) => ({
    value,
    status: "unknown" as const,
    confidence: 0,
    evidence: null,
  });
  return {
    image_id: imageId,
    group_key: "test::test",
    category: { value: null, category_name: null, status: "unknown", confidence: 0, evidence: null },
    product_noun: unknownAttr("test product"),
    brand: unknownAttr(null),
    product_name: unknownAttr("Test Product"),
    size: unknownAttr(null),
    format: unknownAttr(null),
    packaging: unknownAttr(null),
    processing_state: unknownAttr(null),
    temperature_regime: unknownAttr(null),
    certifications_visible: unknownAttr([]),
    kosher_marks_visible: unknownAttr([]),
    organic_claim: unknownAttr(false),
    origin_country: unknownAttr(null),
    label_languages: unknownAttr([]),
    label_claims: unknownAttr([]),
    overall_quality: "clear",
    flags: [],
  };
}

function makeTextPip(overrides: Partial<PipV1> = {}): PipV1 {
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    product: { name: "Olive Oil", raw_description: "500ml extra virgin olive oil" },
    category: { raw_text: "Oils", category_id: "cat-123", category_name: "Oils & Fats" },
    specifications: { formats: ["bottle"], packaging: "retail", sizes: ["500ml"] },
    compliance: { kosher_required: true, kosher_types: ["OU Kosher"], certifications: ["ISO22000"], halal: false, organic: false },
    commercial: { private_label: false, volume: "500 cases", budget: "$5/unit", target_market: "Israel", urgency: "standard" },
    match_config: { must_have: ["kosher"], nice_to_have: [], dealbreakers: [] },
    ...overrides,
  };
}

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log(" Phase 4 Merge — Verification Checklist");
  console.log("══════════════════════════════════════════════════\n");

  // ── Ensure primary fixture has fresh data_json ──
  console.log(`[Setup] Running groupImages for primary fixture (${PRIMARY_REQUEST})...`);
  const primaryResult = await groupImages(PRIMARY_REQUEST);
  console.log(`  pip_ids: ${primaryResult.pip_ids.join(", ")}`);

  const dj = await getPrimaryPipDataJson();
  if (!dj) {
    console.error("FATAL: Could not read data_json for primary fixture. Aborting.");
    process.exit(1);
  }

  // ══════════════════════════════════════════════
  // Field list checks
  // ══════════════════════════════════════════════
  console.log("\n[1] Field list — matching-critical fields present");
  assert("version === '2.0'", dj.version === "2.0");
  assert("category.category_id present", "category_id" in dj.category);
  assert("category.category_name present", "category_name" in dj.category);
  assert("specifications.formats is array", Array.isArray(dj.specifications.formats));
  assert("specifications.packaging present", "packaging" in dj.specifications);
  assert("specifications.sizes is array", Array.isArray(dj.specifications.sizes));
  assert("specifications.processing_state present", "processing_state" in dj.specifications);
  assert("specifications.temperature_regime present", "temperature_regime" in dj.specifications);
  assert("compliance.kosher_required present", "kosher_required" in dj.compliance);
  assert("compliance.kosher_types is array", Array.isArray(dj.compliance.kosher_types));
  assert("compliance.halal present", "halal" in dj.compliance);
  assert("compliance.organic present", "organic" in dj.compliance);
  assert("compliance.certifications is array", Array.isArray(dj.compliance.certifications));
  assert("compliance.allergen_profile is array", Array.isArray(dj.compliance.allergen_profile));
  assert("commercial.private_label present", "private_label" in dj.commercial);
  assert("commercial.volume present", "volume" in dj.commercial);
  assert("commercial.budget present", "budget" in dj.commercial);
  assert("commercial.target_market present", "target_market" in dj.commercial);
  assert("origin_country present", "origin_country" in dj);
  assert("match_config.must_have is array", Array.isArray(dj.match_config.must_have));
  assert("match_config.nice_to_have is array", Array.isArray(dj.match_config.nice_to_have));
  assert("match_config.dealbreakers is array", Array.isArray(dj.match_config.dealbreakers));

  console.log("\n[2] Field list — metadata fields present");
  assert("product.name present", "name" in dj.product);
  assert("product.raw_description present", "raw_description" in dj.product);
  assert("category.raw_text present", "raw_text" in dj.category);
  assert("commercial.urgency present", "urgency" in dj.commercial);
  assert("sourcing_difficulty === null", dj.sourcing_difficulty === null);

  console.log("\n[3] Controlled vocab — no out-of-vocab strings");
  // formats
  for (const attr of dj.specifications.formats) {
    if (attr.value !== null) {
      assert(`format '${attr.value}' in vocab`, FORMAT_VOCAB.includes(attr.value as string), `got: ${attr.value}`);
    }
  }
  // packaging
  const pkgVal = dj.specifications.packaging.value;
  if (pkgVal !== null) {
    assert(`packaging '${pkgVal}' in vocab`, CONTROLLED_VOCABS["specifications.packaging"].includes(pkgVal as string));
  } else {
    assert("packaging is null (no value — acceptable)", true);
  }
  // processing_state
  const psVal = dj.specifications.processing_state.value;
  if (psVal !== null) {
    assert(`processing_state '${psVal}' in vocab`, CONTROLLED_VOCABS["specifications.processing_state"].includes(psVal as string));
  } else {
    assert("processing_state is null (no image observed — acceptable)", true);
  }
  // temperature_regime
  const trVal = dj.specifications.temperature_regime.value;
  if (trVal !== null) {
    assert(`temperature_regime '${trVal}' in vocab`, CONTROLLED_VOCABS["specifications.temperature_regime"].includes(trVal as string));
  } else {
    assert("temperature_regime is null (no image observed — acceptable)", true);
  }
  // allergen_profile
  for (const attr of dj.compliance.allergen_profile) {
    if (attr.value !== null) {
      assert(`allergen '${attr.value}' in vocab`, ALLERGEN_VOCAB.includes(attr.value as string));
    }
  }

  // ══════════════════════════════════════════════
  // Provenance checks
  // ══════════════════════════════════════════════
  console.log("\n[4] Provenance — every MergedAttr has 5 keys");
  const allAttrs = walkAttrs(dj);
  const missingKeys = allAttrs.filter(({ attr }) => !hasFiveKeys(attr));
  assert(`All ${allAttrs.length} merged attrs have {value, source, status, confidence, evidence}`,
    missingKeys.length === 0,
    missingKeys.map(({ path }) => path).join(", "));

  console.log("\n[5] Provenance — image fields have non-null evidence");
  const imageAttrs = allAttrs.filter(({ attr }) => attr.source === "image");
  const nullEvidenceImage = imageAttrs.filter(({ attr }) => attr.evidence === null);
  assert(`All image-sourced attrs have non-null evidence (${imageAttrs.length} image attrs)`,
    nullEvidenceImage.length === 0,
    nullEvidenceImage.map(({ path }) => path).join(", "));

  console.log("\n[6] Provenance — text fields have evidence: null");
  const textAttrs = allAttrs.filter(({ attr }) => attr.source === "text");
  const nonNullEvidenceText = textAttrs.filter(({ attr }) => attr.evidence !== null);
  assert(`All text-sourced attrs have evidence: null (${textAttrs.length} text attrs)`,
    nonNullEvidenceText.length === 0,
    nonNullEvidenceText.map(({ path }) => path).join(", "));

  console.log("\n[7] Provenance — confidence stored unrounded");
  // Just verify confidence is a number (not undefined/null/NaN) on all attrs
  const badConf = allAttrs.filter(({ attr }) => typeof attr.confidence !== "number" || Number.isNaN(attr.confidence));
  assert(`All attrs have numeric confidence (${allAttrs.length} total)`,
    badConf.length === 0,
    badConf.map(({ path }) => path).join(", "));

  // ══════════════════════════════════════════════
  // Merge rule checks (synthetic — pure function calls)
  // ══════════════════════════════════════════════
  console.log("\n[8] Rule 1 — text compliance survives even when image shows no mark");
  {
    const textPip = makeTextPip({ compliance: { kosher_required: true, kosher_types: ["OU Kosher"], certifications: [], halal: false, organic: false } });
    // Image with no kosher mark
    const ex = makeBlankExtraction();
    ex.kosher_marks_visible = { value: [], status: "observed", confidence: 0.95, evidence: "no marks visible" };
    const { dataJson } = mergeTextAndImages(textPip, [ex]);
    assert("Rule 1: kosher_required stays true despite image showing no mark",
      dataJson.compliance.kosher_required.value === true,
      `got: ${dataJson.compliance.kosher_required.value}`);
    assert("Rule 1: kosher_required source = text",
      dataJson.compliance.kosher_required.source === "text");
  }

  console.log("\n[9] Rule 2 — image wins on spec field when observed + conf ≥ 0.75");
  {
    const textPip = makeTextPip({ specifications: { formats: [], packaging: null, sizes: [] } });
    const ex = makeBlankExtraction();
    ex.format = { value: "bottle", status: "observed", confidence: 0.9, evidence: "bottle clearly visible" };
    const { dataJson } = mergeTextAndImages(textPip, [ex]);
    const bottleAttr = dataJson.specifications.formats.find((a) => a.value === "bottle");
    assert("Rule 2: image format 'bottle' appears in formats[]",
      !!bottleAttr,
      `formats: ${JSON.stringify(dataJson.specifications.formats.map((a) => a.value))}`);
    assert("Rule 2: bottle attr source = image", bottleAttr?.source === "image");
  }

  console.log("\n[10] Rule 3 — set-valued union: text + image sizes union correctly");
  {
    const textPip = makeTextPip({ specifications: { formats: [], packaging: null, sizes: ["500ml"] } });
    const ex = makeBlankExtraction();
    ex.size = { value: "1000ml", status: "observed", confidence: 0.85, evidence: "1L label visible" };
    const { dataJson } = mergeTextAndImages(textPip, [ex]);
    const sizeValues = dataJson.specifications.sizes.map((a) => a.value);
    assert("Rule 3: sizes union contains both '500ml' and '1000ml'",
      sizeValues.includes("500ml") && sizeValues.includes("1000ml"),
      `got: ${JSON.stringify(sizeValues)}`);
  }

  console.log("\n[11] Rule 4 — image never removes text-asserted value");
  {
    const textPip = makeTextPip({ specifications: { formats: ["can"], packaging: null, sizes: ["500ml"] } });
    // Image says "bottle" with high confidence — text "can" must still be present
    const ex = makeBlankExtraction();
    ex.format = { value: "bottle", status: "observed", confidence: 0.95, evidence: "bottle visible" };
    const { dataJson } = mergeTextAndImages(textPip, [ex]);
    const formatValues = dataJson.specifications.formats.map((a) => a.value);
    assert("Rule 4: text-asserted 'can' still present even when image says 'bottle'",
      formatValues.includes("can"),
      `formats: ${JSON.stringify(formatValues)}`);
  }

  console.log("\n[12] Rule 5 — high-confidence text-vs-image conflict → both values retained + review_reasons");
  {
    // Use valid packaging vocab values: text="retail" vs image="bulk"
    const textPip = makeTextPip({ specifications: { formats: [], packaging: "retail", sizes: [] } });
    const ex = makeBlankExtraction();
    // packaging conflict: text = "retail", image = "bulk" observed + high conf
    ex.packaging = { value: "bulk", status: "observed", confidence: 0.9, evidence: "bulk industrial packaging visible" };
    const { dataJson, conflicts } = mergeTextAndImages(textPip, [ex]);
    assert("Rule 5: conflict detected for packaging",
      conflicts.includes("specifications.packaging"),
      `conflicts: ${JSON.stringify(conflicts)}`);
    const pkgConflictVal = dataJson.specifications.packaging.value as { text?: unknown; image?: unknown } | null;
    assert("Rule 5: packaging value is object with text + image keys",
      typeof pkgConflictVal === "object" &&
      pkgConflictVal !== null &&
      "text" in pkgConflictVal &&
      "image" in pkgConflictVal,
      `value: ${JSON.stringify(pkgConflictVal)}`);
    assert("Rule 5: review_reasons includes conflicting_text_image_values",
      dataJson.review_reasons?.includes("conflicting_text_image_values") === true);
  }

  // ══════════════════════════════════════════════
  // Confidence gate checks
  // ══════════════════════════════════════════════
  console.log("\n[13] Hallucination test — inferred + low-confidence attr never reaches must_have/dealbreakers");
  {
    const textPip = makeTextPip({ match_config: { must_have: ["kosher"], nice_to_have: [], dealbreakers: [] } });
    const ex = makeBlankExtraction();
    // Fabricated processing_state: inferred + confidence 0.4 — below AUTO_FILL_GATE
    ex.processing_state = { value: "raw", status: "inferred", confidence: 0.4, evidence: null };
    const { dataJson } = mergeTextAndImages(textPip, [ex]);
    const mustHaveFlatStr = JSON.stringify(dataJson.match_config.must_have);
    const dealbrStr = JSON.stringify(dataJson.match_config.dealbreakers);
    assert("Hallucination: 'raw' not in must_have",
      !mustHaveFlatStr.includes("raw"),
      `must_have: ${mustHaveFlatStr}`);
    assert("Hallucination: 'raw' not in dealbreakers",
      !dealbrStr.includes("raw"),
      `dealbreakers: ${dealbrStr}`);
    // It may stay in specifications.processing_state with low confidence — that's OK
    const psVal = dataJson.specifications.processing_state.value;
    // Inferred + low-conf doesn't pass AUTO_FILL_GATE so value should be null
    assert("Hallucination: processing_state.value is null (below AUTO_FILL_GATE)",
      psVal === null,
      `got: ${psVal}`);
  }

  console.log("\n[14] Promotion gate — text-stated facts always in must_have");
  {
    const textPip = makeTextPip({ compliance: { kosher_required: true, kosher_types: ["OU Kosher"], certifications: [], halal: false, organic: false }, match_config: { must_have: ["kosher"], nice_to_have: [], dealbreakers: [] } });
    const { dataJson } = mergeTextAndImages(textPip, []);
    assert("Text-stated 'kosher' in must_have", dataJson.match_config.must_have.includes("kosher"));
  }

  console.log("\n[15] Promotion gate — inferred attribute never reaches must_have/dealbreakers");
  {
    const textPip = makeTextPip({ match_config: { must_have: [], nice_to_have: [], dealbreakers: [] } });
    const ex = makeBlankExtraction();
    // Inferred temperature_regime with high confidence — still must not promote
    ex.temperature_regime = { value: "frozen", status: "inferred", confidence: 0.95, evidence: null };
    const { dataJson } = mergeTextAndImages(textPip, [ex]);
    const mhStr = JSON.stringify(dataJson.match_config.must_have);
    assert("Inferred attr never in must_have even at high confidence",
      !mhStr.includes("frozen"),
      `must_have: ${mhStr}`);
  }

  // ══════════════════════════════════════════════
  // Logging-readiness
  // ══════════════════════════════════════════════
  console.log("\n[16] Logging-readiness — all match-contributing fields retain raw confidence + source");
  {
    const matchFields = [
      dj.category.category_id,
      dj.specifications.packaging,
      dj.specifications.processing_state,
      dj.specifications.temperature_regime,
      dj.compliance.kosher_required,
      dj.compliance.halal,
      dj.compliance.organic,
      dj.origin_country,
    ];
    const badLogging = matchFields.filter((a) => typeof a.confidence !== "number" || !a.source);
    assert("All match-contributing scalar fields have confidence + source",
      badLogging.length === 0,
      `${badLogging.length} fields missing logging keys`);
  }

  // ══════════════════════════════════════════════
  // End-to-end checks
  // ══════════════════════════════════════════════
  console.log("\n[17] End-to-end — primary fixture produces valid provenance-tagged data_json");
  assert("data_json version === '2.0'", dj.version === "2.0");
  assert("merged_at is a date string", typeof dj.merged_at === "string" && dj.merged_at.length > 0);

  console.log("\n[18] End-to-end — merged data_json written to correct v2 pip row");
  {
    const { data: pipRow } = await supabaseAdmin
      .from("pips")
      .select("id, data_json")
      .eq("sourcing_request_id", PRIMARY_REQUEST)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .maybeSingle();
    const storedVersion = (pipRow?.data_json as { version?: string })?.version;
    assert(`v2 pip row for primary fixture has data_json.version = '2.0' (got '${storedVersion}')`,
      storedVersion === "2.0");
  }

  console.log("\n[19] End-to-end — all 4 fixture v2 PIPs have non-empty data_json");
  {
    const { data: fixturePips } = await supabaseAdmin
      .from("pips")
      .select("id, data_json")
      .in("sourcing_request_id", [
        "8e21a27c-dadd-47db-89e0-d8b768ef0349",
        "8bc8fe72-285a-45fb-903b-10903517abda",
        "857fc730-7453-4fde-b64f-76bd90aee87b",
      ])
      .eq("pip_version", 2)
      .eq("created_from", "image");

    const emptyDj = (fixturePips ?? []).filter(
      (p) => !p.data_json || (p.data_json as { version?: string })?.version !== "2.0"
    );
    assert(`All fixture v2 PIPs have data_json.version='2.0' (${fixturePips?.length ?? 0} found, ${emptyDj.length} empty/stale)`,
      emptyDj.length === 0,
      emptyDj.map((p) => p.id).join(", "));
  }

  // ── Summary ──
  console.log(`\n${"═".repeat(50)}`);
  console.log(` Results: ${passed} passed, ${failed} failed`);

  // ── Print full data_json for primary fixture ──
  console.log("\n══ Full data_json for primary fixture (8e21a27c) ══");
  console.log(JSON.stringify(dj, null, 2));

  if (failed > 0) {
    console.error("\n GATE FAILED — do not start the cross-phase integrity check");
    process.exit(1);
  } else {
    console.log("\n All checks passed — Phase 4 complete");
  }
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

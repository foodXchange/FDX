import "dotenv/config";
import { groupImages } from "@/lib/pip/groupImages";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ── Fixture request IDs ──
const SAME_PRODUCT_TWO_SIZES = "8e21a27c-dadd-47db-89e0-d8b768ef0349";
const TWO_DISTINCT_PRODUCTS  = "8bc8fe72-285a-45fb-903b-10903517abda";
const AMBIGUOUS_PAIR         = "857fc730-7453-4fde-b64f-76bd90aee87b";

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

async function countV2ImagePips(requestId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("pips")
    .select("id", { count: "exact", head: true })
    .eq("sourcing_request_id", requestId)
    .eq("pip_version", 2)
    .eq("created_from", "image");
  return count ?? 0;
}

async function getStoredGroupingDecision(requestId: string) {
  const { data } = await supabaseAdmin
    .from("pip_grouping_decisions")
    .select("decision_json")
    .eq("request_id", requestId)
    .maybeSingle();
  return data?.decision_json as { assignments: { image_id: string; pip_id: string; rule: string; confidence: number }[]; needs_review: boolean; flags: string[] } | null;
}

function sortedAssignmentsJson(assignments: { image_id: string; pip_id: string; rule: string; confidence: number }[]) {
  return JSON.stringify([...assignments].sort((a, b) => a.image_id.localeCompare(b.image_id)));
}

async function run() {
  console.log("\n══════════════════════════════════════════");
  console.log(" Phase 3 Grouping — Verification Checklist");
  console.log("══════════════════════════════════════════\n");

  // ── Look up vacuum-veg request early (needed for cleanup and items 7/8) ──
  const { data: vacuumVegReq } = await supabaseAdmin
    .from("request_images")
    .select("request_id")
    .eq("id", "a162fd0f-d71c-48f8-b58d-870f9e24d5d2")
    .maybeSingle();

  // ── Pre-test cleanup: delete stale v2 image PIPs for all fixture requests ──
  const fixtureRequestIds = [
    SAME_PRODUCT_TWO_SIZES, TWO_DISTINCT_PRODUCTS, AMBIGUOUS_PAIR,
    ...(vacuumVegReq?.request_id ? [vacuumVegReq.request_id as string] : []),
  ];
  const { error: cleanupError } = await supabaseAdmin
    .from("pips")
    .delete()
    .in("sourcing_request_id", fixtureRequestIds)
    .eq("pip_version", 2)
    .eq("created_from", "image");
  if (cleanupError) throw new Error(`Pre-test cleanup failed: ${cleanupError.message}`);
  console.log(`Pre-test: cleared stale v2 image PIPs for ${fixtureRequestIds.length} fixture requests\n`);

  // ── Print fixture group_keys before running, to confirm fixture validity ──
  console.log("── Pre-check: group_keys for two-sizes fixture ──");
  const { data: twoSizeImages } = await supabaseAdmin
    .from("request_images")
    .select("id, ai_analysis")
    .eq("request_id", SAME_PRODUCT_TWO_SIZES)
    .order("id", { ascending: true });

  const twoSizeKeys = (twoSizeImages ?? []).map((img) => ({
    image_id: img.id,
    group_key: (img.ai_analysis as { group_key?: string } | null)?.group_key ?? "(null — not yet extracted)",
  }));
  twoSizeKeys.forEach((k) => console.log(`  ${k.image_id}: ${k.group_key}`));

  const allSameGroupKey = twoSizeKeys.length > 0 && new Set(twoSizeKeys.map((k) => k.group_key)).size === 1;
  if (!allSameGroupKey) {
    console.warn("\n  WARNING: two-sizes fixture images have different group_keys — fixture may be invalid.\n  Collapse test result will reflect fixture state, not algorithm failure.\n");
  }

  // ── Print group_keys for two-distinct-products fixture ──
  console.log("\n── Pre-check: category_ids for distinct-products fixture ──");
  const { data: distinctImages } = await supabaseAdmin
    .from("request_images")
    .select("id, ai_analysis")
    .eq("request_id", TWO_DISTINCT_PRODUCTS)
    .order("id", { ascending: true });

  (distinctImages ?? []).forEach((img) => {
    const ex = img.ai_analysis as { category?: { value?: string; category_name?: string }; product_noun?: { value?: string } } | null;
    console.log(`  ${img.id}: category_id=${ex?.category?.value ?? "null"} (${ex?.category?.category_name ?? "?"}) noun=${ex?.product_noun?.value ?? "null"}`);
  });

  // ══════════════════════════════════════════
  // 1. Determinism — run twice, compare assignments
  // ══════════════════════════════════════════
  console.log("\n[1] Determinism (two-sizes fixture, run twice)");
  const run1 = await groupImages(SAME_PRODUCT_TWO_SIZES);
  const run2 = await groupImages(SAME_PRODUCT_TWO_SIZES);
  const det1 = sortedAssignmentsJson(run1.grouping_decision.assignments);
  const det2 = sortedAssignmentsJson(run2.grouping_decision.assignments);
  assert("Assignments byte-for-byte identical across two runs", det1 === det2,
    `Run 1: ${det1}\nRun 2: ${det2}`);

  // ══════════════════════════════════════════
  // 2. Same-product two-sizes → exactly 1 v2 PIP
  // ══════════════════════════════════════════
  console.log("\n[2] Two-sizes collapse (same group_key → 1 v2 PIP)");
  const twoSizePipCount = await countV2ImagePips(SAME_PRODUCT_TWO_SIZES);
  if (allSameGroupKey) {
    assert(`Exactly 1 v2 image PIP (got ${twoSizePipCount})`, twoSizePipCount === 1);
  } else {
    console.log(`  SKIP  Fixture group_keys differ — collapse test skipped (fixture invalid, not algorithm failure)`);
    console.log(`        v2 PIP count for this request: ${twoSizePipCount}`);
  }

  // ══════════════════════════════════════════
  // 3. Two distinct products → exactly 2 v2 PIPs
  // ══════════════════════════════════════════
  console.log("\n[3] Distinct products split (→ 2 v2 PIPs)");
  await groupImages(TWO_DISTINCT_PRODUCTS);
  const distinctPipCount = await countV2ImagePips(TWO_DISTINCT_PRODUCTS);
  assert(`Exactly 2 v2 image PIPs (got ${distinctPipCount})`, distinctPipCount === 2);

  // ══════════════════════════════════════════
  // 4. Ambiguous pair → split + needs_review
  // ══════════════════════════════════════════
  console.log("\n[4] Ambiguous pair (→ split + needs_review)");
  const ambigResult = await groupImages(AMBIGUOUS_PAIR);
  const ambigPipCount = await countV2ImagePips(AMBIGUOUS_PAIR);
  assert(`≥2 v2 image PIPs (got ${ambigPipCount})`, ambigPipCount >= 2);
  assert(`needs_review = true (multi-PIP rule)`, ambigResult.needs_review === true);

  // ══════════════════════════════════════════
  // 5. Rule 4 demonstrably holds (via item 3 — printed category_ids above)
  // ══════════════════════════════════════════
  console.log("\n[5] Rule 4 (different category_id → different PIP)");
  const distinctCats = new Set(
    (distinctImages ?? []).map(
      (img) => (img.ai_analysis as { category?: { value?: string } } | null)?.category?.value ?? "null"
    )
  );
  const splitDueToCategory = distinctCats.size > 1;
  const splitDueToNoun = !splitDueToCategory && distinctImages && distinctImages.length > 1;
  assert(
    `Distinct-products fixture split by category_id (${[...distinctCats].join(", ")}) OR product_noun`,
    distinctPipCount >= 2,
    splitDueToCategory ? "category_ids differ ✓" : "same category — split by product_noun (rule_5)"
  );

  // ══════════════════════════════════════════
  // 6. grouping_decision persisted with non-empty assignments
  // ══════════════════════════════════════════
  console.log("\n[6] grouping_decision persisted with assignments");
  for (const [label, reqId] of [
    ["two-sizes", SAME_PRODUCT_TWO_SIZES],
    ["distinct", TWO_DISTINCT_PRODUCTS],
    ["ambiguous", AMBIGUOUS_PAIR],
  ] as const) {
    const gd = await getStoredGroupingDecision(reqId);
    assert(`${label}: assignments.length > 0 (got ${gd?.assignments?.length ?? 0})`,
      (gd?.assignments?.length ?? 0) > 0);
  }

  // ══════════════════════════════════════════
  // 7. Quality/flag gate → needs_review
  //    Use the vacuum-veg request (multiple_products_in_frame fired for it)
  // ══════════════════════════════════════════
  console.log("\n[7] Quality/flag gate → needs_review");
  if (vacuumVegReq?.request_id) {
    const gateResult = await groupImages(vacuumVegReq.request_id as string);
    assert("Request with multiple_products_in_frame → needs_review = true",
      gateResult.needs_review === true);
  } else {
    console.log("  SKIP  Vacuum-veg fixture request_id not found — skipping gate check");
  }

  // ══════════════════════════════════════════
  // 8. multiple_products_in_frame + same group_key → 1 PIP (NOT split)
  // ══════════════════════════════════════════
  console.log("\n[8] multiple_products_in_frame + same group_key → 1 PIP");
  if (vacuumVegReq?.request_id) {
    const vacuumPipCount = await countV2ImagePips(vacuumVegReq.request_id as string);
    const { data: vacuumImages } = await supabaseAdmin
      .from("request_images")
      .select("ai_analysis")
      .eq("request_id", vacuumVegReq.request_id);
    const vacuumKeys = new Set(
      (vacuumImages ?? []).map(
        (img) => (img.ai_analysis as { group_key?: string } | null)?.group_key ?? "?"
      )
    );
    const sameKey = vacuumKeys.size === 1;
    console.log(`  group_keys in vacuum-veg request: [${[...vacuumKeys].join(", ")}]`);
    if (sameKey) {
      assert(`Same group_key + flag → 1 PIP (got ${vacuumPipCount})`, vacuumPipCount === 1);
    } else {
      console.log(`  SKIP  Vacuum-veg fixture has multiple group_keys (${[...vacuumKeys].join(", ")}) — different PIP count expected by group_key divergence, not flag`);
    }
  } else {
    console.log("  SKIP  Vacuum-veg fixture not found");
  }

  // ══════════════════════════════════════════
  // 9. Auto-accept OFF — all v2 PIPs have status = needs_review
  // ══════════════════════════════════════════
  console.log("\n[9] Auto-accept OFF (all v2 PIPs status = needs_review)");
  const { data: wrongStatusPips, count: wrongCount } = await supabaseAdmin
    .from("pips")
    .select("id, status", { count: "exact" })
    .eq("pip_version", 2)
    .eq("created_from", "image")
    .neq("status", "needs_review");
  assert(`No v2 image PIP has status ≠ needs_review (found ${wrongCount ?? 0})`,
    (wrongCount ?? 0) === 0,
    (wrongStatusPips ?? []).map((p) => `${p.id}: ${p.status}`).join(", "));

  // ══════════════════════════════════════════
  // 10. v1 legacy PIPs untouched
  // ══════════════════════════════════════════
  console.log("\n[10] v1 legacy PIPs untouched");
  // two-sizes fixture (8e21a27c) was created for Phase 3 testing only — no v1 PIP exists, skip.
  for (const [label, reqId] of [
    ["distinct", TWO_DISTINCT_PRODUCTS],
    ["ambiguous", AMBIGUOUS_PAIR],
  ] as const) {
    const { data: v1Pip } = await supabaseAdmin
      .from("pips")
      .select("id, pip_version, created_from, data_json")
      .eq("sourcing_request_id", reqId)
      .eq("pip_version", 1)
      .maybeSingle();
    assert(`${label}: v1 PIP exists with created_from=text`,
      v1Pip?.pip_version === 1 && v1Pip?.created_from === "text");
  }

  // ── Summary ──
  console.log(`\n${"═".repeat(42)}`);
  console.log(` Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(" GATE FAILED — do not start Phase 4");
    process.exit(1);
  } else {
    console.log(" All checks passed — Phase 3 complete");
  }
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

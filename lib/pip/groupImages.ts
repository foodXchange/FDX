import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractImage } from "@/lib/ai/extractImage";
import { mergePip } from "@/lib/pip/mergePipFields";
import type { ImageExtraction, GroupingDecisionAssignment } from "@/lib/pip/pipTypes";

// Rule 6 gate: category confidence below this → image doesn't decide grouping, tags needs_review.
// Placeholder — tune from logged match outcomes once calibration data exists.
const QUALITY_CONFIDENCE_THRESHOLD = 0.5;

export type GroupImagesResult = {
  pip_ids: string[];
  grouping_decision: {
    assignments: GroupingDecisionAssignment[];
    needs_review: boolean;
    flags: string[];
  };
  needs_review: boolean;
};

export async function groupImages(requestId: string): Promise<GroupImagesResult> {
  // ── Step 0: Read stored extractions; extract only images whose ai_analysis is null ──
  const { data: images, error: imgError } = await supabaseAdmin
    .from("request_images")
    .select("id, url, ai_analysis")
    .eq("request_id", requestId)
    .order("id", { ascending: true }); // stable UUID sort → determinism across runs

  if (imgError) throw new Error(`groupImages: failed to read request_images: ${imgError.message}`);
  if (!images?.length) {
    return {
      pip_ids: [],
      grouping_decision: { assignments: [], needs_review: false, flags: [] },
      needs_review: false,
    };
  }

  const extractions: ImageExtraction[] = [];
  for (const img of images) {
    if (img.ai_analysis) {
      extractions.push(img.ai_analysis as ImageExtraction);
    } else {
      // Null ai_analysis: call extractImage (persists result back to request_images).
      const result = await extractImage({ imageUrl: img.url as string, imageId: img.id as string });
      extractions.push(
        result ?? {
          image_id: img.id as string,
          group_key: "unknown::unknown",
          category: { value: null, category_name: null, status: "unknown", confidence: 0, evidence: null },
          product_noun: { value: null, status: "unknown", confidence: 0, evidence: null },
          brand: { value: null, status: "unknown", confidence: 0, evidence: null },
          product_name: { value: null, status: "unknown", confidence: 0, evidence: null },
          size: { value: null, status: "unknown", confidence: 0, evidence: null },
          format: { value: null, status: "unknown", confidence: 0, evidence: null },
          packaging: { value: null, status: "unknown", confidence: 0, evidence: null },
          processing_state: { value: null, status: "unknown", confidence: 0, evidence: null },
          temperature_regime: { value: null, status: "unknown", confidence: 0, evidence: null },
          certifications_visible: { value: [], status: "unknown", confidence: 0, evidence: null },
          kosher_marks_visible: { value: [], status: "unknown", confidence: 0, evidence: null },
          organic_claim: { value: false, status: "unknown", confidence: 0, evidence: null },
          origin_country: { value: null, status: "unknown", confidence: 0, evidence: null },
          label_languages: { value: [], status: "unknown", confidence: 0, evidence: null },
          label_claims: { value: [], status: "unknown", confidence: 0, evidence: null },
          overall_quality: "poor",
          flags: ["extraction_failed"],
        }
      );
    }
  }

  // ── Steps 1–4: Primary bucket by (group_key, category_id) ──
  // Bucket key encodes both signals atomically:
  //   same group_key + same category_id → same bucket (rule 3)
  //   different category_id            → different bucket (rule 4, always overrides)
  const primaryBuckets = new Map<string, ImageExtraction[]>();
  for (const ex of extractions) {
    const categoryId = ex.category?.value ?? "unknown";
    const bucketKey = `${ex.group_key}::${categoryId}`;
    const arr = primaryBuckets.get(bucketKey) ?? [];
    arr.push(ex);
    primaryBuckets.set(bucketKey, arr);
  }

  // Pre-compute whether multiple distinct category_ids exist (used for rule label).
  const allCategoryIds = new Set(extractions.map((ex) => ex.category?.value ?? "unknown"));
  const requestHasMultipleCategories = allCategoryIds.size > 1;

  // ── Steps 5–8: Sub-split, gate, create PIPs, emit provenance ──
  let needsReview = false;
  const allFlags: string[] = [];
  const assignments: GroupingDecisionAssignment[] = [];
  const resultPipIds: string[] = [];

  for (const [primaryBucketKey, primaryExtractions] of primaryBuckets.entries()) {
    // Determine whether this bucket was split from others due to category (rule 4).
    const thisBucketCategoryId = primaryExtractions[0]?.category?.value ?? "unknown";
    const otherBucketHasDifferentCategory = [...primaryBuckets.keys()]
      .filter((k) => k !== primaryBucketKey)
      .some((k) => {
        const otherCatId = k.split("::").at(-1);
        return otherCatId !== thisBucketCategoryId;
      });

    // Rule 5: collect distinct product_nouns within this bucket.
    const nounBuckets = new Map<string, ImageExtraction[]>();
    for (const ex of primaryExtractions) {
      const noun = ex.product_noun?.value?.toLowerCase().trim() ?? "unknown";
      const arr = nounBuckets.get(noun) ?? [];
      arr.push(ex);
      nounBuckets.set(noun, arr);
    }

    const hasMultipleNouns = nounBuckets.size > 1;
    if (hasMultipleNouns) needsReview = true;

    for (const [noun, nounExtractions] of nounBuckets.entries()) {
      // product_family_key uniquely identifies this PIP within the request.
      const productFamilyKey = hasMultipleNouns
        ? `${primaryBucketKey}::${noun}`
        : primaryBucketKey;

      // Idempotent PIP create: reuse existing if present so second run produces same pip_id.
      const { data: existingPip } = await supabaseAdmin
        .from("pips")
        .select("id")
        .eq("sourcing_request_id", requestId)
        .eq("product_family_key", productFamilyKey)
        .eq("pip_version", 2)
        .eq("created_from", "image")
        .maybeSingle();

      let pipId: string;
      if (existingPip?.id) {
        pipId = existingPip.id as string;
      } else {
        const { data: newPip, error: pipError } = await supabaseAdmin
          .from("pips")
          .insert({
            sourcing_request_id: requestId,
            product_family_key: productFamilyKey,
            pip_version: 2,
            created_from: "image",
            status: "needs_review",
            data_json: {}, // Phase 4 will populate from merge
          })
          .select("id")
          .single();
        if (pipError || !newPip?.id) {
          throw new Error(`groupImages: failed to create PIP: ${pipError?.message ?? "no id returned"}`);
        }
        pipId = newPip.id as string;
      }

      resultPipIds.push(pipId);

      // Phase 4: merge text + image data into data_json
      const { conflictsDetected } = await mergePip(pipId, requestId, nounExtractions);
      if (conflictsDetected) needsReview = true;

      for (const ex of nounExtractions) {
        // Rule 6: quality/flag gate — annotates, does NOT force a split.
        const isPoor = ex.overall_quality === "poor";
        const isLowConf = (ex.category?.confidence ?? 0) < QUALITY_CONFIDENCE_THRESHOLD;
        const hasMultiProductFlag = ex.flags?.includes("multiple_products_in_frame") ?? false;
        const isGateFlagged = isPoor || isLowConf || hasMultiProductFlag;

        if (isGateFlagged) {
          needsReview = true;
          allFlags.push(...(ex.flags ?? []));
        }

        // Rule label: most specific rule that determined this assignment.
        let baseRule: string;
        if (hasMultipleNouns) {
          baseRule = otherBucketHasDifferentCategory ? "rule_4+rule_5" : "rule_5";
        } else if (otherBucketHasDifferentCategory) {
          baseRule = "rule_4";
        } else {
          baseRule = "rule_3";
        }
        const rule = isGateFlagged ? `${baseRule}+rule_6` : baseRule;

        assignments.push({
          image_id: ex.image_id,
          pip_id: pipId,
          rule,
          confidence: ex.category?.confidence ?? 0,
        });
      }
    }
  }

  // Any request that produced more than one PIP requires ops review before matching.
  if (resultPipIds.length > 1) needsReview = true;

  const groupingDecision = {
    assignments,
    needs_review: needsReview,
    flags: [...new Set(allFlags)],
  };

  // Upsert grouping_decision — requires unique index on pip_grouping_decisions(request_id).
  const { error: gdError } = await supabaseAdmin
    .from("pip_grouping_decisions")
    .upsert(
      { request_id: requestId, decision_json: groupingDecision },
      { onConflict: "request_id" }
    );
  if (gdError) throw new Error(`groupImages: failed to persist grouping_decision: ${gdError.message}`);

  return { pip_ids: resultPipIds, grouping_decision: groupingDecision, needs_review: needsReview };
}

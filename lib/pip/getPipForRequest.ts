import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import type { PipV2DataJson, MergedAttr } from "@/lib/pip/pipTypes";

// Converts v2 PipV2DataJson (MergedAttr-wrapped) to the PipV1 shape that
// generateOutreachMessage expects. Array fields need .map(a => a.value),
// not just field.value — each element is a MergedAttr object.
function v2DataJsonToPipV1Shape(dj: PipV2DataJson): PipV1 {
  const str = (attr: MergedAttr): string | null =>
    typeof attr.value === "string" ? attr.value : null;

  const bool = (attr: MergedAttr): boolean =>
    attr.value === true;

  const boolNullable = (attr: MergedAttr): boolean | null =>
    attr.value === true ? true : attr.value === false ? false : null;

  const strArr = (attrs: MergedAttr[]): string[] =>
    attrs
      .map((a) => (typeof a.value === "string" ? a.value : null))
      .filter((v): v is string => v !== null);

  return {
    version: "1.0",
    generated_at: dj.merged_at,
    product: {
      name: str(dj.product.name) ?? "",
      raw_description: str(dj.product.raw_description) ?? "",
    },
    category: {
      raw_text: str(dj.category.raw_text) ?? "",
      category_id: str(dj.category.category_id),
      category_name: str(dj.category.category_name),
    },
    specifications: {
      formats: strArr(dj.specifications.formats),
      packaging: str(dj.specifications.packaging),
      sizes: strArr(dj.specifications.sizes),
    },
    compliance: {
      kosher_required: bool(dj.compliance.kosher_required),
      kosher_types: strArr(dj.compliance.kosher_types),
      certifications: strArr(dj.compliance.certifications),
      halal: bool(dj.compliance.halal),
      organic: bool(dj.compliance.organic),
    },
    commercial: {
      private_label: boolNullable(dj.commercial.private_label),
      volume: str(dj.commercial.volume),
      urgency: str(dj.commercial.urgency),
      target_market: str(dj.commercial.target_market),
      budget: str(dj.commercial.budget),
    },
    match_config: {
      must_have: dj.match_config.must_have,
      nice_to_have: dj.match_config.nice_to_have,
      dealbreakers: dj.match_config.dealbreakers,
    },
  };
}

// Prefer v2 PIP (image-merged data) for outreach messages.
// Fall back to sourcing_requests.intent_json / buildPipV1 for v1-only requests.
export async function getPipForRequest(requestId: string): Promise<PipV1> {
  const { data: v2Pip } = await supabaseAdmin
    .from("pips")
    .select("data_json")
    .eq("sourcing_request_id", requestId)
    .eq("pip_version", 2)
    .eq("created_from", "image")
    .maybeSingle();

  if (v2Pip?.data_json && (v2Pip.data_json as { version?: string }).version === "2.0") {
    return v2DataJsonToPipV1Shape(v2Pip.data_json as unknown as PipV2DataJson);
  }

  const { data: request } = await supabaseAdmin
    .from("sourcing_requests")
    .select(
      "intent_json, product_name, message, category, certifications, target_market, private_label, ai_analysis"
    )
    .eq("id", requestId)
    .single();

  const reqRow = request as {
    intent_json: Record<string, unknown> | null;
    product_name: string | null;
    message: string | null;
    category: string | null;
    certifications: string[] | null;
    target_market: string | null;
    private_label: boolean | null;
    ai_analysis: Record<string, unknown> | null;
  } | null;

  if (!reqRow) {
    return buildPipV1({
      product_name: null,
      message: null,
      category: null,
      certifications: [],
      target_market: null,
      private_label: null,
      ai_analysis: null,
    });
  }

  return reqRow.intent_json
    ? (reqRow.intent_json as unknown as PipV1)
    : buildPipV1({
        product_name: reqRow.product_name,
        message: reqRow.message,
        category: reqRow.category,
        certifications: reqRow.certifications ?? [],
        target_market: reqRow.target_market,
        private_label: reqRow.private_label,
        ai_analysis: reqRow.ai_analysis,
      });
}

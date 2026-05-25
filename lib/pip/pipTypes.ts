export type PipStatus = "draft" | "needs_review" | "confirmed" | "matched";
export type PipCreatedFrom = "text" | "image" | "manual";

export type PipRow = {
  id: string;
  sourcing_request_id: string;
  product_family_key: string | null;
  pip_version: number;
  status: PipStatus;
  created_from: PipCreatedFrom;
  data_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type GroupingDecisionAssignment = {
  image_id: string;
  pip_id: string;
  rule: string;
  confidence: number;
};

export type PipGroupingDecisionRow = {
  id: string;
  request_id: string;
  grouping_decision: {
    assignments: GroupingDecisionAssignment[];
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
};

export type PipMatchRow = {
  id: string;
  pip_id: string;
  supplier_id: string;
  score: number;
  explanation_json: Record<string, unknown> | null;
  created_at: string;
};

export type Attr<T> = {
  value: T | null;
  status: "observed" | "inferred" | "unknown";
  confidence: number;
  evidence: string | null;
};

export type MergedAttr = {
  value: unknown;
  source: "text" | "image" | "merged" | "manual";
  status: "observed" | "inferred" | "unknown";
  confidence: number;
  evidence: string | null;
};

export type PipV2DataJson = {
  version: "2.0";
  merged_at: string;
  product: {
    name: MergedAttr;
    raw_description: MergedAttr;
  };
  category: {
    category_id: MergedAttr;
    category_name: MergedAttr;
    raw_text: MergedAttr;
  };
  specifications: {
    formats: MergedAttr[];
    packaging: MergedAttr;
    sizes: MergedAttr[];
    processing_state: MergedAttr;
    temperature_regime: MergedAttr;
  };
  compliance: {
    kosher_required: MergedAttr;
    kosher_types: MergedAttr[];
    halal: MergedAttr;
    organic: MergedAttr;
    certifications: MergedAttr[];
    allergen_profile: MergedAttr[];
  };
  commercial: {
    private_label: MergedAttr;
    volume: MergedAttr;
    budget: MergedAttr;
    target_market: MergedAttr;
    urgency: MergedAttr;
  };
  origin_country: MergedAttr;
  match_config: {
    must_have: string[];
    nice_to_have: string[];
    dealbreakers: string[];
  };
  sourcing_difficulty: null;
  review_reasons?: string[];
};

export type ImageExtraction = {
  image_id: string;
  group_key: string;
  // category.value is the UUID from the taxonomy; category_name stores the human-readable name
  category: Attr<string> & { category_name: string | null };
  product_noun: Attr<string>;
  brand: Attr<string | null>;
  product_name: Attr<string>;
  size: Attr<string>;
  format: Attr<string>;
  packaging: Attr<string>;
  processing_state: Attr<string>;
  temperature_regime: Attr<string>;
  certifications_visible: Attr<string[]>;
  kosher_marks_visible: Attr<string[]>;
  organic_claim: Attr<boolean>;
  origin_country: Attr<string | null>;
  label_languages: Attr<string[]>;
  label_claims: Attr<string[]>;
  overall_quality: "clear" | "partial" | "poor";
  flags: string[];
};

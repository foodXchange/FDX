export type PipV1 = {
  version: "1.0";
  generated_at: string;
  product: {
    name: string;
    raw_description: string;
  };
  category: {
    raw_text: string;
    category_id: string | null;
    category_name: string | null;
  };
  specifications: {
    formats: string[];
    packaging: string | null;
    sizes: string[];
  };
  compliance: {
    kosher_required: boolean;
    kosher_types: string[];
    certifications: string[];
    halal: boolean;
    organic: boolean;
  };
  commercial: {
    private_label: boolean | null;
    volume: string | null;
    urgency: string | null;
    target_market: string | null;
    budget: string | null;
  };
  match_config: {
    must_have: string[];
    nice_to_have: string[];
    dealbreakers: string[];
  };
};

export type SourcingRequestInput = {
  product_name: string | null;
  message: string | null;
  category: string | null;
  certifications: string[] | null;
  target_market: string | null;
  private_label: boolean | null;
  ai_analysis: Record<string, unknown> | null;
};

const KOSHER_KEYWORDS = [
  "kosher",
  "badatz",
  "beit yosef",
  "beit-yosef",
  "chief rabbinate",
  "ou kosher",
  "ok kosher",
  "ksa",
  "star-k",
  "ou",
];

function isKosherCert(cert: string): boolean {
  const lower = cert.toLowerCase().trim();
  return KOSHER_KEYWORDS.some((kw) => lower.includes(kw));
}

function splitFormats(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

export function buildPipV1(request: SourcingRequestInput): PipV1 {
  const ai = request.ai_analysis ?? {};
  const rawCerts = request.certifications ?? [];

  const kosherTypes: string[] = [];
  const otherCerts: string[] = [];

  for (const cert of rawCerts) {
    if (isKosherCert(cert)) {
      kosherTypes.push(cert);
    } else {
      otherCerts.push(cert);
    }
  }

  const kosherRequired = kosherTypes.length > 0;
  const halal = rawCerts.some((c) => c.toLowerCase().includes("halal"));
  const organic = rawCerts.some((c) => c.toLowerCase().includes("organic"));

  const packagingFormat = (ai.packaging_format as string) ?? null;
  const formats = splitFormats(packagingFormat);

  const approxSize = ai.approximate_size as string | undefined;
  const sizes = approxSize ? [approxSize] : [];

  const mustHave: string[] = [];
  if (kosherRequired) mustHave.push("kosher");
  if (request.private_label === true) mustHave.push("private_label");
  if (halal) mustHave.push("halal");

  const niceToHave: string[] = [];
  if (organic) niceToHave.push("organic");

  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    product: {
      name:
        request.product_name ??
        ((ai.product_name as string) || "") ??
        "",
      raw_description: request.message ?? "",
    },
    category: {
      raw_text: request.category ?? "",
      category_id: null,
      category_name: null,
    },
    specifications: {
      formats,
      packaging: packagingFormat,
      sizes,
    },
    compliance: {
      kosher_required: kosherRequired,
      kosher_types: kosherTypes,
      certifications: otherCerts,
      halal,
      organic,
    },
    commercial: {
      private_label: request.private_label ?? null,
      volume: (ai.volume as string) ?? null,
      urgency: (ai.urgency as string) ?? null,
      target_market: request.target_market ?? null,
      budget: (ai.budget as string) ?? null,
    },
    match_config: {
      must_have: mustHave,
      nice_to_have: niceToHave,
      dealbreakers: [],
    },
  };
}

import { resolveCategoryId } from "./resolveCategoryId";

/** Convenience wrapper: builds PIP and resolves category_id in one async call. */
export async function buildPipV1Full(request: SourcingRequestInput): Promise<PipV1> {
  const pip = buildPipV1(request);
  const { category_id, category_name } = await resolveCategoryId(request.category ?? "");
  pip.category.category_id = category_id;
  pip.category.category_name = category_name;
  return pip;
}

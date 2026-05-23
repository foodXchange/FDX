import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getEffectiveKosherTypes, getEffectiveCertifications } from "./factoryInheritance";
import { cleanRequestName, extractFormatHints } from "./cleanRequestName";
import { formatMatchSummary } from "./matchSuppliers";

export interface SourcingRequest {
  id: string;
  product_name: string;
  category: string | null;
  kosher_type: string | null;
  kosher_required: boolean | null;
  company: string | null;
  formats?: string[];
}

export interface ProductMatch {
  product_id: string;
  product_name: string;
  supplier_id: string;
  company_name: string;
  country: string;
  kosher_types: string[];
  certifications: string[];
  formats: string[];
  category: string;
  total_score: number;
  score_breakdown: {
    product_name_score: number;
    category_score: number;
    kosher_score: number;
    format_score: number;
    certification_score: number;
  };
  match_reasons: string[];
  match_summary: string;
}

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  kosher_types: string[] | null;
  certifications: string[] | null;
  formats: string[] | null;
  scrape_confidence: number;
  supplier_id: string;
  needs_review: boolean | null;
  factory: {
    kosher_types: string[];
    certifications_quality: string[];
    certifications_dietary: string[];
    is_primary: boolean;
  } | null;
  supplier: {
    id: string;
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
    priority: number | null;
  } | null;
};

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = [
  "the", "and", "for", "with", "from", "in", "of", "a", "an", "to", "is",
  "are", "was", "be", "has", "had", "not", "or", "but", "on", "at", "by",
  "gr", "kg", "liter", "pack", "pcs",
];

// ─── Semantic bridges (product-name level) ────────────────────────────────────

const SEMANTIC_BRIDGES: Record<string, string[]> = {
  "olive oil": ["evoo", "extra virgin", "virgin olive", "olio"],
  "evoo": ["extra virgin olive oil", "olive oil"],
  "sunflower": ["sunflower oil", "refined sunflower"],
  "tomato": ["tomato paste", "tomato puree", "passata", "tomato sauce", "tomatoes"],
  "wafer": ["wafers", "wafer cookies", "wafer cubes", "cream wafer"],
  "tuna": ["tuna fish", "canned tuna", "tuna in oil", "tuna in water"],
  "pasta": ["spaghetti", "penne", "fusilli", "pasta sauce", "pasta product"],
  "chocolate": ["dark chocolate", "milk chocolate", "cocoa"],
  "biscuit": ["cookie", "cracker", "biscuits", "cookies"],
  "chip": ["chips", "crisps", "vegetable chips", "snack chips"],
  "organic": ["bio", "biological", "natural", "eco"],
  "sultana": ["raisin", "dried grape", "dried fruit"],
  "couscous": ["cous cous", "grain"],
  "frozen": ["iqf", "freeze", "frozen"],
};

// ─── Scoring functions ────────────────────────────────────────────────────────

function scoreProductName(
  requestCleaned: string,
  requestKeywords: string[],
  supplierProductName: string
): number {
  const supplierLower = supplierProductName.toLowerCase();
  const requestLower = requestCleaned.toLowerCase();

  if (supplierLower === requestLower) return 100;
  if (supplierLower.includes(requestLower) || requestLower.includes(supplierLower)) return 90;

  let score = 0;

  const supplierWords = supplierLower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let keywordsMatched = 0;
  for (const kw of requestKeywords) {
    if (supplierWords.includes(kw) || supplierLower.includes(kw)) {
      keywordsMatched++;
    }
  }
  if (requestKeywords.length > 0) {
    score += (keywordsMatched / requestKeywords.length) * 70;
  }

  for (const [concept, terms] of Object.entries(SEMANTIC_BRIDGES)) {
    const requestHasConcept =
      requestLower.includes(concept) || terms.some((t) => requestLower.includes(t));
    const supplierHasConcept =
      supplierLower.includes(concept) || terms.some((t) => supplierLower.includes(t));
    if (requestHasConcept && supplierHasConcept) {
      score += 20;
      break;
    }
  }

  return Math.min(100, Math.round(score));
}

function scoreCategory(requestCategory: string | null, productCategory: string): number {
  if (!requestCategory) return 50;
  if (requestCategory === productCategory) return 100;

  const RELATED: Record<string, string[]> = {
    Snacks: ["Bakery", "Organic & Natural"],
    Bakery: ["Snacks", "Organic & Natural"],
    "Tomato Products": ["Sauces & Condiments", "Canned Foods"],
    "Sauces & Condiments": ["Tomato Products", "Canned Foods"],
    "Oils & Fats": ["Organic & Natural"],
    "Organic & Natural": [
      "Bakery",
      "Snacks",
      "Oils & Fats",
      "Ingredients & Additives",
    ],
  };

  if (RELATED[requestCategory]?.includes(productCategory)) return 60;
  return 0;
}

function scoreKosher(
  requestKosherType: string | null,
  productKosherTypes: string[]
): number {
  if (!requestKosherType) return 100;
  if (!productKosherTypes?.length) return 0;

  if (productKosherTypes.includes(requestKosherType)) return 100;

  if (
    requestKosherType === "Chief Rabbinate" &&
    (productKosherTypes.includes("Badatz") ||
      productKosherTypes.includes("Mehadrin") ||
      productKosherTypes.includes("Badatz Beit Yosef"))
  ) {
    return 100;
  }

  return 20;
}

function scoreFormats(requestFormatHints: string[], productFormats: string[]): number {
  if (!requestFormatHints.length) return 50;
  if (!productFormats.length) return 30;

  let matches = 0;
  for (const hint of requestFormatHints) {
    if (productFormats.some((f) => f.toLowerCase().includes(hint.toLowerCase()))) {
      matches++;
    }
  }
  return matches > 0 ? Math.min(100, matches * 40) : 20;
}

function scoreCertifications(productCertifications: string[]): number {
  const QUALITY_CERTS = ["BRC", "IFS", "FSSC 22000", "ISO 22000", "HACCP"];
  const count = productCertifications.filter((c) => QUALITY_CERTS.includes(c)).length;
  return Math.min(100, count * 25);
}

// ─── WhatsApp formatter (rank-aware) ─────────────────────────────────────────

export function formatProductMatchWhatsApp(
  request: { product_name: string; company: string | null },
  match: ProductMatch,
  rank = 1
): string {
  const div = "──────────────────";
  const lines: (string | null)[] = [
    `🔍 *Sourcing match — FoodXchange*`,
    ``,
    `Buyer: ${request.company ?? "Unknown"}`,
    `Product: ${request.product_name}`,
    ``,
    div,
    `*Match #${rank} — ${match.total_score}/100*`,
    `Supplier: *${match.company_name}* (${match.country || "—"})`,
    `Product: ${match.product_name}`,
    match.kosher_types.length > 0 ? `Kosher: ${match.kosher_types.join(", ")}` : null,
    match.certifications.length > 0
      ? `Certs: ${match.certifications.slice(0, 3).join(", ")}`
      : null,
    match.match_summary || null,
    div,
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function matchProducts(
  request: SourcingRequest,
  limit = 10,
  excludeSupplierIds: string[] = []
): Promise<ProductMatch[]> {
  const cleanedName = cleanRequestName(request.product_name);
  const formatHints = extractFormatHints(request.product_name);

  const keywords = cleanedName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.includes(w));

  const baseQuery = () =>
    supabaseAdmin
      .from("supplier_products")
      .select(
        `id, product_name, category, kosher_types, certifications,
         formats, scrape_confidence, supplier_id, needs_review,
         factory:supplier_factories(kosher_types, certifications_quality, certifications_dietary, is_primary),
         supplier:supplier_offerings!inner(id, company_name, country_of_origin, status, priority)`
      )
      .eq("is_published", true)
      .eq("supplier_offerings.status", "approved")
      .neq("needs_review", true)
      .limit(300);

  const { data: primaryData } = request.category
    ? await baseQuery().eq("category", request.category)
    : await baseQuery();

  let rows = (primaryData ?? []) as unknown as ProductRow[];

  // If category filter returned nothing, retry without it
  if (rows.length === 0 && request.category) {
    const { data: fallback } = await baseQuery();
    rows = (fallback ?? []) as unknown as ProductRow[];
  }

  if (excludeSupplierIds.length > 0) {
    rows = rows.filter((r) => !excludeSupplierIds.includes(r.supplier_id));
  }

  const scored: (ProductMatch | null)[] = rows.map((product) => {
    if (!product.supplier) return null;

    // Kosher hard filter using factory inheritance
    if (request.kosher_required === true) {
      const effectiveKosher = getEffectiveKosherTypes(product);
      if (effectiveKosher.length === 0) return null;
    }

    const effectiveKosherTypes = getEffectiveKosherTypes(product);
    const effectiveCerts = getEffectiveCertifications(product);

    const breakdown = {
      product_name_score: scoreProductName(cleanedName, keywords, product.product_name),
      category_score: scoreCategory(request.category, product.category),
      kosher_score: scoreKosher(request.kosher_type, effectiveKosherTypes),
      format_score: scoreFormats(formatHints, product.formats ?? []),
      certification_score: scoreCertifications(effectiveCerts),
    };

    const total_score = Math.round(
      breakdown.product_name_score * 0.5 +
        breakdown.category_score * 0.2 +
        breakdown.kosher_score * 0.15 +
        breakdown.format_score * 0.1 +
        breakdown.certification_score * 0.05
    );

    if (total_score < 30) return null;

    const reasons: string[] = [];
    if (breakdown.product_name_score >= 70) {
      reasons.push(`Keyword match: ${product.product_name}`);
    }
    if (breakdown.category_score === 100) {
      reasons.push(`Category match: ${product.category}`);
    } else if (breakdown.category_score === 60) {
      reasons.push(`Related category: ${product.category}`);
    }
    if (effectiveKosherTypes.length > 0) {
      reasons.push(`Kosher: ${effectiveKosherTypes.join(", ")}`);
    }
    if (breakdown.format_score > 50) {
      reasons.push(`Format match`);
    }
    if (breakdown.certification_score > 0) {
      const qualityCerts = effectiveCerts.filter((c) =>
        ["BRC", "IFS", "FSSC 22000", "ISO 22000", "HACCP"].includes(c)
      );
      if (qualityCerts.length > 0) {
        reasons.push(
          `${qualityCerts.length} certification match${qualityCerts.length > 1 ? "es" : ""}`
        );
      }
    }

    return {
      product_id: product.id,
      product_name: product.product_name,
      supplier_id: product.supplier_id,
      company_name: product.supplier.company_name,
      country: product.supplier.country_of_origin ?? "",
      kosher_types: effectiveKosherTypes,
      certifications: effectiveCerts,
      formats: product.formats ?? [],
      category: product.category,
      total_score,
      score_breakdown: breakdown,
      match_reasons: reasons,
      match_summary: formatMatchSummary(reasons),
    };
  });

  const valid = scored.filter((m): m is ProductMatch => m !== null);

  // Group by supplier — keep best-scoring product per supplier
  const bestPerSupplier = new Map<string, ProductMatch>();
  for (const match of valid) {
    const existing = bestPerSupplier.get(match.supplier_id);
    if (!existing || match.total_score > existing.total_score) {
      bestPerSupplier.set(match.supplier_id, match);
    }
  }

  return Array.from(bestPerSupplier.values())
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, limit);
}

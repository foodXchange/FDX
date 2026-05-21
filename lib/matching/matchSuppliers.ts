import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface SupplierMatch {
  supplier_id: string;
  company_name: string;
  country_of_origin: string | null;
  categories: string[];
  certifications: string[];
  formats: string[];
  markets_served: string[];
  product_type: string | null;
  primary_ingredients: string[];
  tags: string[];
  priority: number;
  score: number;
  score_breakdown: {
    tagHits: number;
    categoryHit: boolean;
    certHits: number;
    formatHits: number;
    marketHit: boolean;
    productTypeMatch: boolean;
    ingredientHit: boolean;
    priorityBonus: number;
  };
  match_reasons: string[];
}

export interface MatchRequestInput {
  product_name?: string | null;
  category?: string | null;
  certifications?: string[];
  formats?: string[];
  target_market?: string | null;
  private_label?: boolean | null;
  tags?: string[];
  product_type?: string | null;
  primary_ingredients?: string[];
  ai_analysis?: Record<string, unknown> | null;
  description?: string | null;
}

type SupplierRow = {
  id: string;
  company_name: string;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  formats: string[] | null;
  markets_served: string[] | null;
  product_type: string | null;
  primary_ingredients: string[] | null;
  tags: string[] | null;
  priority: number | null;
  private_label: boolean | null;
};

export async function matchSuppliers(
  request: MatchRequestInput,
  limit = 10
): Promise<SupplierMatch[]> {
  const { data: suppliers, error } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, country_of_origin, categories, certifications, formats, markets_served, product_type, primary_ingredients, tags, priority, private_label"
    )
    .eq("status", "approved");

  if (error || !suppliers) return [];

  const requestTags = [
    ...(request.tags ?? []),
    ...(request.certifications ?? []),
    request.product_name,
    request.category,
  ]
    .filter((t): t is string => Boolean(t))
    .map((t) => t.toLowerCase().trim());

  const requestCerts = (request.certifications ?? []).map((c) =>
    c.toLowerCase().trim()
  );

  const requestFormats = (request.formats ?? []).map((f) =>
    f.toLowerCase().trim()
  );

  const scored = (suppliers as SupplierRow[]).map((supplier) => {
    let score = 0;
    const breakdown = {
      tagHits: 0,
      categoryHit: false,
      certHits: 0,
      formatHits: 0,
      marketHit: false,
      productTypeMatch: false,
      ingredientHit: false,
      priorityBonus: 0,
    };
    const reasons: string[] = [];

    const supplierTags = (supplier.tags ?? []).map((t) => t.toLowerCase().trim());
    const supplierCerts = (supplier.certifications ?? []).map((c) => c.toLowerCase().trim());
    const supplierFormats = (supplier.formats ?? []).map((f) => f.toLowerCase().trim());
    const supplierCategories = (supplier.categories ?? []).map((c) => c.toLowerCase().trim());
    const supplierMarkets = (supplier.markets_served ?? []).map((m) => m.toLowerCase().trim());
    const supplierIngredients = (supplier.primary_ingredients ?? []).map((i) => i.toLowerCase().trim());

    // ── HARD FILTER: product type ──────────────────────────────────────────
    if (
      request.product_type === "pure_ingredient" &&
      supplier.product_type === "processed_food"
    ) {
      return {
        supplier_id: supplier.id,
        company_name: supplier.company_name,
        country_of_origin: supplier.country_of_origin,
        categories: supplier.categories ?? [],
        certifications: supplier.certifications ?? [],
        formats: supplier.formats ?? [],
        markets_served: supplier.markets_served ?? [],
        product_type: supplier.product_type,
        primary_ingredients: supplier.primary_ingredients ?? [],
        tags: supplier.tags ?? [],
        priority: supplier.priority ?? 0,
        score: 0,
        score_breakdown: breakdown,
        match_reasons: ["Excluded: processed food, not a pure ingredient supplier"],
      };
    }

    // ── PRODUCT TYPE MATCH (+5) ────────────────────────────────────────────
    if (
      supplier.product_type === "pure_ingredient" &&
      request.product_type === "pure_ingredient"
    ) {
      score += 5;
      breakdown.productTypeMatch = true;
      reasons.push("Pure ingredient supplier match");
    }

    // ── PRIMARY INGREDIENT MATCH (+10) ────────────────────────────────────
    if (request.product_name && supplierIngredients.length > 0) {
      const productWords = request.product_name
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length > 3);

      const ingredientMatch = supplierIngredients.some((ing) =>
        productWords.some(
          (word) => ing.includes(word) || word.includes(ing.split(" ")[0])
        )
      );

      if (ingredientMatch) {
        score += 10;
        breakdown.ingredientHit = true;
        reasons.push(`Primary ingredient match: ${request.product_name}`);
      }
    }

    // ── TAG OVERLAP (+3 per hit) ───────────────────────────────────────────
    requestTags.forEach((tag) => {
      const hit = supplierTags.some((st) => st.includes(tag) || tag.includes(st));
      if (hit) {
        score += 3;
        breakdown.tagHits += 1;
      }
    });
    if (breakdown.tagHits > 0) {
      reasons.push(`${breakdown.tagHits} keyword match${breakdown.tagHits > 1 ? "es" : ""}`);
    }

    // ── CATEGORY MATCH (+6) ───────────────────────────────────────────────
    if (request.category) {
      const catMatch = supplierCategories.some(
        (sc) =>
          sc.includes(request.category!.toLowerCase()) ||
          request.category!.toLowerCase().includes(sc)
      );
      if (catMatch) {
        score += 6;
        breakdown.categoryHit = true;
        reasons.push(`Category match: ${request.category}`);
      }
    }

    // ── CERTIFICATION MATCH (+4 per hit) ──────────────────────────────────
    requestCerts.forEach((cert) => {
      const hit = supplierCerts.some((sc) => sc.includes(cert) || cert.includes(sc));
      if (hit) {
        score += 4;
        breakdown.certHits += 1;
      }
    });
    if (breakdown.certHits > 0) {
      reasons.push(
        `${breakdown.certHits} certification match${breakdown.certHits > 1 ? "es" : ""}`
      );
    }

    // ── FORMAT MATCH (+3 per hit, fuzzy) ──────────────────────────────────
    requestFormats.forEach((fmt) => {
      const fmtWords = fmt.split(" ").filter((w) => w.length > 2);
      const hit = supplierFormats.some((sf) =>
        fmtWords.some((w) => sf.includes(w) || w.includes(sf))
      );
      if (hit) {
        score += 3;
        breakdown.formatHits += 1;
      }
    });

    // ── MARKET MATCH (+5) ─────────────────────────────────────────────────
    if (request.target_market) {
      const mktMatch = supplierMarkets.some((sm) =>
        sm.includes(request.target_market!.toLowerCase())
      );
      if (mktMatch) {
        score += 5;
        breakdown.marketHit = true;
        reasons.push(`Market match: ${request.target_market}`);
      }
    }

    // ── PRIVATE LABEL (+4) ────────────────────────────────────────────────
    if (request.private_label === true && supplier.private_label === true) {
      score += 4;
      reasons.push("Private label available");
    }

    // ── PRIORITY TIE-BREAKER ──────────────────────────────────────────────
    const priorityBonus = Math.min(supplier.priority ?? 0, 20) * 0.25;
    score += priorityBonus;
    breakdown.priorityBonus = priorityBonus;

    return {
      supplier_id: supplier.id,
      company_name: supplier.company_name,
      country_of_origin: supplier.country_of_origin,
      categories: supplier.categories ?? [],
      certifications: supplier.certifications ?? [],
      formats: supplier.formats ?? [],
      markets_served: supplier.markets_served ?? [],
      product_type: supplier.product_type,
      primary_ingredients: supplier.primary_ingredients ?? [],
      tags: supplier.tags ?? [],
      priority: supplier.priority ?? 0,
      score: Math.round(score * 10) / 10,
      score_breakdown: breakdown,
      match_reasons: reasons,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

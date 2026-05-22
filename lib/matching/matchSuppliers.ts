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
  match_summary?: string;
}

export interface ProductMatch {
  product_id: string;
  product_name: string;
  category: string;
  formats: string[];
  certifications: string[];
  kosher_types: string[];
  product_type: string | null;
  primary_ingredients: string[];
  tags: string[];
  private_label: boolean;
  scrape_confidence: number;
  supplier_id: string;
  company_name: string;
  country_of_origin: string | null;
  priority: number;
  score: number;
  score_breakdown: {
    tagHits: number;
    categoryHit: boolean;
    certHits: number;
    formatHits: number;
    ingredientHit: boolean;
    privateLabelMatch: boolean;
    priorityBonus: number;
    confidenceMultiplier: number;
  };
  match_reasons: string[];
  match_summary?: string;
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
  kosher_type?: string | null;
  packaging_preference?: string | null;
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

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  formats: string[] | null;
  certifications: string[] | null;
  kosher_types: string[] | null;
  product_type: string | null;
  primary_ingredients: string[] | null;
  tags: string[] | null;
  private_label: boolean | null;
  scrape_confidence: number;
  manually_verified: boolean | null;
  supplier_id: string;
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

// ─── Semantic matching constants ─────────────────────────────────────────────

const SEMANTIC_BRIDGES: Record<string, string[]> = {
  "Tomato Products": ["Sauces & Condiments", "Canned Foods"],
  "Sauces & Condiments": ["Tomato Products", "Canned Foods"],
  "Organic & Natural": ["Snacks", "Ingredients & Additives", "Beverages"],
  "Canned Foods": ["Pulses & Legumes", "Tomato Products", "Sauces & Condiments"],
  "Snacks": ["Bakery", "Organic & Natural"],
  "Oils & Fats": ["Ingredients & Additives"],
};

const GEO_BONUS: Record<string, number> = {
  Italy: 5, Spain: 5, Greece: 5, Cyprus: 4, Turkey: 4, Portugal: 4, France: 4,
  Egypt: 4, Jordan: 4, Morocco: 3, Bulgaria: 3, Poland: 3, Romania: 3,
  Serbia: 3, Croatia: 3, Netherlands: 3, Germany: 3, Israel: 2,
};

// ─── Factory kosher helpers ───────────────────────────────────────────────────

function getEffectiveKosherTypes(product: {
  kosher_types: string[] | null;
  factory?: { kosher_types: string[]; is_primary: boolean } | null;
}): string[] {
  if (product.factory?.kosher_types?.length) {
    return product.factory.kosher_types;
  }
  return product.kosher_types ?? [];
}

function getEffectiveCertifications(product: {
  certifications: string[] | null;
  factory?: { certifications_quality: string[]; certifications_dietary: string[] } | null;
}): string[] {
  const productCerts = product.certifications ?? [];
  if (!product.factory) return productCerts;
  const factoryCerts = [
    ...(product.factory.certifications_quality ?? []),
    ...(product.factory.certifications_dietary ?? []),
  ];
  return [...new Set([...productCerts, ...factoryCerts])];
}

// ─── Semantic tag similarity ──────────────────────────────────────────────────

function tagSimilarityScore(
  requestTags: string[],
  productTags: string[],
  requestProductName: string | null,
  productName: string
): number {
  const rSet = new Set(requestTags.map((t) => t.toLowerCase().trim()));
  const pSet = new Set(productTags.map((t) => t.toLowerCase().trim()));
  let overlap = 0;
  for (const tag of rSet) {
    if (pSet.has(tag)) {
      overlap++;
    } else {
      for (const pTag of pSet) {
        if (pTag.includes(tag) || tag.includes(pTag)) {
          overlap += 0.5;
          break;
        }
      }
    }
  }
  if (requestProductName) {
    const reqWords = requestProductName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const prodWords = productName.toLowerCase().split(/\s+/);
    for (const word of reqWords) {
      if (prodWords.some((pw) => pw.includes(word) || word.includes(pw))) {
        overlap += 2;
      }
    }
  }
  return overlap;
}

// ─── Human-readable match formatters ─────────────────────────────────────────

export function formatMatchSummary(reasons: string[]): string {
  return reasons
    .map((r) => {
      if (r.includes("Kosher") || r.includes("kosher"))
        return `✡ Kosher: ${r.split(":")[1]?.trim() ?? r}`;
      if (r.startsWith("Category match"))
        return `📦 Makes: ${r.split(":")[1]?.trim()}`;
      if (r.startsWith("Related category"))
        return `📦 Related: ${r.split(":")[1]?.trim()}`;
      if (r.startsWith("Keyword match"))
        return `🎯 Match: ${r.split(":")[1]?.trim()}`;
      if (r.startsWith("Format match"))
        return `📐 Format: ${r.split(":")[1]?.trim()}`;
      if (r.startsWith("Geographic"))
        return `🌍 Location: ${r.split(":")[1]?.trim()}`;
      if (r.includes("Private label"))
        return `🏷️ Private label available`;
      if (r.includes("certification"))
        return `✓ ${r.split(":")[1]?.trim() ?? r}`;
      if (r.includes("Ingredient"))
        return `🌿 Ingredient: ${r.split(":")[1]?.trim()}`;
      if (r.startsWith("Product:"))
        return `📦 Product: ${r.split(":")[1]?.trim()}`;
      return r;
    })
    .filter(Boolean)
    .join(" · ");
}

export function formatWhatsAppMatch(
  request: { product_name?: string | null; company?: string | null },
  match: ProductMatch,
  rank = 1,
  slug?: string
): string {
  const div = "──────────────────";
  const lines: (string | null)[] = [
    `🔍 *Sourcing match — FoodXchange*`,
    ``,
    `Buyer: ${request.company ?? "Unknown"}`,
    `Product: ${request.product_name ?? "—"}`,
    ``,
    div,
    `*Match #${rank} — ${Math.round(match.score)}/100*`,
    `Supplier: *${match.company_name}* (${match.country_of_origin ?? "—"})`,
    `Product: ${match.product_name}`,
    match.kosher_types.length > 0 ? `Kosher: ${match.kosher_types.join(", ")}` : null,
    match.certifications.length > 0
      ? `Certs: ${match.certifications.slice(0, 3).join(", ")}`
      : null,
    match.match_summary ?? null,
    div,
    slug ? `Request details: fdx.trading/${slug}` : null,
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

export function formatMultiMatchWhatsApp(
  request: { product_name?: string | null; company?: string | null },
  matches: ProductMatch[],
  slug?: string
): string {
  const div = "──────────────────";
  const header = [
    `🔍 *Sourcing matches — FoodXchange*`,
    ``,
    `Buyer: ${request.company ?? "Unknown"}`,
    `Product: ${request.product_name ?? "—"}`,
  ].join("\n");

  const cards = matches
    .map((m, i) => {
      const lines: (string | null)[] = [
        div,
        `*Match #${i + 1} — ${Math.round(m.score)}/100*`,
        `Supplier: *${m.company_name}* (${m.country_of_origin ?? "—"})`,
        `Product: ${m.product_name}`,
        m.kosher_types.length > 0 ? `Kosher: ${m.kosher_types.join(", ")}` : null,
        m.certifications.length > 0
          ? `Certs: ${m.certifications.slice(0, 3).join(", ")}`
          : null,
        m.match_summary ?? null,
      ];
      return lines.filter((l): l is string => l !== null).join("\n");
    })
    .join("\n");

  const footer = slug ? `${div}\nRequest: fdx.trading/${slug}` : div;
  return [header, cards, footer].join("\n");
}

// ─── Product-level matching ───────────────────────────────────────────────────

export async function matchSupplierProducts(
  request: MatchRequestInput,
  limit = 10,
  excludeSupplierIds: string[] = []
): Promise<ProductMatch[]> {
  const { data, error } = await supabaseAdmin
    .from("supplier_products")
    .select(
      `id, product_name, category, formats, certifications, kosher_types,
       product_type, primary_ingredients, tags, private_label, scrape_confidence, manually_verified,
       supplier_id,
       factory:supplier_factories(kosher_types, certifications_quality, certifications_dietary, is_primary),
       supplier:supplier_offerings!inner(id, company_name, country_of_origin, status, priority)`
    )
    .eq("supplier_offerings.status", "approved")
    .neq("needs_review", true);

  if (error || !data) return [];

  const rows = data as unknown as ProductRow[];

  const filteredRows =
    excludeSupplierIds.length > 0
      ? rows.filter((r) => !excludeSupplierIds.includes(r.supplier_id))
      : rows;

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

  const scored: (ProductMatch | null)[] = filteredRows.map((product) => {
    if (!product.supplier) return null;

    // ── HARD FILTER: kosher compatibility ─────────────────────────────────
    // Factory kosher overrides product-level (source of truth)
    if (request.kosher_type && request.kosher_type !== "none") {
      const effectiveKosher = getEffectiveKosherTypes(product);
      if (effectiveKosher.length === 0) return null;
      const reqKosher = request.kosher_type.toLowerCase();
      const compatible = effectiveKosher.map((k) => k.toLowerCase()).some(
        (k) => k.includes(reqKosher) || reqKosher.includes(k) || k.includes("kosher")
      );
      if (!compatible) return null;
    }

    // ── HARD FILTER: product type ──────────────────────────────────────────
    if (
      request.product_type === "pure_ingredient" &&
      product.product_type === "processed_food"
    ) {
      return null;
    }

    let baseScore = 0;
    const breakdown = {
      tagHits: 0,
      categoryHit: false,
      certHits: 0,
      formatHits: 0,
      ingredientHit: false,
      privateLabelMatch: false,
      priorityBonus: 0,
      confidenceMultiplier: product.scrape_confidence,
    };
    const reasons: string[] = [];

    const productTags = (product.tags ?? []).map((t) => t.toLowerCase().trim());
    const effectiveCerts = getEffectiveCertifications(product);
    const productCerts = effectiveCerts.map((c) => c.toLowerCase().trim());
    const productFormats = (product.formats ?? []).map((f) =>
      f.toLowerCase().trim()
    );
    const productIngredients = (product.primary_ingredients ?? []).map((i) =>
      i.toLowerCase().trim()
    );

    // ── TAG OVERLAP (+3 per hit) ───────────────────────────────────────────
    requestTags.forEach((tag) => {
      const hit = productTags.some((pt) => pt.includes(tag) || tag.includes(pt));
      if (hit) {
        baseScore += 3;
        breakdown.tagHits += 1;
      }
    });
    if (breakdown.tagHits > 0) {
      reasons.push(
        `${breakdown.tagHits} keyword match${breakdown.tagHits > 1 ? "es" : ""}`
      );
    }

    // ── CATEGORY MATCH (+6) ───────────────────────────────────────────────
    if (request.category) {
      const catLower = request.category.toLowerCase();
      const catMatch =
        product.category.toLowerCase().includes(catLower) ||
        catLower.includes(product.category.toLowerCase());
      if (catMatch) {
        baseScore += 6;
        breakdown.categoryHit = true;
        reasons.push(`Category match: ${request.category}`);
      }
    }

    // ── CROSS-CATEGORY SEMANTIC BRIDGE (+4) ───────────────────────────────
    if (request.category && !breakdown.categoryHit) {
      const bridges = SEMANTIC_BRIDGES[request.category] ?? [];
      if (bridges.includes(product.category)) {
        baseScore += 4;
        reasons.push(`Related category: ${product.category}`);
      }
    }

    // ── SEMANTIC TAG SIMILARITY (capped at +15) ────────────────────────────
    const tagScore = tagSimilarityScore(
      request.tags ?? [],
      product.tags ?? [],
      request.product_name ?? null,
      product.product_name
    );
    if (tagScore > 0) {
      baseScore += Math.min(tagScore * 2, 15);
      if (tagScore >= 2) {
        reasons.push(`Keyword match: ${product.product_name}`);
      }
    }

    // ── CERTIFICATION MATCH (+4 per hit) ──────────────────────────────────
    requestCerts.forEach((cert) => {
      const hit = productCerts.some((pc) => pc.includes(cert) || cert.includes(pc));
      if (hit) {
        baseScore += 4;
        breakdown.certHits += 1;
      }
    });
    if (breakdown.certHits > 0) {
      reasons.push(
        `${breakdown.certHits} certification match${breakdown.certHits > 1 ? "es" : ""}`
      );
    }

    // ── FORMAT PREFERENCE (+6) ─────────────────────────────────────────────
    if (request.packaging_preference && (product.formats ?? []).length > 0) {
      const reqFmt = request.packaging_preference.toLowerCase();
      const hit = (product.formats ?? []).some(
        (f) => f.toLowerCase().includes(reqFmt) || reqFmt.includes(f.toLowerCase())
      );
      if (hit) {
        baseScore += 6;
        reasons.push(`Format match: ${request.packaging_preference}`);
      }
    }

    // ── FORMAT MATCH (+3 per hit, fuzzy) ──────────────────────────────────
    requestFormats.forEach((fmt) => {
      const fmtWords = fmt.split(" ").filter((w) => w.length > 2);
      const hit = productFormats.some((pf) =>
        fmtWords.some((w) => pf.includes(w) || w.includes(pf))
      );
      if (hit) {
        baseScore += 3;
        breakdown.formatHits += 1;
      }
    });

    // ── PRIMARY INGREDIENT MATCH (+10) ────────────────────────────────────
    if (request.product_name && productIngredients.length > 0) {
      const productWords = request.product_name
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length > 3);

      const ingredientMatch = productIngredients.some((ing) =>
        productWords.some(
          (word) => ing.includes(word) || word.includes(ing.split(" ")[0])
        )
      );

      if (ingredientMatch) {
        baseScore += 10;
        breakdown.ingredientHit = true;
        reasons.push(`Ingredient match: ${request.product_name}`);
      }
    }

    // ── GEOGRAPHIC PROXIMITY (+1 to +5) ────────────────────────────────────
    const geoBonus = GEO_BONUS[product.supplier?.country_of_origin ?? ""] ?? 0;
    if (geoBonus > 0) {
      baseScore += geoBonus;
      reasons.push(`Geographic advantage: ${product.supplier?.country_of_origin}`);
    }

    // ── PRIVATE LABEL (+4) ────────────────────────────────────────────────
    if (request.private_label === true && product.private_label === true) {
      baseScore += 4;
      breakdown.privateLabelMatch = true;
      reasons.push("Private label available");
    }

    // ── CONFIDENCE MULTIPLIER ─────────────────────────────────────────────
    const confidence = product.scrape_confidence ?? 0.5;
    const confidenceScore = baseScore * confidence;

    // ── PRIORITY TIE-BREAKER ──────────────────────────────────────────────
    const priorityBonus = Math.min(product.supplier.priority ?? 0, 20) * 0.25;
    breakdown.priorityBonus = priorityBonus;

    const verifiedBonus = product.manually_verified ? 5 : 0;
    const finalScore = confidenceScore + priorityBonus + verifiedBonus;

    if (finalScore <= 0) return null;

    return {
      product_id: product.id,
      product_name: product.product_name,
      category: product.category,
      formats: product.formats ?? [],
      certifications: product.certifications ?? [],
      kosher_types: product.kosher_types ?? [],
      product_type: product.product_type,
      primary_ingredients: product.primary_ingredients ?? [],
      tags: product.tags ?? [],
      private_label: product.private_label ?? false,
      scrape_confidence: confidence,
      supplier_id: product.supplier.id,
      company_name: product.supplier.company_name,
      country_of_origin: product.supplier.country_of_origin,
      priority: product.supplier.priority ?? 0,
      score: Math.round(finalScore * 10) / 10,
      score_breakdown: breakdown,
      match_reasons: reasons,
      match_summary: formatMatchSummary(reasons),
    };
  });

  const validScored = scored.filter((p): p is ProductMatch => p !== null);

  // Group by supplier — keep best-scoring product per supplier
  const bestPerSupplier = new Map<string, ProductMatch>();
  for (const match of validScored) {
    const existing = bestPerSupplier.get(match.supplier_id);
    if (!existing || match.score > existing.score) {
      bestPerSupplier.set(match.supplier_id, match);
    }
  }

  return Array.from(bestPerSupplier.values())
    .filter((m) => m.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Company-level matching (original logic) ──────────────────────────────────

async function matchSuppliersCompanyLevel(
  request: MatchRequestInput,
  limit: number
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
    const supplierCerts = (supplier.certifications ?? []).map((c) =>
      c.toLowerCase().trim()
    );
    const supplierFormats = (supplier.formats ?? []).map((f) =>
      f.toLowerCase().trim()
    );
    const supplierCategories = (supplier.categories ?? []).map((c) =>
      c.toLowerCase().trim()
    );
    const supplierMarkets = (supplier.markets_served ?? []).map((m) =>
      m.toLowerCase().trim()
    );
    const supplierIngredients = (supplier.primary_ingredients ?? []).map((i) =>
      i.toLowerCase().trim()
    );

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
      reasons.push(
        `${breakdown.tagHits} keyword match${breakdown.tagHits > 1 ? "es" : ""}`
      );
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
      match_summary: formatMatchSummary(reasons),
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function matchSuppliers(
  request: MatchRequestInput,
  limit = 10
): Promise<SupplierMatch[]> {
  // Try product-level matching first
  const productMatches = await matchSupplierProducts(request, limit);

  if (productMatches.length >= 3) {
    // Good product-level matches — convert to SupplierMatch format
    return productMatches.map((pm) => ({
      supplier_id: pm.supplier_id,
      company_name: pm.company_name,
      country_of_origin: pm.country_of_origin,
      categories: [pm.category],
      certifications: pm.certifications,
      formats: pm.formats,
      markets_served: [],
      product_type: pm.product_type,
      primary_ingredients: pm.primary_ingredients,
      tags: pm.tags,
      priority: pm.priority,
      score: pm.score,
      score_breakdown: {
        tagHits: pm.score_breakdown.tagHits,
        categoryHit: pm.score_breakdown.categoryHit,
        certHits: pm.score_breakdown.certHits,
        formatHits: pm.score_breakdown.formatHits,
        marketHit: false,
        productTypeMatch: pm.product_type === request.product_type,
        ingredientHit: pm.score_breakdown.ingredientHit,
        priorityBonus: pm.score_breakdown.priorityBonus,
      },
      match_reasons: [
        `Product: ${pm.product_name}`,
        ...pm.match_reasons,
      ],
      match_summary: pm.match_summary,
    }));
  }

  // Fall back to company-level matching
  return matchSuppliersCompanyLevel(request, limit);
}

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ExtractedProduct } from "./extract";

const PRODUCT_BUCKET = "product-images";
const LOGO_BUCKET = "supplier-logos";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REJECT_PRODUCT_IMAGE_RE =
  /\b(logo|flag|icon|favicon|footer|header|banner|sprite|avatar|loader|placeholder|world-|badge|cert|iso-|sticky|facebook|instagram|linkedin|twitter|youtube|whatsapp|certific)\b/i;

const LOGO_URL_HINT_RE = /\b(logo|brand|identity|marque|header-logo|site-logo)\b/i;

export function toAbsoluteUrl(rawUrl: string | null | undefined, baseUrl: string | null | undefined): string | null {
  if (!rawUrl || !baseUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    const base = /^https?:\/\//i.test(baseUrl.trim())
      ? baseUrl.trim()
      : `https://${baseUrl.trim()}`;
    return new URL(trimmed, base).href;
  } catch {
    return null;
  }
}

export function getDomainFaviconUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const base = /^https?:\/\//i.test(website.trim())
      ? website.trim()
      : `https://${website.trim()}`;
    const u = new URL(base);
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
      `${u.protocol}//${u.hostname}`
    )}&size=128`;
  } catch {
    return null;
  }
}

export function isValidProductImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:")) return false;
  if (/\.svg(\?|#|$)/i.test(url)) return false;
  if (REJECT_PRODUCT_IMAGE_RE.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

export interface MarkdownImageCandidate {
  url: string;
  alt: string;
  context: string;
}

/**
 * Extracts all image candidates (`![alt](url)` and `OG_IMAGE: url`) from crawled markdown text.
 */
export function extractImagesFromCrawledContent(
  content: string,
  supplierWebsite: string | null
): {
  productImages: MarkdownImageCandidate[];
  logoCandidates: string[];
} {
  const productImages: MarkdownImageCandidate[] = [];
  const logoCandidates: string[] = [];
  const seenProd = new Set<string>();
  const seenLogo = new Set<string>();

  if (!content || !supplierWebsite) {
    return { productImages, logoCandidates };
  }

  // 1. Check explicit OG_IMAGE lines injected during crawl
  const ogMatches = content.matchAll(/^OG_IMAGE:\s*(https?:\/\/\S+)/gim);
  for (const m of ogMatches) {
    const abs = toAbsoluteUrl(m[1], supplierWebsite);
    if (!abs) continue;
    if (LOGO_URL_HINT_RE.test(abs)) {
      if (!seenLogo.has(abs)) {
        seenLogo.add(abs);
        logoCandidates.push(abs);
      }
    } else if (isValidProductImageUrl(abs) && !seenProd.has(abs)) {
      seenProd.add(abs);
      productImages.push({ url: abs, alt: "og_image", context: "" });
    }
  }

  // 2. Scan markdown image links: ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(content)) !== null) {
    const alt = (match[1] ?? "").trim();
    const rawUrl = (match[2] ?? "").trim();
    const abs = toAbsoluteUrl(rawUrl, supplierWebsite);
    if (!abs) continue;

    // Check if it looks like a company logo
    if (
      LOGO_URL_HINT_RE.test(abs) ||
      /\blogo\b/i.test(alt)
    ) {
      if (!seenLogo.has(abs)) {
        seenLogo.add(abs);
        logoCandidates.push(abs);
      }
      continue;
    }

    if (!isValidProductImageUrl(abs) || seenProd.has(abs)) continue;
    seenProd.add(abs);

    const start = Math.max(0, match.index - 160);
    const end = Math.min(content.length, match.index + match[0].length + 160);
    const context = content.slice(start, end).replace(/\s+/g, " ");
    productImages.push({ url: abs, alt, context });
  }

  return { productImages, logoCandidates };
}

/**
 * Matches an extracted product to the best candidate image from the crawled content
 * if the LLM didn't already populate a valid `image_url`.
 */
export function matchProductToCrawledImage(
  product: ExtractedProduct,
  candidates: MarkdownImageCandidate[],
  supplierWebsite: string | null
): string | null {
  if (product.image_url) {
    const abs = toAbsoluteUrl(product.image_url, supplierWebsite);
    if (abs && isValidProductImageUrl(abs)) {
      return abs;
    }
  }

  if (candidates.length === 0) return null;

  const words = [
    ...(product.product_name ?? "").toLowerCase().split(/[^a-z0-9]+/),
    ...(product.subcategory ?? "").toLowerCase().split(/[^a-z0-9]+/),
    ...(product.primary_ingredients ?? []).flatMap((ing) => ing.toLowerCase().split(/[^a-z0-9]+/)),
  ].filter((w) => w.length >= 3);

  const catWords = [
    ...(product.category ?? "").toLowerCase().split(/[^a-z0-9]+/),
    ...(product.tags ?? []).flatMap((t) => t.toLowerCase().split(/[^a-z0-9]+/)),
  ].filter((w) => w.length >= 3);

  let bestUrl: string | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const hayUrlAndAlt = `${c.url} ${c.alt}`.toLowerCase();
    const hayContext = c.context.toLowerCase();
    let score = 0;

    for (const w of words) {
      if (hayUrlAndAlt.includes(w)) score += 4;
      else if (hayContext.includes(w)) score += 2;
    }
    for (const cw of catWords) {
      if (hayUrlAndAlt.includes(cw)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUrl = c.url;
    }
  }

  return bestScore >= 2 ? bestUrl : null;
}

/**
 * Derives normalized dietary booleans, temperature regime, ingredients text, and source_url
 * from an ExtractedProduct so Buyer Portal & AI Sourcing filters work out-of-the-box.
 */
export function deriveProductQualityFields(
  p: ExtractedProduct,
  supplierWebsite: string | null
) {
  const certsAndTags = [
    ...(p.certifications ?? []),
    ...(p.tags ?? []),
    p.product_name ?? "",
    p.category ?? "",
    p.subcategory ?? "",
    p.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const is_organic = /\b(organic|bio|biologico|biologique|ecologico|ecológico|eu organic|usda organic)\b/i.test(
    certsAndTags
  );
  const is_halal = /\b(halal)\b/i.test(certsAndTags);
  const is_gluten_free = /\b(gluten[- ]?free|senza glutine|sin gluten|sans gluten|bezglutenowy|glutenfrei)\b/i.test(
    certsAndTags
  );
  const is_sugar_free = /\b(sugar[- ]?free|no added sugar|zero sugar|senza zucchero|sin azucar|sans sucre|zuckerfrei|bez cukru)\b/i.test(
    certsAndTags
  );

  // New Free-From & Functional Food Detection (Multilingual: English, Italian, Spanish, French, German, Polish, Hebrew)
  const is_high_protein = /\b(protein|high[- ]?protein|protein[- ]?rich|ad alto contenuto proteico|rico en prote[ií]nas|riche en prot[eé]ines|eiweissreich|wysokobia[lł]kowe|חלבון|עשיר בחלבון)\b/i.test(
    certsAndTags
  );
  const is_vegan = /\b(vegan|100% plant[- ]?based|vegano|v[eé]g[eé]tal|wega[nń]skie|טבעוני)\b/i.test(
    certsAndTags
  );
  const is_lactose_free = /\b(lactose[- ]?free|dairy[- ]?free|senza lattosio|sin lactosa|sans lactose|laktosefrei|bez laktozy|ללא לקטוז)\b/i.test(
    certsAndTags
  );
  const is_nut_free = /\b(nut[- ]?free|peanut[- ]?free|senza frutta a guscio|sin frutos secos|sans fruits [aà] coque|nussfrei|bez orzech[oó]w|ללא אגוזים|ללא בוטנים)\b/i.test(
    certsAndTags
  );

  const kosherText = [
    ...(p.kosher_types ?? []),
    ...(p.certifications ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let kosher_level: string | null = null;
  if (/\b(badatz|mehadrin|beit yosef|edah hachareidis|landau|rubin)\b/i.test(kosherText)) {
    kosher_level = "mehadrin";
  } else if (
    (p.kosher_types && p.kosher_types.length > 0) ||
    /\b(kosher|kasher|casher|ou|ok|star-k|kf|rabbinate)\b/i.test(kosherText)
  ) {
    kosher_level = "regular";
  }

  const rawTemp = (p.storage_temp ?? p.processing_type ?? p.category ?? "").toLowerCase();
  let storage_temp: string = "ambient";
  if (/\b(frozen|iqf|-18|deep freeze|ice cream|gelato)\b/i.test(`${rawTemp} ${certsAndTags}`)) {
    storage_temp = "frozen";
  } else if (
    /\b(chilled|refrigerated|fresh|dairy|cheese|yogurt|fresh meat|fresh fish|0-4)\b/i.test(
      `${rawTemp} ${p.category ?? ""} ${p.subcategory ?? ""}`
    )
  ) {
    storage_temp = "chilled";
  }

  const ingredients =
    typeof p.ingredients === "string" && p.ingredients.trim().length > 0
      ? p.ingredients.trim()
      : Array.isArray(p.primary_ingredients) && p.primary_ingredients.length > 0
        ? p.primary_ingredients.join(", ")
        : null;

  const source_url =
    toAbsoluteUrl(p.source_url ?? null, supplierWebsite) ?? supplierWebsite ?? null;

  // Normalization for Packaging Formats & Sizes if missing or sparse
  const textForSizesAndFormats = `${p.product_name ?? ""} ${p.description ?? ""} ${p.formats?.join(" ") ?? ""}`;

  // Extract weight/volume measurements: e.g., 750ml, 1L, 200g, 2.5kg, 5kg, 200L, 500g
  const sizeMatches = textForSizesAndFormats.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|dl|l|liters?|litres?|g|gr|grams?|kg|kilos?|kilograms?|oz|lbs?|gal)\b/gi);
  const derivedSizes: string[] = Array.isArray(p.sizes) ? [...p.sizes] : [];
  if (sizeMatches) {
    for (const sm of sizeMatches) {
      const clean = sm.trim();
      if (!derivedSizes.some((s) => s.toLowerCase() === clean.toLowerCase())) {
        derivedSizes.push(clean);
      }
    }
  }

  // Extract packaging formats: e.g., bottle, jar, can, tin, pouch, box, bag, drum, tub
  const derivedFormats: string[] = Array.isArray(p.formats) ? [...p.formats] : [];
  const formatMap: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(glass bottle|bottle|bottles|bottiglia|botella|bouteille|flasche)\b/i, label: "Bottle" },
    { pattern: /\b(glass jar|jar|jars|vaso|barattolo|bocal|glas)\b/i, label: "Jar" },
    { pattern: /\b(can|cans|tin|tins|lattina|lata|boite|dose)\b/i, label: "Can / Tin" },
    { pattern: /\b(pouch|pouches|stand[- ]?up pouch|doypack|busta)\b/i, label: "Pouch / Doypack" },
    { pattern: /\b(box|carton|case|scatola|caja|karton)\b/i, label: "Box / Carton" },
    { pattern: /\b(bag|sachet|sacchetto|bolsa|beutel)\b/i, label: "Bag" },
    { pattern: /\b(drum|barrel|fusto|tambor|fass)\b/i, label: "Drum" },
    { pattern: /\b(tray|vaschetta|bandeja|barquette|schale)\b/i, label: "Tray" },
    { pattern: /\b(tub|bucket|secchiello|cubo|eimer)\b/i, label: "Tub / Bucket" },
  ];
  for (const fm of formatMap) {
    if (fm.pattern.test(textForSizesAndFormats)) {
      if (!derivedFormats.some((f) => f.toLowerCase() === fm.label.toLowerCase())) {
        derivedFormats.push(fm.label);
      }
    }
  }

  // Derive precise Commercial Target Channel (Retail, Foodservice / HoReCa, Industry / Ingredients)
  const combinedChannelText = `${p.product_name ?? ""} ${p.description ?? ""} ${p.category ?? ""} ${textForSizesAndFormats}`.toLowerCase();
  const markets: string[] = Array.isArray(p.markets_suitable) ? [...p.markets_suitable] : [];

  const isIndustrialIndicator =
    /\b(bulk|industrial|industry|ingredients?|raw material|food industry|b2b processing|aseptic|flexitank|drum|barrel|tote|ibc|multi[- ]?ply|25\s*kg|50\s*kg|100\s*kg|200\s*kg|1000\s*l|500\s*kg)\b/i.test(combinedChannelText);

  const isFoodserviceIndicator =
    /\b(horeca|foodservice|food service|catering|restaurant|hotel|chef|pizzeria|bakery|cafeteria|canteen|bag[- ]in[- ]box|bib|dispenser|5\s*kg|10\s*kg|3\s*kg|2\.5\s*kg|5\s*l|10\s*l|portion pack|single serve)\b/i.test(combinedChannelText);

  const isRetailIndicator =
    /\b(retail|supermarket|grocery|hypermarket|consumer pack|shelf[- ]ready|srp|barcode|ean|750\s*ml|500\s*ml|250\s*ml|100\s*g|200\s*g|250\s*g|300\s*g|400\s*g|500\s*g|1\s*kg)\b/i.test(combinedChannelText);

  if (isIndustrialIndicator && !markets.includes("Industry")) {
    markets.push("Industry");
  }
  if (isFoodserviceIndicator && !markets.includes("Foodservice")) {
    markets.push("Foodservice");
  }
  if (isRetailIndicator && !markets.includes("Retail")) {
    markets.push("Retail");
  }
  // Default fallback if unspecified: if small format -> Retail, else default Retail & Foodservice
  if (markets.length === 0) {
    if (derivedFormats.includes("Drum") || isIndustrialIndicator) {
      markets.push("Industry");
    } else {
      markets.push("Retail", "Foodservice");
    }
  }

  return {
    storage_temp,
    temperature_regime: storage_temp,
    processing_type: p.processing_type ?? null,
    ingredients,
    source_url,
    sizes: derivedSizes.slice(0, 10),
    formats: derivedFormats.slice(0, 10),
    markets_suitable: markets,
    is_organic,
    is_halal,
    is_gluten_free,
    is_sugar_free,
    kosher_level,
    is_high_protein,
    is_vegan,
    is_lactose_free,
    is_nut_free,
  };
}

/**
 * Builds a rich semantic embedding string for a product including category, ingredients,
 * packaging formats, and certifications so vector search matches B2B buyer specs.
 */
export function buildRichProductEmbeddingText(p: ExtractedProduct): string {
  const dietaryClaims: string[] = [];
  const certsAndTags = [
    ...(p.certifications ?? []),
    ...(p.tags ?? []),
    p.product_name ?? "",
    p.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(organic|bio|biologico|biologique|ecologico)\b/i.test(certsAndTags)) dietaryClaims.push("Organic / Bio");
  if (/\b(gluten[- ]?free|senza glutine|sin gluten|sans gluten)\b/i.test(certsAndTags)) dietaryClaims.push("Gluten-Free");
  if (/\b(sugar[- ]?free|no added sugar|zero sugar)\b/i.test(certsAndTags)) dietaryClaims.push("Sugar-Free");
  if (/\b(protein|high[- ]?protein|protein[- ]?rich)\b/i.test(certsAndTags)) dietaryClaims.push("High Protein");
  if (/\b(vegan|plant[- ]?based|vegano)\b/i.test(certsAndTags)) dietaryClaims.push("Vegan / 100% Plant-Based");
  if (/\b(lactose[- ]?free|dairy[- ]?free|senza lattosio)\b/i.test(certsAndTags)) dietaryClaims.push("Lactose-Free / Dairy-Free");
  if (/\b(nut[- ]?free|peanut[- ]?free)\b/i.test(certsAndTags)) dietaryClaims.push("Nut-Free / Allergen-Free");
  if (p.kosher_types?.length || /\b(kosher|kasher)\b/i.test(certsAndTags)) {
    dietaryClaims.push(`Kosher (${p.kosher_types?.join(", ") || "Certified"})`);
  }
  if (/\b(halal)\b/i.test(certsAndTags)) dietaryClaims.push("Halal Certified");

  const parts = [
    p.product_name?.trim(),
    p.category?.trim(),
    p.subcategory?.trim(),
    p.description?.trim(),
    dietaryClaims.length ? `Dietary & Free-From: ${dietaryClaims.join(", ")}` : null,
    p.primary_ingredients?.length ? `Ingredients: ${p.primary_ingredients.join(", ")}` : null,
    p.formats?.length ? `Packaging: ${p.formats.join(", ")}` : null,
    p.certifications?.length ? `Certifications: ${p.certifications.join(", ")}` : null,
    p.tags?.filter(Boolean).join(". ").trim() || null,
  ]
    .filter(Boolean)
    .join(". ");
  return (parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".").replace(/\s+\./g, ".");
}

function sanitizeFilename(url: string): string {
  let name = "product";
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    if (last) name = last;
  } catch {}
  name = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 70);
  if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) name += ".jpg";
  return name;
}

/**
 * Downloads an external product image and re-hosts it to Supabase Storage (`product-images`)
 * so hotlink protection / expiring URLs never break the catalog UI.
 */
export async function rehostProductImageToStorage(
  supplierId: string,
  imageUrl: string,
  index = 0
): Promise<string> {
  if (imageUrl.includes(".supabase.co/storage/")) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return imageUrl;

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("image/")) return imageUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 800) return imageUrl; // skip 1x1 tracking pixels

    const filename = `scraped-${index}-${sanitizeFilename(imageUrl)}`;
    const path = `${supplierId}/${filename}`;

    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_BUCKET)
      .upload(path, buffer, { contentType: ct, upsert: true });

    if (error) return imageUrl;

    const { data: pub } = supabaseAdmin.storage
      .from(PRODUCT_BUCKET)
      .getPublicUrl(path);
    return pub.publicUrl || imageUrl;
  } catch {
    return imageUrl;
  }
}

/**
 * Re-hosts a supplier logo to `supplier-logos` in Supabase Storage, or falls back to the URL.
 */
export async function rehostSupplierLogoToStorage(
  supplierId: string,
  logoUrl: string
): Promise<string> {
  if (logoUrl.includes(".supabase.co/storage/") || logoUrl.includes("gstatic.com/faviconV2")) {
    return logoUrl;
  }

  try {
    const res = await fetch(logoUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return logoUrl;

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("image/")) return logoUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 200) return logoUrl;

    const ext = ct.includes("svg")
      ? "svg"
      : ct.includes("png")
        ? "png"
        : ct.includes("webp")
          ? "webp"
          : "jpg";
    const path = `${supplierId}/logo.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .upload(path, buffer, { contentType: ct, upsert: true });

    if (error) return logoUrl;

    const { data: pub } = supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(path);
    return pub.publicUrl || logoUrl;
  } catch {
    return logoUrl;
  }
}

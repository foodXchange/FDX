// Firecrawl-powered product image fill — scrapes top matched suppliers'
// websites for real product images, re-hosts them to Supabase Storage
// (bucket "product-images") to dodge hotlink 403s, and assigns them to
// products by category/keyword matching. Falls back to a Perplexity web
// search (sonar) for products that get no confident
// Firecrawl match, gated on PERPLEXITY_API_KEY.
//
// Run: npx tsx scripts/fill-images-homepage-firecrawl.ts
//      npx tsx scripts/fill-images-homepage-firecrawl.ts --dry-run
//      npx tsx scripts/fill-images-homepage-firecrawl.ts --limit 10
//      npx tsx scripts/fill-images-homepage-firecrawl.ts --dry-run --limit 10
//
// Safe to re-run: only writes to supplier_products rows where image_url IS NULL,
// and only for products with a confident keyword+image match or a verified
// AI web-search result (no generic fallback — a wrong hero/banner image is
// worse than the SVG placeholder).

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { appendFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Firecrawl from "@mendable/firecrawl-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!FIRECRAWL_API_KEY) {
  console.error("Missing FIRECRAWL_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

const BUCKET = "product-images";
const LOG_PATH = resolve(process.cwd(), "scripts/fill-images-homepage-firecrawl.log");
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 1000;
const PAGE = 1000;
const SCRAPE_TIMEOUT_MS = 30_000;
const FETCH_TIMEOUT_MS = 10_000;
const HEAD_TIMEOUT_MS = 5_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MIN_DIMENSION_PX = 200;
const AI_RATE_LIMIT_MS = 1000;

const DRY_RUN = process.argv.includes("--dry-run");

function parseLimit(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (args[i].startsWith("--limit=")) {
      const n = parseInt(args[i].slice(8), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 50;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(line: string): void {
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + "\n");
  } catch {
    // best-effort — don't fail the run over a log write error
  }
}

// ── Supplier target list ──────────────────────────────────────────────────────
// Mirrors:
//   SELECT so.id, so.company_name, so.website, COUNT(sp.id) as missing
//   FROM supplier_products sp
//   JOIN supplier_offerings so ON so.id = sp.supplier_id
//   JOIN sourcing_matches sm   ON sm.supplier_id = sp.supplier_id
//   WHERE sp.image_url IS NULL AND so.website IS NOT NULL AND so.website != ''
//   GROUP BY so.id, so.company_name, so.website
//   ORDER BY missing DESC
//   LIMIT N
//
// Rebuilt from three paginated queries and joined client-side, same approach
// as fill-images-perplexity.ts (the Supabase JS client can't express this
// join/aggregate directly).

type MissingProduct = { id: string; product_name: string; category: string | null };

type SupplierTarget = {
  supplier_id: string;
  company_name: string;
  website: string;
  products: MissingProduct[];
};

async function fetchMissingImageProductsBySupplier(): Promise<Map<string, MissingProduct[]>> {
  const bySupplier = new Map<string, MissingProduct[]>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_products")
      .select("id, supplier_id, product_name, category")
      .is("image_url", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchMissingImageProductsBySupplier: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data as {
      id: string;
      supplier_id: string;
      product_name: string;
      category: string | null;
    }[]) {
      const bucket = bySupplier.get(row.supplier_id) ?? [];
      bucket.push({ id: row.id, product_name: row.product_name, category: row.category });
      bySupplier.set(row.supplier_id, bucket);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }
  return bySupplier;
}

async function fetchMatchedSupplierIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("sourcing_matches")
      .select("supplier_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchMatchedSupplierIds: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data as { supplier_id: string }[]) ids.add(row.supplier_id);

    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchSupplierOfferings(
  ids: string[]
): Promise<Map<string, { company_name: string; website: string }>> {
  const out = new Map<string, { company_name: string; website: string }>();
  for (const idChunk of chunk(ids, 200)) {
    if (idChunk.length === 0) continue;
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website")
      .in("id", idChunk)
      .not("website", "is", null)
      .neq("website", "");
    if (error) throw new Error(`fetchSupplierOfferings: ${error.message}`);
    for (const row of (data ?? []) as { id: string; company_name: string; website: string }[]) {
      out.set(row.id, { company_name: row.company_name, website: row.website });
    }
  }
  return out;
}

async function buildSupplierTargets(limit: number): Promise<SupplierTarget[]> {
  const [missingBySupplier, matchedIds] = await Promise.all([
    fetchMissingImageProductsBySupplier(),
    fetchMatchedSupplierIds(),
  ]);

  const candidateIds = [...missingBySupplier.keys()].filter((id) => matchedIds.has(id));
  const offerings = await fetchSupplierOfferings(candidateIds);

  const targets: SupplierTarget[] = [];
  for (const supplierId of candidateIds) {
    const offering = offerings.get(supplierId);
    if (!offering) continue;
    const products = missingBySupplier.get(supplierId) ?? [];
    if (products.length === 0) continue;
    targets.push({
      supplier_id: supplierId,
      company_name: offering.company_name,
      website: offering.website,
      products,
    });
  }

  targets.sort((a, b) => b.products.length - a.products.length);
  return targets.slice(0, limit);
}

// ── Scrape candidate pages + extract images ──────────────────────────────────

const CANDIDATE_PATHS = ["", "/products", "/prodotti", "/produkte", "/en/products", "/our-products", "/catalogue", "/catalog"];

const REJECT_KEYWORDS =
  /\b(logo|flag|icon|favicon|footer|header|banner|sprite|avatar|loader|placeholder|world-|badge|cert|iso-|sticky|ISO)\b/i;

const REJECT_PATH_SUBSTRINGS =
  /\/(hero|banner|bg-|background|slide|header|footer|nav|menu|logo|brand|icon|thumb-placeholder)|-(banner|hero|bg|background)|_(logo|icon)/i;

const TINY_DIMENSION_RE = /-(\d{2,4})x(\d{2,4})\b/i;

type CandidateImage = {
  url: string;
  alt: string;
  area: number | null;
  source?: "homepage" | "path" | "discovered";
  sourcePageUrl?: string;
};

function toAbsoluteUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url.trim(), baseUrl).href;
  } catch {
    return null;
  }
}

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function dimensionArea(url: string): number | null {
  const m = url.match(TINY_DIMENSION_RE);
  if (!m) return null;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return w * h;
}

function hasShortFilename(url: string): boolean {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    const name = last.replace(/\.[a-z0-9]+$/i, "");
    return name.length > 0 && name.length < 8;
  } catch {
    return false;
  }
}

function isRejectedByName(url: string): boolean {
  if (url.startsWith("data:")) return true;
  if (/\.svg(\?|#|$)/i.test(url)) return true;
  if (REJECT_KEYWORDS.test(url)) return true;
  if (REJECT_PATH_SUBSTRINGS.test(url)) return true;
  if (hasShortFilename(url)) return true;
  const m = url.match(TINY_DIMENSION_RE);
  if (m) {
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (w < MIN_DIMENSION_PX && h < MIN_DIMENSION_PX) return true;
  }
  return false;
}

function metaTagContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*\\scontent=["']([^"']+)["']`,
    "i"
  );
  const match = html.match(re);
  return match?.[1] ?? null;
}

function extractAllImages(html: string, baseUrl: string): CandidateImage[] {
  const out: CandidateImage[] = [];
  const seen = new Set<string>();

  const ogImage = metaTagContent(html, "og:image") ?? metaTagContent(html, "og:image:secure_url");
  if (ogImage) {
    const abs = toAbsoluteUrl(ogImage, baseUrl);
    if (abs && !isRejectedByName(abs) && !seen.has(abs)) {
      seen.add(abs);
      out.push({ url: abs, alt: "", area: dimensionArea(abs), sourcePageUrl: baseUrl });
    }
  }

  const imgRe = /<img\b[^>]*>/gi;
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  const altRe = /\balt=["']([^"']*)["']/i;

  for (const tagMatch of html.matchAll(imgRe)) {
    const tag = tagMatch[0];
    const src = tag.match(srcRe)?.[1];
    if (!src) continue;
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs || isRejectedByName(abs) || seen.has(abs)) continue;
    seen.add(abs);
    const alt = tag.match(altRe)?.[1] ?? "";
    out.push({ url: abs, alt, area: dimensionArea(abs), sourcePageUrl: baseUrl });
  }

  return out;
}

// ── Products-page discovery ───────────────────────────────────────────────────

const HREF_PRODUCT_SIGNALS =
  /\/(products?|produits?|prodotti|produkte?|catalogue?|range|shop|our-products|en\/products?)\b/i;

const TEXT_PRODUCT_SIGNALS = [
  "products", "produits", "prodotti", "produkte", "producten",
  "catalogue", "catalog", "range", "our range", "shop", "sortiment",
  "gamme", "produkty", "produkter",
];

function discoverProductsPageUrl(html: string, baseUrl: string): string | null {
  const anchorRe = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let baseHost: string;
  try {
    baseHost = new URL(baseUrl).host;
  } catch {
    return null;
  }

  let best: string | null = null;
  let bestScore = 0;

  for (const m of html.matchAll(anchorRe)) {
    const href = m[1].trim();
    if (!href || href.startsWith("#") || /^(javascript|mailto|tel):/i.test(href)) continue;

    const abs = toAbsoluteUrl(href, baseUrl);
    if (!abs) continue;
    try {
      if (new URL(abs).host !== baseHost) continue; // stay on the same site
    } catch {
      continue;
    }

    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

    let score = 0;
    if (HREF_PRODUCT_SIGNALS.test(href)) score += 2; // href patterns outrank text-only matches
    if (TEXT_PRODUCT_SIGNALS.some((sig) => text.includes(sig))) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = abs;
    }
  }

  return best;
}

async function scrapeSupplierImages(
  website: string
): Promise<{ kept: CandidateImage[]; scrapedCount: number }> {
  const homepageUrl = toAbsoluteUrl("", website);
  if (!homepageUrl) return { kept: [], scrapedCount: 0 };

  const allImages: CandidateImage[] = [];
  const seen = new Set<string>();
  let scrapedCount = 0;

  async function scrapeHtml(url: string): Promise<string> {
    try {
      const job: any = await Promise.race([
        firecrawl.scrape(url, { formats: ["html"], onlyMainContent: false } as any),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("scrape timeout")), SCRAPE_TIMEOUT_MS)
        ),
      ]);
      return job?.html || job?.rawHtml || "";
    } catch {
      // 404 / timeout / blocked — skip this page, never crash
      return "";
    }
  }

  // 1. Homepage first — also used for products-page discovery
  const homepageHtml = await scrapeHtml(homepageUrl);
  if (homepageHtml) {
    scrapedCount += 1;
    for (const img of extractAllImages(homepageHtml, homepageUrl)) {
      if (seen.has(img.url)) continue;
      seen.add(img.url);
      allImages.push({ ...img, source: "homepage" });
    }
  }

  const discoveredUrl = homepageHtml ? discoverProductsPageUrl(homepageHtml, homepageUrl) : null;

  // 2. Remaining CANDIDATE_PATHS (always-on fallback set) + discovered page
  const remainingUrls = Array.from(
    new Set(
      CANDIDATE_PATHS.slice(1)
        .map((p) => toAbsoluteUrl(p, website))
        .filter((u): u is string => Boolean(u))
    )
  );
  if (discoveredUrl && discoveredUrl !== homepageUrl && !remainingUrls.includes(discoveredUrl)) {
    remainingUrls.push(discoveredUrl);
  }

  for (const url of remainingUrls) {
    const html = await scrapeHtml(url);
    if (!html) continue;
    scrapedCount += 1;

    const source: CandidateImage["source"] = url === discoveredUrl ? "discovered" : "path";
    for (const img of extractAllImages(html, url)) {
      if (seen.has(img.url)) continue;
      seen.add(img.url);
      allImages.push({ ...img, source });
    }
  }

  // 3. HEAD-verify survivors: must resolve 200 + image/* content-type
  const kept: CandidateImage[] = [];
  for (const img of allImages) {
    if (await verifyImageUrl(img.url)) kept.push(img);
  }

  return { kept, scrapedCount };
}

async function findImageViaAi(
  productName: string,
  companyName: string,
  supplierWebsite: string
): Promise<string | null> {
  if (!PERPLEXITY_API_KEY) return null;
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: `Search for "${productName}" by ${companyName} food product. Return ONLY a direct image file URL ending in .jpg, .jpeg, .png, or .webp. No explanations, no webpage links, just the raw image URL.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Perplexity API ${res.status}`);
    const data: any = await res.json();
    const text = (data?.choices?.[0]?.message?.content ?? "").trim();
    log(`    [ai] model returned: ${text.slice(0, 300)}`);

    const supplierDomain = getDomain(supplierWebsite);
    const candidates = text.match(/https?:\/\/[^\s")\]]+\.(?:jpe?g|png|webp)(?:\?[^\s")\]]*)?/gi) ?? [];
    for (const url of candidates) {
      const candidateDomain = getDomain(url);
      if (supplierDomain && candidateDomain === supplierDomain) {
        log(`    [ai] trusting supplier-domain URL: ${url}`);
        return url;
      }
      log(`    [ai] checking candidate: ${url}`);
      if (await verifyImageUrl(url)) return url;
    }
    return null;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log(`    [WARN] Perplexity search failed for "${productName}": ${reason}`);
    return null;
  }
}

async function verifyImageUrl(url: string): Promise<boolean> {
  async function attempt(method: "HEAD" | "GET", extraHeaders: Record<string, string>): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, ...extraHeaders },
      });
      if (res.status !== 200 && res.status !== 206) return false;
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      return contentType.startsWith("image/");
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (await attempt("HEAD", {})) return true;
  return attempt("GET", { Range: "bytes=0-1023" });
}

// ── Re-host to Supabase Storage ───────────────────────────────────────────────

function sanitizeFilename(url: string): string {
  let name = "image";
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    if (last) name = last;
  } catch {
    // keep default
  }
  name = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  if (!name.includes(".")) name += ".jpg";
  return name;
}

type RehostedImage = CandidateImage & { hostedUrl: string };

async function rehostImage(
  supplierId: string,
  index: number,
  img: CandidateImage
): Promise<RehostedImage | null> {
  const filename = `scraped-${index}-${sanitizeFilename(img.url)}`;
  const path = `${supplierId}/${filename}`;

  // Idempotent: if a file already exists at this path, reuse it.
  try {
    const { data: existing } = await supabase.storage.from(BUCKET).list(supplierId, {
      search: filename,
    });
    if (existing && existing.some((f) => f.name === filename)) {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { ...img, hostedUrl: pub.publicUrl };
    }
  } catch {
    // listing failed — fall through and try a fresh upload
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(img.url, { redirect: "follow", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`fetch ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ...img, hostedUrl: pub.publicUrl };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log(`    [WARN] re-host failed for ${img.url} (${reason}) — falling back to original URL`);
    return { ...img, hostedUrl: img.url };
  }
}

// ── Keyword → image-hint matching ─────────────────────────────────────────────

const KEYWORD_RULES: { label: string; productKeywords: string[]; imageHints: string[] }[] = [
  {
    label: "tomato",
    productKeywords: ["tomato", "passata", "pelati", "pomodoro"],
    imageHints: ["tomat", "pomodor", "passata", "pelati"],
  },
  {
    label: "juice",
    productKeywords: ["juice", "nectar", "drink", "beverage"],
    imageHints: ["juice", "succo", "bevand", "drink", "nectar"],
  },
  {
    label: "legumes",
    productKeywords: ["pulse", "bean", "legume", "chickpea", "lentil"],
    imageHints: ["legum", "bean", "fagiol", "lenticch", "ceci"],
  },
  {
    label: "fruit",
    productKeywords: [
      "berry", "berries", "blueberr", "strawberr", "raspberr",
      "plum", "apple", "peach", "mango", "cherry", "fruit",
    ],
    imageHints: [
      "fruit", "berry", "berries", "blueberr", "strawberr",
      "raspberr", "plum", "apple", "frutta", "frutti",
    ],
  },
  {
    label: "vegetable",
    productKeywords: ["vegetable", "frozen", "broccoli", "pea", "spinach"],
    imageHints: ["vegetabl", "verdur", "broccoli", "spinach", "pisell"],
  },
  {
    label: "biscuit",
    productKeywords: ["biscuit", "cookie", "wafer", "pastry", "biscotti"],
    imageHints: ["biscuit", "cookie", "wafer", "biscott", "pasticc"],
  },
  {
    label: "pasta",
    productKeywords: ["pasta", "noodle", "spaghetti"],
    imageHints: ["pasta", "spaghett", "noodle", "tagliatell"],
  },
  {
    label: "dairy",
    productKeywords: [
      "milk", "cream", "cheese", "ricotta", "mascarpone",
      "bechamel", "béchamel", "yogurt", "butter", "dairy",
      "mozzarella", "kefir", "whipping",
    ],
    imageHints: [
      "milk", "cream", "cheese", "ricott", "mascarpone",
      "latte", "formaggio", "yogurt", "burro", "dairy", "panna",
    ],
  },
  {
    label: "olive",
    productKeywords: ["olive", "kalamata"],
    imageHints: ["olive", "oliv"],
  },
  {
    label: "pepper",
    productKeywords: ["pepper", "pepperoncini", "chili"],
    imageHints: ["pepper", "peperon", "chili"],
  },
  {
    label: "snack",
    productKeywords: ["crisp", "popcorn", "snack", "chip"],
    imageHints: ["snack", "crisp", "popcorn", "chip"],
  },
  {
    label: "supplement",
    productKeywords: ["supplement", "capsule", "probiotic", "vitamin", "enzyme", "botanical"],
    imageHints: ["supplement", "capsul", "vitamin", "health"],
  },
  {
    label: "nut",
    productKeywords: ["nut", "almond", "hazelnut", "cashew", "walnut", "seed", "sunflower", "pumpkin seed"],
    imageHints: ["nut", "almond", "hazelnut", "seed", "nocciola"],
  },
  {
    label: "pasta-filled",
    productKeywords: ["gnocchi", "tortelloni", "ravioli", "pesto"],
    imageHints: ["gnocchi", "tortelloni", "ravioli", "pesto"],
  },
];

function findRule(productName: string, category: string | null) {
  const haystack = `${productName} ${category ?? ""}`.toLowerCase();
  return KEYWORD_RULES.find((rule) => rule.productKeywords.some((kw) => haystack.includes(kw)));
}

function sourceBonus(source?: CandidateImage["source"]): number {
  if (source === "discovered") return 2;
  if (source === "path") return 1;
  return 0; // homepage or unspecified
}

const PRODUCT_PAGE_URL_SIGNALS =
  /\/(products?|produits?|prodotti|produkte?|catalogue?|range|shop|our-products|sortiment|gamme)/i;

function scoreImages(
  rule: { imageHints: string[] },
  images: RehostedImage[],
  productWords: string[]
): RehostedImage | null {
  let best: RehostedImage | null = null;
  let bestScore = -1;

  for (const img of images) {
    const haystack = `${img.url} ${img.alt}`.toLowerCase();
    let keywordScore = 0;
    for (const word of productWords) {
      if (haystack.includes(word)) keywordScore += 2;
    }
    for (const hint of rule.imageHints) {
      if (haystack.includes(hint)) keywordScore += 1;
    }
    if (keywordScore === 0) continue;

    const score = keywordScore * 10 + sourceBonus(img.source);
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }

  return best;
}

function findMatchingImage(
  rule: { imageHints: string[] },
  images: RehostedImage[],
  productName: string
): RehostedImage | null {
  const productWords = productName.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2) ?? [];

  const groupA = images.filter((img) => img.sourcePageUrl && PRODUCT_PAGE_URL_SIGNALS.test(img.sourcePageUrl));
  const groupB = images.filter((img) => !(img.sourcePageUrl && PRODUCT_PAGE_URL_SIGNALS.test(img.sourcePageUrl)));

  return scoreImages(rule, groupA, productWords) ?? scoreImages(rule, groupB, productWords);
}

// ── Per-supplier processing ───────────────────────────────────────────────────

type UnmatchedProduct = {
  id: string;
  product_name: string;
  company_name: string;
  supplier_id: string;
  website: string;
};

type SupplierOutcome = { kept: number; rehosted: number; matched: number; unmatched: UnmatchedProduct[] };

async function processSupplier(target: SupplierTarget, prefix: string): Promise<SupplierOutcome> {
  const { kept, scrapedCount } = await scrapeSupplierImages(target.website);

  if (kept.length === 0) {
    log(`${prefix} ${target.company_name} | scraped ${scrapedCount} pages, kept 0 images | matched 0 products`);
    const unmatched: UnmatchedProduct[] = [];
    for (const product of target.products) {
      log(`  ✗ ${product.product_name} → no image available`);
      unmatched.push({
        id: product.id,
        product_name: product.product_name,
        company_name: target.company_name,
        supplier_id: target.supplier_id,
        website: target.website,
      });
    }
    return { kept: 0, rehosted: 0, matched: 0, unmatched };
  }

  let rehosted: RehostedImage[];
  if (DRY_RUN) {
    rehosted = kept.map((img) => ({ ...img, hostedUrl: img.url }));
  } else {
    rehosted = [];
    for (let i = 0; i < kept.length; i += 1) {
      const result = await rehostImage(target.supplier_id, i, kept[i]);
      if (result) rehosted.push(result);
    }
  }

  let matched = 0;
  const unmatched: UnmatchedProduct[] = [];
  for (const product of target.products) {
    const rule = findRule(product.product_name, product.category);
    const image = rule ? findMatchingImage(rule, rehosted, product.product_name) : null;

    if (rule && image) {
      log(`  ✓ ${product.product_name} → ${image.hostedUrl} [keyword: ${rule.label}]`);
      matched += 1;

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from("supplier_products")
          .update({ image_url: image.hostedUrl, image_source: "firecrawl_homepage" })
          .eq("id", product.id)
          .is("image_url", null);
        if (updateError) {
          log(`    [ERROR] failed to update ${product.id}: ${updateError.message}`);
        }
      }
    } else {
      log(`  – ${product.product_name} → no confident match (left as placeholder)`);
      unmatched.push({
        id: product.id,
        product_name: product.product_name,
        company_name: target.company_name,
        supplier_id: target.supplier_id,
        website: target.website,
      });
    }
  }

  log(
    `${prefix} ${target.company_name} | scraped ${scrapedCount} pages, kept ${kept.length} images | matched ${matched} products`
  );

  return { kept: kept.length, rehosted: rehosted.length, matched, unmatched };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const limit = parseLimit();

  log(
    `\n=== Firecrawl homepage image fill run started ${new Date().toISOString()}` +
      `${DRY_RUN ? " [dry-run]" : ""} (--limit ${limit}) ===`
  );

  if (!DRY_RUN) {
    try {
      await supabase.storage.createBucket(BUCKET, { public: true });
      log(`Bucket "${BUCKET}" ready.`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (!/already exists/i.test(reason)) {
        log(`[WARN] could not ensure bucket "${BUCKET}" exists: ${reason}`);
      }
    }
  }

  log("Building supplier target list...");
  const targets = await buildSupplierTargets(limit);
  log(`Suppliers to process: ${targets.length}`);

  let totalKept = 0;
  let totalRehosted = 0;
  let totalMatched = 0;
  const allUnmatched: UnmatchedProduct[] = [];

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((target, j) => processSupplier(target, `[${i + j + 1}/${targets.length}]`))
    );

    for (const r of results) {
      totalKept += r.kept;
      totalRehosted += r.rehosted;
      totalMatched += r.matched;
      allUnmatched.push(...r.unmatched);
    }

    if (i + BATCH_SIZE < targets.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  let totalAiMatched = 0;
  if (allUnmatched.length > 0) {
    if (!PERPLEXITY_API_KEY) {
      log(`\nSkipping Perplexity web-search fallback (${allUnmatched.length} unmatched) — PERPLEXITY_API_KEY not set.`);
    } else {
      log(`\nRunning Perplexity web-search fallback for ${allUnmatched.length} unmatched products...`);
      for (let i = 0; i < allUnmatched.length; i += 1) {
        const product = allUnmatched[i];
        const foundUrl = await findImageViaAi(product.product_name, product.company_name, product.website);

        if (foundUrl) {
          const rehosted = DRY_RUN
            ? { ...{ url: foundUrl, alt: product.product_name, area: null }, hostedUrl: foundUrl }
            : await rehostImage(product.supplier_id, 9000 + i, { url: foundUrl, alt: product.product_name, area: null });

          if (rehosted) {
            log(`  ✓[ai] ${product.product_name} → ${rehosted.hostedUrl}`);
            totalAiMatched += 1;

            if (!DRY_RUN) {
              const { error: updateError } = await supabase
                .from("supplier_products")
                .update({ image_url: rehosted.hostedUrl, image_source: "perplexity_search" })
                .eq("id", product.id)
                .is("image_url", null);
              if (updateError) {
                log(`    [ERROR] failed to update ${product.id}: ${updateError.message}`);
              }
            }
          }
        } else {
          log(`  – ${product.product_name} → AI fallback found no usable image`);
        }

        if (i < allUnmatched.length - 1) {
          await sleep(AI_RATE_LIMIT_MS);
        }
      }
    }
  }
  totalMatched += totalAiMatched;

  log(`\n=== Summary ===`);
  log(`Suppliers processed: ${targets.length}`);
  log(`Images kept:         ${totalKept}`);
  log(`Images re-hosted:    ${totalRehosted}${DRY_RUN ? " (dry-run — no uploads performed)" : ""}`);
  log(`Products matched:    ${totalMatched}${DRY_RUN ? " (dry-run — no writes performed)" : ""}`);
  log(`AI fallback matched: ${totalAiMatched}/${allUnmatched.length}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

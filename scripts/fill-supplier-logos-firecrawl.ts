// Firecrawl-powered supplier logo fill — scrapes supplier homepages for their
// company LOGO/brand mark (the opposite of fill-images-homepage-firecrawl.ts,
// which avoids logo/icon images and seeks product photos), re-hosts it to
// Supabase Storage (bucket "supplier-logos") at {supplier_id}/logo.{ext}, and
// writes the result to supplier_offerings.logo_url.
//
// Run: npx tsx scripts/fill-supplier-logos-firecrawl.ts
//      npx tsx scripts/fill-supplier-logos-firecrawl.ts --dry-run
//      npx tsx scripts/fill-supplier-logos-firecrawl.ts --limit 10
//      npx tsx scripts/fill-supplier-logos-firecrawl.ts --dry-run --limit 10
//
// Safe to re-run: only processes supplier_offerings rows where
// logo_url IS NULL and website IS NOT NULL, and only writes logo_url
// while it's still NULL.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { appendFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Firecrawl from "@mendable/firecrawl-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;

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

const BUCKET = "supplier-logos";
const LOG_PATH = resolve(process.cwd(), "scripts/fill-supplier-logos-firecrawl.log");
const PAGE = 1000;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const SCRAPE_TIMEOUT_MS = 30_000;
const FETCH_TIMEOUT_MS = 10_000;
const HEAD_TIMEOUT_MS = 5_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MIN_LOGO_DIMENSION_PX = 50;

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

type RawSupplierRow = { id: string; company_name: string; website: string };

type SupplierTarget = {
  id: string; // primary id — used for the Firecrawl scrape + storage path
  company_name: string;
  website: string;
  allIds: string[]; // every supplier_offerings.id sharing this domain
};

type TargetListStats = {
  totalCandidates: number;
  junkFiltered: number;
  duplicatesMerged: number;
  uniqueWebsites: number;
};

const NON_LETTER_DIGIT_START_RE = /^[^a-zA-Z0-9À-ɏ]/;

function getDomain(website: string): string | null {
  const trimmed = website.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function isJunkRecord(row: RawSupplierRow): boolean {
  const website = row.website.trim();
  const name = row.company_name.trim();

  if (website.toLowerCase().startsWith("http://www.com")) return true;
  if ((website.match(/https:\/\//gi) ?? []).length > 1) return true;
  if (name.length <= 1) return true;
  if (NON_LETTER_DIGIT_START_RE.test(name)) return true;

  return false;
}

async function fetchAllCandidates(): Promise<RawSupplierRow[]> {
  const out: RawSupplierRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website")
      .is("logo_url", null)
      .not("website", "is", null)
      .neq("website", "")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchAllCandidates: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as RawSupplierRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function buildSupplierTargets(
  rows: RawSupplierRow[],
  limit: number
): { targets: SupplierTarget[]; stats: TargetListStats } {
  const totalCandidates = rows.length;

  const clean = rows.filter((row) => !isJunkRecord(row) && getDomain(row.website) !== null);
  const junkFiltered = totalCandidates - clean.length;

  const groups = new Map<string, RawSupplierRow[]>();
  for (const row of clean) {
    const domain = getDomain(row.website)!;
    const group = groups.get(domain) ?? [];
    group.push(row);
    groups.set(domain, group);
  }

  const targets: SupplierTarget[] = [];
  for (const group of groups.values()) {
    const primary = group.reduce((best, row) =>
      row.company_name.trim().length > best.company_name.trim().length ? row : best
    );
    targets.push({
      id: primary.id,
      company_name: primary.company_name,
      website: primary.website,
      allIds: group.map((r) => r.id),
    });
  }

  targets.sort((a, b) => a.company_name.localeCompare(b.company_name));

  const stats: TargetListStats = {
    totalCandidates,
    junkFiltered,
    duplicatesMerged: clean.length - targets.length,
    uniqueWebsites: targets.length,
  };

  return { targets: targets.slice(0, limit), stats };
}

// ── Logo candidate extraction ─────────────────────────────────────────────────

const TINY_DIMENSION_RE = /-(\d{2,4})x(\d{2,4})\b/i;

const LOGO_SRC_KEYWORDS = /\b(logo|brand|identity|marque)/i;
const LOGO_ALT_EXACT_RE = /\blogo\b/i;
const ICON_REL_RE = /icon/i;

const PRODUCT_PHOTO_KEYWORDS =
  /\b(product|produit|produits|prodotti|prodotto|pasta|tomato|tomate|pomodoro|wafer|snack|cookie|biscuit|cheese|sauce|jar|bottle|pack|packaging)\b/i;

const PRODUCT_FILENAME_KEYWORDS =
  /\b(stick|bottle|can|pack|bag|pouch|box|jar|tub|tube|sachet|cup|pot|tin|extract|flavou?r|ingredient)/i;

const PRODUCT_ALT_KEYWORDS =
  /\b(flavou?r|extract|ingredient|sauce|juice|cream|powder|mix|blend)/i;

const ICON_FILENAME_RE = /\bicon\b/i;
const LOGO_ICON_EXCEPTION_RE = /logo[-_]?icon/i;

type LogoCandidate = {
  url: string;
  alt: string;
  tier: 1 | 2 | 3;
  area: number | null;
};

function toAbsoluteUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url.trim(), baseUrl).href;
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

function hasGenericShortFilename(url: string): boolean {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    const name = last.replace(/\.[a-z0-9]+$/i, "");
    return name.length > 0 && name.length < 4;
  } catch {
    return false;
  }
}

function isRejectedLogoUrl(url: string): boolean {
  if (url.startsWith("data:")) return true;
  const m = url.match(TINY_DIMENSION_RE);
  if (m) {
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (w < MIN_LOGO_DIMENSION_PX && h < MIN_LOGO_DIMENSION_PX) return true;
  }
  if (hasGenericShortFilename(url)) return true;
  return false;
}

function isPortraitProductDimensions(url: string): boolean {
  const m = url.match(TINY_DIMENSION_RE);
  if (!m) return false;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0) return false;
  return h > w * 2;
}

function isLikelyProductPhoto(url: string, alt: string): boolean {
  if (PRODUCT_PHOTO_KEYWORDS.test(url) || PRODUCT_PHOTO_KEYWORDS.test(alt)) return true;
  if (PRODUCT_FILENAME_KEYWORDS.test(url)) return true;
  if (PRODUCT_ALT_KEYWORDS.test(alt)) return true;
  if (ICON_FILENAME_RE.test(url) && !LOGO_ICON_EXCEPTION_RE.test(url)) return true;
  if (isPortraitProductDimensions(url)) return true;
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

function companyNameTokens(name: string): string[] {
  return name.toLowerCase().match(/[a-z0-9]+/g)?.filter((t) => t.length >= 3) ?? [];
}

function extractLogoCandidates(html: string, baseUrl: string, companyName: string): LogoCandidate[] {
  const out: LogoCandidate[] = [];
  const seen = new Set<string>();
  const companyTokens = companyNameTokens(companyName);

  function add(rawUrl: string, alt: string, tier: LogoCandidate["tier"]) {
    const abs = toAbsoluteUrl(rawUrl, baseUrl);
    if (!abs || seen.has(abs)) return;
    if (isRejectedLogoUrl(abs)) return;
    if (isLikelyProductPhoto(abs, alt)) return;
    seen.add(abs);
    out.push({ url: abs, alt, tier, area: dimensionArea(abs) });
  }

  // Tier 1: og:image
  const ogImage = metaTagContent(html, "og:image") ?? metaTagContent(html, "og:image:secure_url");
  if (ogImage) add(ogImage, "", 1);

  // Tier 2: <img> tags that explicitly look like a logo
  const imgRe = /<img\b[^>]*>/gi;
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  const altRe = /\balt=["']([^"']*)["']/i;

  for (const tagMatch of html.matchAll(imgRe)) {
    const tag = tagMatch[0];
    const src = tag.match(srcRe)?.[1];
    if (!src) continue;
    const alt = tag.match(altRe)?.[1] ?? "";
    const altLower = alt.toLowerCase();
    const srcLower = src.toLowerCase();

    const srcLooksLikeLogo = LOGO_SRC_KEYWORDS.test(srcLower);
    const altLooksLikeLogo =
      LOGO_ALT_EXACT_RE.test(altLower) || companyTokens.some((t) => altLower.includes(t));

    if (srcLooksLikeLogo || altLooksLikeLogo) {
      add(src, alt, 2);
    }
  }

  // Tier 3: <link rel="icon" | "shortcut icon" | "apple-touch-icon">
  const linkRe = /<link\b[^>]*>/gi;
  const relRe = /\brel=["']([^"']*)["']/i;
  const hrefRe = /\bhref=["']([^"']+)["']/i;

  for (const tagMatch of html.matchAll(linkRe)) {
    const tag = tagMatch[0];
    const rel = tag.match(relRe)?.[1] ?? "";
    if (!ICON_REL_RE.test(rel)) continue;
    const href = tag.match(hrefRe)?.[1];
    if (!href) continue;
    add(href, "", 3);
  }

  return out;
}

function formatRank(url: string): number {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith(".svg")) return 0;
  if (clean.endsWith(".png")) return 1;
  if (clean.endsWith(".webp")) return 2;
  return 3;
}

function sortCandidates(candidates: LogoCandidate[]): LogoCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const fa = formatRank(a.url);
    const fb = formatRank(b.url);
    if (fa !== fb) return fa - fb;
    return (b.area ?? 0) - (a.area ?? 0);
  });
}

// ── Scrape + verify ────────────────────────────────────────────────────────────

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
    // 404 / timeout / blocked — skip this site, never crash
    return "";
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

function extFromContentType(contentType: string, url: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("svg")) return "svg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";

  const m = url.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "png";
}

async function rehostLogo(supplierId: string, url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { redirect: "follow", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`fetch ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/png";
    const ext = extFromContentType(contentType, url);
    const path = `${supplierId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log(`    [WARN] re-host failed for ${url} (${reason}) — falling back to original URL`);
    return url;
  }
}

// ── Per-supplier processing ───────────────────────────────────────────────────

type SupplierOutcome = { found: boolean; rehosted: boolean };

async function processSupplier(target: SupplierTarget, prefix: string): Promise<SupplierOutcome> {
  const homepageUrl = toAbsoluteUrl("", target.website);
  if (!homepageUrl) {
    log(`${prefix} ${target.company_name} | invalid website URL — skipped`);
    return { found: false, rehosted: false };
  }

  const html = await scrapeHtml(homepageUrl);
  if (!html) {
    log(`${prefix} ${target.company_name} | failed to scrape homepage — skipped`);
    return { found: false, rehosted: false };
  }

  const candidates = sortCandidates(extractLogoCandidates(html, homepageUrl, target.company_name));

  let chosen: LogoCandidate | null = null;
  for (const candidate of candidates) {
    if (await verifyImageUrl(candidate.url)) {
      chosen = candidate;
      break;
    }
  }

  if (!chosen) {
    log(`${prefix} ${target.company_name} | no logo found`);
    return { found: false, rehosted: false };
  }

  if (DRY_RUN) {
    log(`${prefix} ${target.company_name} | found tier ${chosen.tier} logo (${chosen.url}) [dry-run]`);
    return { found: true, rehosted: false };
  }

  const hostedUrl = await rehostLogo(target.id, chosen.url);

  const { error: updateError } = await supabase
    .from("supplier_offerings")
    .update({ logo_url: hostedUrl })
    .in("id", target.allIds)
    .is("logo_url", null);

  if (updateError) {
    log(`${prefix} ${target.company_name} | found tier ${chosen.tier} logo but failed to save: ${updateError.message}`);
    return { found: true, rehosted: false };
  }

  const appliedSuffix = target.allIds.length > 1 ? ` (applied to ${target.allIds.length} records)` : "";
  log(`${prefix} ${target.company_name} | found tier ${chosen.tier} logo (${chosen.url}) → ${hostedUrl}${appliedSuffix}`);
  return { found: true, rehosted: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const limit = parseLimit();

  log(
    `\n=== Firecrawl supplier logo fill run started ${new Date().toISOString()}` +
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

  log("Fetching suppliers with no logo...");
  const candidates = await fetchAllCandidates();
  const { targets, stats } = buildSupplierTargets(candidates, limit);
  log(`Candidates fetched:           ${stats.totalCandidates}`);
  log(`Junk records filtered:        ${stats.junkFiltered}`);
  log(`Duplicate-domain rows merged: ${stats.duplicatesMerged}`);
  log(`Unique websites:              ${stats.uniqueWebsites}`);
  log(`Suppliers to process: ${targets.length}`);

  let totalFound = 0;
  let totalRehosted = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((target, j) => processSupplier(target, `[${i + j + 1}/${targets.length}]`))
    );

    for (const r of results) {
      if (r.found) totalFound += 1;
      if (r.rehosted) totalRehosted += 1;
    }

    if (i + BATCH_SIZE < targets.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  log(`\n=== Summary ===`);
  log(`Suppliers processed: ${targets.length}`);
  log(`Logos found:         ${totalFound}`);
  log(`Logos re-hosted:     ${totalRehosted}${DRY_RUN ? " (dry-run — no uploads performed)" : ""}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

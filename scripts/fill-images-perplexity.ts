// Perplexity-powered product image fill for matched suppliers — one Perplexity
// "sonar" web-search call per supplier (not per product) to keep cost low (~$2-3 total).
//
// Run: npx tsx scripts/fill-images-perplexity.ts
//      npx tsx scripts/fill-images-perplexity.ts --dry-run
//      npx tsx scripts/fill-images-perplexity.ts --limit 5
//      npx tsx scripts/fill-images-perplexity.ts --dry-run --limit 5
//
// Safe to re-run: only writes to supplier_products rows where image_url IS NULL.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { appendFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!PERPLEXITY_API_KEY) {
  console.error("Missing PERPLEXITY_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LOG_PATH = resolve(process.cwd(), "scripts/fill-images-perplexity.log");
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;
const PAGE = 1000;

const DRY_RUN = process.argv.includes("--dry-run");

function parseLimit(): number | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (args[i].startsWith("--limit=")) {
      const n = parseInt(args[i].slice(8), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
//   SELECT DISTINCT ON (sp.supplier_id) so.id, so.company_name, so.website,
//          array_agg(DISTINCT sp.product_name) FILTER (WHERE sp.image_url IS NULL)
//   FROM supplier_products sp
//   JOIN supplier_offerings so ON so.id = sp.supplier_id
//   JOIN sourcing_matches sm   ON sm.supplier_id = sp.supplier_id
//   WHERE sp.image_url IS NULL AND so.website IS NOT NULL AND so.website != ''
//   GROUP BY so.id, so.company_name, so.website
//
// The Supabase JS client can't express this join/aggregate directly, so it's
// rebuilt from three paginated queries and joined client-side.

type NullImageProduct = { id: string; product_name: string };

type SupplierTarget = {
  supplier_id: string;
  company_name: string;
  website: string;
  products: NullImageProduct[];
};

async function fetchNullImageProductsBySupplier(): Promise<Map<string, NullImageProduct[]>> {
  const bySupplier = new Map<string, NullImageProduct[]>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_products")
      .select("id, supplier_id, product_name")
      .is("image_url", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchNullImageProductsBySupplier: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data as { id: string; supplier_id: string; product_name: string }[]) {
      const bucket = bySupplier.get(row.supplier_id) ?? [];
      bucket.push({ id: row.id, product_name: row.product_name });
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

async function buildSupplierTargets(): Promise<SupplierTarget[]> {
  const [nullImageBySupplier, matchedIds] = await Promise.all([
    fetchNullImageProductsBySupplier(),
    fetchMatchedSupplierIds(),
  ]);

  const candidateIds = [...nullImageBySupplier.keys()].filter((id) => matchedIds.has(id));
  const offerings = await fetchSupplierOfferings(candidateIds);

  const targets: SupplierTarget[] = [];
  for (const supplierId of candidateIds) {
    const offering = offerings.get(supplierId);
    if (!offering) continue;
    const products = nullImageBySupplier.get(supplierId) ?? [];
    if (products.length === 0) continue;
    targets.push({
      supplier_id: supplierId,
      company_name: offering.company_name,
      website: offering.website,
      products,
    });
  }
  return targets;
}

// ── Perplexity call (one per supplier) ────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are a product image finder. Return ONLY valid JSON, no markdown, " +
  "no explanation. Find real product image URLs from the supplier's website.";

function buildUserPrompt(companyName: string, website: string, productNames: string[]): string {
  const capped = productNames.slice(0, 20);
  return `Find product image URLs from ${companyName} (${website}).
Return a JSON object mapping each product name to one direct image URL
from their website. Only include products you find actual images for.
Cap at 20 products. Format: {"Product Name": "https://...image.jpg"}

Products to find: ${capped.join(", ")}`;
}

function extractJsonObject(content: string): Record<string, unknown> | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

async function queryPerplexity(
  companyName: string,
  website: string,
  productNames: string[]
): Promise<Record<string, string> | null> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(companyName, website, productNames) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity HTTP ${res.status}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  const obj = extractJsonObject(content);
  if (!obj) return null;

  const out: Record<string, string> = {};
  for (const [name, url] of Object.entries(obj)) {
    if (typeof url === "string" && url.trim().length > 0) out[name] = url.trim();
  }
  return out;
}

// ── HEAD verification ─────────────────────────────────────────────────────────

type VerifyResult = { ok: true } | { ok: false; reason: string };

async function verifyImageUrl(url: string): Promise<VerifyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status !== 200) return { ok: false, reason: String(res.status) };
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return { ok: false, reason: "not an image" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Per-supplier processing ───────────────────────────────────────────────────

type SupplierOutcome = { found: number; verified: number; written: number };

async function processSupplier(target: SupplierTarget, prefix: string): Promise<SupplierOutcome> {
  const productNames = target.products.map((p) => p.product_name);

  const byNormalizedName = new Map<string, NullImageProduct[]>();
  for (const p of target.products) {
    const key = normalizeName(p.product_name);
    const bucket = byNormalizedName.get(key) ?? [];
    bucket.push(p);
    byNormalizedName.set(key, bucket);
  }

  let mapping: Record<string, string> | null = null;
  try {
    mapping = await queryPerplexity(target.company_name, target.website, productNames);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log(`${prefix} ${target.company_name}: ERROR — Perplexity request failed (${reason})`);
    return { found: 0, verified: 0, written: 0 };
  }

  if (!mapping) {
    log(`${prefix} ${target.company_name}: SKIPPED — could not parse Perplexity JSON response`);
    return { found: 0, verified: 0, written: 0 };
  }

  const entries = Object.entries(mapping);
  let verified = 0;
  let written = 0;

  for (const [productName, url] of entries) {
    const result = await verifyImageUrl(url);
    if (!result.ok) {
      log(`  ✗ ${productName} (${result.reason})`);
      continue;
    }
    verified += 1;
    log(`  ✓ ${productName} → ${url}`);

    if (DRY_RUN) continue;

    const candidates = byNormalizedName.get(normalizeName(productName)) ?? [];
    for (const candidate of candidates) {
      const { error: updateError } = await supabase
        .from("supplier_products")
        .update({ image_url: url, image_source: "perplexity_search" })
        .eq("id", candidate.id)
        .is("image_url", null);

      if (updateError) {
        log(`    [ERROR] failed to update ${candidate.id}: ${updateError.message}`);
        continue;
      }
      written += 1;
    }
  }

  log(
    `${prefix} ${target.company_name} | ${entries.length} products found | ${verified} verified | ${written} written`
  );

  return { found: entries.length, verified, written };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const limit = parseLimit();

  log(
    `\n=== Perplexity image fill run started ${new Date().toISOString()}` +
      `${DRY_RUN ? " [dry-run]" : ""}${limit ? ` (--limit ${limit})` : ""} ===`
  );

  log("Building supplier target list...");
  const allTargets = await buildSupplierTargets();
  const targets = limit ? allTargets.slice(0, limit) : allTargets;

  log(`Suppliers to process: ${targets.length}${limit ? ` (of ${allTargets.length} eligible)` : ""}`);

  let totalFound = 0;
  let totalVerified = 0;
  let totalWritten = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((target, j) => processSupplier(target, `[${i + j + 1}/${targets.length}]`))
    );

    for (const r of results) {
      totalFound += r.found;
      totalVerified += r.verified;
      totalWritten += r.written;
    }

    if (i + BATCH_SIZE < targets.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  log(`\n=== Summary ===`);
  log(`Suppliers processed: ${targets.length}`);
  log(`Images found:        ${totalFound}`);
  log(`Images verified:     ${totalVerified}`);
  log(`Images written:      ${totalWritten}${DRY_RUN ? " (dry-run — no writes performed)" : ""}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

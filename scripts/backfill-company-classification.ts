import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import {
  classifyFromSummary,
  saveClassification,
  describeClassification,
} from "../lib/scraper/classify";

function loadEnv(): void {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CONCURRENCY = 5;

interface SkippedSupplier {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  internal_notes: string | null;
}

function parsePriorReason(notes: string | null): { type: string | null; reason: string | null } {
  if (!notes) return { type: null, reason: null };
  const match = notes.match(/Auto-skipped:\s*(\w+)(?:\s*[—–-]\s*(.*))?/i);
  if (match) return { type: match[1], reason: match[2]?.trim() ?? null };
  return { type: null, reason: notes };
}

async function processSupplier(s: SkippedSupplier, index: number, total: number) {
  const { type: priorType, reason: priorReason } = parsePriorReason(s.internal_notes);
  const cls = await classifyFromSummary({
    companyName: s.company_name,
    website: s.website,
    country: s.country_of_origin,
    priorType,
    priorReason,
  });

  const res = await saveClassification(supabase, s.id, cls, "backfill_summary");
  console.log(
    `[${index + 1}/${total}] ${s.company_name} → ${describeClassification(cls)} (${(cls.confidence * 100).toFixed(0)}%)` +
      (res.ok ? "" : ` ⚠ DB save: ${res.error}`)
  );
  return cls;
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
  const dryRun = process.argv.includes("--dry-run");

  console.log("══════════════════════════════════════════════════════════");
  console.log("  BACKFILL CLASSIFICATION FOR SKIPPED SUPPLIERS");
  console.log(`  Dry run: ${dryRun ? "YES (no DB writes)" : "NO"}`);
  if (limit) console.log(`  Limit: ${limit}`);
  console.log("══════════════════════════════════════════════════════════\n");

  let query = supabase
    .from("supplier_offerings")
    .select("id, company_name, website, country_of_origin, internal_notes")
    .eq("scrape_status", "skipped");

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch skipped suppliers:", error.message);
    process.exit(1);
  }

  const suppliers = (data ?? []) as SkippedSupplier[];
  console.log(`Found ${suppliers.length} unclassified skipped suppliers.\n`);
  if (suppliers.length === 0) return;

  const tally: Record<string, number> = {};
  let potentialBuyers = 0;

  for (let i = 0; i < suppliers.length; i += CONCURRENCY) {
    const chunk = suppliers.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((s, idx) => (dryRun ? dryRunItem(s, i + idx, suppliers.length) : processSupplier(s, i + idx, suppliers.length)))
    );
    for (const c of results) {
      const key = `${c.sector} / ${c.businessRole ?? "unknown"}`;
      tally[key] = (tally[key] ?? 0) + 1;
      if (c.isPotentialBuyer) potentialBuyers++;
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("══════════════════════════════════════════════════════════");
  for (const [k, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(45)} ${count}`);
  }
  console.log(`\n  Potential buyers flagged: ${potentialBuyers}`);
  console.log("══════════════════════════════════════════════════════════\n");
}

async function dryRunItem(s: SkippedSupplier, index: number, total: number) {
  const { type: priorType, reason: priorReason } = parsePriorReason(s.internal_notes);
  const cls = await classifyFromSummary({
    companyName: s.company_name,
    website: s.website,
    country: s.country_of_origin,
    priorType,
    priorReason,
  });
  console.log(`[${index + 1}/${total}] DRY-RUN: ${s.company_name} → ${describeClassification(cls)}`);
  return cls;
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});

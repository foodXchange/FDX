/**
 * One-shot script: fix broken company names via Claude API.
 *
 * Run with:
 *   npx tsx scripts/fix-broken-names.ts
 *
 * Requires in .env.local:
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Strategy:
 *   1. Fetch all broken rows (octet_length > length * 2)
 *   2. Process in batches of 20 per Claude call (one call per batch)
 *   3. Claude gets: broken_name, website_domain, country
 *   4. Claude returns: corrected_name OR null if cannot determine
 *   5. Update only rows where Claude returned a non-null value
 *   6. Log everything to fix-broken-names.log for review
 *
 * Safety:
 *   - DRY_RUN=true by default (prints what would change, no DB writes)
 *   - Set DRY_RUN=false in the call to actually update
 *   - All changes wrapped per-row, no transactions (each fix is independent)
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, appendFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const DRY_RUN = process.env.DRY_RUN !== "false"; // default safe
const BATCH_SIZE = 20;
const LOG_FILE = "fix-broken-names.log";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface BrokenRow {
  id: string;
  company_name: string;
  website_domain: string | null;
  country_of_origin: string | null;
}

interface FixResult {
  id: string;
  fixed_name: string | null;
  confidence: "high" | "medium" | "low";
}

function log(msg: string) {
  console.log(msg);
  appendFileSync(LOG_FILE, msg + "\n");
}

async function fetchBrokenRows(): Promise<BrokenRow[]> {
  // Fetch in pages — Supabase caps at 1000 rows per request
  const all: BrokenRow[] = [];
  let from = 0;
  const pageSize = 500;

  while (true) {
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website_domain, country_of_origin")
      .or(
        `company_name.like.%${String.fromCharCode(0xfffd)}%,company_name.like.%??%`
      )
      .range(from, from + pageSize - 1);

    if (error) {
      log(`Error fetching: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function fixBatch(rows: BrokenRow[]): Promise<FixResult[]> {
  const prompt = `You are fixing broken company names in a B2B food supplier database. The names have UTF-8 encoding corruption — the � character represents one or more bytes that were lost during import.

For each row, infer the most likely correct company name using:
- The broken name pattern
- The website domain (strong hint to the real name)
- The country of origin (language hint: ñ for Spanish, ü for German, etc.)

Rules:
- Return the FULL correct company name (do not truncate)
- Preserve original case style (Title Case as given)
- If you cannot confidently determine the name, return null
- Confidence "high" = website domain matches the name clearly
- Confidence "medium" = good inference from country + partial name
- Confidence "low" = guess, name has too many missing characters

Input rows:
${rows.map((r, i) => `${i + 1}. id=${r.id} | broken="${r.company_name}" | domain=${r.website_domain || "null"} | country=${r.country_of_origin || "null"}`).join("\n")}

Respond with ONLY a JSON array, no other text. Format:
[
  {"id": "uuid", "fixed_name": "Correct Name" | null, "confidence": "high" | "medium" | "low"},
  ...
]`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  // Strip markdown fences if present
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    log(`Failed to parse batch response: ${clean.slice(0, 500)}`);
    return [];
  }
}

async function updateRow(id: string, newName: string): Promise<boolean> {
  if (DRY_RUN) return true;
  const { error } = await supabase
    .from("supplier_offerings")
    .update({ company_name: newName, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    log(`Update failed for ${id}: ${error.message}`);
    return false;
  }
  return true;
}

async function main() {
  writeFileSync(LOG_FILE, `--- Run started ${new Date().toISOString()} ---\n`);
  log(`DRY_RUN=${DRY_RUN} (set DRY_RUN=false to actually update)`);

  const rows = await fetchBrokenRows();
  log(`Found ${rows.length} broken rows`);

  if (rows.length === 0) {
    log("Nothing to fix. Exiting.");
    return;
  }

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} (rows ${i + 1}-${i + batch.length})`);

    let results: FixResult[];
    try {
      results = await fixBatch(batch);
    } catch (e: any) {
      log(`Batch error: ${e.message}. Skipping.`);
      failed += batch.length;
      continue;
    }

    for (const result of results) {
      const original = batch.find((r) => r.id === result.id);
      if (!original) continue;

      if (!result.fixed_name) {
        log(`  SKIP [${result.confidence}] "${original.company_name}" → null`);
        skipped++;
        continue;
      }

      // Don't overwrite with a name that's still broken
      if (result.fixed_name.includes(String.fromCharCode(0xfffd)) || result.fixed_name.includes("??")) {
        log(`  SKIP (still broken) "${original.company_name}" → "${result.fixed_name}"`);
        skipped++;
        continue;
      }

      log(`  FIX  [${result.confidence}] "${original.company_name}" → "${result.fixed_name}"`);
      const ok = await updateRow(result.id, result.fixed_name);
      if (ok) fixed++;
      else failed++;
    }

    // Light rate-limit pause between batches
    await new Promise((r) => setTimeout(r, 500));
  }

  log(`\n=== DONE ===`);
  log(`Total: ${rows.length}`);
  log(`Fixed: ${fixed}`);
  log(`Skipped (could not determine): ${skipped}`);
  log(`Failed: ${failed}`);
  log(`\nLog written to ${LOG_FILE}`);
  if (DRY_RUN) {
    log(`\nDRY RUN — no DB changes were made. Re-run with DRY_RUN=false to apply.`);
  }
}

main().catch((e) => {
  log(`FATAL: ${e}`);
  process.exit(1);
});
/**
 * Import product taxonomy from Products_21_5_2026.xlsx into product_categories table.
 * Extracts unique Tier 1 (major) and Tier 2 (sub) category values.
 *
 * Run with: npx tsx scripts/05-import-taxonomy.ts
 * Dry-run:  DRY_RUN=true npx tsx scripts/05-import-taxonomy.ts
 *
 * SQL required (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS public.product_categories (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name text NOT NULL,
 *     slug text UNIQUE,
 *     parent_name text,
 *     description text,
 *     tags text[] DEFAULT '{}',
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 * Idempotent: upserts on slug.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// ─── Load .env.local ─────────────────────────────────────────────────────────
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — assume env vars are already set
  }
}

loadEnvLocal();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TIER1_COL = "Tier 1: Major Category";
const TIER2_COL = "Tier 2: Sub-Category";
const TIER3_COL = "Tier 3: Specific Product Description";
const TAGS_COL  = "Search Keywords – Ingredients & Inputs";

const DRY_RUN = process.env.DRY_RUN === "true";
const XLSX_FILE = resolve(process.cwd(), "data/Products_21_5_2026.xlsx");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type CategoryRecord = {
  name: string;
  slug: string;
  parent_name: string | null;
  description: string | null;
  tags: string[];
  tier1: string | null;
  tier2: string | null;
  tier3: string | null;
  level: number;
  is_leaf: boolean;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(XLSX_FILE)) {
    console.error(`✗ File not found: ${XLSX_FILE}`);
    process.exit(1);
  }

  console.log("Reading XLSX (this may take a moment)…");
  const wb = XLSX.readFile(XLSX_FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    console.log("No rows found in XLSX.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n── DRY RUN: XLSX column discovery ───────────────────────");
    console.log("Total rows:", rows.length);
    console.log("\nAll columns:");
    Object.keys(rows[0]).forEach((c) => console.log(`  "${c}"`));
    console.log("\nSample Tier values (first 5 rows):");
    rows.slice(0, 5).forEach((row, i) => {
      console.log(`  Row ${i + 1}: Tier1="${row[TIER1_COL]}" | Tier2="${row[TIER2_COL]}"`);
    });
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("No changes made. Remove DRY_RUN=true to import.");
    return;
  }

  // Collect unique Tier 1 categories
  // key = tier1 name, value = first seen description + tags
  const tier1: Map<string, { description: string; tags: string[] }> = new Map();

  // Collect unique Tier 2 sub-categories
  // key = tier2 name, value = { parent (tier1), description, tags }
  const tier2: Map<string, { parent: string; description: string; tags: string[] }> = new Map();

  for (const row of rows) {
    const t1 = row[TIER1_COL]?.toString().trim();
    const t2 = row[TIER2_COL]?.toString().trim();
    const desc = row[TIER3_COL]?.toString().trim() || "";
    const tags = (row[TAGS_COL]?.toString() ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (t1 && !tier1.has(t1)) {
      tier1.set(t1, { description: desc, tags });
    }
    if (t2 && t1 && !tier2.has(t2)) {
      tier2.set(t2, { parent: t1, description: desc, tags });
    }
  }

  console.log(`Extracted ${tier1.size} Tier 1 categories, ${tier2.size} Tier 2 sub-categories.`);

  // Build records list: Tier 1 first, then Tier 2
  const records: CategoryRecord[] = [];

  for (const [name, { description, tags }] of tier1) {
    const slug = slugify(name);
    if (!slug) continue;
    records.push({
      name,
      slug,
      parent_name: null,
      description: description || null,
      tags,
      tier1: name,
      tier2: null,
      tier3: description || null,
      level: 1,
      is_leaf: false,
    });
  }

  for (const [name, { parent, description, tags }] of tier2) {
    const slug = slugify(name);
    if (!slug) continue;
    records.push({
      name,
      slug,
      parent_name: parent,
      description: description || null,
      tags,
      tier1: parent,
      tier2: name,
      tier3: description || null,
      level: 2,
      is_leaf: true,
    });
  }

  if (records.length === 0) {
    console.log("No categories to import.");
    return;
  }

  // Delete all existing rows then insert fresh (idempotent, no unique constraint needed)
  console.log("Clearing existing categories…");
  await Promise.resolve(
    supabaseAdmin.from("product_categories").delete().gte("created_at", "2000-01-01")
  ).catch(console.error);

  console.log(`Inserting ${records.length} categories…`);

  let inserted = 0;
  let failed = 0;
  const BATCH = 100;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabaseAdmin
      .from("product_categories")
      .insert(batch);

    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n✓ ${inserted} inserted  ·  ✗ ${failed} failed`);
  console.log(`  ${tier1.size} top-level  ·  ${tier2.size} sub-categories`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

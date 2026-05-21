/**
 * Import sourcing requests from CSV into sourcing_requests table.
 * Run with: npx tsx scripts/02-import-requests.ts
 * Dry-run:  DRY_RUN=true npx tsx scripts/02-import-requests.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

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
// Step 1: run with DRY_RUN=true to print available columns.
// Step 2: fill in the values below with the actual CSV header names.
const COLUMN_MAP = {
  name: "Contact",            // ← replace with actual CSV header
  email: "Email",
  company: "Company",
  product_name: "Product",
  category: "Category",
  target_market: "Market",
  message: "Notes",
  certifications: "Certs",    // comma-separated → string[]
  private_label: "PL",        // "yes"/"true"/"1" → true
} as const;

const DRY_RUN = process.env.DRY_RUN === "true";
const FILE = resolve(process.cwd(), "data/Buyer_Requests_21_5_2026.csv");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(row: Record<string, string>, col: string): string | null {
  return row[col]?.trim() || null;
}

function toArray(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function toBool(val: string | null): boolean {
  if (!val) return false;
  return ["yes", "true", "1", "y"].includes(val.toLowerCase());
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let content: string;
  try {
    content = readFileSync(FILE, "utf-8");
  } catch {
    console.error(`✗ File not found: ${FILE}`);
    console.error("  Place Buyer_Requests_21_5_2026.csv in the data/ folder and try again.");
    process.exit(1);
  }

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (rows.length === 0) {
    console.log("No rows found in file.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n── DRY RUN: column discovery ─────────────────────────────");
    console.log("Columns found:", Object.keys(rows[0]).join(", "));
    console.log("\nFirst 3 mapped rows:");
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`\n  Row ${i + 1}:`);
      for (const [dbKey, csvCol] of Object.entries(COLUMN_MAP)) {
        console.log(`    ${dbKey}: "${row[csvCol] ?? "—"}"`);
      }
    });
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("No changes made. Update COLUMN_MAP and remove DRY_RUN=true to import.");
    return;
  }

  // Load existing imported requests for dedup (email + product_name combo)
  const { data: existing } = await supabaseAdmin
    .from("sourcing_requests")
    .select("email, product_name")
    .eq("source", "imported");

  const existingKeys = new Set(
    (existing ?? []).map(
      (r) => `${(r.email as string)?.toLowerCase()}::${(r.product_name as string)?.toLowerCase()}`
    )
  );

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = get(row, COLUMN_MAP.email)?.toLowerCase() ?? null;
    const product_name = get(row, COLUMN_MAP.product_name);

    // Skip if this email+product combo was already imported
    const dedupeKey = `${email ?? ""}::${product_name?.toLowerCase() ?? ""}`;
    if (existingKeys.has(dedupeKey)) {
      skipped++;
      continue;
    }

    const record = {
      name: get(row, COLUMN_MAP.name),
      email,
      company: get(row, COLUMN_MAP.company),
      product_name,
      category: get(row, COLUMN_MAP.category),
      target_market: get(row, COLUMN_MAP.target_market),
      message: get(row, COLUMN_MAP.message),
      certifications: toArray(get(row, COLUMN_MAP.certifications)),
      private_label: toBool(get(row, COLUMN_MAP.private_label)),
      status: "new",
      source: "imported",
    };

    const { error } = await supabaseAdmin.from("sourcing_requests").insert(record);

    if (error) {
      console.error(`  ✗ Row skipped (${email ?? "no email"}): ${error.message}`);
      skipped++;
    } else {
      inserted++;
      existingKeys.add(dedupeKey);
    }
  }

  console.log(`\n✓ ${inserted} inserted  ·  ✗ ${skipped} skipped  (${rows.length} total rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

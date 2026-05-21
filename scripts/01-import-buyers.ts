/**
 * Import buyer companies from CSV into buyer_companies table.
 * Run with: npx tsx scripts/01-import-buyers.ts
 * Dry-run:  DRY_RUN=true npx tsx scripts/01-import-buyers.ts
 *
 * SQL required (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS public.buyer_companies (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     company_name text NOT NULL,
 *     contact_name text,
 *     email text,
 *     phone text,
 *     country text,
 *     city text,
 *     website text,
 *     notes text,
 *     tags text[] DEFAULT '{}',
 *     status text DEFAULT 'active',
 *     source text DEFAULT 'imported',
 *     created_at timestamptz DEFAULT now(),
 *     updated_at timestamptz DEFAULT now()
 *   );
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
  company_name: "Company",    // ← replace with actual CSV header
  contact_name: "Contact",
  email: "Email",
  phone: "Phone",
  country: "Country",
  city: "City",
  website: "Website",
  notes: "Notes",
} as const;

const DRY_RUN = process.env.DRY_RUN === "true";
const FILE = resolve(process.cwd(), "data/Buyer_Requests_21_5_2026.csv");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(row: Record<string, string>, col: string): string | null {
  return row[col]?.trim() || null;
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

  // Load existing records for dedup
  const { data: existing } = await supabaseAdmin
    .from("buyer_companies")
    .select("email, company_name");

  const existingEmails = new Set(
    (existing ?? [])
      .map((r) => (r.email as string)?.toLowerCase())
      .filter(Boolean)
  );
  const existingCompanies = new Set(
    (existing ?? [])
      .map((r) => (r.company_name as string)?.toLowerCase())
      .filter(Boolean)
  );

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const company_name = get(row, COLUMN_MAP.company_name);
    if (!company_name) {
      console.warn("  ⚠ Skipping row — missing company_name");
      skipped++;
      continue;
    }

    const email = get(row, COLUMN_MAP.email)?.toLowerCase() ?? null;

    // Skip duplicates
    if (email && existingEmails.has(email)) {
      skipped++;
      continue;
    }
    if (!email && existingCompanies.has(company_name.toLowerCase())) {
      skipped++;
      continue;
    }

    const record = {
      company_name,
      contact_name: get(row, COLUMN_MAP.contact_name),
      email,
      phone: get(row, COLUMN_MAP.phone),
      country: get(row, COLUMN_MAP.country),
      city: get(row, COLUMN_MAP.city),
      website: get(row, COLUMN_MAP.website),
      notes: get(row, COLUMN_MAP.notes),
      source: "imported",
    };

    const { error } = await supabaseAdmin.from("buyer_companies").insert(record);

    if (error) {
      console.error(`  ✗ ${company_name}: ${error.message}`);
      skipped++;
    } else {
      inserted++;
      if (email) existingEmails.add(email);
      existingCompanies.add(company_name.toLowerCase());
    }
  }

  console.log(`\n✓ ${inserted} inserted  ·  ✗ ${skipped} skipped  (${rows.length} total rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

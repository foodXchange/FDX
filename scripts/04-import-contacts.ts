/**
 * Import supplier contacts from CSV into supplier_contacts table.
 * Resolves company_name → supplier_id via lookup against supplier_offerings.
 *
 * Run with: npx tsx scripts/04-import-contacts.ts
 * Dry-run:  DRY_RUN=true npx tsx scripts/04-import-contacts.ts
 *
 * Idempotent: deletes all existing contacts for each matched supplier before inserting.
 * Run 03-import-suppliers.ts first so supplier_offerings is populated.
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
  company_name: "Suppliers",        // links to supplier — used as lookup key
  name: "Full Name",                // first col, BOM-stripped via bom:true
  role: "Job Title / Dept.",
  email: "Email Address",
  phone: "WhatsApp / Phone",
  is_primary: "",                   // no primary flag — default false
  notes: "Open Comments",
} as const;

// Only import rows that are linked to a supplier (skip buyer-only contacts)
const SUPPLIER_FILTER_COL = "Supplier?";

const DRY_RUN = process.env.DRY_RUN === "true";
const FILE = resolve(process.cwd(), "data/Contacts_21_5_2026.csv");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(row: Record<string, string>, col: string): string | null {
  return row[col]?.trim() || null;
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
    console.error("  Place Contacts_21_5_2026.csv in the data/ folder and try again.");
    process.exit(1);
  }

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
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

  // Load all suppliers into a lookup map: company_name.toLowerCase() → id
  const { data: suppliers, error: suppliersError } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id, company_name");

  if (suppliersError) {
    console.error("✗ Failed to load suppliers:", suppliersError.message);
    process.exit(1);
  }

  const supplierMap = new Map<string, string>(
    (suppliers ?? []).map((s) => [
      (s.company_name as string).toLowerCase(),
      s.id as string,
    ])
  );

  console.log(`Loaded ${supplierMap.size} suppliers for lookup.`);

  // Group contacts by supplier_id
  const grouped = new Map<string, typeof rows>();
  const unresolved = new Set<string>();

  for (const row of rows) {
    // Filter: skip contacts not linked to any supplier
    const supplierFilterVal = row[SUPPLIER_FILTER_COL]?.trim().toLowerCase();
    if (
      supplierFilterVal !== undefined &&
      supplierFilterVal !== "" &&
      !["yes", "true", "1"].includes(supplierFilterVal)
    ) {
      continue;
    }

    const rawCompany = get(row, COLUMN_MAP.company_name);
    if (!rawCompany) continue;

    // "Suppliers" column may contain multiple names separated by comma
    const companyNames = rawCompany.split(",").map((s) => s.trim()).filter(Boolean);

    for (const company_name of companyNames) {
      const supplierId = supplierMap.get(company_name.toLowerCase());
      if (!supplierId) {
        if (!unresolved.has(company_name)) {
          console.warn(`  ⚠ No supplier found for: "${company_name}"`);
          unresolved.add(company_name);
        }
        continue;
      }

      const existing = grouped.get(supplierId) ?? [];
      existing.push(row);
      grouped.set(supplierId, existing);
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (const [supplierId, contactRows] of grouped) {
    // Delete existing contacts for this supplier (idempotent)
    await Promise.resolve(
      supabaseAdmin.from("supplier_contacts").delete().eq("supplier_id", supplierId)
    ).catch(console.error);

    const records = contactRows
      .filter((row) => {
        const name = get(row, COLUMN_MAP.name);
        if (!name) { skipped++; return false; }
        return true;
      })
      .map((row) => ({
        supplier_id: supplierId,
        name: get(row, COLUMN_MAP.name),
        title: get(row, COLUMN_MAP.role),   // table uses "title", not "role"
        email: get(row, COLUMN_MAP.email),
        phone: get(row, COLUMN_MAP.phone),
        is_primary: toBool(get(row, COLUMN_MAP.is_primary)),
        notes: get(row, COLUMN_MAP.notes),
      }));

    if (records.length === 0) continue;

    const { error } = await supabaseAdmin.from("supplier_contacts").insert(records);

    if (error) {
      console.error(`  ✗ Contacts for supplier ${supplierId}: ${error.message}`);
      skipped += records.length;
    } else {
      inserted += records.length;
    }
  }

  console.log(`\n✓ ${inserted} contacts inserted  ·  ✗ ${skipped} skipped`);
  if (unresolved.size > 0) {
    console.log(`⚠  ${unresolved.size} company name(s) not matched to any supplier — check spelling`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Repair mojibake in supplier_offerings.company_name.
 *
 * Strategy (Option 3 — hybrid):
 *   - Apply CSV name only when it contains ZERO U+FFFD characters (fully clean).
 *   - Skip rows where the CSV name itself has U+FFFD (still-corrupted accented names).
 *   - Generate migrations/reports/mojibake_unrecovered.csv for manual correction.
 *   - Snapshot all 571 affected rows to mojibake_backup_<ts>.json before any writes.
 *
 * Source CSV paths (override via env vars if files move):
 *   SOURCE_CSV_CLEANED  default: C:\Users\ASUS\Downloads\european_suppliers_cleaned.csv
 *   SOURCE_CSV_FULL     default: C:\Users\ASUS\Downloads\files\european_suppliers_full.csv
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/fix-mojibake.ts
 *
 * Dry-run (no DB writes):
 *   DRY_RUN=true npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/fix-mojibake.ts
 *
 * Rollback:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/rollback-mojibake.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DRY_RUN = process.env.DRY_RUN === "true";

const CSV_CLEANED =
  process.env.SOURCE_CSV_CLEANED ??
  "C:\\Users\\ASUS\\Downloads\\european_suppliers_cleaned.csv";

const CSV_FULL =
  process.env.SOURCE_CSV_FULL ??
  "C:\\Users\\ASUS\\Downloads\\files\\european_suppliers_full.csv";

const PATTERN = "ï¿½";
const BATCH_SIZE = 100;

type AffectedRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
};

type CsvRow = {
  company_name?: string;
  website?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizedDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/^www\./i, "");
  }
}

function isCleanName(name: string): boolean {
  return !name.includes("�");
}

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function writeCsv(filePath: string, header: string, rows: (string | null)[][]): void {
  const body = rows.map((r) => r.map(csvEscape).join(","));
  fs.writeFileSync(filePath, [header, ...body].join("\n") + "\n", "utf8");
}

// ── Load source CSVs → domain map ─────────────────────────────────────────────

function loadCsvDomainMap(csvPath: string): Map<string, string> {
  const domainMap = new Map<string, string>();
  if (!fs.existsSync(csvPath)) {
    console.warn(`  WARNING: CSV not found, skipping: ${csvPath}`);
    return domainMap;
  }
  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as CsvRow[];

  let loaded = 0;
  for (const row of rows) {
    const name = (row.company_name ?? "").trim();
    const website = (row.website ?? "").trim();
    if (!name || !website) continue;
    const domain = normalizedDomain(website);
    if (!domain) continue;
    if (!domainMap.has(domain)) {
      domainMap.set(domain, name);
      loaded++;
    }
  }
  console.log(`  Loaded ${loaded} entries from: ${path.basename(csvPath)}`);
  return domainMap;
}

// ── Fetch all affected rows ────────────────────────────────────────────────────

async function fetchAffected(): Promise<AffectedRow[]> {
  const PAGE_SIZE = 1000;
  let page = 0;
  const rows: AffectedRow[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website, country_of_origin")
      .or(`company_name.ilike.%${PATTERN}%,website.ilike.%${PATTERN}%`)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) { console.error("Fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        id: r.id as string,
        company_name: (r.company_name ?? "") as string,
        website: r.website as string | null,
        country_of_origin: r.country_of_origin as string | null,
      });
    }
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return rows;
}

// ── Batch UPDATE ──────────────────────────────────────────────────────────────

async function batchUpdate(
  updates: { id: string; company_name: string }[]
): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    for (const u of chunk) {
      const { error } = await supabase
        .from("supplier_offerings")
        .update({ company_name: u.company_name })
        .eq("id", u.id);
      if (error) {
        console.error(`  UPDATE failed for id=${u.id}: ${error.message}`);
        process.exit(1);
      }
    }
    const pct = Math.round(((i + chunk.length) / updates.length) * 100);
    process.stdout.write(`\r  Updated ${i + chunk.length}/${updates.length} (${pct}%)...`);
  }
  process.stdout.write("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(DRY_RUN ? "DRY RUN — no DB writes\n" : "LIVE RUN — will write to DB\n");

  // 1. Load domain maps — full CSV first (has proper UTF-8 accents for 649 entries);
  //    cleaned CSV supplements only for domains not in full.
  console.log("Loading source CSVs...");
  const domainMap = new Map<string, string>();
  for (const [k, v] of loadCsvDomainMap(CSV_FULL)) domainMap.set(k, v);
  for (const [k, v] of loadCsvDomainMap(CSV_CLEANED)) {
    if (!domainMap.has(k)) domainMap.set(k, v);
  }
  console.log(`  Combined domain map: ${domainMap.size} entries\n`);

  // 2. Fetch all affected rows
  console.log("Fetching affected rows from DB...");
  const affected = await fetchAffected();
  console.log(`  Found ${affected.length} affected rows\n`);

  // 3. Snapshot ALL affected rows before any writes
  const reportsDir = path.join(process.cwd(), "migrations", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(reportsDir, `mojibake_backup_${ts}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(affected, null, 2), "utf8");
  console.log(`Snapshot (${affected.length} rows) → ${backupPath}\n`);

  // 4. Classify each row into: clean-fix | accented-skip | no-match-skip
  type FixEntry = { id: string; old_company_name: string; new_company_name: string };
  const toUpdate: FixEntry[] = [];
  const manualQueue: AffectedRow[] = [];  // accented CSV name OR no domain match

  for (const row of affected) {
    const domain = normalizedDomain(row.website);
    const csvName = domain ? domainMap.get(domain) : undefined;

    if (csvName && isCleanName(csvName)) {
      // CSV name is fully clean — safe to apply
      toUpdate.push({ id: row.id, old_company_name: row.company_name, new_company_name: csvName });
    } else {
      // Either no match or CSV name itself has U+FFFD — leave DB as-is, queue for manual review
      manualQueue.push(row);
    }
  }

  console.log("Classification:");
  console.log(`  Clean CSV match → will update: ${toUpdate.length}`);
  console.log(`  Needs manual fix (no clean match): ${manualQueue.length}\n`);

  // 5. Write reports
  const fixedPath = path.join(reportsDir, "mojibake_fixed.csv");
  writeCsv(
    fixedPath,
    "id,old_company_name,new_company_name",
    toUpdate.map((u) => [u.id, u.old_company_name, u.new_company_name])
  );
  console.log(`Fixed preview → ${fixedPath}`);

  // Manual correction spreadsheet — includes a blank corrected_name column
  const unrecoveredPath = path.join(reportsDir, "mojibake_unrecovered.csv");
  writeCsv(
    unrecoveredPath,
    "id,current_company_name,website,country,corrected_name",
    manualQueue.map((r) => [r.id, r.company_name, r.website, r.country_of_origin, ""])
  );
  console.log(`Manual correction sheet → ${unrecoveredPath}\n`);

  if (DRY_RUN) {
    console.log("DRY RUN complete — no DB writes made.");
    console.log("Re-run without DRY_RUN=true to apply.");
    return;
  }

  if (toUpdate.length === 0) {
    console.log("Nothing to update (no clean CSV matches found).");
    return;
  }

  // 6. Apply clean updates
  console.log(`Applying ${toUpdate.length} clean-name updates...`);
  await batchUpdate(toUpdate.map((u) => ({ id: u.id, company_name: u.new_company_name })));

  // 7. Verify — should equal manualQueue.length
  const { count } = await supabase
    .from("supplier_offerings")
    .select("*", { count: "exact", head: true })
    .or(`company_name.ilike.%${PATTERN}%,website.ilike.%${PATTERN}%`);

  console.log(`\nPost-update check: ${count ?? "?"} rows still contain pattern (expected: ${manualQueue.length})`);

  console.log("\n── Summary ─────────────────────────────────────────────────────");
  console.log(`  Updated (clean CSV name):  ${toUpdate.length}`);
  console.log(`  Skipped (need manual fix): ${manualQueue.length}`);
  console.log(`  Backup:                    ${path.basename(backupPath)}`);
  console.log(`  Manual correction sheet:   mojibake_unrecovered.csv`);
  console.log("\nFill in the corrected_name column in mojibake_unrecovered.csv,");
  console.log("then re-import via the suppliers upload UI or a follow-up script.");
  console.log("\nRollback if needed:");
  console.log("  npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/rollback-mojibake.ts");
}

main().catch((e) => { console.error(e); process.exit(1); });

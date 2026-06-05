/**
 * Audit supplier_offerings for mojibake in company_name / website.
 * NO DB writes. Read-only.
 *
 * Outputs:
 *   migrations/reports/mojibake_audit.csv  — full affected row list
 *   stdout                                 — count + first 30 rows + codepoint dump
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/audit-mojibake.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The pattern as stored in Postgres — three literal characters: ï ¿ ½
// This is what results when U+FFFD's UTF-8 bytes (EF BF BD) were mis-read as Latin-1.
const PATTERN = "ï¿½";

function csvEscape(v: string | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function codepointDump(s: string, label: string): void {
  // Find first occurrence of PATTERN in s and print surrounding codepoints
  const idx = s.indexOf(PATTERN);
  if (idx === -1) return;
  const start = Math.max(0, idx - 2);
  const end = Math.min(s.length, idx + PATTERN.length + 4);
  const slice = s.slice(start, end);
  const points = [...slice].map(
    (c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} (${c})`
  );
  console.log(`  ${label}: ...${JSON.stringify(slice)}...`);
  console.log(`  Codepoints: ${points.join("  ")}`);
}

async function main(): Promise<void> {
  console.log(`Querying supplier_offerings for pattern: ${JSON.stringify(PATTERN)}`);

  // Paginate — 1000 rows per page
  const PAGE_SIZE = 1000;
  let page = 0;
  const affected: { id: string; company_name: string; website: string | null }[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website")
      .or(`company_name.ilike.%${PATTERN}%,website.ilike.%${PATTERN}%`)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Query error:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      affected.push({
        id: row.id as string,
        company_name: (row.company_name ?? "") as string,
        website: row.website as string | null,
      });
    }

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\nTotal affected rows: ${affected.length}`);

  // ── Write CSV report ─────────────────────────────────────────────────────────
  const reportsDir = path.join(process.cwd(), "migrations", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const csvPath = path.join(reportsDir, "mojibake_audit.csv");
  const header = "id,company_name,website";
  const body = affected.map((r) =>
    [csvEscape(r.id), csvEscape(r.company_name), csvEscape(r.website)].join(",")
  );
  fs.writeFileSync(csvPath, [header, ...body].join("\n") + "\n", "utf8");
  console.log(`\nFull list written to: ${csvPath}`);

  // ── Print first 30 rows ───────────────────────────────────────────────────────
  console.log("\n── First 30 affected rows ──────────────────────────────────────");
  console.log(
    "  " +
      "ID".padEnd(38) +
      "Company Name".padEnd(50) +
      "Website"
  );
  console.log("  " + "─".repeat(38) + " " + "─".repeat(50) + " " + "─".repeat(40));
  const sample = affected.slice(0, 30);
  for (const r of sample) {
    const name = (r.company_name ?? "").slice(0, 48);
    const web = (r.website ?? "").slice(0, 40);
    console.log("  " + r.id.padEnd(38) + name.padEnd(50) + web);
  }

  // ── Codepoint dump for diagnosis ─────────────────────────────────────────────
  console.log("\n── Codepoint diagnosis (first 3 company_names with pattern) ───");
  console.log(
    "  Expected: ï=U+00EF  ¿=U+00BF  ½=U+00BD  (= 3 separate chars, not U+FFFD)"
  );
  const codePointSamples = affected
    .filter((r) => r.company_name.includes(PATTERN))
    .slice(0, 3);
  for (const r of codePointSamples) {
    codepointDump(r.company_name, r.company_name.slice(0, 40));
  }

  console.log("\n── Summary ─────────────────────────────────────────────────────");
  const nameCount = affected.filter((r) => r.company_name.includes(PATTERN)).length;
  const websiteCount = affected.filter((r) => r.website?.includes(PATTERN)).length;
  console.log(`  company_name affected: ${nameCount}`);
  console.log(`  website affected:      ${websiteCount}`);
  console.log(`  Total rows:            ${affected.length}`);
  console.log("\nPAUSE — review the above before proceeding to fix script.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

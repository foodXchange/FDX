/**
 * Rollback mojibake fix — restores company_name (and website) from the JSON
 * snapshot written by fix-mojibake.ts.
 *
 * Usage:
 *   BACKUP_FILE=migrations/reports/mojibake_backup_<ts>.json \
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/rollback-mojibake.ts
 *
 * If BACKUP_FILE is not set, uses the most recent mojibake_backup_*.json.
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
const BATCH_SIZE = 100;

type BackupRow = { id: string; company_name: string; website: string | null };

function findLatestBackup(): string {
  const reportsDir = path.join(process.cwd(), "migrations", "reports");
  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith("mojibake_backup_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) {
    console.error("No mojibake_backup_*.json found in migrations/reports/");
    process.exit(1);
  }
  return path.join(reportsDir, files[0]);
}

async function main(): Promise<void> {
  const backupFile = process.env.BACKUP_FILE
    ? path.resolve(process.env.BACKUP_FILE)
    : findLatestBackup();

  console.log(`Rollback source: ${backupFile}`);
  if (!fs.existsSync(backupFile)) {
    console.error("File not found:", backupFile);
    process.exit(1);
  }

  const rows: BackupRow[] = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  console.log(`Restoring ${rows.length} rows...\n`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    for (const r of chunk) {
      const patch: Record<string, string | null> = { company_name: r.company_name };
      if (r.website !== null) patch.website = r.website;
      const { error } = await supabase
        .from("supplier_offerings")
        .update(patch)
        .eq("id", r.id);
      if (error) {
        console.error(`  UPDATE failed for id=${r.id}: ${error.message}`);
        process.exit(1);
      }
    }
    const pct = Math.round(((i + chunk.length) / rows.length) * 100);
    process.stdout.write(`\r  Restored ${i + chunk.length}/${rows.length} (${pct}%)...`);
  }
  process.stdout.write("\n");
  console.log("\nRollback complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });

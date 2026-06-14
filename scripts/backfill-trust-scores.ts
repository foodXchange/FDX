// Run: npx tsx scripts/backfill-trust-scores.ts [--dry-run] [--limit=N]
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../lib/supabaseAdmin";
import { calculateTrustScore, recalculateAndSaveTrustScore } from "../lib/suppliers/trustScore";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

async function main() {
  let query = supabaseAdmin
    .from("supplier_offerings")
    .select("id, company_name")
    .order("company_name", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data: suppliers, error } = await query;
  if (error) throw new Error(`Failed to fetch suppliers: ${error.message}`);

  let total = 0;
  let sumScore = 0;

  for (const supplier of suppliers ?? []) {
    const breakdown = dryRun
      ? await calculateTrustScore(supplier.id as string)
      : await recalculateAndSaveTrustScore(supplier.id as string);

    console.log(`${supplier.company_name}: ${breakdown.total}`);
    total++;
    sumScore += breakdown.total;
  }

  const avg = total > 0 ? sumScore / total : 0;
  console.log(`\n${total} calculated, avg score: ${avg.toFixed(1)}${dryRun ? " (dry run, not saved)" : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

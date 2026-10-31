/**
 * Batch re-score all active sourcing requests using runMatchV3.
 *
 * Usage:
 *   npx tsx scripts/batch-refresh-matches.ts
 *   npx tsx scripts/batch-refresh-matches.ts --dry-run
 *   npx tsx scripts/batch-refresh-matches.ts --limit=20
 *   npx tsx scripts/batch-refresh-matches.ts --id=<uuid>   (single request)
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables BEFORE any application modules are imported
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { createClient } from "@supabase/supabase-js";

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const SINGLE_ID = (() => {
  const flag = process.argv.find((a) => a.startsWith("--id="));
  return flag ? flag.split("=")[1] : null;
})();
const LIMIT = (() => {
  const flag = process.argv.find((a) => a.startsWith("--limit="));
  return flag ? parseInt(flag.split("=")[1], 10) : null;
})();

const CONCURRENCY = 5;
const DELAY_BETWEEN_MS = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type SourcingRequestRow = {
  id: string;
  product_name: string | null;
  category: string | null;
  status: string | null;
  pipeline_stage: string | null;
};

async function main() {
  console.log(`\n🔄 FDX Batch Match Refresh — ${new Date().toISOString()}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY-RUN" : "LIVE"}`);
  if (SINGLE_ID) console.log(`   Single request: ${SINGLE_ID}`);
  if (LIMIT) console.log(`   Limit: ${LIMIT}`);
  console.log("");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL not set in .env.local");
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set in .env.local");
    process.exit(1);
  }
  if (!process.env.VOYAGE_API_KEY) {
    console.error("❌ VOYAGE_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Dynamically import runMatchV3 AFTER env is fully populated
  const { runMatchV3 } = await import("../lib/matching/runMatchV3");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let query = supabase
    .from("sourcing_requests")
    .select("id, product_name, category, status, pipeline_stage")
    .not("status", "eq", "deleted")
    .not("status", "eq", "exception")
    .order("created_at", { ascending: false });

  if (SINGLE_ID) {
    query = supabase
      .from("sourcing_requests")
      .select("id, product_name, category, status, pipeline_stage")
      .eq("id", SINGLE_ID);
  } else if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: requests, error: fetchErr } = await query;

  if (fetchErr) {
    console.error("❌ Failed to fetch sourcing requests:", fetchErr.message);
    process.exit(1);
  }

  const total = (requests ?? []).length;
  console.log(`📋 Found ${total} request(s) to re-score\n`);

  if (total === 0) {
    console.log("Nothing to do.");
    return;
  }

  async function refreshSingleRequest(
    req: SourcingRequestRow,
    idx: number
  ): Promise<{ id: string; ok: boolean; count?: number; error?: string }> {
    const label = `[${idx + 1}/${total}] ${req.product_name ?? req.id} (${req.id.slice(0, 8)})`;

    if (DRY_RUN) {
      console.log(`  DRY-RUN  ${label}`);
      return { id: req.id, ok: true, count: 0 };
    }

    try {
      const result = await runMatchV3(req.id);
      const count = result.inserted ?? 0;
      const topScore = result.topScore ?? 0;

      console.log(
        `  ✓ OK     ${label} — ${count} matches, top score ${topScore}%`
      );
      return { id: req.id, ok: true, count };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ERR    ${label} — ${msg}`);
      return { id: req.id, ok: false, error: msg };
    }
  }

  const results: { id: string; ok: boolean; count?: number; error?: string }[] = [];
  const allRequests = requests as SourcingRequestRow[];

  for (let i = 0; i < allRequests.length; i += CONCURRENCY) {
    const batch = allRequests.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(allRequests.length / CONCURRENCY);
    console.log(`── Batch ${batchNum}/${totalBatches} (${batch.length} requests) ──`);

    const batchResults = await Promise.all(
      batch.map(async (req, batchIdx) => {
        await sleep(batchIdx * DELAY_BETWEEN_MS);
        return refreshSingleRequest(req, i + batchIdx);
      })
    );

    results.push(...batchResults);

    if (i + CONCURRENCY < allRequests.length) {
      console.log(`   ⏳ Pausing 1s before next batch…`);
      await sleep(1000);
    }
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const totalMatches = ok.reduce((s, r) => s + (r.count ?? 0), 0);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Done — ${ok.length}/${total} succeeded`);
  console.log(`📊 Total match rows written: ${totalMatches}`);
  console.log(
    `📈 Avg matches per request: ${ok.length > 0 ? Math.round(totalMatches / ok.length) : 0}`
  );

  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} failure(s):`);
    failed.forEach((f) => console.log(`   - ${f.id}: ${f.error}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

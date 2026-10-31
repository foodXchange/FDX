/**
 * Batch re-score all active sourcing requests using runMatchV3.
 *
 * Usage:
 *   npx tsx scripts/batch-refresh-matches.ts
 *   npx tsx scripts/batch-refresh-matches.ts --dry-run
 *   npx tsx scripts/batch-refresh-matches.ts --limit=20
 *   npx tsx scripts/batch-refresh-matches.ts --id=<uuid>   (single request)
 *
 * What it does per request:
 *   1. Calls runMatchV3 (re-scores against all supplier products via vector + heuristics)
 *   2. Deletes stale rows from request_matches
 *   3. Upserts fresh ranked matches
 *   4. Logs per-request score summary
 *
 * Rate limiting: 1 request/second, batches of 5 concurrent.
 *
 * Requires: VOYAGE_API_KEY + SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 * in .env.local
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

import { createClient } from "@supabase/supabase-js";
import { runMatchV3 } from "../lib/matching/runMatchV3";

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

// ─── Config ───────────────────────────────────────────────────────────────────
const CONCURRENCY = 5;       // max parallel requests
const DELAY_BETWEEN_MS = 200; // ms between each individual request (rate-limit guard)

// ─── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SourcingRequestRow = {
  id: string;
  product_name: string | null;
  category: string | null;
  status: string | null;
  pipeline_stage: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function refreshSingleRequest(
  req: SourcingRequestRow,
  idx: number,
  total: number
): Promise<{ id: string; ok: boolean; count?: number; error?: string }> {
  const label = `[${idx + 1}/${total}] ${req.product_name ?? req.id} (${req.id.slice(0, 8)})`;

  if (DRY_RUN) {
    console.log(`  DRY-RUN  ${label}`);
    return { id: req.id, ok: true };
  }

  try {
    const result = await runMatchV3(req.id);

    if (!result.success) {
      console.error(`  ✗ FAIL   ${label} — ${result.error ?? "unknown error"}`);
      return { id: req.id, ok: false, error: result.error };
    }

    const matches = result.matches ?? [];
    const count = matches.length;
    const topScore =
      count > 0 ? Math.round((matches[0].final_score ?? 0) * 100) : 0;

    // Delete stale matches
    const { error: delErr } = await supabase
      .from("request_matches")
      .delete()
      .eq("request_id", req.id);

    if (delErr) {
      console.error(`  ✗ DEL    ${label} — ${delErr.message}`);
      return { id: req.id, ok: false, error: delErr.message };
    }

    // Upsert fresh matches
    if (count > 0) {
      const rows = matches.map((m, rank) => ({
        request_id: req.id,
        product_id: m.product_id,
        supplier_id: m.supplier_id,
        score: m.final_score,
        rank: rank + 1,
        score_breakdown: m.score_breakdown ?? null,
        matched_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from("request_matches")
        .upsert(rows, { onConflict: "request_id,product_id" });

      if (upsertErr) {
        console.error(`  ✗ UPSERT ${label} — ${upsertErr.message}`);
        return { id: req.id, ok: false, error: upsertErr.message };
      }
    }

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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 FDX Batch Match Refresh — ${new Date().toISOString()}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY-RUN" : "LIVE"}`);
  if (SINGLE_ID) console.log(`   Single request: ${SINGLE_ID}`);
  if (LIMIT) console.log(`   Limit: ${LIMIT}`);
  console.log("");

  // ── Validate env ────────────────────────────────────────────────────────────
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

  // ── Fetch requests ───────────────────────────────────────────────────────────
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

  // ── Process in batches ───────────────────────────────────────────────────────
  const results: { id: string; ok: boolean; count?: number; error?: string }[] = [];
  const allRequests = requests as SourcingRequestRow[];

  for (let i = 0; i < allRequests.length; i += CONCURRENCY) {
    const batch = allRequests.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(allRequests.length / CONCURRENCY);
    console.log(`── Batch ${batchNum}/${totalBatches} (${batch.length} requests) ──`);

    const batchResults = await Promise.all(
      batch.map(async (req, batchIdx) => {
        // Stagger within batch to avoid API rate limits
        await sleep(batchIdx * DELAY_BETWEEN_MS);
        return refreshSingleRequest(req, i + batchIdx, total);
      })
    );

    results.push(...batchResults);

    // Pause between batches
    if (i + CONCURRENCY < allRequests.length) {
      console.log(`   ⏳ Pausing 1s before next batch…`);
      await sleep(1000);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
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

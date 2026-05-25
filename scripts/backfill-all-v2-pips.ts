/**
 * Backfills v2 PIPs for all requests that have images but no v2 PIP yet.
 * Gate: request_images.count > 0 AND no pips row with pip_version=2 exists.
 * Safe to re-run: groupImages() is idempotent.
 *
 * Run:      npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/backfill-all-v2-pips.ts
 * Dry run:  ... --dry-run
 */

import "dotenv/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { groupImages } from "@/lib/pip/groupImages";

const DRY_RUN = process.argv.includes("--dry-run");
const DELAY_MS = 1000; // 1 s between requests — extractImage calls the LLM

async function findEligibleRequestIds(): Promise<string[]> {
  const { data: imgRows, error: imgError } = await supabaseAdmin
    .from("request_images")
    .select("request_id")
    .limit(1000);

  if (imgError) throw new Error(`Failed to query request_images: ${imgError.message}`);
  if (!imgRows?.length) return [];

  const withImages = [...new Set(imgRows.map((r) => r.request_id as string))];
  console.log(`  ${withImages.length} requests have at least one image`);

  const eligible: string[] = [];
  for (const requestId of withImages) {
    const { data: existing } = await supabaseAdmin
      .from("pips")
      .select("id")
      .eq("sourcing_request_id", requestId)
      .eq("pip_version", 2)
      .limit(1)
      .maybeSingle();

    if (!existing) eligible.push(requestId);
  }

  return eligible;
}

async function run() {
  console.log(`\n=== FoodXchange v2 PIP Backfill${DRY_RUN ? " [DRY RUN]" : ""} ===\n`);

  console.log("Scanning for eligible requests…");
  const eligible = await findEligibleRequestIds();
  console.log(`  ${eligible.length} requests need v2 PIPs\n`);

  if (eligible.length === 0) {
    console.log("Nothing to backfill. Exiting.");
    return;
  }

  if (DRY_RUN) {
    for (const id of eligible) {
      const { data: sr } = await supabaseAdmin
        .from("sourcing_requests")
        .select("product_name")
        .eq("id", id)
        .single();
      console.log(`  Would process: ${id} | ${(sr as { product_name?: string } | null)?.product_name ?? "?"}`);
    }
    console.log("\nDry run complete. No changes made.");
    return;
  }

  let done = 0;
  let failed = 0;

  for (let i = 0; i < eligible.length; i++) {
    const requestId = eligible[i];
    const { data: sr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("product_name")
      .eq("id", requestId)
      .single();
    const name = (sr as { product_name?: string } | null)?.product_name ?? "?";

    process.stdout.write(`[${i + 1}/${eligible.length}] ${requestId} | ${name} … `);

    try {
      const result = await groupImages(requestId);
      const pipCount = result.pip_ids.length;
      console.log(`OK — ${pipCount} PIP${pipCount === 1 ? "" : "s"}, needs_review=${result.needs_review}`);
      done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`ERROR — ${msg}`);
      failed++;
    }

    if (i < eligible.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${done} | Failed: ${failed} | Total: ${eligible.length}`);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

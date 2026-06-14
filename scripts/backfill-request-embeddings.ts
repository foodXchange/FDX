/**
 * Backfill voyage-3 embeddings for sourcing_requests rows.
 *
 * Usage:  npx tsx scripts/backfill-request-embeddings.ts
 *         npx tsx scripts/backfill-request-embeddings.ts --dry-run
 *         npx tsx scripts/backfill-request-embeddings.ts --limit=20
 *
 * Idempotent: rows with a non-NULL embedding are skipped.
 *
 * Uses the same text-extraction logic as lib/matching/runMatchV3.ts
 * (extractFromPip + buildRequestEmbedString) so stored vectors match what
 * live matching computes, and embeds with input_type "query" — the same
 * asymmetric encoding runMatchV3 uses for request_emb.
 *
 * Requires: VOYAGE_API_KEY + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "../lib/ai/embed";
import { extractFromPip, buildRequestEmbedString } from "../lib/matching/runMatchV3";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;
const DRY_RUN = process.argv.includes("--dry-run");
const limitFlagIndex = process.argv.indexOf("--limit");
const LIMIT =
  limitFlagIndex !== -1
    ? parseInt(process.argv[limitFlagIndex + 1], 10)
    : (() => {
        const inline = process.argv.find((a) => a.startsWith("--limit="));
        return inline ? parseInt(inline.split("=")[1], 10) : null;
      })();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADD_COLUMN_SQL = `alter table public.sourcing_requests
  add column if not exists embedding vector(1024);

create index if not exists sourcing_requests_embedding_idx
  on public.sourcing_requests
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);`;

type SourcingRequestRow = {
  id: string;
  intent_json: Record<string, unknown> | null;
  product_name: string | null;
  category: string | null;
  message: string | null;
  embedding: unknown;
};

type PipRow = {
  sourcing_request_id: string;
  data_json: Record<string, unknown> | null;
};

async function main() {
  // ── Column existence check ──────────────────────────────────────────────
  const { error: colError } = await supabase
    .from("sourcing_requests")
    .select("id, embedding")
    .limit(1);

  if (colError) {
    if (colError.code === "42703") {
      console.error("The `embedding` column does not exist on sourcing_requests yet.");
      console.error("Run this SQL manually in Supabase, then re-run this script:\n");
      console.error(ADD_COLUMN_SQL);
      if (!DRY_RUN) process.exit(1);
      console.error("\n[dry-run] Continuing to preview embed strings anyway...\n");
    } else {
      console.error("Failed to query sourcing_requests:", colError.message);
      process.exit(1);
    }
  }

  // ── Fetch all rows (paginated) ──────────────────────────────────────────
  console.log("Fetching sourcing_requests...");

  const PAGE = 1000;
  const selectCols = colError
    ? "id, intent_json, product_name, category, message"
    : "id, intent_json, product_name, category, message, embedding";

  let rows: SourcingRequestRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("sourcing_requests")
      .select(selectCols)
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("Failed to fetch rows:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    rows = rows.concat(
      (data as unknown[]).map((r) => ({
        embedding: null,
        ...(r as object),
      })) as SourcingRequestRow[]
    );

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Total rows: ${rows.length}`);

  const toProcessAll = rows.filter((r) => r.embedding === null);
  const alreadyEmbedded = rows.length - toProcessAll.length;
  const toProcess = LIMIT !== null ? toProcessAll.slice(0, LIMIT) : toProcessAll;

  console.log(
    `Rows without embedding: ${toProcessAll.length}  (already embedded: ${alreadyEmbedded})`
  );
  if (LIMIT !== null) {
    console.log(`--limit=${LIMIT}: processing ${toProcess.length} rows`);
  }

  if (toProcess.length === 0) {
    console.log("\nNothing to do. Done.");
    return;
  }

  // ── Process in batches ───────────────────────────────────────────────────
  let embedded = 0;
  let emptyTextSkipped = 0;
  let embedErrors = 0;
  let writeErrors = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    // Batch-fetch v2 image PIPs for this batch's request ids.
    const ids = batch.map((r) => r.id);
    const { data: pipRows, error: pipError } = await supabase
      .from("pips")
      .select("sourcing_request_id, data_json")
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .in("sourcing_request_id", ids);

    if (pipError) {
      console.error("  Failed to fetch pips for batch:", pipError.message);
    }

    const pipByRequestId = new Map<string, Record<string, unknown> | null>();
    for (const p of (pipRows ?? []) as PipRow[]) {
      pipByRequestId.set(p.sourcing_request_id, p.data_json);
    }

    const embedStrings = batch.map((r) => {
      const pipJson = pipByRequestId.get(r.id) ?? r.intent_json ?? null;
      const { productText, niceToHave } = extractFromPip(pipJson, {
        productName: r.product_name,
        category: r.category,
        message: r.message,
      });
      return buildRequestEmbedString(productText, niceToHave);
    });

    if (DRY_RUN) {
      batch.forEach((r, j) => {
        const text = embedStrings[j];
        if (text.trim().length <= 1) {
          emptyTextSkipped++;
          console.log(`[${i + j + 1}] ${r.id} | (empty — would be skipped)`);
        } else {
          console.log(`[${i + j + 1}] ${r.id} | ${text.slice(0, 120)}`);
        }
      });
      continue;
    }

    // Embed only rows with non-trivial text.
    const embedIndices: number[] = [];
    const textsToEmbed: string[] = [];
    batch.forEach((_, j) => {
      if (embedStrings[j].trim().length > 1) {
        embedIndices.push(j);
        textsToEmbed.push(embedStrings[j]);
      } else {
        emptyTextSkipped++;
      }
    });

    if (textsToEmbed.length > 0) {
      const vectors = await embedBatch(textsToEmbed, "query");

      for (let k = 0; k < embedIndices.length; k++) {
        const r = batch[embedIndices[k]];
        const vec = vectors[k];
        if (!vec) {
          embedErrors++;
          continue;
        }

        const { error: upErr } = await supabase
          .from("sourcing_requests")
          .update({ embedding: vec as unknown as string })
          .eq("id", r.id);

        if (upErr) {
          console.error(`  Embedding update error for ${r.id}:`, upErr.message);
          writeErrors++;
        } else {
          embedded++;
        }
      }
    }

    process.stdout.write(
      `  Processed: ${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length} (embedded: ${embedded}, errors: ${embedErrors + writeErrors})\r`
    );

    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] Previewed ${toProcess.length} rows (${emptyTextSkipped} would be skipped as empty).`);
    return;
  }

  console.log(`\n\n── Summary ──────────────────────────────`);
  console.log(`Total rows:        ${rows.length}`);
  console.log(`Already embedded:  ${alreadyEmbedded}`);
  console.log(`Processed:         ${toProcess.length}`);
  console.log(`Newly embedded:    ${embedded}`);
  console.log(`Skipped (empty):   ${emptyTextSkipped}`);
  console.log(`Embed errors:      ${embedErrors}`);
  console.log(`Write errors:      ${writeErrors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

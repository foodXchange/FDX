/**
 * Backfill voyage-3 embeddings and typed hard-constraint columns for all
 * supplier_products rows.
 *
 * Usage:  npx tsx scripts/backfill-embeddings.ts
 *
 * Idempotent: rows with a non-NULL embedding are skipped for embedding.
 * Hard-constraint columns (kosher_level, is_organic, etc.) are always
 * re-derived from existing data — safe to re-run to fix mistakes.
 *
 * Requires: VOYAGE_API_KEY and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY) in environment or .env.local.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local from project root
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "../lib/ai/embed";

const BATCH_SIZE = 64;
const FORCE = process.argv.includes("--force");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Hard-constraint derivation ────────────────────────────────────────────────

function deriveKosherLevel(kosherTypes: string[]): string {
  const lower = kosherTypes.map((t) => t.toLowerCase());
  if (lower.some((t) => t.includes("badatz") || t.includes("bet din") || t.includes("beit din")))
    return "badatz";
  if (lower.some((t) => t.includes("mehadrin"))) return "mehadrin";
  if (lower.some((t) => t.includes("kosher"))) return "regular";
  return "none";
}

function deriveKosherPassover(kosherTypes: string[]): boolean {
  return kosherTypes.some((t) => {
    const l = t.toLowerCase();
    return l.includes("passover") || l.includes("pesach");
  });
}

function containsAny(fields: string[], ...terms: string[]): boolean {
  return fields.some((f) => terms.some((t) => f.toLowerCase().includes(t)));
}

// ── Embed string builder ──────────────────────────────────────────────────────

function buildSupplierEmbedString(row: {
  product_name: string | null;
  description: string | null;
  subcategory: string | null;
  tags: string[] | null;
  country_of_origin: string | null;
}): string {
  const parts = [
    row.product_name?.trim(),
    row.description?.trim(),
    row.subcategory?.trim(),
    row.tags?.filter(Boolean).join(". ").trim() || null,
    row.country_of_origin?.trim(),
  ]
    .filter((p): p is string => Boolean(p))
    .join(". ");

  return parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching supplier_products...");

  const { data: rows, error } = await supabase
    .from("supplier_products")
    .select(
      `id, product_name, description, subcategory, tags, certifications,
       kosher_types, embedding,
       supplier_offerings!inner(country_of_origin)`
    );

  if (error || !rows) {
    console.error("Failed to fetch rows:", error);
    process.exit(1);
  }

  console.log(`Total rows: ${rows.length}`);

  const toEmbed = FORCE ? rows : rows.filter((r) => r.embedding === null);
  const toSkip  = rows.length - toEmbed.length;
  if (FORCE) console.log(`--force: embedding all ${rows.length} rows (ignoring existing vectors)`);
  else console.log(`Rows to embed: ${toEmbed.length}  (skipping ${toSkip} already-embedded)`);

  // ── Populate hard-constraint columns for ALL rows ──────────────────────────
  console.log("\nPopulating hard-constraint columns for all rows...");
  let constraintErrors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const updates = batch.map((r) => {
      const kosherTypes  = (r.kosher_types   as string[] | null) ?? [];
      const certifs      = (r.certifications as string[] | null) ?? [];
      const tags         = (r.tags           as string[] | null) ?? [];
      const allSearchable = [...certifs, ...tags];

      return {
        id: r.id,
        kosher_level:   deriveKosherLevel(kosherTypes),
        kosher_passover: deriveKosherPassover(kosherTypes),
        is_organic:     containsAny(certifs, "organic"),
        is_halal:       containsAny(certifs, "halal"),
        is_gluten_free: containsAny(allSearchable, "gluten free", "gluten-free"),
        is_sugar_free:  containsAny(allSearchable, "sugar free", "sugar-free"),
        // temperature and channel have no source data — leave NULL
      };
    });

    // Upsert constraint columns without touching embedding
    const { error: upErr } = await supabase
      .from("supplier_products")
      .upsert(updates, { onConflict: "id" });

    if (upErr) {
      console.error(`  Constraint update error (batch ${i / BATCH_SIZE + 1}):`, upErr);
      constraintErrors++;
    } else {
      process.stdout.write(`  Constraints: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
    }
  }
  console.log(`\nConstraint population done. Errors: ${constraintErrors}`);

  // ── Embed rows that don't have embeddings yet ──────────────────────────────
  if (toEmbed.length === 0) {
    console.log("\nAll rows already have embeddings. Done.");
    return;
  }

  console.log(`\nEmbedding ${toEmbed.length} rows in batches of ${BATCH_SIZE}...`);
  let embedded = 0;
  let embedErrors = 0;

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);

    const texts = batch.map((r) =>
      buildSupplierEmbedString({
        product_name: r.product_name as string | null,
        description:  r.description  as string | null,
        subcategory:  r.subcategory  as string | null,
        tags:         r.tags         as string[] | null,
        // supplier_offerings is a join result — Supabase returns it as an array
        country_of_origin: (r.supplier_offerings as { country_of_origin: string | null }[] | null)?.[0]
          ?.country_of_origin ?? null,
      })
    );

    const vectors = await embedBatch(texts, "document");

    // Update each row individually for those that succeeded
    for (let j = 0; j < batch.length; j++) {
      const vec = vectors[j];
      if (!vec) {
        embedErrors++;
        continue;
      }
      const { error: upErr } = await supabase
        .from("supplier_products")
        .update({ embedding: vec as unknown as string }) // PostgREST serialises array → vector
        .eq("id", batch[j].id);

      if (upErr) {
        console.error(`  Embedding update error for ${batch[j].id}:`, upErr);
        embedErrors++;
      } else {
        embedded++;
      }
    }

    process.stdout.write(
      `  Embedded: ${Math.min(i + BATCH_SIZE, toEmbed.length)}/${toEmbed.length} (errors: ${embedErrors})\r`
    );
  }

  console.log(`\n\n── Summary ──────────────────────────────`);
  console.log(`Total rows:       ${rows.length}`);
  console.log(`Already embedded: ${toSkip}`);
  console.log(`Newly embedded:   ${embedded}`);
  console.log(`Embed errors:     ${embedErrors}`);
  console.log(`Constraint errors:${constraintErrors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

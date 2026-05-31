/**
 * Backfill voyage-3 embeddings and typed hard-constraint columns for all
 * supplier_products rows.
 *
 * Usage:  npx tsx scripts/backfill-embeddings.ts
 *         npx tsx scripts/backfill-embeddings.ts --force   (re-embed all rows)
 *
 * Idempotent: rows with a non-NULL embedding are skipped unless --force.
 * Hard-constraint columns (kosher_level, is_organic, etc.) are always
 * re-derived from existing data — safe to re-run to fix derivation mistakes.
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

const BATCH_SIZE = 64;
const FORCE = process.argv.includes("--force");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Hard-constraint derivation ────────────────────────────────────────────────

function deriveKosherLevel(kosherTypes: string[]): string {
  const lower = kosherTypes.map((t) => t.toLowerCase());

  // Mehadrin-or-stricter tier
  if (lower.some((t) =>
    t.includes("badatz") ||
    t.includes("bet din") ||
    t.includes("beit din")
  )) return "badatz";

  if (lower.some((t) => t.includes("mehadrin"))) return "mehadrin";

  // Regular kosher — includes Israeli Chief Rabbinate and all common
  // international kosher authorities that aren't Mehadrin/Badatz
  if (lower.some((t) =>
    t.includes("kosher")      ||   // generic "Kosher", "OU Kosher", "OK Kosher"
    t.includes("kasher")      ||   // French/alternative spelling
    t.includes("rabbinate")   ||   // Chief Rabbinate, Local Rabbinate
    t.includes("rabbanut")    ||   // Hebrew transliteration
    t.includes("kof-k")       ||
    t.includes("kof k")       ||
    t.includes("star-k")      ||
    t.includes("star k")      ||
    t.includes("crc")         ||   // Chicago Rabbinical Council
    t.includes("klbd")        ||   // Kedassia / London Beth Din
    t.includes("beth din")    ||
    t.includes("kedassia")    ||
    t.includes("mk kosher")   ||   // Montreal Kosher
    t.includes("triangle k")
  )) return "regular";

  return "none";
}

function deriveKosherPassover(kosherTypes: string[]): boolean {
  return kosherTypes.some((t) => {
    const l = t.toLowerCase();
    return l.includes("passover") || l.includes("pesach") || l.includes("le-pesach");
  });
}

function containsAny(fields: string[], ...terms: string[]): boolean {
  return fields.some((f) => terms.some((t) => f.toLowerCase().includes(t)));
}

// ── Embed string builder ──────────────────────────────────────────────────────

function buildSupplierEmbedString(row: {
  product_name:     string | null;
  description:      string | null;
  subcategory:      string | null;
  processing_type?: string | null;
  ingredients?:     string | null;
  tags:             string[] | null;
  country_of_origin: string | null;
}): string {
  const parts = [
    row.product_name?.trim(),
    row.description?.trim(),
    row.subcategory?.trim(),
    row.processing_type?.trim() || null,
    row.ingredients?.trim() || null,
    row.tags?.filter(Boolean).join('. ').trim() || null,
    row.country_of_origin?.trim(),
  ]
    .filter((p): p is string => Boolean(p))
    .join('. ');

  return (parts.replace(/\.{2,}/g, '.').replace(/\.\s*$/, '') + '.').replace(/\s+\./g, '.');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching supplier_products...");

  // Supabase `select()` is capped at 1000 rows by default. Paginate to fetch all rows.
  const PAGE = 1000;
  const selectCols = `id, product_name, description, subcategory, processing_type, ingredients, tags, certifications,
       kosher_types, embedding,
       supplier_offerings!inner(country_of_origin)`;

  let rows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_products")
      .select(selectCols)
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("Failed to fetch rows:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    rows = rows.concat(data as any[]);

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Total rows: ${rows.length}`);

  const toEmbed = FORCE ? rows : rows.filter((r) => r.embedding === null);
  const toSkip  = rows.length - toEmbed.length;
  if (FORCE) {
    console.log(`--force: embedding all ${rows.length} rows (ignoring existing vectors)`);
  } else {
    console.log(`Rows to embed: ${toEmbed.length}  (skipping ${toSkip} already-embedded)`);
  }

  // ── Populate hard-constraint columns for ALL rows ──────────────────────────
  console.log("\nPopulating hard-constraint columns for all rows...");
  let constraintErrors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const r of batch) {
      const kosherTypes   = (r.kosher_types   as string[] | null) ?? [];
      const certifs       = (r.certifications as string[] | null) ?? [];
      const tags          = (r.tags           as string[] | null) ?? [];
      const allSearchable = [...certifs, ...tags];

      const payload = {
        kosher_level:    deriveKosherLevel(kosherTypes),
        kosher_passover: deriveKosherPassover(kosherTypes),
        is_organic:      containsAny(certifs, "organic"),
        is_halal:        containsAny(certifs, "halal"),
        is_gluten_free:  containsAny(allSearchable, "gluten free", "gluten-free"),
        is_sugar_free:   containsAny(allSearchable, "sugar free", "sugar-free"),
        temperature:     null as string | null,
        channel:         null as string[] | null,
      };

      const { error: upErr } = await supabase
        .from("supplier_products")
        .update(payload)
        .eq("id", r.id);

      if (upErr) {
        console.error(`  Constraint update error for ${r.product_name} (${r.id}):`, upErr.message);
        constraintErrors++;
      }
    }

    process.stdout.write(
      `  Constraints: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`
    );
  }
  console.log(`\nConstraint population done. Errors: ${constraintErrors}`);

  // ── Spot-check: print kosher_level distribution ───────────────────────────
  const dist: Record<string, number> = {};
  for (const r of rows) {
    const kosherTypes = (r.kosher_types as string[] | null) ?? [];
    const level = deriveKosherLevel(kosherTypes);
    dist[level] = (dist[level] ?? 0) + 1;
  }
  console.log("Kosher level distribution (derived):", dist);

  // ── Embed rows that need it ───────────────────────────────────────────────
  if (toEmbed.length === 0) {
    console.log("\nAll rows already have embeddings. Done.");
    return;
  }

  console.log(`\nEmbedding ${toEmbed.length} rows in batches of ${BATCH_SIZE}...`);
  let embedded    = 0;
  let embedErrors = 0;

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);

    const texts = batch.map((r) =>
      buildSupplierEmbedString({
        product_name:      r.product_name as string | null,
        description:       r.description  as string | null,
        subcategory:       r.subcategory  as string | null,
        processing_type:   (r as any).processing_type ?? null,
        ingredients:       (r as any).ingredients ?? null,
        tags:              r.tags         as string[] | null,
        country_of_origin:
          (r.supplier_offerings as { country_of_origin: string | null }[] | null)?.[0]
            ?.country_of_origin ?? null,
      })
    );

    const vectors = await embedBatch(texts, "document");

    for (let j = 0; j < batch.length; j++) {
      const vec = vectors[j];
      if (!vec) {
        embedErrors++;
        continue;
      }
      const { error: upErr } = await supabase
        .from("supplier_products")
        .update({ embedding: vec as unknown as string })
        .eq("id", batch[j].id);

      if (upErr) {
        console.error(`  Embedding update error for ${batch[j].product_name}:`, upErr.message);
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
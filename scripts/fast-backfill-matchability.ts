/**
 * Fast Matchability Backfill:
 * 1. Resolves canonical category_id for supplier_products using SCRAPER_CATEGORY_MAP.
 * 2. Generates Voyage-3 vector embeddings for supplier_products missing embeddings.
 *
 * Usage: npx tsx scripts/fast-backfill-matchability.ts [--categories-only] [--embeddings-only] [--limit=1000]
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { mapScraperCategoryToCanonicalId } from "../lib/pip/resolveCategoryId";
import { embedBatch } from "../lib/ai/embed";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const args = {
  categoriesOnly: process.argv.includes("--categories-only"),
  embeddingsOnly: process.argv.includes("--embeddings-only"),
  limit: (() => {
    const lim = process.argv.find((a) => a.startsWith("--limit="));
    return lim ? parseInt(lim.slice(8), 10) : null;
  })(),
};

async function backfillCategories() {
  console.log("\n─── 1. BACKFILLING CATEGORY IDs ───");
  let totalMapped = 0;
  let page = 0;
  const CHUNK = 500;

  while (true) {
    const { data: rows, error } = await supabase
      .from("supplier_products")
      .select("id, category")
      .is("category_id", null)
      .not("category", "is", null)
      .range(0, CHUNK - 1);

    if (error) {
      console.error("Fetch error:", error.message);
      break;
    }
    if (!rows || rows.length === 0) {
      console.log("No more products missing category_id.");
      break;
    }

    const updates: { id: string; category_id: string }[] = [];
    for (const r of rows) {
      const catId = mapScraperCategoryToCanonicalId(r.category);
      if (catId) {
        updates.push({ id: r.id, category_id: catId });
      }
    }

    if (updates.length > 0) {
      for (const u of updates) {
        await supabase
          .from("supplier_products")
          .update({ category_id: u.category_id })
          .eq("id", u.id);
      }
      totalMapped += updates.length;
      console.log(`Mapped ${updates.length}/${rows.length} products in chunk (total mapped: ${totalMapped})`);
    } else {
      console.log(`Remaining ${rows.length} products in chunk cannot be auto-mapped (e.g. 'Other'). Stopping category pass.`);
      break;
    }

    if (args.limit && totalMapped >= args.limit) break;
  }
  console.log(`✓ Category backfill finished. Total mapped: ${totalMapped}`);
}

async function backfillEmbeddings() {
  console.log("\n─── 2. BACKFILLING VOYAGE EMBEDDINGS ───");
  if (!process.env.VOYAGE_API_KEY) {
    console.error("VOYAGE_API_KEY not configured — skipping embeddings.");
    return;
  }

  let totalEmbedded = 0;
  const BATCH_SIZE = 64;

  while (true) {
    const { data: rows, error } = await supabase
      .from("supplier_products")
      .select("id, product_name, description, subcategory, tags")
      .is("embedding", null)
      .range(0, BATCH_SIZE - 1);

    if (error) {
      console.error("Fetch error:", error.message);
      break;
    }
    if (!rows || rows.length === 0) {
      console.log("No more products missing embeddings.");
      break;
    }

    const embedTexts = rows.map((p) => {
      const parts = [
        p.product_name?.trim(),
        p.description?.trim(),
        p.subcategory?.trim(),
        p.tags?.filter(Boolean).join(". ").trim() || null,
      ].filter(Boolean).join(". ");
      return (parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".").replace(/\s+\./g, ".");
    });

    try {
      const vectors = await embedBatch(embedTexts, "document");
      let updatedInBatch = 0;
      for (let i = 0; i < rows.length; i++) {
        if (vectors[i]) {
          await supabase
            .from("supplier_products")
            .update({ embedding: JSON.stringify(vectors[i]) })
            .eq("id", rows[i].id);
          updatedInBatch++;
        }
      }
      totalEmbedded += updatedInBatch;
      console.log(`Embedded ${updatedInBatch}/${rows.length} products (total embedded: ${totalEmbedded})`);
    } catch (e) {
      console.error("Embedding batch failed:", e);
      break;
    }

    if (args.limit && totalEmbedded >= args.limit) break;
  }
  console.log(`✓ Embeddings backfill finished. Total embedded: ${totalEmbedded}`);
}

async function main() {
  console.log("Starting Fast Matchability Backfill...");
  if (!args.embeddingsOnly) {
    await backfillCategories();
  }
  if (!args.categoriesOnly) {
    await backfillEmbeddings();
  }
}

main().catch(console.error);

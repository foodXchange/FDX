// Run: npx tsx scripts/backfill-product-images.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { resolveImageFromHtml } from "../lib/scraper/resolveProductImage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FoodXchangeBot/1.0; +https://fdx.trading)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main() {
  console.log("Fetching supplier_products missing images...");

  const { data: rows, error } = await supabase
    .from("supplier_products")
    .select("id, source_url")
    .is("image_url", null)
    .not("source_url", "is", null);

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("Nothing to backfill — all products already have images or no source_url.");
    return;
  }

  const productIdsByUrl = new Map<string, string[]>();
  for (const row of rows as { id: string; source_url: string }[]) {
    const list = productIdsByUrl.get(row.source_url) ?? [];
    list.push(row.id);
    productIdsByUrl.set(row.source_url, list);
  }

  const uniqueUrls = Array.from(productIdsByUrl.keys());
  console.log(
    `Found ${rows.length} product(s) without images across ${uniqueUrls.length} unique page(s).`
  );

  let pagesProcessed = 0;
  let imagesFound = 0;
  let productsUpdated = 0;

  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (sourceUrl) => {
        const html = await fetchHtml(sourceUrl);
        if (!html) return;

        const { url: imageUrl, source: imageSource } = resolveImageFromHtml(html, sourceUrl);
        if (!imageUrl) return;

        const ids = productIdsByUrl.get(sourceUrl) ?? [];
        const { error: updateError } = await supabase
          .from("supplier_products")
          .update({ image_url: imageUrl, image_source: imageSource })
          .in("id", ids)
          .is("image_url", null);

        if (updateError) {
          console.error(`  [ERROR] ${sourceUrl}: ${updateError.message}`);
          return;
        }

        imagesFound += 1;
        productsUpdated += ids.length;
        console.log(`  [FOUND] ${sourceUrl} → ${imageSource} (${ids.length} product(s))`);
      })
    );

    pagesProcessed += batch.length;
    console.log(
      `Processed ${pagesProcessed}/${uniqueUrls.length} pages, found ${imagesFound} images`
    );

    if (i + BATCH_SIZE < uniqueUrls.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(
    `\nDone. Pages processed: ${pagesProcessed}, images found: ${imagesFound}, products updated: ${productsUpdated}.`
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

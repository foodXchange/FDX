// Temporary image-fill pass using OpenAI's web-search-enabled Responses API
// while Anthropic API billing is being fixed. Image-only — never touches any
// other supplier_products column, never inserts rows.
//
// Run: npx tsx scripts/fill-images-openai-search.ts
//      npx tsx scripts/fill-images-openai-search.ts --limit 2 --product-limit 3

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { appendFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set — required to run scripts/fill-images-openai-search.ts");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LOG_PATH = resolve(process.cwd(), "scripts/fill-images-openai.log");
const PRODUCT_BATCH_SIZE = 5;
const PRODUCT_BATCH_DELAY_MS = 1000;
const SEARCH_DELAY_MS = 500;
const COST_PER_SEARCH = 0.001; // gpt-4o-mini + web search, rough estimate
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)(\?[^\s]*)?$/i;

// ─── Tier 1 suppliers — highest match-card appearance counts ─────────────────
const TIER1_SUPPLIER_IDS = [
  "c7bee031-d7f4-414b-aafc-30d48c70e392", // La Doria - 57 appearances
  "e0814977-dff9-4ee2-add3-ad46b696017e", // Fruttagel - 34
  "de68d3d4-4296-466d-947a-ffd46f9074d4", // Vicenzi - 31
  "1d7c4587-de56-4639-94b3-c5494118e4d7", // Wadi Food - 29
  "0eb117c1-ee76-4768-8541-21e2ae7cf702", // Al Durra - 27
  "5f3e8388-0cbc-441e-bb02-6422dd8875c9", // Eurosnacks/Fornodamiani - 27
  "7fd902bd-6a9f-4f03-9b13-9a3c7be81f83", // Primi Tagli - 27
  "d93b06b7-aad9-464d-9b95-43605ef44b22", // Pastificio Carassai - 27
  "71f5debd-c5d1-48d2-8021-8649296d9c70", // Pastificio Minardo - 26
  "4a94b2b4-cc4e-4ff4-8f39-8cf437d5bcaf", // PopCorners - 25
  "8dedd547-b764-43ce-bae3-4bb2e83bfb5a", // Steriltom - 25
  "cf10ea37-af27-46b5-9918-80eab424e107", // Gandola Biscuits - 22
  "5c8f2754-be5e-4e3a-9b80-c78babac795c", // Rosso Gargano - 21
  "74ccbab4-84bc-4b32-abab-6520b51f5229", // Polenghi Group - 21
  "ea33e53d-c9d8-41d0-9bb1-63072eca4e21", // HELIO - 21
  "fe388a42-ebea-4d45-bfc0-5901b8f0ef91", // Solana - 20
  "83825e18-7cf3-43c9-96b3-04e04f628962", // Fiorentini Alimentari - 19
  "1e97c3db-1da7-4107-b52b-81491d88b136", // Pastificio Mennucci - 18
  "5ebcc274-983b-4630-9f8f-24b35a6c37ef", // Caffe Carraro - 18
  "87888ac0-f090-48b2-8527-fca8bd9ac299", // Makprogres - 18
  "e59610af-3e60-417e-ae7c-bdd3b17c6afa", // LeBazar/legurme - 18
  "e7f1abd8-da4c-4658-a07a-3abb4d87ea98", // Ciemme Alimentari - 18
  "f2548360-2ae0-44c7-a7fe-a837055d4e71", // Pata SPA - 18
  "51b3aee3-89bd-436a-9552-cbb44a650b3e", // Rigas Stathopoulos - 17
  "879eef39-8371-4c63-bb7f-d0f8ddaae8f8", // Ardo - 17
  "a1952990-113d-4321-8b19-981c301fd27c", // Pasta Lori/Popz - 17
  "066b8d1d-7688-4444-8d9b-a006980d25c0", // Viube/Mikso - 16
  "47de66f8-f404-41a9-b8fa-d3e794f58fe3", // PATA SpA - 16
  "7cf6d9b5-f3c9-4edb-9cbc-da4e4272942a", // Jaffa - 15
  "97e38fca-70ef-4f6b-8bc9-9ff380b81faf", // Ulker - 15
  "482077a2-06ee-415d-b2bd-c2d9521ad6dc", // Aceites Canoliva - 14
  "95239990-c9da-4e4e-8b17-502194f3aa78", // Lazzaroni - 14
  "cbe4dbf9-67fa-4ff9-9899-28feb656e316", // Fujian Hanwei - 14
  "cbfc5dde-04de-4cb5-a46b-1cb19b571dd1", // Biscuits Bouvard - 14
  "5e943d9c-e750-4b40-ac9f-3ded56dfca46", // Riverfrut - 13
  "648a1e65-a503-4f39-9c59-086ae1bde97c", // ETA Kamnik/Natureta - 13
  "92440ca1-5a71-4121-a91e-0ba692d6eb68", // La Mole - 13
  "95416278-c179-4979-9f8c-0bc3bb2888de", // ZPC Milanowek - 13
  "a081a14a-33dc-4948-87b8-bb2ed010b235", // Weissenfelser/Filinchen - 13
  "3038883e-cfc7-4692-aaab-c3e5947df81a", // Valbes/Storko - 12
  "4c9a0dd7-480a-4502-93b2-98226781cf3d", // New Bakery - 12
  "5cdc6dec-cc60-41a5-a340-07b8fa293b4b", // Henan Fitaky - 12
  "d7f7fc99-271d-4716-80d6-3a4d64393091", // Laica - 12
  "f1170451-24c0-42ee-8971-4f881a13f48a", // Intelligent Foods - 12
  "04686031-8ae6-49eb-84aa-48e31e968bab", // Bonum - 11
  "10125cf8-a376-4500-8350-df0f8c14b8f7", // Sera Food - 11
  "15ca9981-b6d1-4244-acb9-2f033401ccac", // ITAN Nardone - 11
  "3d673eb3-62a9-4039-a651-ae6bf87e864a", // Lebonta Firenze - 11
  "4055d398-4518-4049-8533-e84e059ca599", // Carmit Candy - 11
  "61c105c3-cbad-496b-82ee-6df43d37468e", // Vetrija - 11
  "817104fb-f1d5-4f4c-89f9-2f354307599d", // Nolano - 11
  "858ccc31-da66-4848-a5fc-d3aac251c8fa", // Vegetalia - 11
  "cb01b856-caf5-4460-a51a-111402d918c4", // NV Biscuits Delacre - 11
  "e33915c3-551d-47b5-a74b-b39f41538d87", // UAB Granex - 11
  "e9b48526-77bd-4f49-8e6a-57732c4d0744", // Crisbiss - 11
  "0d3ff196-8b69-4626-be46-715e21431807", // Balkan Agricultural - 10
  "210421a7-a33c-4090-947b-ac3799f45972", // Walterwerk Kiel - 10
  "45446039-33ce-4625-a819-6009b1bb7248", // Roncadin - 10
  "6cef6b9b-7cc6-47da-88db-23525336eb8f", // Balconi - 10
  "77c5f994-95bc-4f41-8f2c-0c3e124926e1", // Tomato Farm - 10
  "7f43f263-aede-4496-88dd-c5acb813e340", // Al Islami - 10
  "80c6d32f-4861-438f-8afd-2e5496471243", // Biscuits Delacre NV - 10
  "9303c84d-ad14-4659-be4f-788a8dbf96c7", // Franz Kastner - 10
  "93ec0d74-c163-4d80-ba52-2f8575c82153", // Balkan Agricultural Co - 10
  "99390819-46dd-4813-9604-6fc17b313ed4", // Nuova Industria Crich - 10
  "b1aa5b6e-0683-4430-9ed8-a6257b1f4026", // Lactopia - 10
  "c73b78e1-aa97-4ac6-b31c-75807f606083", // AB Kauno Grudai - 10
  "cc2b9c40-3ea4-4e75-8325-e5c0090cc89f", // Eesti Sai - 10
  "f9916a63-8df8-4ae7-ace6-974905b3cb21", // Babbi - 10
];

function parseIntFlag(name: string): number | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (args[i].startsWith(`${name}=`)) {
      const n = parseInt(args[i].slice(name.length + 1), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(line: string): void {
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + "\n");
  } catch {
    // best-effort — don't fail the run over a log write error
  }
}

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
};

type ProductRow = {
  id: string;
  product_name: string;
  category: string | null;
};

interface SearchResult {
  image_url: string | null;
  source_page: string | null;
}

function extractJson(text: string): SearchResult | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;
  try {
    const parsed = JSON.parse(objectMatch[0]);
    return {
      image_url: typeof parsed.image_url === "string" ? parsed.image_url : null,
      source_page: typeof parsed.source_page === "string" ? parsed.source_page : null,
    };
  } catch {
    return null;
  }
}

async function searchProductImage(
  productName: string,
  companyName: string
): Promise<{ result: SearchResult | null; cost: number }> {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `Find a product image URL for: "${productName}" by ${companyName}.

Return ONLY a JSON object like this, nothing else:
{"image_url": "https://...direct-image-url.jpg", "source_page": "https://...page-url"}

Rules:
- image_url must be a direct image file (.jpg, .jpeg, .png, .webp)
- Prefer official product images from the manufacturer website
- If no good image found, return {"image_url": null, "source_page": null}
- Never return placeholder, logo, or icon images`,
    tools: [{ type: "web_search_preview" }],
    max_output_tokens: 300,
  });

  return { result: extractJson(response.output_text ?? ""), cost: COST_PER_SEARCH };
}

async function fetchProductsNeedingImages(supplierId: string, productLimit?: number): Promise<ProductRow[]> {
  let query = supabase
    .from("supplier_products")
    .select("id, product_name, category")
    .eq("supplier_id", supplierId)
    .is("image_url", null);

  if (productLimit) {
    query = query.limit(productLimit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ProductRow[];
}

async function main() {
  const supplierLimit = parseIntFlag("--limit");
  const productLimit = parseIntFlag("--product-limit");
  const ids = supplierLimit ? TIER1_SUPPLIER_IDS.slice(0, supplierLimit) : TIER1_SUPPLIER_IDS;

  log(
    `\n=== OpenAI image-search run started ${new Date().toISOString()} — ${ids.length} supplier(s)` +
      `${supplierLimit ? ` (--limit ${supplierLimit})` : ""}${productLimit ? ` (--product-limit ${productLimit})` : ""} ===`
  );

  const { data: suppliers, error: supplierError } = await supabase
    .from("supplier_offerings")
    .select("id, company_name, website")
    .in("id", ids);

  if (supplierError || !suppliers) {
    log(`Fatal: failed to fetch suppliers — ${supplierError?.message ?? "no data"}`);
    process.exit(1);
  }

  const supplierById = new Map<string, SupplierRow>();
  for (const s of suppliers as SupplierRow[]) {
    supplierById.set(s.id, s);
  }

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrored = 0;
  let totalSearches = 0;
  let estimatedCost = 0;
  const erroredSuppliers: { id: string; name: string; reason: string }[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    const supplierId = ids[i];
    const prefix = `[${i + 1}/${ids.length}]`;
    const supplier = supplierById.get(supplierId);

    if (!supplier) {
      log(`${prefix} ${supplierId}: SKIPPED — supplier not found`);
      erroredSuppliers.push({ id: supplierId, name: supplierId, reason: "Supplier not found" });
      continue;
    }

    try {
      const products = await fetchProductsNeedingImages(supplierId, productLimit);
      let found = 0;

      for (let b = 0; b < products.length; b += PRODUCT_BATCH_SIZE) {
        const batch = products.slice(b, b + PRODUCT_BATCH_SIZE);

        for (const product of batch) {
          try {
            const { result, cost } = await searchProductImage(product.product_name, supplier.company_name);
            totalSearches += 1;
            estimatedCost += cost;

            const candidateUrl = result?.image_url?.trim() || null;
            if (!candidateUrl || !IMAGE_EXT_RE.test(candidateUrl)) {
              log(`  ✗ ${product.product_name} (no image found)`);
              totalSkipped += 1;
            } else {
              const { error: updateError } = await supabase
                .from("supplier_products")
                .update({ image_url: candidateUrl, image_source: "openai_search" })
                .eq("id", product.id)
                .is("image_url", null);

              if (updateError) {
                log(`  [ERROR] ${product.product_name} — update failed: ${updateError.message}`);
                totalErrored += 1;
              } else {
                log(`  ✓ ${product.product_name} → ${candidateUrl}`);
                found += 1;
                totalUpdated += 1;
              }
            }
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            log(`  [ERROR] ${product.product_name} — search failed: ${reason}`);
            totalErrored += 1;
          }

          if (batch.indexOf(product) < batch.length - 1) {
            await sleep(SEARCH_DELAY_MS);
          }
        }

        if (b + PRODUCT_BATCH_SIZE < products.length) {
          await sleep(PRODUCT_BATCH_DELAY_MS);
        }
      }

      log(`${prefix} ${supplier.company_name}: ${products.length} products need images, found ${found} URLs`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      erroredSuppliers.push({ id: supplierId, name: supplier.company_name, reason });
      log(`${prefix} ${supplier.company_name}: ERROR — ${reason}`);
    }
  }

  log(`\n=== Summary ===`);
  log(`Total products updated: ${totalUpdated}`);
  log(`Total skipped (no image found): ${totalSkipped}`);
  log(`Total errored: ${totalErrored}`);
  log(`Suppliers errored: ${erroredSuppliers.length}`);
  for (const e of erroredSuppliers) {
    log(`  - ${e.name} (${e.id}): ${e.reason}`);
  }
  log(`Searches performed: ${totalSearches}`);
  log(`Estimated cost: $${estimatedCost.toFixed(2)}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

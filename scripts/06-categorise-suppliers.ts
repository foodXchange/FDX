/**
 * AI-based supplier categorisation enrichment.
 * Reads each supplier with empty/thin categories and updates with structured data.
 *
 * Run: npx tsx scripts/06-categorise-suppliers.ts
 * Dry-run: DRY_RUN=true npx tsx scripts/06-categorise-suppliers.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ─── Load .env.local ─────────────────────────────────────────────────────────
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
  } catch {
    // .env.local not found — assume env vars are already set
  }
}

loadEnvLocal();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DRY_RUN = process.env.DRY_RUN === "true";

const VALID_CATEGORIES = [
  "Tomato Products",
  "Pasta & Grains",
  "Snacks",
  "Dairy",
  "Beverages",
  "Sauces & Condiments",
  "Canned Foods",
  "Frozen Foods",
  "Oils & Fats",
  "Fish & Seafood",
  "Bakery",
  "Spices & Herbs",
  "Meat & Poultry",
  "Pulses & Legumes",
  "Organic & Natural",
  "Ingredients & Additives",
  "Other",
];

const VALID_PRODUCT_TYPES = [
  "pure_ingredient",
  "processed_food",
  "semi_processed",
  "mixed",
];

type SupplierRow = {
  id: string;
  company_name: string;
  product_description: string | null;
  country_of_origin: string | null;
  certifications: string[] | null;
  categories: string[] | null;
  tags: string[] | null;
  website: string | null;
};

type AiResult = {
  categories: string[];
  product_type: string;
  primary_ingredients: string[];
  tags: string[];
  kosher_types: string[];
  markets_served: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function categoriseSupplier(
  client: Anthropic,
  supplier: SupplierRow
): Promise<AiResult | null> {
  const description = (supplier.product_description ?? "").slice(0, 800);
  const certs = (supplier.certifications ?? []).join(", ") || "none listed";

  const userPrompt = `Categorise this food supplier for a B2B sourcing platform that matches manufacturers with Israeli food buyers.

Company: ${supplier.company_name}
Country: ${supplier.country_of_origin ?? "unknown"}
Description: ${description || "No description provided"}
Known certifications: ${certs}
Website: ${supplier.website ?? "not provided"}

Return ONLY this JSON structure — no explanation, no markdown, just valid JSON:
{
  "categories": ["category1", "category2"],
  "product_type": "pure_ingredient" or "processed_food" or "semi_processed" or "mixed",
  "primary_ingredients": ["ingredient1", "ingredient2"],
  "tags": ["tag1", "tag2"],
  "kosher_types": [],
  "markets_served": ["Retail", "Foodservice", "Industry"]
}

Categories must be from this list only:
${VALID_CATEGORIES.join(", ")}

Tags must be specific — product names, formats, certifications, origin, processing method. Never use vague tags like "food" or "supplier". Up to 20 tags.

For kosher_types: only populate if certifications mention kosher. Use exact values:
Chief Rabbinate, Badatz Beit Yosef, Badatz Eida Chareidis, Mehadrin, Kosher (unspecified)`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system:
      "You are a food industry categorisation expert. Analyse food supplier descriptions and return structured categorisation data as JSON only. No explanation, no markdown, just valid JSON.",
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  const categories = Array.isArray(parsed.categories)
    ? (parsed.categories as string[]).filter((c) => VALID_CATEGORIES.includes(c))
    : [];

  const product_type =
    typeof parsed.product_type === "string" &&
    VALID_PRODUCT_TYPES.includes(parsed.product_type)
      ? parsed.product_type
      : "mixed";

  return {
    categories,
    product_type,
    primary_ingredients: Array.isArray(parsed.primary_ingredients)
      ? (parsed.primary_ingredients as string[])
      : [],
    tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 20) : [],
    kosher_types: Array.isArray(parsed.kosher_types)
      ? (parsed.kosher_types as string[])
      : [],
    markets_served: Array.isArray(parsed.markets_served)
      ? (parsed.markets_served as string[])
      : [],
  };
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("Fetching suppliers…");
  const { data: all, error } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, product_description, country_of_origin, certifications, categories, tags, website"
    )
    .order("company_name");

  if (error) {
    console.error("✗ Fetch failed:", error.message);
    process.exit(1);
  }

  const suppliers = ((all ?? []) as SupplierRow[]).filter(
    (s) => !s.categories || s.categories.length < 2
  );

  if (suppliers.length === 0) {
    console.log("All suppliers already have categories — nothing to do.");
    return;
  }

  console.log(`\nFound ${suppliers.length} suppliers to categorise`);
  console.log(`This will take approximately ${suppliers.length * 2} seconds`);
  console.log("Model: claude-sonnet-4-5");

  if (DRY_RUN) {
    console.log("\n── DRY RUN — first 3 suppliers ──────────────────────");
    suppliers.slice(0, 3).forEach((s) => {
      console.log(`  "${s.company_name}" — ${s.product_description?.slice(0, 60) ?? "no description"}…`);
    });
    console.log("\nRemove DRY_RUN=true to process.");
    return;
  }

  let updated = 0;
  let failed = 0;
  const BATCH = 10;

  for (let i = 0; i < suppliers.length; i += BATCH) {
    if (i > 0) await sleep(1000);

    const batch = suppliers.slice(i, i + BATCH);
    console.log(`\nProcessing ${i + 1}–${Math.min(i + BATCH, suppliers.length)} of ${suppliers.length}…`);

    for (const supplier of batch) {
      try {
        const result = await categoriseSupplier(anthropic, supplier);

        if (!result) {
          console.log(`✗ ${supplier.company_name}: AI returned unparseable response`);
          failed++;
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from("supplier_offerings")
          .update({
            categories: result.categories,
            product_type: result.product_type,
            primary_ingredients: result.primary_ingredients,
            tags: result.tags,
            kosher_types: result.kosher_types,
            markets_served: result.markets_served,
          })
          .eq("id", supplier.id);

        if (updateError) {
          console.log(`✗ ${supplier.company_name}: ${updateError.message}`);
          failed++;
        } else {
          console.log(
            `✓ ${supplier.company_name}: ${result.categories.join(", ")} — ${result.product_type}`
          );
          updated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`✗ ${supplier.company_name}: ${msg}`);
        failed++;
      }
    }
  }

  console.log("\n=== DONE ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped/errors: ${failed}`);
  console.log("\nRun in Supabase SQL editor to verify:");
  console.log(`SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN array_length(categories,1) > 0 THEN 1 END) AS with_categories,
  COUNT(CASE WHEN product_type IS NOT NULL THEN 1 END) AS with_product_type
FROM supplier_offerings;`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

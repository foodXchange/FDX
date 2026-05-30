/**
 * Fix non-canonical category_name / category_id values in sourcing_requests.intent_json.
 * Maps bad LLM-written category names to the 15 canonical taxonomy entries.
 * Also patches the matching v1 pip row in the pips table if one exists.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/fix-category-mapping.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Canonical taxonomy (15 entries) ───────────────────────────────────────────
const CANONICAL: Record<string, { id: string; name: string }> = {
  "Bakery & Bread Products":      { id: "8660789d-00a3-49d2-8489-6b42f2345b7a", name: "Bakery & Bread Products" },
  "Beverages":                    { id: "0df2b578-f933-46c8-8e0d-be2b1e0b9b4a", name: "Beverages" },
  "Breakfast Cereals":            { id: "7bc69cf6-a4d7-4857-a7e3-8e4dcf01d682", name: "Breakfast Cereals" },
  "Canned Legumes & Pulses":      { id: "a11351fc-9d9f-4406-bb05-6059afde8c91", name: "Canned Legumes & Pulses" },
  "Dairy Products & Analogues":   { id: "ab9f8022-0f59-4d96-883d-19367680461f", name: "Dairy Products & Analogues" },
  "Fish & Seafood":               { id: "61113ec4-53b7-44a8-8822-e9e883ddafd4", name: "Fish & Seafood" },
  "Fresh Produce":                { id: "03809958-ff01-48d1-90a1-bc25887375c3", name: "Fresh Produce" },
  "Frozen Foods":                 { id: "f51a64b4-265c-47dc-b0ff-a3f6d6ddb2fb", name: "Frozen Foods" },
  "Herbs":                        { id: "8899bfa4-1ca9-451b-8fdb-242231a6d2f0", name: "Herbs" },
  "Oils & Fats":                  { id: "153be4b6-ee8a-40ea-9206-aecfdef48378", name: "Oils & Fats" },
  "Other Plant Proteins":         { id: "18f4fb10-0337-45c8-a9d3-d063052db846", name: "Other Plant Proteins" },
  "Pasta & Grains":               { id: "8f8b37f2-bdf3-40de-b356-c497c3d812b9", name: "Pasta & Grains" },
  "Savory Snacks & Cereals":      { id: "f20fccd2-3bbe-4b7d-9b01-6424ef184fba", name: "Savory Snacks & Cereals" },
  "Specialty Sauces & Condiments":{ id: "24768201-755e-4560-b283-46cbbabcd27b", name: "Specialty Sauces & Condiments" },
  "Tomato Products":              { id: "4a949d67-d900-4d84-b8d6-f3e1f903e74b", name: "Tomato Products" },
};

// ── Alias map: bad name → canonical name key ──────────────────────────────────
const ALIAS_MAP: Record<string, string> = {
  // Canned
  "Canned Vegetables & Pulses":               "Canned Legumes & Pulses",
  "Canned & Preserved Goods":                 "Canned Legumes & Pulses",
  "11. Canned & Preserved Goods":             "Canned Legumes & Pulses",
  // Grains / pasta
  "Bulk Grains, Flours & Sweeteners":         "Pasta & Grains",
  // Oils
  "Fats, Oils & Spreads":                     "Oils & Fats",
  "Nut/Seed Butters":                         "Oils & Fats",
  // Frozen
  "Prepared Meals (Frozen & Shelf-Stable)":   "Frozen Foods",
  "10. Prepared Meals (Frozen/Shelf Stable)": "Frozen Foods",
  // Cereals / breakfast
  "Granola/Muesli":                           "Breakfast Cereals",
  // Fish
  "Seafood & Aquatic Products":               "Fish & Seafood",
  // Fresh produce
  "Fresh Produce (RTE)":                      "Fresh Produce",
  // Bakery
  "06. Bakery & Bread Products (RTE/Frozen)": "Bakery & Bread Products",
  "Bakery & Bread Products (RTE/Frozen)":     "Bakery & Bread Products",
  "Gluten-Free Cookies":                      "Bakery & Bread Products",
  // Snacks / confectionery
  "Confectionery, Sweets & Gum":              "Savory Snacks & Cereals",
  "Confectionery & Candies":                  "Savory Snacks & Cereals",
  "Chocolate & Candies":                      "Savory Snacks & Cereals",
  "Chocolate Bars (Solid/Filled)":            "Savory Snacks & Cereals",
  "Functional Gummies":                       "Savory Snacks & Cereals",
  "Energy/Protein Bars":                      "Savory Snacks & Cereals",
  // ── Unmapped (no confident canonical match): "Dried Fruits" ─────────────────
};

const CANONICAL_NAMES = new Set(Object.keys(CANONICAL));

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type RequestRow = {
  id: string;
  product_name: string | null;
  intent_json: Record<string, unknown> | null;
};

async function main() {
  console.log("Fetching sourcing_requests with intent_json…");

  const { data: allRows, error: fetchError } = await supabase
    .from("sourcing_requests")
    .select("id, product_name, intent_json")
    .not("intent_json", "is", null);

  if (fetchError || !allRows) {
    console.error("Fetch failed:", fetchError?.message);
    process.exit(1);
  }

  // Filter to rows with a non-canonical category_name
  const toProcess = (allRows as RequestRow[]).filter((r) => {
    const name = (r.intent_json?.category as Record<string, unknown> | undefined)
      ?.category_name as string | undefined;
    return name && !CANONICAL_NAMES.has(name);
  });

  console.log(`Total with intent_json: ${allRows.length}`);
  console.log(`Non-canonical category_name: ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  let fixed = 0;
  let skipped_no_alias = 0;
  let failed = 0;

  const unmapped: Record<string, number> = {};

  for (let i = 0; i < toProcess.length; i++) {
    const req = toProcess[i];
    const intentJson = req.intent_json as Record<string, unknown>;
    const cat = intentJson.category as Record<string, unknown>;
    const badName = cat.category_name as string;

    const canonicalKey = ALIAS_MAP[badName];

    process.stdout.write(
      `[${i + 1}/${toProcess.length}] ${req.id.slice(0, 8)}… "${badName}" → `
    );

    if (!canonicalKey) {
      console.log("UNMAPPED — skipped");
      unmapped[badName] = (unmapped[badName] ?? 0) + 1;
      skipped_no_alias++;
      continue;
    }

    const target = CANONICAL[canonicalKey];
    const updatedIntentJson = {
      ...intentJson,
      category: {
        ...cat,
        category_id: target.id,
        category_name: target.name,
      },
    };

    try {
      const { error: updateError } = await supabase
        .from("sourcing_requests")
        .update({ intent_json: updatedIntentJson })
        .eq("id", req.id);

      if (updateError) {
        console.log(`ERROR: ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`${target.name}`);
      fixed++;

      // Also patch the v1 pip row if one exists
      const { data: pipRows } = await supabase
        .from("pips")
        .select("id, data_json")
        .eq("sourcing_request_id", req.id)
        .eq("pip_version", 1)
        .limit(1);

      if (pipRows && pipRows.length > 0) {
        const pip = pipRows[0];
        const dataJson = pip.data_json as Record<string, unknown>;
        const pipCat = dataJson.category as Record<string, unknown> | undefined;

        if (pipCat) {
          const updatedDataJson = {
            ...dataJson,
            category: {
              ...pipCat,
              category_id: target.id,
              category_name: target.name,
            },
          };
          const { error: pipErr } = await supabase
            .from("pips")
            .update({ data_json: updatedDataJson })
            .eq("id", pip.id);

          if (pipErr) {
            console.error(`  ⚠ pip update failed for ${pip.id}: ${pipErr.message}`);
          } else {
            console.log(`  ↳ pip ${pip.id.slice(0, 8)}… updated`);
          }
        }
      }
    } catch (err) {
      console.log(`EXCEPTION: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    if (i < toProcess.length - 1) {
      await sleep(100);
    }
  }

  console.log("\n── Summary ──────────────────────────────────────");
  console.log(`  Fixed:    ${fixed}`);
  console.log(`  Unmapped (no alias): ${skipped_no_alias}`);
  console.log(`  Failed:   ${failed}`);
  if (Object.keys(unmapped).length > 0) {
    console.log("\n  Unmapped names (need manual review):");
    Object.entries(unmapped).forEach(([name, count]) =>
      console.log(`    ${count}x  "${name}"`)
    );
  }
  console.log("─────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

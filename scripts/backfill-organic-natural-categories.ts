/**
 * Backfill category_id for sourcing_requests where raw_text = "Organic & Natural"
 * and category_id is null. Uses Claude Haiku to infer the best matching taxonomy
 * category from the product name + description text.
 *
 * Also patches the matching v1 pip row in the pips table if one exists.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/backfill-organic-natural-categories.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type CategoryRow = { id: string; name: string };

type RequestRow = {
  id: string;
  product_name: string | null;
  message: string | null;
  intent_json: Record<string, unknown> | null;
};

async function resolveOrganicCategory(
  productName: string,
  description: string,
  categories: CategoryRow[]
): Promise<{ category_id: string | null; category_name: string | null }> {
  const categoryList = categories
    .map((c) => `- "${c.name}" (id: ${c.id})`)
    .join("\n");

  const prompt = `You are categorizing a food product for a B2B sourcing platform.

Product name: "${productName}"
Description: "${description}"

Available taxonomy categories:
${categoryList}

Pick the single best matching category for this product. Choose based on the product itself, not the "Organic & Natural" label — that just means the buyer prefers organic variants. If none of the categories fit at all, return null for both fields.

Respond with ONLY valid JSON (no markdown, no explanation):
{"category_id": "<uuid or null>", "category_name": "<name or null>"}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system:
      "You are a food product taxonomy classifier. Output ONLY valid JSON, no markdown, no explanation.",
    messages: [{ role: "user", content: prompt }],
  });

  const firstBlock = response.content[0];
  const raw = firstBlock?.type === "text" ? firstBlock.text : "";
  if (!raw) return { category_id: null, category_name: null };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { category_id: null, category_name: null };

  let parsed: { category_id: string | null; category_name: string | null };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { category_id: null, category_name: null };
  }

  if (!parsed.category_id) return { category_id: null, category_name: null };

  // Validate the returned ID actually exists in our list to prevent hallucinations
  const valid = categories.find((c) => c.id === parsed.category_id);
  if (!valid) return { category_id: null, category_name: null };

  return { category_id: valid.id, category_name: valid.name };
}

async function main() {
  console.log("Fetching product_categories…");

  const { data: categories, error: catError } = await supabase
    .from("product_categories")
    .select("id, name");

  if (catError || !categories || categories.length === 0) {
    console.error("Failed to load product_categories:", catError?.message);
    process.exit(1);
  }

  console.log(`Loaded ${categories.length} categories.`);

  console.log(
    'Fetching sourcing_requests with raw_text = "Organic & Natural" and null category_id…'
  );

  const { data: allRows, error: fetchError } = await supabase
    .from("sourcing_requests")
    .select("id, product_name, message, intent_json")
    .not("intent_json", "is", null);

  if (fetchError || !allRows) {
    console.error("Failed to fetch requests:", fetchError?.message);
    process.exit(1);
  }

  const toProcess = (allRows as RequestRow[]).filter((r) => {
    const cat = (r.intent_json as Record<string, unknown> | null)?.category as
      | Record<string, unknown>
      | undefined;
    return (
      cat &&
      !cat.category_id &&
      (cat.raw_text as string | undefined)?.toLowerCase().trim() ===
        "organic & natural"
    );
  });

  console.log(`Found ${toProcess.length} requests to process.\n`);

  if (toProcess.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let resolved = 0;
  let stayedNull = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const req = toProcess[i];
    const intentJson = req.intent_json as Record<string, unknown>;
    const cat = intentJson.category as Record<string, unknown>;

    const productName = req.product_name ?? "";
    const description = req.message ?? "";
    const preview = productName.slice(0, 45);

    process.stdout.write(
      `[${i + 1}/${toProcess.length}] ${req.id.slice(0, 8)}… "${preview}" → `
    );

    try {
      const { category_id, category_name } = await resolveOrganicCategory(
        productName,
        description,
        categories as CategoryRow[]
      );

      if (!category_id) {
        console.log("no match");
        stayedNull++;
      } else {
        const updatedIntentJson = {
          ...intentJson,
          category: {
            ...cat,
            category_id,
            category_name,
          },
        };

        const { error: updateError } = await supabase
          .from("sourcing_requests")
          .update({ intent_json: updatedIntentJson })
          .eq("id", req.id);

        if (updateError) {
          console.log(`ERROR updating sourcing_request: ${updateError.message}`);
          failed++;
        } else {
          console.log(`${category_name} (${category_id.slice(0, 8)}…)`);
          resolved++;

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
            const pipCat = dataJson.category as
              | Record<string, unknown>
              | undefined;

            if (pipCat) {
              const updatedDataJson = {
                ...dataJson,
                category: {
                  ...pipCat,
                  category_id,
                  category_name,
                },
              };

              const { error: pipUpdateError } = await supabase
                .from("pips")
                .update({ data_json: updatedDataJson })
                .eq("id", pip.id);

              if (pipUpdateError) {
                console.error(
                  `  ⚠ pip update failed for pip ${pip.id}: ${pipUpdateError.message}`
                );
              } else {
                console.log(`  ↳ pip ${pip.id.slice(0, 8)}… updated`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(
        `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`
      );
      failed++;
    }

    if (i < toProcess.length - 1) {
      await sleep(200);
    }
  }

  console.log("\n── Summary ─────────────────────────────────");
  console.log(`  Resolved:        ${resolved}`);
  console.log(`  Stayed null:     ${stayedNull}`);
  console.log(`  Failed (errors): ${failed}`);
  console.log("─────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

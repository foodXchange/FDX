/**
 * Backfill category_id + category_name into sourcing_requests.intent_json
 * for all rows where the category text is set but category_id is null.
 * Also patches the matching v1 pip row in the pips table if one exists.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/backfill-category-ids.ts
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

// ── Inlined from lib/pip/resolveCategoryId.ts ─────────────────────────────────
// (Scripts use a direct client, not the @/ alias chain.)
type CategoryRow = { id: string; name: string };
let categoryCache: CategoryRow[] | null = null;

/**
 * Alias map: known raw_text values that don't substring-match any DB category name.
 * Values are substrings to search for in product_categories.name (case-insensitive).
 * Prefer non-numbered category names (no leading "01." prefix).
 */
const ALIAS_MAP: Record<string, string> = {
  "canned foods":                      "canned & preserved goods",
  "tomato products":                   "canned vegetables & pulses",
  "pasta & grains":                    "bulk grains, flours & sweeteners",
  "oils & fats":                       "fats, oils & spreads",
  "frozen foods":                      "prepared meals (frozen & shelf-stable)",
  "fish & seafood":                    "seafood & aquatic products",
  // Hebrew + English mixed label
  "ירקות טריים (fresh produce)":       "fresh produce (rte)",
  "fresh produce":                     "fresh produce (rte)",
  // "organic & natural" is intentionally absent — too vague to map reliably
};

async function resolveCategoryId(rawText: string): Promise<{
  category_id: string | null;
  category_name: string | null;
}> {
  if (!rawText.trim()) return { category_id: null, category_name: null };

  // Cache the full category list for the duration of the script run.
  if (!categoryCache) {
    const { data, error } = await supabase.from("product_categories").select("id, name");
    if (error || !data || data.length === 0) {
      console.error("Failed to load product_categories:", error?.message);
      return { category_id: null, category_name: null };
    }
    categoryCache = data as CategoryRow[];
  }

  const needle = rawText.toLowerCase().trim();

  // 1. Exact match
  const exact = categoryCache.find((r) => r.name.toLowerCase() === needle);
  if (exact) return { category_id: exact.id, category_name: exact.name };

  // 2. Standard substring match (original resolveCategoryId logic)
  const contains = categoryCache.find(
    (r) =>
      r.name.toLowerCase().includes(needle) ||
      needle.includes(r.name.toLowerCase())
  );
  if (contains) return { category_id: contains.id, category_name: contains.name };

  // 3. Alias lookup — map known frontend labels to canonical DB names
  const aliasTarget = ALIAS_MAP[needle];
  if (aliasTarget) {
    // Prefer non-numbered categories (no leading digit-dot pattern like "01.")
    const aliasMatches = categoryCache.filter((r) =>
      r.name.toLowerCase().includes(aliasTarget)
    );
    const preferred = aliasMatches.find((r) => !/^\d+\./.test(r.name));
    const match = preferred ?? aliasMatches[0];
    if (match) return { category_id: match.id, category_name: match.name };
  }

  return { category_id: null, category_name: null };
}
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type RequestRow = {
  id: string;
  intent_json: Record<string, unknown> | null;
};

async function main() {
  console.log("Fetching sourcing_requests with intent_json...");

  const { data: allRows, error: fetchError } = await supabase
    .from("sourcing_requests")
    .select("id, intent_json")
    .not("intent_json", "is", null);

  if (fetchError || !allRows) {
    console.error("Failed to fetch requests:", fetchError?.message);
    process.exit(1);
  }

  // Filter in TypeScript: null category_id but non-null raw_text
  const toProcess = (allRows as RequestRow[]).filter((r) => {
    const cat = (r.intent_json as Record<string, unknown> | null)?.category as
      | Record<string, unknown>
      | undefined;
    return cat && !cat.category_id && cat.raw_text;
  });

  console.log(
    `Total with intent_json: ${allRows.length} | Needing category_id backfill: ${toProcess.length}`
  );

  if (toProcess.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let resolved = 0;
  let stayed_null = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const req = toProcess[i];
    const intentJson = req.intent_json as Record<string, unknown>;
    const cat = intentJson.category as Record<string, unknown>;
    const rawText = cat.raw_text as string;

    process.stdout.write(
      `[${i + 1}/${toProcess.length}] ${req.id.slice(0, 8)}… "${rawText}" → `
    );

    try {
      const { category_id, category_name } = await resolveCategoryId(rawText);

      if (!category_id) {
        console.log("no match");
        stayed_null++;
      } else {
        // Patch intent_json in-memory and write back the whole object
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
            const pipCat = dataJson.category as Record<string, unknown> | undefined;

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
      console.log(`EXCEPTION: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    if (i < toProcess.length - 1) {
      await sleep(200);
    }
  }

  console.log("\n── Summary ─────────────────────────────────");
  console.log(`  Resolved:   ${resolved}`);
  console.log(`  Stayed null (no category match): ${stayed_null}`);
  console.log(`  Failed:     ${failed}`);
  console.log("─────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

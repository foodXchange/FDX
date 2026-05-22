/**
 * AI-based request parsing enrichment.
 * Reads each sourcing request with no product_name and extracts structured fields.
 *
 * Run: npx tsx scripts/07-parse-requests.ts
 * Dry-run: DRY_RUN=true npx tsx scripts/07-parse-requests.ts
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

type RequestRow = {
  id: string;
  message: string | null;
  product_name: string | null;
  category: string | null;
  company: string | null;
};

type AiResult = {
  product_name: string | null;
  category: string | null;
  tags: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function parseRequest(
  client: Anthropic,
  request: RequestRow
): Promise<AiResult | null> {
  const title = (request.message ?? "").trim();
  if (!title) return null;

  const userPrompt = `Extract product information from this Israeli food buyer request title:

Title: "${title}"
Buyer company: "${request.company ?? "unknown"}"

Return ONLY this JSON — no explanation, no markdown:
{
  "product_name": "clean product name in English",
  "category": "one category from the list",
  "subcategory": "specific sub-category or null",
  "packaging_format": "e.g. glass bottle, plastic bottle, tin can, cup, pouch, bag, or null",
  "size": "e.g. 750ml, 1L, 500g, or null",
  "tags": ["tag1", "tag2"],
  "product_type": "pure_ingredient" or "processed_food" or "semi_processed",
  "is_private_label": true or false or null
}

Categories must be from this list only:
${VALID_CATEGORIES.join(", ")}

Tags should be specific — product type, format, size, certifications. Up to 10 tags.

Examples:
"750 ml. Olive oil to H. Cohen" → product_name: "Olive Oil", category: "Oils & Fats", packaging_format: "glass bottle", size: "750ml"
"1 L & 5L Sunflower oil, Shufersal" → product_name: "Sunflower Oil", category: "Oils & Fats", packaging_format: "plastic bottle", size: "1L, 5L"
"גרנולות - אורגניות" → product_name: "Organic Granola", category: "Snacks", packaging_format: null, size: null

Note: some titles may be in Hebrew — translate and extract correctly.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    system:
      "You are a food sourcing analyst. Extract structured product information from buyer request titles. Return JSON only. No explanation.",
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

  const product_name =
    typeof parsed.product_name === "string" && parsed.product_name.trim()
      ? parsed.product_name.trim()
      : null;

  const category =
    typeof parsed.category === "string" &&
    VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : null;

  const tags = Array.isArray(parsed.tags)
    ? (parsed.tags as string[]).slice(0, 10)
    : [];

  return { product_name, category, tags };
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("Fetching requests…");
  const { data, error } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, message, product_name, category, company")
    .or("product_name.is.null,product_name.eq.")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("✗ Fetch failed:", error.message);
    process.exit(1);
  }

  const requests = (data ?? []) as RequestRow[];

  if (requests.length === 0) {
    console.log("All requests already have product_name — nothing to do.");
    return;
  }

  console.log(`\nFound ${requests.length} requests to parse`);
  console.log(`This will take approximately ${requests.length * 2} seconds`);
  console.log("Model: claude-sonnet-4-5");

  if (DRY_RUN) {
    console.log("\n── DRY RUN — first 5 requests ───────────────────────");
    requests.slice(0, 5).forEach((r) => {
      console.log(`  [${r.company ?? "no company"}] "${r.message?.slice(0, 80) ?? "no message"}"`);
    });
    console.log("\nRemove DRY_RUN=true to process.");
    return;
  }

  let updated = 0;
  let failed = 0;
  const BATCH = 10;

  for (let i = 0; i < requests.length; i += BATCH) {
    if (i > 0) await sleep(1000);

    const batch = requests.slice(i, i + BATCH);
    console.log(`\nProcessing ${i + 1}–${Math.min(i + BATCH, requests.length)} of ${requests.length}…`);

    for (const request of batch) {
      try {
        const result = await parseRequest(anthropic, request);

        if (!result || !result.product_name) {
          console.log(
            `✗ [${request.company ?? "—"}] "${request.message?.slice(0, 50) ?? ""}": no product_name extracted`
          );
          failed++;
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from("sourcing_requests")
          .update({
            product_name: result.product_name,
            ...(result.category ? { category: result.category } : {}),
            ...(result.tags.length > 0 ? { tags: result.tags } : {}),
          })
          .eq("id", request.id);

        if (updateError) {
          console.log(
            `✗ [${request.company ?? "—"}] "${request.message?.slice(0, 50) ?? ""}": ${updateError.message}`
          );
          failed++;
        } else {
          console.log(
            `✓ [${request.company ?? "—"}] "${result.product_name}" → ${result.category ?? "no category"}`
          );
          updated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(
          `✗ [${request.company ?? "—"}] "${request.message?.slice(0, 40) ?? ""}": ${msg}`
        );
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
  COUNT(CASE WHEN product_name IS NOT NULL THEN 1 END) AS with_product_name,
  COUNT(CASE WHEN category IS NOT NULL THEN 1 END) AS with_category
FROM sourcing_requests;`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

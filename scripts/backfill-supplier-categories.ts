/**
 * Backfill category_id + category_name into supplier_products where category_id IS NULL.
 * Uses Claude Haiku in batch mode (BATCH_SIZE products per call, CONCURRENCY workers).
 *
 * Only assigns categories where is_leaf = true in product_categories (42 leaves).
 * Does NOT touch existing non-null category_id rows.
 *
 * Run (dry-run — no DB writes, outputs CSV preview):
 *   DRY_RUN=true npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/backfill-supplier-categories.ts
 *
 * Run (live):
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/backfill-supplier-categories.ts
 *
 * Optional env vars:
 *   LIMIT=200        process only first N rows (for smoke-testing)
 *   BATCH_SIZE=20    products per LLM call (default: 20)
 *   CONCURRENCY=5    parallel LLM workers (default: 5)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
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

const DRY_RUN = process.env.DRY_RUN === "true";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "20", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? "5", 10);
const DB_CHUNK = 100;

type LeafCategory = { id: string; name: string; tier1: string | null };
type ProductRow = {
  id: string;
  product_name: string | null;
  category: string | null;
  description: string | null;
};
type Classification = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  confidence: string;
};

const SYSTEM_PROMPT = `You are a strict food product classifier for a B2B food sourcing platform.
Assign each product to EXACTLY ONE category id from the allowed list, or null.

Conflict rules:
- Olive oil, sunflower oil, vegetable oil → "Olive Oil & Cooking Oils"
- Pasta (fresh, dry, gluten-free, all shapes) → "Pasta & Noodles"
- Cookies, biscuits (sweet or savory), crackers → "Biscuits & Crackers"
- Chips, crisps, puffed snacks, popcorn, pretzels → "Chips & Puffed Snacks"
- Chocolate, chocolate-coated, confectionery candy → "Chocolate & Confectionery"
- Granola bars, energy bars, protein bars, cereal bars → "Energy & Protein Bars"
- Croissants, danishes, laminated/viennoiserie pastry → "Pastry & Croissants"
- Cakes, tarts, muffins, sweet pastries (non-laminated) → "Pastry & Sweet Baked Goods" or "Cakes & Desserts"
- Bread, baguette, focaccia, rolls, sourdough, buns → "Bread & Bread Products"
- Pizza, flatbread, naan, pita, calzone → "Pizza & Flatbreads"
- Soup, broth, stew, ready meals, instant meals → "Soups & Ready Meals"
- Canned/preserved fish, sardines, tuna in cans/jars → "Canned & Preserved Fish"
- Smoked salmon, marinated/cured fish, ceviche, gravlax → "Smoked & Marinated Fish"
- Fresh or frozen raw fish/seafood (whole, fillets, shellfish) → leave null (no matching fresh-fish leaf)
- Food additives, emulsifiers, stabilizers, preservatives, thickeners → "Food Additives & Emulsifiers"
- Natural colors, flavorings, extracts, essences → "Natural Colors & Flavors"
- Protein powder, isolates, amino acids, collagen peptides (raw ingredient form) → "Proteins & Amino Acids"
- Honey, royal jelly, bee pollen, honeycomb → "Honey & Bee Products"
- Jam, marmalade, fruit spread → "Jams & Fruit Preserves"
- Olives, capers, pickles, gherkins → "Olives & Pickled Products"
- Cheese (all types) → "Cheese"
- Butter → "Butter & Spreads"
- Milk, cream, cream cheese → "Milk & Cream"
- Yogurt, kefir, labneh → "Yogurt & Fermented Dairy"
- Frozen fries, hash browns, potato sides → "Frozen Potatoes & Sides"
- Frozen vegetables, frozen fruit → "Frozen Vegetables & Fruits"
- Fresh/raw fruit → "Fruits"
- Fresh/raw vegetables → "Vegetables"
- Mushrooms, truffles, truffle products (raw/preserved) → "Mushrooms & Truffles"
- Truffle sauces, specialty condiments (not tomato-based) → "Truffle & Specialty Sauces"
- Vinegar, dressings, aioli → "Vinegars & Dressings"
- Coffee, tea, herbal infusions → "Coffee & Tea"
- Beer, wine, spirits, liqueur → "Beer, Wine & Spirits"
- Water, sparkling water, soft drinks, cola → "Water & Soft Drinks"
- Juice, nectar, smoothie → "Juices & Nectars"
- Nuts, seeds, trail mix, dried fruit → "Nuts, Seeds & Dried Fruits"
- Legumes, lentils, beans, chickpeas → "Legumes & Pulses"
- Rice, quinoa, couscous, barley, farro → "Rice & Grains"
- Granola, muesli, breakfast cereals → "Granola, Muesli & Cereals"
- Fresh whole herbs (basil plants, fresh parsley) → "Herbs"
- Dried herbs, spice blends, seasoning mixes → "Herbs, Spices & Seasonings"
- Nut butter (peanut, almond, hazelnut) → "Nut Butters & Spreads"
- Tofu, tempeh, seitan, plant-based meat alternatives (finished foods) → leave null (no matching leaf)
- Raw flour, starch, bulk sweetener (B2B ingredient) → "Flour & Starches"
- Retail baking mix, leavening agents → "Flour & Baking Ingredients"
- Ham, salami, prosciutto, mortadella → "Cured & Smoked Meats"
- Chicken, turkey, duck products → "Poultry Products"
- Sausages, frankfurters, meatballs → "Processed Meat & Sausages"
- Return null for low-confidence (product is ambiguous or spans multiple categories)

Output STRICT JSON only — no markdown, no commentary:
{"results":[{"idx":0,"category_id":"<uuid or null>","confidence":"high|medium|low"},…]}`;

async function classifyBatch(
  products: Array<{ idx: number; id: string; text: string }>,
  leaves: LeafCategory[]
): Promise<Map<number, { category_id: string | null; confidence: string }>> {
  const categoryList = leaves
    .map((c) => `- "${c.name}" (id: ${c.id}, under: ${c.tier1 ?? "root"})`)
    .join("\n");

  const productList = products
    .map((p) => `${p.idx}. ${p.text}`)
    .join("\n");

  const userPrompt = `Allowed categories:\n${categoryList}\n\nProducts to classify:\n${productList}\n\nReturn JSON for all ${products.length} products.`;

  let raw = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content[0];
    raw = block?.type === "text" ? block.text : "";
  } catch (err) {
    console.error("  LLM error:", (err as Error).message);
    return new Map();
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return new Map();

  let parsed: { results?: Array<{ idx: number; category_id: string | null; confidence: string }> };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return new Map();
  }

  const validIds = new Set(leaves.map((l) => l.id));
  const out = new Map<number, { category_id: string | null; confidence: string }>();
  for (const item of parsed.results ?? []) {
    const catId = item.category_id && validIds.has(item.category_id) ? item.category_id : null;
    const conf = item.confidence ?? "low";
    // Reject low-confidence to reduce noise
    out.set(item.idx, { category_id: conf === "low" ? null : catId, confidence: conf });
  }
  return out;
}

async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

async function fetchAllNullRows(): Promise<ProductRow[]> {
  const PAGE = 1000;
  const rows: ProductRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_products")
      .select("id, product_name, category, description")
      .is("category_id", null)
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) { console.error("Fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        id: r.id as string,
        product_name: r.product_name as string | null,
        category: r.category as string | null,
        description: r.description as string | null,
      });
    }
    if (data.length < PAGE) break;
    page++;
  }
  return rows;
}

async function batchUpdate(updates: Array<{ id: string; category_id: string; category_name: string }>): Promise<void> {
  for (let i = 0; i < updates.length; i += DB_CHUNK) {
    const chunk = updates.slice(i, i + DB_CHUNK);
    for (const u of chunk) {
      const { error } = await supabase
        .from("supplier_products")
        .update({ category_id: u.category_id })
        .eq("id", u.id);
      if (error) {
        console.error(`  UPDATE failed for id=${u.id}: ${error.message}`);
        process.exit(1);
      }
    }
    const pct = Math.round(((i + chunk.length) / updates.length) * 100);
    process.stdout.write(`\r  Saved ${i + chunk.length}/${updates.length} (${pct}%)...`);
  }
  process.stdout.write("\n");
}

async function main(): Promise<void> {
  console.log(DRY_RUN ? "DRY RUN — no DB writes\n" : "LIVE RUN — will write to DB\n");

  // 1. Load leaf categories
  console.log("Loading leaf categories (is_leaf = true)...");
  const { data: catData, error: catErr } = await supabase
    .from("product_categories")
    .select("id, name, tier1")
    .eq("is_leaf", true)
    .order("tier1")
    .order("name");
  if (catErr || !catData) { console.error("Failed to load categories:", catErr?.message); process.exit(1); }
  const leaves = catData as LeafCategory[];
  console.log(`  ${leaves.length} leaf categories loaded\n`);

  // 2. Fetch all null-category supplier_products
  console.log("Fetching supplier_products with category_id IS NULL...");
  let rows = await fetchAllNullRows();
  console.log(`  Found ${rows.length} rows\n`);

  if (LIMIT < rows.length) {
    console.log(`  Capped at LIMIT=${LIMIT} rows for this run\n`);
    rows = rows.slice(0, LIMIT);
  }

  if (rows.length === 0) {
    console.log("Nothing to do — all rows already have a category_id.");
    return;
  }

  // 3. Build batches
  const idToName = new Map(leaves.map((l) => [l.id, l.name]));
  const batches: Array<Array<{ idx: number; id: string; text: string }>> = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r, j) => ({
      idx: i + j,
      id: r.id,
      text: [r.product_name, r.category, r.description?.slice(0, 80)]
        .filter(Boolean)
        .join(" | "),
    }));
    batches.push(chunk);
  }
  console.log(`Classifying ${rows.length} products in ${batches.length} batches (concurrency=${CONCURRENCY})...`);

  // 4. Run classification pool
  const classificationResults = new Map<number, { category_id: string | null; confidence: string }>();
  let batchesDone = 0;

  const tasks = batches.map((batch) => async () => {
    const result = await classifyBatch(batch, leaves);
    for (const [idx, cls] of result) classificationResults.set(idx, cls);
    batchesDone++;
    process.stdout.write(`\r  Classified ${Math.min(batchesDone * BATCH_SIZE, rows.length)}/${rows.length}...`);
  });

  await runPool(tasks, CONCURRENCY);
  process.stdout.write("\n");

  // 5. Collate results
  const toUpdate: Array<{ id: string; category_id: string; category_name: string }> = [];
  const stayedNull: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cls = classificationResults.get(i);
    if (cls?.category_id) {
      toUpdate.push({
        id: rows[i].id,
        category_id: cls.category_id,
        category_name: idToName.get(cls.category_id) ?? "",
      });
    } else {
      stayedNull.push(rows[i].id);
    }
  }

  // 6. Distribution summary
  const dist = new Map<string, number>();
  for (const u of toUpdate) {
    dist.set(u.category_name, (dist.get(u.category_name) ?? 0) + 1);
  }
  const sorted = [...dist.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\n── Classification distribution ─────────────────────────────────");
  for (const [name, count] of sorted) {
    console.log(`  ${String(count).padStart(5)}  ${name}`);
  }
  console.log(`\n  Classified:  ${toUpdate.length}`);
  console.log(`  Stayed null: ${stayedNull.length}`);

  // 7. Write dry-run CSV
  const reportsDir = path.join(process.cwd(), "migrations", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const csvPath = path.join(reportsDir, "supplier_categories_dryrun.csv");
  const csvLines = [
    "id,product_name,old_category_text,new_category_id,new_category_name,confidence",
    ...rows.map((r, i) => {
      const cls = classificationResults.get(i);
      return [
        csvEscape(r.id),
        csvEscape(r.product_name),
        csvEscape(r.category),
        csvEscape(cls?.category_id ?? null),
        csvEscape(cls?.category_id ? idToName.get(cls.category_id) ?? "" : null),
        csvEscape(cls?.confidence ?? null),
      ].join(",");
    }),
  ];
  fs.writeFileSync(csvPath, csvLines.join("\n") + "\n", "utf8");
  console.log(`\nDry-run CSV → ${csvPath}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN complete — no DB writes. Re-run without DRY_RUN=true to apply.");
    return;
  }

  if (toUpdate.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  // 8. Apply updates
  console.log(`\nApplying ${toUpdate.length} updates...`);
  await batchUpdate(toUpdate);

  // 9. Verify
  const { count } = await supabase
    .from("supplier_products")
    .select("*", { count: "exact", head: true })
    .is("category_id", null);
  console.log(`\nPost-update: ${count ?? "?"} rows still have category_id IS NULL`);

  console.log("\n── Summary ─────────────────────────────────────────────────────");
  console.log(`  Updated:     ${toUpdate.length}`);
  console.log(`  Stayed null: ${stayedNull.length}`);
  console.log(`  Report:      migrations/reports/supplier_categories_dryrun.csv`);
}

main().catch((e) => { console.error(e); process.exit(1); });

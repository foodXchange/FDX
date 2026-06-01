/**
 * Dry-run reclassification for the two category dump buckets + wrong sourcing requests.
 * NO DB writes. Outputs migrations/reports/reclass_dryrun.csv.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/reclass-dryrun.ts
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

// ── Canonical whitelist ───────────────────────────────────────────────────────

const CANONICAL_LEAVES: Record<string, string> = {
  "Savory Snacks & Cereals":                "f20fccd2-3bbe-4b7d-9b01-6424ef184fba",
  "Sweet Biscuits & Bars":                  "91549ddb-1b13-4058-82f6-f1d86475ea0f",
  "Breakfast Cereals":                      "a230a819-c000-4eee-b56e-3eea4e4f350c",
  "Confectionery & Chocolate":              "ff37e8ca-cb21-42c1-9955-7eb1f6132f06",
  "Canned & Preserved Goods":              "6b051f68-90c2-4ba4-9535-f678cd268cf8",
  "Canned Vegetables & Pulses":            "bd1da832-15dd-4186-b365-3e26b38bbdbe",
  "Tomato Products":                        "2b5f3c21-1770-4da3-b0ec-6147ffbcc8c7",
  "Raw Meat & Poultry":                     "bfa873d3-4bb3-4c8e-945a-a38d4ad9d66f",
  "Fresh & Frozen Fish":                    "965a483d-eacc-4426-ae7c-cf0552e65250",
  "Dairy Products & Analogues":             "ab9f8022-0f59-4d96-883d-19367680461f",
  "Dairy-Free Desserts":                    "27d773c1-e097-468e-9bcc-3b52ae6ffe34",
  "Ingredients & Additives":                "0a8f2c3c-b4ed-4759-849d-a545cdf551a2",
  "Herbs":                                  "8899bfa4-1ca9-451b-8fdb-242231a6d2f0",
  "Plant-Based Proteins":                   "18f4fb10-0337-45c8-a9d3-d063052db846",
  "Bakery & Bread Products":                "8660789d-00a3-49d2-8489-6b42f2345b7a",
  "Specialty Sauces & Condiments":          "24768201-755e-4560-b283-46cbbabcd27b",
  "Beverages (Non-Alcoholic)":              "32eace2c-ac37-4168-b93b-005748119293",
  "Fats, Oils & Spreads":                   "85998961-842d-4171-9198-07f8a7409b9d",
  "Pasta/Noodles":                          "ff746938-df89-47ad-9551-b174340c7ce1",
  "Prepared Meals (Frozen & Shelf-Stable)": "c49e821f-fff8-4ac1-af10-c6db4c8564ab",
  "Sugars & Sweeteners":                    "baf81f58-194d-4810-9367-152fac1349bf",
};

const CANONICAL_IDS = new Set(Object.values(CANONICAL_LEAVES));
const ID_TO_NAME = Object.fromEntries(
  Object.entries(CANONICAL_LEAVES).map(([name, id]) => [id, name])
);

const FOCACCIA_ID    = "d1adcc9f-c6a7-40a2-a4a9-5cfbc7d10dad";
const PLANT_PROT_ID  = "18f4fb10-0337-45c8-a9d3-d063052db846";

// ── LLM classifier ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strict product classification engine for a B2B food sourcing platform.
Assign each product to EXACTLY ONE category id from the allowed list, or to
"unclassified". Never guess by closest match.

Conflict rules (apply exactly):
- Chocolate / chocolate-coated / spreads -> Confectionery & Chocolate
- Plain biscuits, cookies -> Sweet Biscuits & Bars
- Savory crackers, pretzels, chips -> Savory Snacks & Cereals
- Honey, syrups, sugar, sweetener solutions -> Sugars & Sweeteners
- Canned/preserved tomato (chopped, diced, paste, peeled) -> Tomato Products
- Tomato sauce / ketchup / pasta sauce -> Specialty Sauces & Condiments
- Edible oils (sunflower, olive, blends) -> Fats, Oils & Spreads
- Frozen vegetables / frozen ready items -> Prepared Meals (Frozen & Shelf-Stable)
- Protein isolates / TVP / pea / soy protein / meat alternatives -> Plant-Based Proteins
Bucket-protection (must NOT attract noise): Plant-Based Proteins, Ingredients &
Additives, Bakery & Bread Products. If a product is not *explicitly* protein-focused
it may NOT enter Plant-Based Proteins. Ingredients & Additives is B2B raw inputs
ONLY, never finished retail SKUs.
Ignore negotiation notes, emails, Hebrew marketing boilerplate — extract product intent only.

Output STRICT JSON only:
{"category_id":"<id or 'unclassified'>","confidence":"high|medium|low","reason":"<short>"}`;

function buildLeafList(): string {
  return Object.entries(CANONICAL_LEAVES)
    .map(([name, id]) => `- "${name}" (id: ${id})`)
    .join("\n");
}

const LEAF_LIST = buildLeafList();

async function classify(productText: string): Promise<{
  predicted_category_id: string;
  predicted_name: string;
  confidence: string;
  reason: string;
}> {
  const userPrompt = `Product/category text: "${productText}"

Allowed categories:
${LEAF_LIST}

Output STRICT JSON only:
{"category_id":"<id or 'unclassified'>","confidence":"high|medium|low","reason":"<short>"}`;

  let raw = "";
  try {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = resp.content[0];
    raw = block?.type === "text" ? block.text : "";
  } catch (err) {
    return { predicted_category_id: "error", predicted_name: "ERROR", confidence: "low", reason: String(err) };
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { predicted_category_id: "unclassified", predicted_name: "Unclassified", confidence: "low", reason: "no JSON in response" };
  }

  let parsed: { category_id?: string; confidence?: string; reason?: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { predicted_category_id: "unclassified", predicted_name: "Unclassified", confidence: "low", reason: "JSON parse error" };
  }

  const returnedId = parsed.category_id ?? "unclassified";
  const confidence = parsed.confidence ?? "low";
  const reason = parsed.reason ?? "";

  if (returnedId === "unclassified" || !CANONICAL_IDS.has(returnedId)) {
    return { predicted_category_id: "unclassified", predicted_name: "Unclassified", confidence, reason };
  }

  return {
    predicted_category_id: returnedId,
    predicted_name: ID_TO_NAME[returnedId] ?? returnedId,
    confidence,
    reason,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── CSV writer ────────────────────────────────────────────────────────────────

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type CsvRow = {
  source: string;
  id: string;
  name: string;
  old_category_id: string;
  predicted_category_id: string;
  predicted_name: string;
  confidence: string;
  reason: string;
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const rows: CsvRow[] = [];

  // ── Set (a): Focaccia dump ────────────────────────────────────────────────
  console.log(`\n[Set A] Fetching supplier_products with category_id = Focaccia dump…`);
  const { data: setA, error: errA } = await supabase
    .from("supplier_products")
    .select("id, product_name, category")
    .eq("category_id", FOCACCIA_ID);

  if (errA) { console.error("Set A fetch error:", errA.message); process.exit(1); }
  console.log(`  Found ${setA?.length ?? 0} rows.`);

  for (let i = 0; i < (setA ?? []).length; i++) {
    const p = (setA ?? [])[i] as { id: string; product_name: string | null; category: string | null };
    const text = [p.product_name, p.category].filter(Boolean).join(" — ");
    process.stdout.write(`  [A ${i + 1}/${setA!.length}] ${(p.product_name ?? "").slice(0, 40).padEnd(40)} → `);
    const result = await classify(text);
    console.log(`${result.predicted_name} (${result.confidence})`);
    rows.push({
      source: "supplier_products",
      id: p.id,
      name: p.product_name ?? "",
      old_category_id: FOCACCIA_ID,
      ...result,
    });
    if (i < setA!.length - 1) await sleep(500);
  }

  // ── Set (b): Plant-Based Proteins bucket ─────────────────────────────────
  console.log(`\n[Set B] Fetching supplier_products with category_id = Plant-Based Proteins…`);
  const { data: setB, error: errB } = await supabase
    .from("supplier_products")
    .select("id, product_name, category")
    .eq("category_id", PLANT_PROT_ID);

  if (errB) { console.error("Set B fetch error:", errB.message); process.exit(1); }
  console.log(`  Found ${setB?.length ?? 0} rows.`);

  for (let i = 0; i < (setB ?? []).length; i++) {
    const p = (setB ?? [])[i] as { id: string; product_name: string | null; category: string | null };
    const text = [p.product_name, p.category].filter(Boolean).join(" — ");
    process.stdout.write(`  [B ${i + 1}/${setB!.length}] ${(p.product_name ?? "").slice(0, 40).padEnd(40)} → `);
    const result = await classify(text);
    console.log(`${result.predicted_name} (${result.confidence})`);
    rows.push({
      source: "supplier_products",
      id: p.id,
      name: p.product_name ?? "",
      old_category_id: PLANT_PROT_ID,
      ...result,
    });
    if (i < setB!.length - 1) await sleep(500);
  }

  // ── Set (c): Wrong sourcing_request category_ids ──────────────────────────
  console.log(`\n[Set C] Fetching sourcing_requests with non-canonical category_id…`);
  const { data: allReqs, error: errC } = await supabase
    .from("sourcing_requests")
    .select("id, product_name, intent_json")
    .not("intent_json", "is", null);

  if (errC) { console.error("Set C fetch error:", errC.message); process.exit(1); }

  type ReqRow = { id: string; product_name: string | null; intent_json: Record<string, unknown> | null };
  const setC = (allReqs as ReqRow[]).filter((r) => {
    const cat = r.intent_json?.category as Record<string, unknown> | undefined;
    const cid = cat?.category_id as string | undefined;
    return cid && !CANONICAL_IDS.has(cid);
  });
  console.log(`  Found ${setC.length} rows with non-canonical category_id.`);

  for (let i = 0; i < setC.length; i++) {
    const r = setC[i];
    const cat = r.intent_json?.category as Record<string, unknown> | undefined;
    const oldId = (cat?.category_id as string) ?? "";
    const rawText = (cat?.raw_text as string | undefined) ?? r.product_name ?? "";
    const text = [r.product_name, rawText !== r.product_name ? rawText : null].filter(Boolean).join(" — ");
    process.stdout.write(`  [C ${i + 1}/${setC.length}] ${(r.product_name ?? "").slice(0, 40).padEnd(40)} → `);
    const result = await classify(text);
    console.log(`${result.predicted_name} (${result.confidence})`);
    rows.push({
      source: "sourcing_requests",
      id: r.id,
      name: r.product_name ?? "",
      old_category_id: oldId,
      ...result,
    });
    if (i < setC.length - 1) await sleep(500);
  }

  // ── Write CSV ─────────────────────────────────────────────────────────────
  const reportsDir = path.join(process.cwd(), "migrations", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const csvPath = path.join(reportsDir, "reclass_dryrun.csv");

  const header = "source,id,name,old_category_id,predicted_category_id,predicted_name,confidence,reason";
  const body = rows.map((r) =>
    [r.source, r.id, r.name, r.old_category_id, r.predicted_category_id, r.predicted_name, r.confidence, r.reason]
      .map(csvEscape)
      .join(",")
  );
  fs.writeFileSync(csvPath, [header, ...body].join("\n") + "\n", "utf8");
  console.log(`\nCSV written to: ${csvPath}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  function distribution(subset: CsvRow[]) {
    const counts = new Map<string, number>();
    for (const r of subset) {
      counts.set(r.predicted_name, (counts.get(r.predicted_name) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }

  const rowsA = rows.filter((r) => r.source === "supplier_products" && r.old_category_id === FOCACCIA_ID);
  const rowsB = rows.filter((r) => r.source === "supplier_products" && r.old_category_id === PLANT_PROT_ID);
  const rowsC = rows.filter((r) => r.source === "sourcing_requests");

  console.log("\n── Set A (Focaccia dump) distribution ─────────────────────────────");
  for (const [name, count] of distribution(rowsA)) {
    console.log(`  ${String(count).padStart(4)}  ${name}`);
  }

  console.log("\n── Set B (Plant-Based Proteins) distribution ──────────────────────");
  for (const [name, count] of distribution(rowsB)) {
    console.log(`  ${String(count).padStart(4)}  ${name}`);
  }
  const contaminatedB = rowsB.filter((r) => r.predicted_category_id !== PLANT_PROT_ID).length;
  const contaminationPct = rowsB.length > 0 ? ((contaminatedB / rowsB.length) * 100).toFixed(1) : "0.0";
  console.log(`\n  Plant-Based Proteins contamination: ${contaminatedB}/${rowsB.length} = ${contaminationPct}%`);
  console.log(`  (rows predicted to a category OTHER than Plant-Based Proteins)`);

  console.log("\n── Set C (Wrong sourcing_request category_ids) distribution ────────");
  for (const [name, count] of distribution(rowsC)) {
    console.log(`  ${String(count).padStart(4)}  ${name}`);
  }

  console.log("\n── Totals ──────────────────────────────────────────────────────────");
  console.log(`  Set A (Focaccia):        ${rowsA.length} rows`);
  console.log(`  Set B (Plant Proteins):  ${rowsB.length} rows`);
  console.log(`  Set C (Requests):        ${rowsC.length} rows`);
  console.log(`  Total classified:        ${rows.length}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

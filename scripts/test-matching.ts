/**
 * CSV-driven matching test harness for Phase 5 hybrid vector matching.
 *
 * Usage:  npx tsx scripts/test-matching.ts
 *
 * Reads test-data/supplier_products.csv and test-data/requests.csv.
 * Inserts test rows, embeds them, runs match_v3, prints per-request results,
 * validates hard-filter + vector assertions, then cleans up all test rows.
 *
 * Test isolation: all test supplier products are tagged with "__test__" in their
 * tags[] column, and all use category = "__test_cereals__" to constrain the
 * candidate pool to test rows only.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

import { createClient } from "@supabase/supabase-js";
import { embedText, embedBatch } from "../lib/ai/embed";

const TEST_TAG = "__test__";
const TEST_CATEGORY = "__test_cereals__";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCSV(filePath: string): Record<string, string>[] {
  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SupplierRow = {
  product_name: string;
  description: string;
  category_name: string;
  sub_type: string;
  channel: string;
  temperature: string;
  is_organic: string;
  is_gluten_free: string;
  is_sugar_free: string;
  kosher_level: string;
  kosher_passover: string;
  is_halal: string;
  net_weight: string;
  claims: string;
  origin_country: string;
  supplier_name: string;
};

type RequestRow = {
  id: string;
  product_text: string;
  required_kosher: string;
  required_kosher_passover: string;
  required_temperature: string;
  required_channel: string;
  required_organic: string;
  required_gluten_free: string;
  required_sugar_free: string;
  descriptors: string;
  expected_include: string;
  expected_exclude: string;
};

type MatchRow = {
  supplier_id: string;
  product_id: string;
  product_name: string;
  company_name: string;
  country: string | null;
  score: number;
  breakdown: Record<string, number>;
  summary: string;
};

// ── Embed string builder (mirrors backfill-embeddings.ts) ────────────────────

function buildSupplierEmbedString(row: SupplierRow): string {
  const parts = [
    row.product_name,
    row.description,
    row.sub_type,
    row.claims.split(";").join(". "),
    row.origin_country,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(". ");
  return parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".";
}

function buildRequestEmbedString(row: RequestRow): string {
  const parts = [
    row.product_text,
    row.descriptors.split(";").join(". "),
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(". ");
  return parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".";
}

// ── Main ──────────────────────────────────────────────────────────────────────

const insertedOfferingIds: string[] = [];
const insertedProductIds: string[] = [];
const insertedRequestIds: string[] = [];

async function main() {
  // ── 1. Load CSVs ───────────────────────────────────────────────────────────
  const supplierRows = parseCSV(
    path.resolve(__dirname, "test-data/supplier_products.csv")
  ) as SupplierRow[];

  const requestRows = parseCSV(
    path.resolve(__dirname, "test-data/requests.csv")
  ) as RequestRow[];

  console.log(`Loaded ${supplierRows.length} supplier rows, ${requestRows.length} request rows\n`);

  // ── 2. Insert test supplier_offerings (one per unique supplier_name) ───────
  console.log("Inserting test supplier_offerings...");
  const uniqueSuppliers = [...new Set(supplierRows.map((r) => r.supplier_name))];
  const supplierIdMap = new Map<string, string>();

  for (const supplierName of uniqueSuppliers) {
    const row = supplierRows.find((r) => r.supplier_name === supplierName)!;
    const { data, error } = await supabase
      .from("supplier_offerings")
      .insert({
        company_name: supplierName,
        country_of_origin: row.origin_country || null,
        status: "approved",
        verified: false,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`  Failed to insert offering for ${supplierName}:`, error);
      continue;
    }
    supplierIdMap.set(supplierName, data.id);
    insertedOfferingIds.push(data.id);
    console.log(`  Inserted offering: ${supplierName} → ${data.id}`);
  }

  // ── 3. Insert test supplier_products ──────────────────────────────────────
  console.log("\nInserting test supplier_products...");

  for (const row of supplierRows) {
    const supplierId = supplierIdMap.get(row.supplier_name);
    if (!supplierId) {
      console.warn(`  No supplier_id for ${row.supplier_name}, skipping`);
      continue;
    }

    const { data, error } = await supabase
      .from("supplier_products")
      .insert({
        supplier_id: supplierId,
        product_name: row.product_name,
        description: row.description || null,
        category: row.category_name,
        subcategory: row.sub_type || null,
        tags: [TEST_TAG, ...row.claims.split(";").filter(Boolean)],
        kosher_types: row.kosher_level !== "none"
          ? [row.kosher_level.charAt(0).toUpperCase() + row.kosher_level.slice(1)]
          : [],
        certifications: [
          ...(row.is_organic === "true" ? ["Organic"] : []),
          ...(row.is_halal === "true" ? ["Halal"] : []),
          ...(row.is_gluten_free === "true" ? ["Gluten Free"] : []),
        ],
        private_label: false,
        is_published: true,
        // typed hard-constraint columns
        kosher_level: row.kosher_level,
        kosher_passover: row.kosher_passover === "true",
        is_organic: row.is_organic === "true",
        is_halal: row.is_halal === "true",
        is_gluten_free: row.is_gluten_free === "true",
        is_sugar_free: row.is_sugar_free === "true",
        temperature: row.temperature || null,
        channel: row.channel ? row.channel.split(";") : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`  Failed to insert product ${row.product_name}:`, error);
      continue;
    }
    insertedProductIds.push(data.id);
    console.log(`  Inserted product: ${row.product_name} (${row.supplier_name})`);
  }

  // ── 4. Embed all test supplier rows ───────────────────────────────────────
  console.log("\nEmbedding test supplier products...");
  const embedStrings = supplierRows.map(buildSupplierEmbedString);
  const embeddings = await embedBatch(embedStrings);

  let embedCount = 0;
  for (let i = 0; i < insertedProductIds.length; i++) {
    const vec = embeddings[i];
    if (!vec) {
      console.warn(`  No embedding for row ${i} (${supplierRows[i].product_name})`);
      continue;
    }
    await supabase
      .from("supplier_products")
      .update({ embedding: vec as unknown as string })
      .eq("id", insertedProductIds[i]);
    embedCount++;
  }
  console.log(`  Embedded ${embedCount}/${insertedProductIds.length} products`);

  // ── 5. Run match for each request row ─────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  let totalPass = 0;
  let totalFail = 0;

  for (const reqRow of requestRows) {
    console.log(`\n── Request ${reqRow.id}: "${reqRow.product_text}"`);
    if (reqRow.required_kosher) console.log(`   kosher=${reqRow.required_kosher}, passover=${reqRow.required_kosher_passover}, temp=${reqRow.required_temperature || "any"}`);

    // Build + embed the request string (input_type "query" — asymmetric vs supplier "document")
    const embedString = buildRequestEmbedString(reqRow);
    const reqEmbedding = await embedText(embedString, "query");
    if (!reqEmbedding) console.warn("   Warning: request embedding failed, using neutral pts_vector=10");

    // Insert a minimal sourcing_request so match_v3 has a row to read from.
    // category = TEST_CATEGORY ensures the candidate pool pulls only test rows.
    const { data: srData, error: srError } = await supabase
      .from("sourcing_requests")
      .insert({
        name: `Test Request ${reqRow.id}`,
        email: "test@test.com",
        product_name: reqRow.product_text,
        category: TEST_CATEGORY,
        message: reqRow.descriptors || null,
        status: "new",
        intent_json: {
          product: { name: reqRow.product_text },
          category: { category_id: null, raw_text: TEST_CATEGORY },
          match_config: {
            must_have: buildMustHaveArray(
              reqRow.required_kosher || null,
              reqRow.required_kosher_passover === "true",
              reqRow.required_temperature || null,
              reqRow.required_organic === "true",
              false,
              reqRow.required_channel || null
            ),
            nice_to_have: [],
            dealbreakers: [],
          },
          compliance: {
            kosher_required: (reqRow.required_kosher || null) !== null,
            kosher_types: reqRow.required_kosher && reqRow.required_kosher !== "any"
              ? [reqRow.required_kosher]
              : [],
            certifications: [],
          },
          commercial: { private_label: false },
          specifications: { formats: [] },
        },
      })
      .select("id")
      .single();

    if (srError || !srData) {
      console.error("   Failed to insert sourcing_request:", srError);
      continue;
    }
    insertedRequestIds.push(srData.id);

    // Call match_v3 — constraints derived from intent_json inside SQL (pip_c CTE)
    const { data: matchData, error: matchError } = await supabase.rpc("match_v3", {
      request_uuid: srData.id,
      limit_n: 20,
      request_emb: reqEmbedding,
    });

    if (matchError) {
      console.error("   match_v3 error:", matchError);
      continue;
    }

    const results = (matchData ?? []) as MatchRow[];
    const testResults = results.filter((r) =>
    insertedProductIds.includes(r.product_id)
    );

    console.log(`   Results (test rows only, ${testResults.length} matches):`);
    console.log(
      `   ${"Product".padEnd(45)} ${"Supplier".padEnd(22)} ${"Score".padEnd(6)} Cat  Vec`
    );
    for (const r of testResults) {
      const cat = typeof r.breakdown?.category === "number"
        ? String(Math.round(r.breakdown.category)).padStart(3)
        : " n/a";
      const vec = typeof r.breakdown?.vector === "number"
        ? r.breakdown.vector.toFixed(1).padStart(4)
        : " n/a";
      const sim = `${cat} ${vec}`;
      console.log(
        `   ${r.product_name.slice(0, 43).padEnd(45)} ${r.company_name.slice(0, 20).padEnd(22)} ${String(Math.round(r.score)).padEnd(6)} ${sim}`
      );
    }

    // ── Assertions ──────────────────────────────────────────────────────────
    const resultKeys = testResults.map((r) => `${r.product_name}|${r.company_name}`);

    for (const expected of reqRow.expected_include.split(";").filter(Boolean)) {
      const found = resultKeys.includes(expected.trim());
      const status = found ? "PASS" : "FAIL";
      if (found) totalPass++; else totalFail++;
      console.log(`   [${status}] Expected INCLUDE: "${expected}"`);
    }

    for (const excluded of reqRow.expected_exclude.split(";").filter(Boolean)) {
      if (!excluded.trim()) continue;
      const found = resultKeys.includes(excluded.trim());
      const status = !found ? "PASS" : "FAIL";
      if (!found) totalPass++; else totalFail++;
      console.log(`   [${status}] Expected EXCLUDE: "${excluded}"`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log(`TOTAL: ${totalPass} PASS, ${totalFail} FAIL\n`);
}

function buildMustHaveArray(
  kosherLevel: string | null,
  kosherPassover: boolean,
  temperature: string | null,
  organic: boolean,
  halal: boolean,
  channel: string | null = null
): string[] {
  const arr: string[] = [];
  if (kosherLevel === "any") arr.push("kosher");
  else if (kosherLevel) { arr.push("kosher"); arr.push(`kosher:${kosherLevel.charAt(0).toUpperCase() + kosherLevel.slice(1)}`); }
  if (kosherPassover) arr.push("kosher_passover");
  if (temperature) arr.push(`temperature_regime:${temperature}`);
  if (organic) arr.push("organic");
  if (halal) arr.push("halal");
  if (channel) arr.push(`channel:${channel}`);
  return arr;
}

async function cleanup() {
  console.log("Cleaning up test rows...");

  if (insertedRequestIds.length) {
    const { error } = await supabase
      .from("sourcing_requests")
      .delete()
      .in("id", insertedRequestIds);
    if (error) console.warn("  sourcing_requests cleanup error:", error);
    else console.log(`  Deleted ${insertedRequestIds.length} sourcing_requests`);
  }

  if (insertedProductIds.length) {
    const { error } = await supabase
      .from("supplier_products")
      .delete()
      .in("id", insertedProductIds);
    if (error) console.warn("  supplier_products cleanup error:", error);
    else console.log(`  Deleted ${insertedProductIds.length} supplier_products`);
  }

  if (insertedOfferingIds.length) {
    const { error } = await supabase
      .from("supplier_offerings")
      .delete()
      .in("id", insertedOfferingIds);
    if (error) console.warn("  supplier_offerings cleanup error:", error);
    else console.log(`  Deleted ${insertedOfferingIds.length} supplier_offerings`);
  }
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
  })
  .finally(() => {
    cleanup().then(() => process.exit(0));
  });
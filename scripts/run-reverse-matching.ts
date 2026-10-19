/**
 * FDX Reverse Assortment Matching Engine
 *
 * Matches buyer private-label lines (Shufersal, Rami Levy, Carrefour, etc.)
 * directly against the 38,800+ supplier product catalog to discover:
 * 1. Direct factory alternatives (co-packing parity)
 * 2. Origin substitution (e.g. Spanish EVOO, Italian Pasta, Turkish Tomatoes)
 * 3. Cost-arbitrage pitches for commercial teams
 *
 * Usage:
 *   npx tsx scripts/run-reverse-matching.ts [--buyer="Shufersal"] [--min-score=70]
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { embedBatch, embedText } from "../lib/ai/embed";
import { mapScraperCategoryToCanonicalId } from "../lib/pip/resolveCategoryId";

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
  } catch {}
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SkuTarget {
  buyerId: string;
  buyerName: string;
  productName: string;
  category: string;
  origin?: string;
  priceIls?: number;
}

function parseVector(val: unknown): number[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val as number[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as number[];
    } catch {}
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── 1. Extract Target SKUs from buyers.notes or buyer_assortments ───────────────
async function loadTargetSkus(targetBuyerName?: string | null): Promise<SkuTarget[]> {
  const skus: SkuTarget[] = [];

  // Check if buyer_assortments has items
  const { data: assortRows, error } = await supabase
    .from("buyer_assortments")
    .select("id, buyer_id, product_name, category_id, manufacturer_country, retail_price_ils, buyers(company_name)");

  if (!error && assortRows && assortRows.length > 0) {
    for (const r of assortRows as any[]) {
      skus.push({
        buyerId: r.buyer_id,
        buyerName: r.buyers?.company_name || "Unknown Buyer",
        productName: r.product_name,
        category: r.category_id || "Food",
        origin: r.manufacturer_country,
        priceIls: r.retail_price_ils,
      });
    }
    return skus;
  }

  // Fallback: parse rich co-packed SKUs from buyers.notes
  let query = supabase.from("buyers").select("id, company_name, notes").not("notes", "is", null);
  if (targetBuyerName) {
    query = query.ilike("company_name", `%${targetBuyerName}%`);
  }

  const { data: buyers } = await query;
  if (!buyers) return [];

  for (const b of buyers) {
    const notes = b.notes || "";
    const lines = notes.split("\n");
    let inSkus = false;

    for (const line of lines) {
      if (line.includes("Top Co-Packed SKUs:")) {
        inSkus = true;
        continue;
      }
      if (inSkus && line.startsWith("•")) {
        // e.g. "• Shufersal Durum Wheat Penne Rigate 500g (Pasta & Grains - Co-packed in Italy - ₪4.9)"
        const match = line.match(/^•\s*(.*?)\s*\((.*?)\)/);
        if (match) {
          const productName = match[1].trim();
          const metaParts = match[2].split("-").map((s: string) => s.trim());
          const category = metaParts[0] || "Food";
          let origin: string | undefined;
          let priceIls: number | undefined;

          for (const p of metaParts.slice(1)) {
            if (p.toLowerCase().includes("co-packed in")) {
              origin = p.replace(/co-packed in/i, "").trim();
            } else if (p.includes("₪")) {
              const num = parseFloat(p.replace(/[^\d.]/g, ""));
              if (!isNaN(num)) priceIls = num;
            }
          }

          skus.push({
            buyerId: b.id,
            buyerName: b.company_name,
            productName,
            category,
            origin,
            priceIls,
          });
        }
      }
    }
  }

  return skus;
}

// ── 2. Run Reverse Match against 38,800+ Catalog ───────────────────────────────
async function runReverseMatch(sku: SkuTarget, minScore: number) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Matching Buyer SKU: [${sku.buyerName}] "${sku.productName}"`);
  console.log(`Category: ${sku.category} | Current Co-Pack Origin: ${sku.origin || "Unknown"} | Retail Price: ₪${sku.priceIls || "N/A"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const canonicalCatId = mapScraperCategoryToCanonicalId(sku.category);

  // 1. Generate Voyage-3 embedding for the buyer SKU
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embedText(
      `${sku.productName}. ${sku.category}. Co-packed food product.`,
      "query"
    );
  } catch (e) {
    console.warn("Embedding generation failed:", e);
  }

  // 2. Fetch candidate suppliers in category
  let query = supabase
    .from("supplier_products")
    .select("id, product_name, category_id, subcategory, formats, embedding, supplier_id, supplier_offerings(id, company_name, country_of_origin, verified, certifications)")
    .limit(300);

  if (canonicalCatId) {
    query = query.eq("category_id", canonicalCatId);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates || candidates.length === 0) {
    console.log(`No supplier candidates found in category ${sku.category}.`);
    return;
  }

  console.log(`Evaluating ${candidates.length} candidate suppliers in ${sku.category}...`);

  const matches: {
    supplierId: string;
    supplierName: string;
    productName: string;
    country: string | null;
    score: number;
    vectorSim: number;
    pitchAngle: string;
    verified: boolean;
  }[] = [];

  for (const c of candidates as any[]) {
    const sup = Array.isArray(c.supplier_offerings)
      ? c.supplier_offerings[0]
      : c.supplier_offerings;
    if (!sup) continue;

    // Vector Similarity (0-40 pts)
    let vectorSim = 0;
    let ptsVector = 20;
    const prodVec = parseVector(c.embedding);
    if (queryEmbedding && prodVec) {
      vectorSim = cosineSimilarity(queryEmbedding, prodVec);
      ptsVector = Math.round(vectorSim * 40 * 10) / 10;
    }

    // Category Match (30 pts)
    const ptsCategory = c.category_id === canonicalCatId ? 30 : 15;

    // Origin Match (15 pts if matches co-packing origin e.g. Italy, Spain)
    let ptsOrigin = 5;
    const supCountry = (sup.country_of_origin || "").toLowerCase();
    if (sku.origin && supCountry && supCountry.includes(sku.origin.toLowerCase())) {
      ptsOrigin = 15;
    }

    // Verified / Market Fit (15 pts)
    const ptsEvidence = (sup.verified ? 10 : 0) + ((sup.certifications || []).length > 0 ? 5 : 0);

    const totalScore = Math.min(100, Math.round(ptsVector + ptsCategory + ptsOrigin + ptsEvidence));

    if (totalScore >= minScore) {
      const pitch =
        sup.country_of_origin?.toLowerCase() === sku.origin?.toLowerCase()
          ? `Direct ${sup.country_of_origin} factory parity against current ${sku.buyerName} private label.`
          : `Alternative certified producer with potential margin improvement over current co-packer.`;

      matches.push({
        supplierId: sup.id,
        supplierName: sup.company_name,
        productName: c.product_name,
        country: sup.country_of_origin,
        score: totalScore,
        vectorSim,
        pitchAngle: pitch,
        verified: Boolean(sup.verified),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const topMatches = matches.slice(0, 5);

  if (topMatches.length === 0) {
    console.log(`  No candidate scored above threshold (${minScore}%).`);
    return;
  }

  console.log(`✓ Found ${topMatches.length} high-confidence factory matches:`);
  for (const m of topMatches) {
    console.log(`  ★ [Score: ${m.score}% | Sim: ${(m.vectorSim * 100).toFixed(1)}%] ${m.supplierName} (${m.country || "Global"})`);
    console.log(`    SKU: "${m.productName}"`);
    console.log(`    Pitch: ${m.pitchAngle}\n`);
  }
}

// ── Main Controller ──────────────────────────────────────────────────────────
async function main() {
  const buyerArg = process.argv.find((a) => a.startsWith("--buyer="));
  const targetBuyerName = buyerArg ? buyerArg.slice(8).replace(/^["']|["']$/g, "") : null;
  const minScoreArg = process.argv.find((a) => a.startsWith("--min-score="));
  const minScore = minScoreArg ? parseInt(minScoreArg.slice(12), 10) : 65;

  console.log("=========================================================");
  console.log("  FDX Reverse Assortment Matching Engine");
  console.log("  Targeting: Proactive Supplier-to-Buyer Private Label Pitches");
  console.log("=========================================================");

  const targetSkus = await loadTargetSkus(targetBuyerName);
  console.log(`Loaded ${targetSkus.length} buyer private-label SKU(s) for reverse matching.`);

  if (targetSkus.length === 0) {
    console.log("No buyer assortment SKUs found. Run scripts/scrape-buyer-assortment.ts first.");
    return;
  }

  // Match the top representative SKUs across categories
  const batch = targetSkus.slice(0, 8);
  for (const sku of batch) {
    await runReverseMatch(sku, minScore);
  }

  console.log("\n✓ Reverse Assortment Matching batch finished.");
}

main().catch(console.error);

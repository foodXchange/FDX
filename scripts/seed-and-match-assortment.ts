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

interface ParsedSku {
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

async function main() {
  console.log("=============================================================");
  console.log("  FDX Reverse Matching Engine — Seeding & Catalog Matching");
  console.log("=============================================================");

  // 1. Fetch buyers with notes
  const { data: buyers, error: bErr } = await supabase
    .from("buyers")
    .select("id, company_name, notes")
    .not("notes", "is", null);

  if (bErr || !buyers) {
    console.error("Failed to fetch buyers:", bErr?.message);
    return;
  }

  const parsedSkus: ParsedSku[] = [];

  for (const b of buyers) {
    const lines = (b.notes || "").split("\n");
    let inSkus = false;

    for (const line of lines) {
      if (line.includes("Top Co-Packed SKUs:")) {
        inSkus = true;
        continue;
      }
      if (inSkus && line.startsWith("•")) {
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

          parsedSkus.push({
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

  console.log(`Parsed ${parsedSkus.length} private-label SKUs across ${buyers.length} buyers.`);

  // 2. Generate Voyage-3 Embeddings & Insert into buyer_assortments
  console.log("\nGenerating Voyage-3 embeddings for private-label SKUs...");
  const embedTexts = parsedSkus.map((s) => `${s.productName}. ${s.category}. Co-packed food product.`);
  let vectors: (number[] | null)[] = [];
  try {
    vectors = await embedBatch(embedTexts, "document");
  } catch (e) {
    console.warn("Embedding batch error:", e);
  }

  const assortmentRowsToInsert = parsedSkus.map((sku, idx) => {
    const canonicalCatId = mapScraperCategoryToCanonicalId(sku.category);
    return {
      buyer_id: sku.buyerId,
      category_id: canonicalCatId,
      product_name: sku.productName,
      brand_name: sku.buyerName,
      is_private_label: true,
      manufacturer_country: sku.origin || null,
      retail_price_ils: sku.priceIls || null,
      embedding: vectors[idx] ? JSON.stringify(vectors[idx]) : null,
    };
  });

  console.log(`Inserting ${assortmentRowsToInsert.length} items into buyer_assortments...`);
  const { data: insertedAssortments, error: insertAssortErr } = await supabase
    .from("buyer_assortments")
    .insert(assortmentRowsToInsert)
    .select("id, buyer_id, product_name, category_id, manufacturer_country, retail_price_ils, embedding");

  if (insertAssortErr) {
    console.error("Failed to insert into buyer_assortments:", insertAssortErr.message);
    return;
  }

  console.log(`✓ Successfully seeded ${insertedAssortments?.length ?? 0} SKUs into buyer_assortments!`);

  // 3. Run Matching Against Catalog and Store into assortment_matches
  console.log("\n── Running Reverse Catalog Matching Engine ──");
  let totalMatchesInserted = 0;

  for (const item of (insertedAssortments || []).slice(0, 15)) {
    const buyerName = parsedSkus.find((s) => s.buyerId === item.buyer_id)?.buyerName || "Buyer";
    console.log(`\nMatching [${buyerName}] "${item.product_name}"...`);

    const itemVec = parseVector(item.embedding);

    let candidateQuery = supabase
      .from("supplier_products")
      .select("id, product_name, category_id, embedding, supplier_id, supplier_offerings(id, company_name, country_of_origin, verified, certifications)")
      .limit(200);

    if (item.category_id) {
      candidateQuery = candidateQuery.eq("category_id", item.category_id);
    }

    const { data: candidates } = await candidateQuery;
    if (!candidates || candidates.length === 0) continue;

    const scoredMatches: any[] = [];

    for (const c of candidates as any[]) {
      const sup = Array.isArray(c.supplier_offerings) ? c.supplier_offerings[0] : c.supplier_offerings;
      if (!sup) continue;

      let vectorSim = 0;
      let ptsVector = 20;
      const prodVec = parseVector(c.embedding);
      if (itemVec && prodVec) {
        vectorSim = cosineSimilarity(itemVec, prodVec);
        ptsVector = Math.round(vectorSim * 40 * 10) / 10;
      }

      const ptsCategory = c.category_id === item.category_id ? 30 : 15;
      let ptsOrigin = 5;
      const supCountry = (sup.country_of_origin || "").toLowerCase();
      if (item.manufacturer_country && supCountry.includes(item.manufacturer_country.toLowerCase())) {
        ptsOrigin = 15;
      }
      const ptsEvidence = (sup.verified ? 10 : 0) + ((sup.certifications || []).length > 0 ? 5 : 0);
      const totalScore = Math.min(100, Math.round(ptsVector + ptsCategory + ptsOrigin + ptsEvidence));

      if (totalScore >= 65) {
        const pitch =
          sup.country_of_origin?.toLowerCase() === item.manufacturer_country?.toLowerCase()
            ? `Direct ${sup.country_of_origin} manufacturer alternative to ${buyerName} co-packer.`
            : `Qualified manufacturer with potential cost-advantage over existing ${buyerName} line.`;

        scoredMatches.push({
          buyer_assortment_id: item.id,
          buyer_id: item.buyer_id,
          supplier_product_id: c.id,
          supplier_id: sup.id,
          match_score: totalScore,
          vector_similarity: vectorSim,
          category_match: c.category_id === item.category_id,
          kosher_match: true,
          pitch_angle: pitch,
          potential_margin_gain: "15-25% estimated margin improvement over distributor import",
          status: "proposed",
        });
      }
    }

    scoredMatches.sort((a, b) => b.match_score - a.match_score);
    const topScored = scoredMatches.slice(0, 3);

    if (topScored.length > 0) {
      const { error: matchInsertErr } = await supabase
        .from("assortment_matches")
        .insert(topScored);

      if (!matchInsertErr) {
        totalMatchesInserted += topScored.length;
        console.log(`  ✓ Saved ${topScored.length} match proposal(s) to assortment_matches!`);
      } else {
        console.error(`  Match insert error:`, matchInsertErr.message);
      }
    }
  }

  console.log(`\n=============================================================`);
  console.log(`✓ Engine finished! Total ${totalMatchesInserted} proactive match cards generated.`);
  console.log(`=============================================================`);
}

main().catch(console.error);

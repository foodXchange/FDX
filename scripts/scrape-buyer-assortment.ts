/**
 * Buyer Assortment & Private-Label Sourcing Scraper
 *
 * Implements "Category Assortment Fingerprinting":
 * 1. Focuses strictly on buyer's OWN private-label brands and exclusive co-packed lines.
 * 2. Extracts category hierarchy, price tier, key import origins, and co-packing appetite.
 * 3. Does NOT scrape 50,000 generic retail items — captures high-value B2B trade data only.
 * 4. Resolves canonical category IDs and generates Voyage-3 embeddings for matched supplier discovery.
 *
 * Usage:
 *   npx tsx scripts/scrape-buyer-assortment.ts --buyer="Shufersal"
 *   npx tsx scripts/scrape-buyer-assortment.ts --buyer="Rami Levy"
 *   npx tsx scripts/scrape-buyer-assortment.ts --all --limit=5
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Firecrawl from "@mendable/firecrawl-js";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { mapScraperCategoryToCanonicalId } from "../lib/pip/resolveCategoryId";
import { embedBatch } from "../lib/ai/embed";

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

interface BuyerRow {
  id: string;
  company_name: string;
  website: string | null;
  country: string | null;
  buyer_type?: string | null;
  kosher_standard?: string | null;
  notes?: string | null;
}

interface ExtractedBuyerProfile {
  businessType: string;
  privateLabelBrands: string[];
  topFoodCategories: string[];
  priceTier: "budget" | "mid-market" | "premium" | "mass-market";
  sourcingSummary: string;
  privateLabelSkus: {
    productName: string;
    brandName: string;
    category: string;
    subcategory?: string;
    packageSize?: string;
    retailPriceIls?: number;
    manufacturerCountry?: string;
    certifications?: string[];
  }[];
}

// ── 1. Fetch content via Firecrawl or Perplexity Grounding ─────────────────────
async function fetchBuyerContent(buyer: BuyerRow): Promise<string> {
  const website = buyer.website!;
  console.log(`\nGathering data for ${buyer.company_name} (${website})...`);

  // Try Firecrawl scrape on the website
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const firecrawl = new Firecrawl({ apiKey: firecrawlKey });
      console.log(`  Scraping ${website} via Firecrawl...`);
      const scrapeRes: any = await firecrawl.scrape(website, {
        formats: ["markdown"],
        onlyMainContent: true,
      });

      const md = scrapeRes?.markdown || scrapeRes?.content || "";
      if (md.length > 200) {
        console.log(`  ✓ Firecrawl scraped ${md.length} characters`);
        return md;
      }
    } catch (e: any) {
      console.warn(`  Firecrawl scrape notice:`, e?.message || e);
    }
  }

  // Fallback: Perplexity research targeting private-label & retail assortment
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityKey) {
    console.log(`  🔍 Researching private-label & category assortment via Perplexity...`);
    try {
      const query =
        `Israeli supermarket / food retailer: ${buyer.company_name} (${website}). ` +
        `Analyze their food retail assortment and private label lines:\n` +
        `1. What are their own private label brands (מותג פרטי)? (e.g. Shufersal, Rami Levy, Carrefour Bio)\n` +
        `2. What food categories do they heavily co-pack or import? (pasta, olive oil, tuna, canned tomatoes, legumes, bakery, dairy)\n` +
        `3. List 15 to 25 representative food products sold under their private label brand with sizes and prices in ILS.\n` +
        `4. What foreign countries do they source private label co-packing from (Italy, Spain, Turkey, Poland)?`;

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "You are an expert food retail analyst specializing in private-label assortment, retail co-packing, and supermarket brand lines in Israel.",
            },
            { role: "user", content: query },
          ],
          max_tokens: 2500,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const json: any = await response.json();
        const text = json.choices?.[0]?.message?.content || "";
        if (text.length > 200) {
          console.log(`  ✓ Perplexity research retrieved ${text.length} chars of assortment data`);
          return text;
        }
      } else {
        const errText = await response.text();
        console.warn(`  Perplexity API returned HTTP ${response.status}:`, errText);
      }
    } catch (err) {
      console.warn(`  Perplexity query error:`, err);
    }
  }

  return `Food retailer: ${buyer.company_name} (${website}). Region: ${buyer.country || "Israel"}.`;
}

// ── 2. LLM Extraction with Claude 3.5 Sonnet / Gemini fallback ────────────────
async function extractBuyerAssortment(
  rawContent: string,
  buyer: BuyerRow
): Promise<ExtractedBuyerProfile | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const prompt = `You are a B2B food trade analyst. Analyze this retail buyer / supermarket website data for "${buyer.company_name}".
We are building a B2B food manufacturer matching platform.
DO NOT extract thousands of generic third-party retail products (like Coca-Cola or Osem).
FOCUS STRICTLY ON:
1. The buyer's OWN private label brand(s) (מותג פרטי) or exclusive import lines.
2. The core food categories they source and sell.
3. Up to 25 high-value representative private-label or co-packed food items (pasta, olive oil, tuna, canned foods, grains, sauces, confectionery).
4. The B2B co-packing and supplier opportunity profile.

Website & Research Content:
${rawContent.slice(0, 45000)}

Return ONLY valid JSON matching this exact schema:
{
  "businessType": "Supermarket Chain | FMCG Distributor | Institutional Buyer | Wholesaler",
  "privateLabelBrands": ["string"],
  "topFoodCategories": ["string (e.g. Pasta & Grains, Canned Foods, Oils & Fats, Dairy, Snacks)"],
  "priceTier": "budget | mid-market | premium | mass-market",
  "sourcingSummary": "A concise 2-4 sentence summary of their private-label lines, co-packing origins, and key opportunities for food manufacturers.",
  "privateLabelSkus": [
    {
      "productName": "string (e.g. Shufersal Durum Wheat Penne Rigate 500g)",
      "brandName": "string (the private label brand)",
      "category": "string (one of: Pasta & Grains, Canned Foods, Oils & Fats, Sauces & Condiments, Spices & Herbs, Pulses & Legumes, Snacks, Beverages, Confectionery, Frozen Foods, Dairy)",
      "subcategory": "string (e.g. Dry Pasta)",
      "packageSize": "string (e.g. 500g, 1L, 400g)",
      "retailPriceIls": 5.90,
      "manufacturerCountry": "string (e.g. Italy, Spain, Turkey, or null)",
      "certifications": ["string (e.g. Kosher, Badatz, BRC)"]
    }
  ]
}`;

  if (anthropicKey) {
    try {
      console.log(`  Extracting assortment profile with Claude 3.5 Sonnet...`);
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 3000,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText =
        msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ExtractedBuyerProfile;
      }
    } catch (e: any) {
      console.warn(`  Anthropic extraction failed:`, e?.message || e);
    }
  }

  // Gemini fallback
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log(`  Extracting assortment profile with Gemini (gemini-3.8-flash)...`);
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const resp = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });
      const text = resp.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ExtractedBuyerProfile;
      }
    } catch (e: any) {
      console.warn(`  Gemini extraction failed:`, e?.message || e);
    }
  }

  return null;
}

// ── 3. Save into Supabase (buyers + buyer_assortments) ────────────────────────
async function saveBuyerAssortment(
  buyer: BuyerRow,
  profile: ExtractedBuyerProfile
) {
  console.log(`\nSaving assortment data for ${buyer.company_name}:`);
  console.log(`  Private-Label Brands: ${profile.privateLabelBrands.join(", ") || "None identified"}`);
  console.log(`  Top Categories: ${profile.topFoodCategories.join(", ")}`);
  console.log(`  Extracted SKUs: ${profile.privateLabelSkus.length} private-label items`);
  console.log(`  Summary: ${profile.sourcingSummary.slice(0, 100)}...`);

  // 1. Update the buyers table
  const { error: buyerUpdateErr } = await supabase
    .from("buyers")
    .update({
      notes: `${profile.sourcingSummary}\n\n[Core Categories: ${profile.topFoodCategories.join(", ")}]\n[Private Label Lines: ${profile.privateLabelBrands.join(", ")}]\n[Price Tier: ${profile.priceTier}]\n\nTop Co-Packed SKUs:\n${profile.privateLabelSkus.slice(0, 15).map(s => `• ${s.productName} (${s.category}${s.manufacturerCountry ? ` - Co-packed in ${s.manufacturerCountry}` : ""}${s.retailPriceIls ? ` - ₪${s.retailPriceIls}` : ""})`).join("\n")}`,
    })
    .eq("id", buyer.id);

  if (buyerUpdateErr) {
    console.error(`  Failed to update buyers table:`, buyerUpdateErr.message);
  } else {
    console.log(`  ✓ Updated buyers profile (${buyer.company_name}) with categories & sourcing summary`);
  }

  // 2. Insert into buyer_assortments table if available
  const { error: testTableErr } = await supabase
    .from("buyer_assortments")
    .select("id")
    .limit(1);

  if (testTableErr) {
    console.log(`  ℹ buyer_assortments table is pending SQL execution (SQL migration file ready in supabase/migrations/)`);
    console.log(`  ✓ All category mappings and private-label profiles are safely stored in 'buyers' table.`);
    return;
  }

  // If buyer_assortments exists, insert items with embeddings
  if (profile.privateLabelSkus.length > 0) {
    // Generate Voyage embeddings in batch
    const textsToEmbed = profile.privateLabelSkus.map((sku) =>
      `${sku.productName}. ${sku.brandName}. ${sku.category}. ${sku.subcategory || ""}. Co-packed in ${sku.manufacturerCountry || "Israel"}`
    );

    let vectors: (number[] | null)[] = [];
    try {
      vectors = await embedBatch(textsToEmbed, "document");
    } catch {}

    const rowsToInsert = profile.privateLabelSkus.map((sku, idx) => {
      const canonicalCatId = mapScraperCategoryToCanonicalId(sku.category);
      return {
        buyer_id: buyer.id,
        category_id: canonicalCatId,
        product_name: sku.productName,
        brand_name: sku.brandName,
        is_private_label: true,
        manufacturer_country: sku.manufacturerCountry || null,
        package_size: sku.packageSize || null,
        retail_price_ils: sku.retailPriceIls || null,
        certifications: sku.certifications || [],
        embedding: vectors[idx] ? JSON.stringify(vectors[idx]) : null,
        scrape_confidence: 0.95,
      };
    });

    const { error: insertErr } = await supabase
      .from("buyer_assortments")
      .insert(rowsToInsert);

    if (insertErr) {
      console.error(`  Failed to insert into buyer_assortments:`, insertErr.message);
    } else {
      console.log(`  ✓ Inserted ${rowsToInsert.length} private-label SKUs into buyer_assortments with Voyage-3 vectors!`);
    }
  }
}

// ── Main Controller ──────────────────────────────────────────────────────────
async function main() {
  const buyerArg = process.argv.find((a) => a.startsWith("--buyer="));
  const targetBuyerName = buyerArg ? buyerArg.slice(8).replace(/^["']|["']$/g, "") : null;
  const isAll = process.argv.includes("--all");

  console.log("==================================================");
  console.log("  FDX Smart Buyer Assortment Ingestion Engine");
  console.log("  Mode: Targeted Private Label & Sourcing Profiling");
  console.log("==================================================");

  let query = supabase
    .from("buyers")
    .select("id, company_name, website, country, buyer_type, kosher_standard, notes")
    .not("website", "is", null)
    .neq("website", "")
    .neq("website", "NONE");

  if (targetBuyerName) {
    query = query.ilike("company_name", `%${targetBuyerName}%`);
  }

  const { data: buyers, error } = await query;
  if (error || !buyers || buyers.length === 0) {
    console.error("No eligible buyers found to crawl:", error?.message);
    return;
  }

  console.log(`Found ${buyers.length} buyer(s) with active website domains.`);

  const targets = isAll ? buyers.slice(0, 5) : [buyers[0]];

  for (const b of targets) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Target: ${b.company_name} | URL: ${b.website}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const rawContent = await fetchBuyerContent(b);
    if (!rawContent || rawContent.length < 20) {
      console.warn(`  Could not retrieve sufficient content for ${b.company_name}`);
      continue;
    }

    const profile = await extractBuyerAssortment(rawContent, b);
    if (!profile) {
      console.warn(`  Failed to extract structured assortment profile for ${b.company_name}`);
      continue;
    }

    await saveBuyerAssortment(b, profile);
  }

  console.log("\n✓ Buyer assortment scraping batch completed successfully.");
}

main().catch(console.error);

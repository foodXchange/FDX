import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ExtractedIntent {
  categories: string[];
  kosher_types: string[];
  certifications: string[];
  formats: string[];
  keywords: string[];
  private_label: boolean | null;
}

type ImageAnalysisInput = {
  product_name: string | null;
  category: string | null;
  packaging_format: string | null;
  certifications_visible: string[];
  sourcing_keywords: string[];
};

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  kosher_types: string[];
  certifications: string[];
  formats: string[];
  private_label: boolean;
  scrape_confidence: number;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
  } | null;
};

const SYSTEM_PROMPT = `You extract structured search intent from food sourcing queries for the Israeli kosher food market. Return only JSON.`;

const VALID_CATEGORIES = [
  "Oils & Fats",
  "Tomato Products",
  "Canned Foods",
  "Snacks",
  "Frozen Foods",
  "Bakery",
  "Pasta & Grains",
  "Sauces & Condiments",
  "Fish & Seafood",
  "Organic & Natural",
  "Spices & Herbs",
  "Beverages",
  "Dairy",
  "Pulses & Legumes",
  "Meat & Poultry",
  "Ingredients & Additives",
  "Other",
];

function scoreProduct(product: ProductRow, intent: ExtractedIntent, query: string): number {
  let score = 0;
  const nameLower = product.product_name.toLowerCase();
  const queryLower = query.toLowerCase();

  if (intent.categories.includes(product.category)) score += 10;
  for (const kw of intent.keywords) {
    if (nameLower.includes(kw.toLowerCase())) score += 8;
  }
  if (queryLower.split(" ").some((w) => nameLower.includes(w) && w.length > 3)) score += 4;
  for (const kt of intent.kosher_types) {
    if (product.kosher_types.some((k) => k.toLowerCase().includes(kt.toLowerCase()))) score += 5;
  }
  for (const cert of intent.certifications) {
    if (product.certifications.some((c) => c.toLowerCase().includes(cert.toLowerCase()))) score += 3;
  }
  for (const fmt of intent.formats) {
    if (product.formats.some((f) => f.toLowerCase().includes(fmt.toLowerCase()))) score += 2;
  }
  if (intent.private_label === true && product.private_label) score += 2;

  return score;
}

export async function POST(req: NextRequest) {
  let body: { query?: string; category?: string; imageAnalysis?: ImageAnalysisInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { query, category, imageAnalysis } = body;
  if (!query?.trim() && !imageAnalysis) {
    return NextResponse.json({ error: "Missing query or imageAnalysis" }, { status: 400 });
  }

  let intent: ExtractedIntent = {
    categories: category ? [category] : [],
    kosher_types: [],
    certifications: [],
    formats: [],
    keywords: query ? query.split(/\s+/).filter((w) => w.length > 3) : [],
    private_label: null,
  };

  // Step 1a — If image analysis provided, build intent directly (skip Claude)
  if (imageAnalysis) {
    intent = {
      categories:
        imageAnalysis.category && VALID_CATEGORIES.includes(imageAnalysis.category)
          ? [imageAnalysis.category]
          : category
          ? [category]
          : [],
      kosher_types: [],
      certifications: imageAnalysis.certifications_visible,
      formats: imageAnalysis.packaging_format ? [imageAnalysis.packaging_format] : [],
      keywords: [
        ...(imageAnalysis.product_name ? [imageAnalysis.product_name] : []),
        ...imageAnalysis.sourcing_keywords,
        ...(query?.split(/\s+/).filter((w) => w.length > 3) ?? []),
      ],
      private_label: null,
    };
  }

  // Step 1b — Claude intent extraction (only when no imageAnalysis)
  if (!imageAnalysis && process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extract intent from this sourcing query: '${query}'

Return JSON only:
{
  "categories": string[],
  "kosher_types": string[],
  "certifications": string[],
  "formats": string[],
  "keywords": string[],
  "private_label": boolean | null
}

categories must be from: ${VALID_CATEGORIES.join(", ")}`,
          },
        ],
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
      const parsed = JSON.parse(raw) as Partial<ExtractedIntent>;
      intent = {
        categories: category
          ? [category]
          : (parsed.categories ?? []).filter((c) => VALID_CATEGORIES.includes(c)),
        kosher_types: parsed.kosher_types ?? [],
        certifications: parsed.certifications ?? [],
        formats: parsed.formats ?? [],
        keywords: parsed.keywords ?? intent.keywords,
        private_label: parsed.private_label ?? null,
      };
    } catch {
      // Fall through to keyword-only search
    }
  }

  // Step 2 — Build Supabase query
  let q = supabaseAdmin
    .from("supplier_products")
    .select(
      `id, product_name, category, kosher_types, certifications, formats,
       private_label, scrape_confidence,
       supplier:supplier_offerings!inner(company_name, country_of_origin, status)`
    )
    .eq("is_published", true);

  if (intent.categories.length > 0) {
    q = q.in("category", intent.categories);
  }
  if (intent.private_label === true) {
    q = q.eq("private_label", true);
  }
  if (intent.keywords.length > 0) {
    const keywordFilter = intent.keywords
      .slice(0, 5) // limit to avoid too-complex queries
      .map((k) => `product_name.ilike.%${k}%`)
      .join(",");
    q = q.or(keywordFilter);
  }

  const { data } = await q
    .order("scrape_confidence", { ascending: false })
    .limit(20);

  const products = (data ?? []) as unknown as ProductRow[];

  // Step 3 — Score and sort
  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(p, intent, query ?? "") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.product);

  // Determine category suggestion
  const categoryCounts: Record<string, number> = {};
  for (const p of scored) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }
  const dominantCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const category_suggestion =
    dominantCategory && dominantCategory !== category ? dominantCategory : null;

  return NextResponse.json({ ok: true, results: scored, intent, category_suggestion });
}

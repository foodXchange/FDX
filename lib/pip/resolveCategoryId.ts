import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Canonical 21-leaf taxonomy — the ONLY ids the classifier may return.
// Never query product_categories for this list; the whitelist is authoritative.
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

// Reverse lookup: id → name
const ID_TO_NAME = Object.fromEntries(
  Object.entries(CANONICAL_LEAVES).map(([name, id]) => [id, name])
);

const CANONICAL_IDS = new Set(Object.values(CANONICAL_LEAVES));

const SYSTEM_PROMPT = `You are a strict product classification engine for a B2B food sourcing platform.
Assign each product to EXACTLY ONE category id from the allowed list, or to
"unclassified". Never guess by closest match.

Conflict rules (apply exactly):
- Chocolate / chocolate-coated / spreads -> Confectionery & Chocolate
- Plain biscuits, cookies -> Sweet Biscuits & Bars
- Savory crackers, pretzels, chips -> Savory Snacks & Cereals
- Honey, syrups, sugar, sweetener solutions -> Sugars & Sweeteners
- Canned/preserved tomato (chopped, diced, paste, peeled) -> Tomato Products
- Tomato sauce / ketchup / pasta sauce / mayonnaise / dressings / mustard -> Specialty Sauces & Condiments
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

async function classifyWithLLM(rawText: string): Promise<{
  category_id: string | null;
  category_name: string | null;
}> {
  const leafList = Object.entries(CANONICAL_LEAVES)
    .map(([name, id]) => `- "${name}" (id: ${id})`)
    .join("\n");

  const userPrompt = `Product/category text: "${rawText}"

Allowed categories:
${leafList}

Output STRICT JSON only:
{"category_id":"<id or 'unclassified'>","confidence":"high|medium|low","reason":"<short>"}`;

  let raw = "";
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      });
      raw = (response.text ?? "").trim();
    } catch {
      raw = "";
    }
  }

  if (!raw && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      const block = response.content[0];
      raw = block?.type === "text" ? block.text : "";
    } catch {
      return { category_id: null, category_name: null };
    }
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { category_id: null, category_name: null };

  let parsed: { category_id?: string; confidence?: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { category_id: null, category_name: null };
  }

  const returnedId = parsed.category_id ?? "";
  const confidence = parsed.confidence ?? "low";

  // Reject: unclassified signal, low confidence, or id not in our whitelist
  if (
    returnedId === "unclassified" ||
    confidence === "low" ||
    !CANONICAL_IDS.has(returnedId)
  ) {
    return { category_id: null, category_name: null };
  }

  return {
    category_id: returnedId,
    category_name: ID_TO_NAME[returnedId] ?? null,
  };
}

export async function resolveCategoryId(rawText: string): Promise<{
  category_id: string | null;
  category_name: string | null;
}> {
  if (!rawText.trim()) return { category_id: null, category_name: null };
  return classifyWithLLM(rawText);
}

// Exported for use in reclassification scripts.
export { CANONICAL_LEAVES, CANONICAL_IDS, ID_TO_NAME };

const SCRAPER_CATEGORY_MAP: Record<string, string> = {
  "Sauces & Condiments": CANONICAL_LEAVES["Specialty Sauces & Condiments"],
  "Specialty Sauces & Condiments": CANONICAL_LEAVES["Specialty Sauces & Condiments"],
  "Snacks": CANONICAL_LEAVES["Savory Snacks & Cereals"],
  "Savory Snacks & Cereals": CANONICAL_LEAVES["Savory Snacks & Cereals"],
  "Nuts & Dried Fruit": CANONICAL_LEAVES["Savory Snacks & Cereals"],
  "Biscuits & Confectionery": CANONICAL_LEAVES["Sweet Biscuits & Bars"],
  "Sweet Biscuits & Bars": CANONICAL_LEAVES["Sweet Biscuits & Bars"],
  "Confectionery & Chocolate": CANONICAL_LEAVES["Confectionery & Chocolate"],
  "Oils & Fats": CANONICAL_LEAVES["Fats, Oils & Spreads"],
  "Fats, Oils & Spreads": CANONICAL_LEAVES["Fats, Oils & Spreads"],
  "Spreads & Nut Butters": CANONICAL_LEAVES["Fats, Oils & Spreads"],
  "Canned Goods": CANONICAL_LEAVES["Canned & Preserved Goods"],
  "Canned & Preserved Goods": CANONICAL_LEAVES["Canned & Preserved Goods"],
  "Canned Vegetables & Pulses": CANONICAL_LEAVES["Canned Vegetables & Pulses"],
  "Pickles & Olives": CANONICAL_LEAVES["Canned Vegetables & Pulses"],
  "Tomato Products": CANONICAL_LEAVES["Tomato Products"],
  "Beverages": CANONICAL_LEAVES["Beverages (Non-Alcoholic)"],
  "Beverages (Non-Alcoholic)": CANONICAL_LEAVES["Beverages (Non-Alcoholic)"],
  "Dairy & Alternatives": CANONICAL_LEAVES["Dairy Products & Analogues"],
  "Dairy Products & Analogues": CANONICAL_LEAVES["Dairy Products & Analogues"],
  "Dairy-Free Desserts": CANONICAL_LEAVES["Dairy-Free Desserts"],
  "Frozen Foods": CANONICAL_LEAVES["Prepared Meals (Frozen & Shelf-Stable)"],
  "Prepared Meals (Frozen & Shelf-Stable)": CANONICAL_LEAVES["Prepared Meals (Frozen & Shelf-Stable)"],
  "Grains, Rice & Pulses": CANONICAL_LEAVES["Breakfast Cereals"],
  "Breakfast Cereals": CANONICAL_LEAVES["Breakfast Cereals"],
  "Pasta & Noodles": CANONICAL_LEAVES["Pasta/Noodles"],
  "Pasta/Noodles": CANONICAL_LEAVES["Pasta/Noodles"],
  "Bakery & Bread": CANONICAL_LEAVES["Bakery & Bread Products"],
  "Bakery & Bread Products": CANONICAL_LEAVES["Bakery & Bread Products"],
  "Spices & Seasonings": CANONICAL_LEAVES["Herbs"],
  "Herbs": CANONICAL_LEAVES["Herbs"],
  "Honey & Sweeteners": CANONICAL_LEAVES["Sugars & Sweeteners"],
  "Sugars & Sweeteners": CANONICAL_LEAVES["Sugars & Sweeteners"],
  "Meat & Poultry": CANONICAL_LEAVES["Raw Meat & Poultry"],
  "Raw Meat & Poultry": CANONICAL_LEAVES["Raw Meat & Poultry"],
  "Seafood": CANONICAL_LEAVES["Fresh & Frozen Fish"],
  "Fresh & Frozen Fish": CANONICAL_LEAVES["Fresh & Frozen Fish"],
  "Baking Ingredients": CANONICAL_LEAVES["Ingredients & Additives"],
  "Ingredients & Additives": CANONICAL_LEAVES["Ingredients & Additives"],
  "Baby Food": CANONICAL_LEAVES["Prepared Meals (Frozen & Shelf-Stable)"],
  "Health & Functional Foods": CANONICAL_LEAVES["Plant-Based Proteins"],
  "Plant-Based Proteins": CANONICAL_LEAVES["Plant-Based Proteins"],
};

export function mapScraperCategoryToCanonicalId(category?: string | null): string | null {
  if (!category) return null;
  return SCRAPER_CATEGORY_MAP[category.trim()] ?? null;
}

// Looks up the Unclassified category id from the DB (used in reclass scripts).
export async function getUnclassifiedId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("product_categories")
    .select("id")
    .eq("name", "Unclassified")
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}


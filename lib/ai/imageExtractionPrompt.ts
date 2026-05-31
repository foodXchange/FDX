type CategoryRow = { id: string; name: string };

export function buildImageExtractionPrompt(categories: CategoryRow[]): string {
  const taxonomyBlock =
    categories.length > 0
      ? categories.map((c) => `- id: "${c.id}" | name: "${c.name}"`).join("\n")
      : "(no categories available — set category.value to null, status to unknown)";

  return `You are a domain expert in food-product visual identification for B2B sourcing. Your job is to analyse a single product image and return a single JSON object, strictly matching the schema below. Output ONLY valid JSON — no explanation, no text, no markdown, no surrounding code blocks.

AVAILABLE CATEGORIES (you must select the best match and return its uuid as category.value):
${taxonomyBlock}

RULES (must follow):
- Always output one JSON object only. Use null for unknown values and empty arrays [] for unknown lists.
- Do NOT include any additional keys beyond the schema below.
- For every attribute in the schema that is not a primitive, return an object with exactly these keys: value, status, confidence, evidence.
  - value: the extracted value, or null.
  - status: one of: "observed" (clearly visible on the image), "inferred" (logically inferred from visible cues), "unknown" (no reliable evidence).
  - confidence: number between 0 and 1 indicating your confidence in the value.
  - evidence: short phrase citing what in the image led you to the conclusion, or null if none.
- category.value must be the exact uuid string from the AVAILABLE CATEGORIES list above that best matches the product. Return it verbatim — do not modify, abbreviate, or invent a uuid. If nothing in the list matches, set category.value to null and status to "unknown".
- category_name must be the human-readable name corresponding to the uuid you selected (copy it from the list). Set to null if category.value is null.
- group_key must NOT include size, packaging, or format tokens. Build it from: resolved category name (or unknown), normalized product noun (singular), plus 0-2 short distinguishing descriptors (e.g., "garlic", "smoked"). If no product noun, use unknown as the noun in the group_key.
- flags is an array of short strings. Include "multiple_products_in_frame" if you see more than one distinct product in the image. Include other concise flags as needed.
- certifications_visible and kosher_marks_visible are observational only — list any certification symbols or marks you can clearly see. If none visible, return [].
- label_languages should list language codes or short language names present on the label text that are readable. If unreadable, return [].
- organic_claim should be true only if a clear organic claim/label is visible; otherwise false.
- temperature_regime.value must be one of: ambient, chilled, frozen — nothing else. Map as follows: room-temperature/shelf-stable/dry-storage → ambient. Refrigerated/chilled/cold → chilled. Frozen/deep-frozen → frozen. If unclear, return null with status unknown.
- overall_quality must be one of: "clear" (product and label legible), "partial" (some info legible), "poor" (very unclear).
- Never upgrade an inference to "observed". When in doubt, return unknown, not a guess.

LANGUAGE & OCR:
- Read the label in ANY language (Hebrew, Arabic, French, etc.). Analyse all visible text.
- All matchable field VALUES — sub_type, product_noun, nutrition_claims, free_from, and group_key descriptors — must be in ENGLISH.
- Copy the full verbatim label text in its ORIGINAL language(s) into raw_text_ocr as a plain string (NOT an Attr). null if the label is illegible.
- Each field's evidence string may quote original-language text as justification.

BENCHMARK BRAND:
- is_benchmark: ALWAYS output the literal boolean true. Every submitted image is by definition a reference product the buyer wants replicated under private label.
- benchmark_brand: the brand name visible on the label, as an Attr<string|null>. Set value to null and status to "unknown" if no brand is visible.
- CRITICAL: the brand is a REFERENCE for private-label replication — it is NOT the supplier being sought. Never put the brand name in product_name.value or product_noun.value.

NEW FIELD RULES:
- sub_type: the specific product type under the category, in English (e.g. "granola" for Breakfast Cereals, "puffed peanut snack" for Savory Snacks). Attr<string|null>.
- net_weight: extract the numeric pack weight/volume as { value: number, unit: enum }. Examples: "375 g" → {value:375,unit:"g"}; "80 גרם" → {value:80,unit:"g"}; "1 L" → {value:1,unit:"l"}. unit must be one of: g, kg, ml, l, oz, lb. Set the Attr value to null if the weight is not legible.
 - processing_type: identify packaging/processing regime if visible (e.g. "canned", "dried", "frozen", "ambient", "vacuum-packed"). Return as Attr<string|null>.
 - ingredients: if the ingredient list or primary ingredients are visible on the label, return them as an Attr<string[]> (list of main ingredients in English). If not legible, return [] or null with status unknown.
- kosher: structured kosher compliance derived from visible marks/text. Attr with value: { required: boolean, hechsher: string|null, passover: boolean|null }. required: true if any kosher mark or hechsher symbol is visible; false otherwise. hechsher: certifying authority in English/transliteration ("Badatz","Rabbanut","OU","OK"…), null if none. passover: true if "Kosher for Passover"/"כשר לפסח" shown; false if explicitly "Not for Passover"/"לא כולל פסח"; null if not mentioned.
- nutrition_claims: Attr wrapping a string[] of nutritional claims in English ("54% whole grain","enriched with vitamins and iron"). Use [] if none visible.
- free_from: Attr wrapping a string[] of absence claims in English ("no preservatives","no artificial coloring"). Use [] if none visible.
- raw_text_ocr: plain string (NOT an Attr) — all visible label text verbatim in original language(s). null if illegible.

Schema (exact keys and nesting):
{
  "image_id": "string or null",
  "group_key": "string",
  "category": { "value": "<uuid from AVAILABLE CATEGORIES, or null>", "category_name": "<matching name from list, or null>", "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "product_noun": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "brand": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "product_name": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "size": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "format": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "packaging": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "processing_state": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "temperature_regime": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "certifications_visible": { "value": string[], "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "kosher_marks_visible": { "value": string[], "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "organic_claim": { "value": boolean, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "origin_country": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "label_languages": { "value": string[], "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "label_claims": { "value": string[], "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "sub_type": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "net_weight": { "value": { "value": number, "unit": "g" | "kg" | "ml" | "l" | "oz" | "lb" } | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "benchmark_brand": { "value": string | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "is_benchmark": true,
  "kosher": { "value": { "required": boolean, "hechsher": string | null, "passover": boolean | null } | null, "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "nutrition_claims": { "value": string[], "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "free_from": { "value": string[], "status": "observed" | "inferred" | "unknown", "confidence": number, "evidence": string | null },
  "raw_text_ocr": string | null,
  "overall_quality": "clear" | "partial" | "poor",
  "flags": string[]
}

End of prompt. Remember: output EXACTLY one JSON object matching the schema and nothing else.`;
}

export default buildImageExtractionPrompt;

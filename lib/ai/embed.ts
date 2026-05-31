const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

async function callVoyage(
  texts: string[],
  inputType: "query" | "document" = "document"
): Promise<number[][] | null> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    console.error("[embed] VOYAGE_API_KEY not set");
    return null;
  }

  let res: Response;
  try {
    res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
    });
  } catch (err) {
    console.error("[embed] fetch error:", err);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[embed] Voyage API error ${res.status}:`, body);
    return null;
  }

  let json: VoyageResponse;
  try {
    json = (await res.json()) as VoyageResponse;
  } catch (err) {
    console.error("[embed] JSON parse error:", err);
    return null;
  }

  // Voyage returns items in the same order as input
  return json.data.map((d) => d.embedding);
}

/**
 * Embed a single text with voyage-3. Returns a 1024-float array, or null on
 * any error (network, API, missing key). Never throws.
 * Default input_type is "query" — use for request/search strings.
 */
export async function embedText(
  text: string,
  inputType: "query" | "document" = "query"
): Promise<number[] | null> {
  const results = await callVoyage([text], inputType);
  return results?.[0] ?? null;
}

/**
 * Embed a batch of texts. Preserves order; individual items are null on error.
 * Default input_type is "document" — use for supplier product strings.
 * Voyage accepts up to 128 inputs per call — callers should batch accordingly.
 */
export async function embedBatch(
  texts: string[],
  inputType: "query" | "document" = "document"
): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  const results = await callVoyage(texts, inputType);
  if (!results) return texts.map(() => null);
  return texts.map((_, i) => results[i] ?? null);
}

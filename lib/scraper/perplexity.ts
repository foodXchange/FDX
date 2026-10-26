import { GoogleGenAI } from "@google/genai";
import { generateGeminiWithFallback } from "@/lib/ai/models";

interface PerplexityResult {
  content: string;
  sources: string[];
}

export async function researchSupplier(
  companyName: string,
  website: string,
  country: string | null
): Promise<PerplexityResult> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt =
        `Food manufacturer company profile: ${companyName} (${website}) ` +
        `${country ? `based in ${country}` : ""}.\n\n` +
        `Find and list:\n` +
        `1. What specific food products they manufacture (e.g. canned chopped tomatoes, pasta, olive oil)\n` +
        `2. Packaging formats, sizes, and Brix levels (e.g. Tin 400g, 2.5kg, Drum 200kg, 28-30% Brix)\n` +
        `3. Quality and dietary certifications (BRC, IFS, ISO, Kosher, Halal, Organic/Bio)\n` +
        `4. Production facilities / factory locations and export markets\n` +
        `5. Private label capabilities and company contact details.\n` +
        `Check their official website, LinkedIn, Europages, Kompass, and food trade directories.`;

      const { text } = await generateGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            "You are a B2B food industry research analyst. Provide detailed, factual, and accurate " +
            "information about food manufacturers with specific formats, sizes, and certifications.",
          tools: [{ googleSearch: {} }],
        },
      });

      if (text.trim().length > 150) {
        return {
          content: text,
          sources: [],
        };
      }
    } catch {
      // Search Grounding quota or network unavailable; silently return empty
    }
  }

  // Fallback to Perplexity API if configured and working
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) {
    return { content: "", sources: [] };
  }

  const query =
    `Food manufacturer company profile: ${companyName} (${website}) ` +
    `${country ? `based in ${country}` : ""}. ` +
    `Find: what food products they manufacture, their certifications (BRC, IFS, HACCP, ` +
    `ISO 22000, kosher, halal, organic), production facilities, export markets, ` +
    `contact details, private label capability. Focus on products with formats and sizes. ` +
    `Check their website, LinkedIn, Europages, Kompass, food industry directories.`;

  try {
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
              "You are a food industry research analyst. Provide detailed, accurate " +
              "information about food manufacturers. Focus on products, certifications, " +
              "and export capability. Be specific about formats, sizes, and standards.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        return_citations: true,
        search_recency_filter: "month",
      }),
    });

    if (!response.ok) {
      console.warn(`Perplexity API error: ${response.status}`);
      return { content: "", sources: [] };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      citations?: string[];
    };

    return {
      content: data.choices?.[0]?.message?.content ?? "",
      sources: data.citations ?? [],
    };
  } catch (err) {
    console.warn("Perplexity research failed:", err);
    return { content: "", sources: [] };
  }
}

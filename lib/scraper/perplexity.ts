interface PerplexityResult {
  content: string;
  sources: string[];
}

export async function researchSupplier(
  companyName: string,
  website: string,
  country: string | null
): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

  const query =
    `Food manufacturer company profile: ${companyName} (${website}) ` +
    `${country ? `based in ${country}` : ""}. ` +
    `Find: what food products they manufacture, their certifications (BRC, IFS, HACCP, ` +
    `ISO 22000, kosher, halal, organic), production facilities, export markets, ` +
    `contact details, private label capability. Focus on products with formats and sizes. ` +
    `Check their website, LinkedIn, Europages, Kompass, food industry directories.`;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
  };

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    sources: data.citations ?? [],
  };
}

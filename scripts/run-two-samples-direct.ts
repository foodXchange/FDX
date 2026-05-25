import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import IMAGE_EXTRACTION_PROMPT from "@/lib/ai/imageExtractionPrompt";

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in environment — cannot run LLM.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const samples = [
    {
      name: "Meshek Achiya olive oil 750ml",
      url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/1779649953704-dh0ckiv3xec.webp",
    },
    {
      name: "Jahshan olive oil",
      url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/1779649961850-l4z4folcu1l.jpg",
    },
  ];

  for (const s of samples) {
    console.log(`\n--- ${s.name} ---`);
    const userPrompt = `${IMAGE_EXTRACTION_PROMPT}\n\nImage URL: ${s.url}`;

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
        system: "You are a food-product visual extraction assistant. Output only the JSON requested by the user and nothing else.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: s.url } },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      });

      const raw = response.content?.[0]?.type === "text" ? response.content[0].text.trim() : "";
      console.log(raw);
    } catch (e) {
      console.error("LLM call failed:", e);
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

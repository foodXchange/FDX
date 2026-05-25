import "dotenv/config";
import { extractImage } from "@/lib/ai/extractImage";

// All fixture images with valid URLs but null ai_analysis.
// Run this once to populate ai_analysis so grouping tests don't call the LLM live.
const fixtures = [
  // distinct-products fixture
  { imageId: "8faf4e21-b415-4836-8e9a-21086b89a66d", url: "https://www.pizohaizion.co.il/wp-content/uploads/2021/02/38000138416.jpg" },
  { imageId: "d06b30b1-23f7-40f5-b695-1c2912b1182c", url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/choco.webp" },
  // two-sizes fixture (second image — now has real URL)
  { imageId: "038d4c24-3b55-46fe-893b-e6bc8196a5fa", url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/olive500.webp" },
  // ambiguous pair fixture (sunflower oil vs olive oil — different product_noun, same category)
  { imageId: "31494966-9aa6-454f-b0d8-d1cbca30505c", url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/sunflower.jpg" },
  { imageId: "f687058b-4bce-4d69-a249-89f5818a5a77", url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/olive500.webp" },
];

async function run() {
  for (const f of fixtures) {
    console.log(`\nExtracting ${f.imageId}...`);
    const out = await extractImage({ imageUrl: f.url, imageId: f.imageId }); // dryRun OFF — must persist
    if (out) {
      console.log(`  group_key: ${out.group_key}`);
      console.log(`  category:  ${out.category?.category_name} (${out.category?.value})`);
      console.log(`  noun:      ${out.product_noun?.value}`);
      console.log(`  flags:     ${out.flags?.join(", ") || "none"}`);
    } else {
      console.log("  FAILED — null returned");
    }
  }
  console.log("\nDone. ai_analysis persisted to request_images for all successful extractions.");
}

run().catch((e) => { console.error(e); process.exit(1); });

import "dotenv/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const IMAGE_IDS = [
  // two-sizes fixture
  "a05f8cf1-834b-44a5-94fe-798bf6e48e9b",
  "038d4c24-3b55-46fe-893b-e6bc8196a5fa",
  // distinct-products fixture
  "8faf4e21-b415-4836-8e9a-21086b89a66d",
  "d06b30b1-23f7-40f5-b695-1c2912b1182c",
  // ambiguous-pair fixture (fetch by request_id)
];

async function run() {
  const { data, error } = await supabaseAdmin
    .from("request_images")
    .select("id, url, ai_analysis")
    .in("id", IMAGE_IDS);

  if (error) { console.error("Error:", error); return; }

  for (const img of data ?? []) {
    const hasHttp = (img.url as string)?.startsWith("http://");
    const hasAnalysis = img.ai_analysis !== null;
    console.log(`${img.id}:`);
    console.log(`  url: ${img.url}`);
    console.log(`  protocol: ${hasHttp ? "HTTP ✗" : "HTTPS ✓"}`);
    console.log(`  ai_analysis: ${hasAnalysis ? "present" : "null"}`);
  }

  // Also fetch ambiguous pair images
  const { data: ambig } = await supabaseAdmin
    .from("request_images")
    .select("id, url, ai_analysis")
    .eq("request_id", "857fc730-7453-4fde-b64f-76bd90aee87b");

  console.log("\nAmbiguous pair images:");
  for (const img of ambig ?? []) {
    const hasAnalysis = img.ai_analysis !== null;
    console.log(`  ${img.id}: ${img.url} | analysis: ${hasAnalysis ? "present" : "null"}`);
  }
}

run().catch(console.error);

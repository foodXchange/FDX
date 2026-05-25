import "dotenv/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { groupImages } from "@/lib/pip/groupImages";

// Fixture request IDs with existing v2 PIPs to backfill
const FIXTURE_REQUESTS = [
  "8e21a27c-dadd-47db-89e0-d8b768ef0349", // two-sizes olive oil (primary end-to-end target)
  "8bc8fe72-285a-45fb-903b-10903517abda", // distinct products
  "857fc730-7453-4fde-b64f-76bd90aee87b", // ambiguous pair
];

async function run() {
  // Also include vacuum-veg fixture if its request_id exists
  const { data: vacuumVegReq } = await supabaseAdmin
    .from("request_images")
    .select("request_id")
    .eq("id", "a162fd0f-d71c-48f8-b58d-870f9e24d5d2")
    .maybeSingle();

  const allRequests = [
    ...FIXTURE_REQUESTS,
    ...(vacuumVegReq?.request_id ? [vacuumVegReq.request_id as string] : []),
  ];

  console.log(`\nBackfilling data_json for ${allRequests.length} fixture v2 PIPs...\n`);

  for (const reqId of allRequests) {
    console.log(`── ${reqId}`);
    const result = await groupImages(reqId);
    console.log(`   pip_ids: ${result.pip_ids.join(", ")}`);
    console.log(`   needs_review: ${result.needs_review}`);
    console.log(`   conflicts: ${result.grouping_decision.flags.join(", ") || "none"}`);
  }

  console.log("\nBackfill complete. All fixture v2 PIPs have populated data_json.");
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

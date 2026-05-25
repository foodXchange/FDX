/**
 * Validates match_v3 by comparing its output to match_v2 on three requests:
 *   1. A v1-only request (no v2 PIP) — must produce byte-for-byte identical results
 *   2. 8e21a27c-dadd-47db-89e0-d8b768ef0349 — has a v2 PIP; scores may differ
 *   3. 8bc8fe72-285a-45fb-903b-10903517abda — has 2 v2 PIPs; LIMIT 1 applies
 *
 * Does NOT write to the DB — calls RPC functions directly.
 * Run: npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/validate-match-v3.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MatchRow = {
  supplier_id: string;
  product_id: string;
  product_name: string;
  company_name: string;
  country: string | null;
  score: number;
  breakdown: Record<string, number>;
  summary: string;
};

async function callRpc(fn: "match_v2" | "match_v3", requestId: string): Promise<MatchRow[]> {
  const { data, error } = await supabase.rpc(fn, {
    request_uuid: requestId,
    limit_n: 30,
  });
  if (error) throw new Error(`${fn} error for ${requestId}: ${error.message}`);
  return (data ?? []) as MatchRow[];
}

function sortById(rows: MatchRow[]): MatchRow[] {
  return [...rows].sort((a, b) => a.supplier_id.localeCompare(b.supplier_id));
}

function top3(rows: MatchRow[]): string {
  return rows
    .slice(0, 3)
    .map((r) => `${r.company_name} (${r.score})`)
    .join(", ") || "(none)";
}

async function findV1OnlyRequest(): Promise<string | null> {
  // Find a request that has intent_json but no v2 PIP
  const { data: requests } = await supabase
    .from("sourcing_requests")
    .select("id")
    .not("intent_json", "is", null)
    .limit(50);

  if (!requests?.length) return null;

  for (const req of requests) {
    const { data: pip } = await supabase
      .from("pips")
      .select("id")
      .eq("sourcing_request_id", req.id)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .limit(1)
      .maybeSingle();

    if (!pip) return req.id;
  }
  return null;
}

async function compare(label: string, requestId: string, expectIdentical: boolean) {
  console.log(`\n── ${label} (${requestId})`);

  const [v2rows, v3rows] = await Promise.all([
    callRpc("match_v2", requestId),
    callRpc("match_v3", requestId),
  ]);

  console.log(`  match_v2: ${v2rows.length} results, top 3: ${top3(v2rows)}`);
  console.log(`  match_v3: ${v3rows.length} results, top 3: ${top3(v3rows)}`);

  if (expectIdentical) {
    const v2sorted = JSON.stringify(sortById(v2rows));
    const v3sorted = JSON.stringify(sortById(v3rows));
    if (v2sorted === v3sorted) {
      console.log(`  PASS  Byte-for-byte identical (${v2rows.length} suppliers, sorted by supplier_id)`);
    } else {
      console.log(`  FAIL  Results differ — v1-only request should be identical`);

      // Show which suppliers appear in one but not the other
      const v2ids = new Set(v2rows.map((r) => r.supplier_id));
      const v3ids = new Set(v3rows.map((r) => r.supplier_id));
      const onlyV2 = v2rows.filter((r) => !v3ids.has(r.supplier_id)).map((r) => r.company_name);
      const onlyV3 = v3rows.filter((r) => !v2ids.has(r.supplier_id)).map((r) => r.company_name);
      if (onlyV2.length) console.log(`    only in v2: ${onlyV2.join(", ")}`);
      if (onlyV3.length) console.log(`    only in v3: ${onlyV3.join(", ")}`);

      // Show score differences for common suppliers
      for (const v2row of v2rows) {
        const v3row = v3rows.find((r) => r.supplier_id === v2row.supplier_id);
        if (v3row && v3row.score !== v2row.score) {
          console.log(`    ${v2row.company_name}: v2=${v2row.score} v3=${v3row.score}`);
        }
      }
    }
  } else {
    // Check if v3 used a category_id that v2 didn't
    const v2top = v2rows[0];
    const v3top = v3rows[0];
    if (v2top && v3top && v2top.supplier_id !== v3top.supplier_id) {
      console.log(
        `  INFO  Top supplier changed: v2="${v2top.company_name}" → v3="${v3top.company_name}" (expected if image drove better category match)`
      );
    } else if (v2top && v3top && v2top.score !== v3top.score) {
      console.log(
        `  INFO  Top score changed: v2=${v2top.score} → v3=${v3top.score}`
      );
    } else {
      console.log(`  INFO  Results comparable (may differ in ordering or scores)`);
    }
  }
}

async function main() {
  console.log("=== match_v3 validation ===\n");

  // 1. Find a v1-only request
  const v1OnlyId = await findV1OnlyRequest();
  if (!v1OnlyId) {
    console.log("WARNING: Could not find a v1-only request — skipping identical check");
  } else {
    await compare("v1-only request", v1OnlyId, true);
  }

  // 2. Request with a v2 PIP (two-sizes olive oil)
  await compare(
    "v2 PIP request (olive oil)",
    "8e21a27c-dadd-47db-89e0-d8b768ef0349",
    false
  );

  // 3. Request with 2 v2 PIPs (LIMIT 1 applies)
  await compare(
    "2-PIP request",
    "8bc8fe72-285a-45fb-903b-10903517abda",
    false
  );

  console.log("\n=== done ===");
  console.log("NEXT: confirm results, then switch matching/run/route.ts to runMatchV3.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

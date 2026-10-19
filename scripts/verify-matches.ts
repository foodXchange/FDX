import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { count: assortCount } = await supabase.from("buyer_assortments").select("*", { count: "exact", head: true });
  const { count: matchCount } = await supabase.from("assortment_matches").select("*", { count: "exact", head: true });
  console.log(`\n=== SUPABASE LIVE STATS ===`);
  console.log(`buyer_assortments: ${assortCount} rows`);
  console.log(`assortment_matches: ${matchCount} rows`);

  const { data: sampleMatches } = await supabase
    .from("assortment_matches")
    .select("match_score, pitch_angle, potential_margin_gain, buyer_assortments(product_name), supplier_offerings(company_name, country_of_origin)")
    .order("match_score", { ascending: false })
    .limit(5);

  console.log("\n=== TOP LIVE MATCH CARDS IN DATABASE ===");
  for (const m of sampleMatches as any[]) {
    console.log(`[Score: ${m.match_score}%] Target: "${m.buyer_assortments?.product_name}"`);
    console.log(`  -> Supplier: ${m.supplier_offerings?.company_name} (${m.supplier_offerings?.country_of_origin || "Global"})`);
    console.log(`  -> Pitch: ${m.pitch_angle}`);
    console.log(`  -> Margin Gain: ${m.potential_margin_gain}\n`);
  }
}

main().catch(console.error);

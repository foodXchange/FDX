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

async function check() {
  console.log("Checking Supabase tables status...");
  const [bAssort, aMatches, rTrends] = await Promise.all([
    supabase.from("buyer_assortments").select("id").limit(1),
    supabase.from("assortment_matches").select("id").limit(1),
    supabase.from("retail_trends").select("id").limit(1),
  ]);

  const results = {
    buyer_assortments: bAssort.error ? `NOT_FOUND (${bAssort.error.message})` : "READY (Active)",
    assortment_matches: aMatches.error ? `NOT_FOUND (${aMatches.error.message})` : "READY (Active)",
    retail_trends: rTrends.error ? `NOT_FOUND (${rTrends.error.message})` : "READY (Active)",
  };

  console.log(JSON.stringify(results, null, 2));

  const allReady = !bAssort.error && !aMatches.error && !rTrends.error;
  return allReady;
}

check().catch(console.error);

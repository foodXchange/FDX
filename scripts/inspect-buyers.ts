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
  const [buyersRes, buyerCompaniesRes] = await Promise.all([
    supabase.from("buyers").select("*"),
    supabase.from("buyer_companies").select("*"),
  ]);

  const buyers = buyersRes.data ?? [];
  const buyerCompanies = buyerCompaniesRes.data ?? [];

  console.log(`Total buyers: ${buyers.length}`);
  console.log(`Total buyer_companies: ${buyerCompanies.length}`);

  const bcMap = new Map<string, any>();
  for (const bc of buyerCompanies) {
    bcMap.set(bc.company_name.toLowerCase().trim(), bc);
  }

  console.log("\n=== BUYER MATCHING & WEBSITE STATUS ===");
  for (const b of buyers) {
    const norm = b.company_name.toLowerCase().trim();
    const bc = bcMap.get(norm);
    const site = b.website || bc?.website || "NONE";
    console.log(`[${site !== "NONE" ? "HAS SITE" : "NO SITE"}] ${b.company_name} => ${site}`);
  }

  console.log("\n=== BUYER_COMPANIES NOT IN BUYERS TABLE ===");
  const buyersSet = new Set(buyers.map((b) => b.company_name.toLowerCase().trim()));
  for (const bc of buyerCompanies) {
    const norm = bc.company_name.toLowerCase().trim();
    if (!buyersSet.has(norm)) {
      console.log(`- ${bc.company_name} => ${bc.website ?? "NONE"}`);
    }
  }
}

main().catch(console.error);

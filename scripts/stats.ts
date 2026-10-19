import { readFileSync } from "fs";
import { resolve } from "path";

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

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, count, error } = await supabase
    .from("supplier_offerings")
    .select("id, company_name, sector, business_role, taxonomy_category, country_of_origin, website, offerings_summary, capabilities, contact_email, contact_phone, logo_url", { count: "exact" })
    .or("sector.neq.food_beverage,supplier_type.eq.non_food");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Total non-food companies with or query:", count);
}

main().catch(console.error);

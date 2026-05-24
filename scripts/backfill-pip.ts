// Run: npx tsx scripts/backfill-pip.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { buildPipV1, type SourcingRequestInput } from "../lib/pip/buildPipV1";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CategoryRow = { id: string; name: string };

async function resolveCategoryId(rawText: string): Promise<{
  category_id: string | null;
  category_name: string | null;
}> {
  if (!rawText.trim()) return { category_id: null, category_name: null };

  const { data } = await supabase.from("product_categories").select("id, name");
  if (!data || data.length === 0) return { category_id: null, category_name: null };

  const rows = data as CategoryRow[];
  const needle = rawText.toLowerCase().trim();

  const exact = rows.find((r) => r.name.toLowerCase() === needle);
  if (exact) return { category_id: exact.id, category_name: exact.name };

  const contains = rows.find(
    (r) =>
      r.name.toLowerCase().includes(needle) ||
      needle.includes(r.name.toLowerCase())
  );
  if (contains) return { category_id: contains.id, category_name: contains.name };

  return { category_id: null, category_name: null };
}

async function main() {
  console.log("Fetching sourcing requests with no PIP...");

  const { data: rows, error } = await supabase
    .from("sourcing_requests")
    .select(
      "id, product_name, message, category, certifications, target_market, private_label, ai_analysis, intent_json"
    )
    .is("intent_json", null);

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No requests need backfilling.");
    return;
  }

  console.log(`Found ${rows.length} requests to backfill.`);

  let processed = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const input: SourcingRequestInput = {
        product_name: row.product_name ?? null,
        message: row.message ?? null,
        category: row.category ?? null,
        certifications: (row.certifications as string[]) ?? [],
        target_market: row.target_market ?? null,
        private_label: row.private_label ?? null,
        ai_analysis: (row.ai_analysis as Record<string, unknown>) ?? null,
      };

      const pip = buildPipV1(input);
      const { category_id, category_name } = await resolveCategoryId(row.category ?? "");
      pip.category.category_id = category_id;
      pip.category.category_name = category_name;

      const { error: updateError } = await supabase
        .from("sourcing_requests")
        .update({ intent_json: pip })
        .eq("id", row.id);

      if (updateError) {
        console.error(`  [ERROR] ${row.id}: ${updateError.message}`);
        errors++;
      } else {
        console.log(`  [OK] ${row.id} — ${row.product_name ?? "(no name)"}`);
        processed++;
      }
    } catch (e) {
      console.error(`  [ERROR] ${row.id}:`, e);
      errors++;
    }
  }

  console.log(`\nDone. Processed: ${processed}, Errors: ${errors}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

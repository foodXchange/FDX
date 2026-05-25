// Run: npx tsx scripts/migrate-pips.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { buildPipV1, type SourcingRequestInput } from "../lib/pip/buildPipV1";
import { resolveCategoryId } from "../lib/pip/resolveCategoryId";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type SourcingRequestRow = {
  id: string;
  product_name: string | null;
  message: string | null;
  category: string | null;
  certifications: string[] | null;
  target_market: string | null;
  private_label: boolean | null;
  ai_analysis: Record<string, unknown> | null;
  intent_json: Record<string, unknown> | null;
};

async function main() {
  console.log("Fetching all sourcing requests...");

  const { data: rows, error } = await supabase
    .from("sourcing_requests")
    .select(
      "id, product_name, message, category, certifications, target_market, private_label, ai_analysis, intent_json"
    );

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No sourcing requests found.");
    return;
  }

  console.log(`Found ${rows.length} sourcing requests.`);

  let inserted = 0;
  let updatedIntent = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const input: SourcingRequestInput = {
        product_name: row.product_name ?? null,
        message: row.message ?? null,
        category: row.category ?? null,
        certifications: row.certifications ?? [],
        target_market: row.target_market ?? null,
        private_label: row.private_label ?? null,
        ai_analysis: row.ai_analysis ?? null,
      };

      let pip = row.intent_json;
      if (!pip || typeof pip !== "object") {
        pip = buildPipV1(input);
        const { category_id, category_name } = await resolveCategoryId(row.category ?? "");
        pip.category.category_id = category_id;
        pip.category.category_name = category_name;

        const { error: updateError } = await supabase
          .from("sourcing_requests")
          .update({ intent_json: pip })
          .eq("id", row.id);

        if (updateError) {
          throw new Error(`Failed to persist intent_json: ${updateError.message}`);
        }

        updatedIntent++;
      }

      const pipRow = {
        id: randomUUID(),
        sourcing_request_id: row.id,
        product_family_key: null,
        pip_version: 1,
        status: "confirmed",
        created_from: "text",
        data_json: pip,
      };

      const { error: insertError } = await supabase
        .from("pips")
        .upsert(pipRow, { onConflict: "sourcing_request_id" });

      if (insertError) {
        throw new Error(`Failed to insert or update pip: ${insertError.message}`);
      }

      inserted++;
      console.log(`  [OK] ${row.id}`);
    } catch (e) {
      console.error(`  [ERROR] ${row.id}:`, e instanceof Error ? e.message : e);
      errors++;
    }
  }

  console.log(`\nMigration complete. Rows processed: ${rows.length}`);
  console.log(`PIPs inserted/updated: ${inserted}`);
  console.log(`Intent_json generated: ${updatedIntent}`);
  console.log(`Errors: ${errors}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

/**
 * Bulk product-to-product matching for all unmatched sourcing requests.
 * Fetches requests with match_count = 0 (or null) or status = 'new',
 * runs matchProducts(), saves results to sourcing_matches.
 *
 * Run from foodxchange/: npx tsx scripts/10-bulk-match.ts
 * Dry-run:               DRY_RUN=true npx tsx scripts/10-bulk-match.ts
 * Single request:        REQUEST_ID=<uuid> npx tsx scripts/10-bulk-match.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { matchProducts, formatProductMatchWhatsApp } from "../lib/matching/matchProducts";
import type { SourcingRequest } from "../lib/matching/matchProducts";

// ─── Load .env.local ─────────────────────────────────────────────────────────

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
  } catch {
    // .env.local not found — assume env vars are already set
  }
}

loadEnvLocal();

// ─── Supabase client ─────────────────────────────────────────────────────────

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DRY_RUN = process.env.DRY_RUN === "true";
const SINGLE_REQUEST_ID = process.env.REQUEST_ID ?? null;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍  FoodXchange Bulk Matcher${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log("─".repeat(50));

  // Fetch target requests
  let query = supabase
    .from("sourcing_requests")
    .select("id, product_name, category, certifications, company, status, match_count, ai_analysis")
    .not("product_name", "is", null);

  if (SINGLE_REQUEST_ID) {
    query = query.eq("id", SINGLE_REQUEST_ID);
  } else {
    query = query.or("match_count.is.null,match_count.eq.0,status.eq.new");
  }

  const { data: requests, error: fetchError } = await query;

  if (fetchError) {
    console.error("Failed to fetch requests:", fetchError.message);
    process.exit(1);
  }

  if (!requests || requests.length === 0) {
    console.log("No unmatched requests found.");
    return;
  }

  console.log(`Found ${requests.length} request(s) to process.\n`);

  // ─── Stats ────────────────────────────────────────────────────────────────
  let processed = 0;
  let withMatches = 0;
  let noMatches = 0;
  let totalMatchesCreated = 0;
  let totalBestScore = 0;

  // ─── Process each request ─────────────────────────────────────────────────
  for (const req of requests as Array<Record<string, unknown>>) {
    const requestId = req.id as string;
    const productName = (req.product_name as string | null) ?? "";
    const company = (req.company as string | null) ?? null;

    const certs = (req.certifications as string[] | null) ?? [];
    const kosherCert = certs.find((c) => c.toLowerCase().includes("kosher"));
    const kosher_required = Boolean(kosherCert);
    const kosher_type = kosherCert
      ? kosherCert.replace(/^kosher[- ]*/i, "").trim() || "Chief Rabbinate"
      : null;

    const aiAnalysis = req.ai_analysis as Record<string, unknown> | null;

    const srRequest: SourcingRequest = {
      id: requestId,
      product_name: productName,
      category: (req.category as string | null) ?? null,
      kosher_type,
      kosher_required,
      company,
      formats: aiAnalysis?.packaging_format
        ? [aiAnalysis.packaging_format as string]
        : [],
    };

    // Fetch already-rejected supplier IDs to exclude
    const { data: rejectedRows } = await supabase
      .from("sourcing_matches")
      .select("supplier_id")
      .eq("request_id", requestId)
      .eq("status", "rejected");

    const rejectedIds = (rejectedRows ?? []).map(
      (r) => (r as { supplier_id: string }).supplier_id
    );

    // Run matching
    let matches: Awaited<ReturnType<typeof matchProducts>> = [];
    try {
      matches = await matchProducts(srRequest, 10, rejectedIds);
    } catch (err) {
      console.error(
        `  ✗ ERROR matching "${productName}" (${requestId}):`,
        err instanceof Error ? err.message : err
      );
      processed++;
      noMatches++;
      continue;
    }

    const label = `${company ?? "—"} / "${productName}"`;

    if (matches.length === 0) {
      console.log(`  ○  ${label} → no matches`);
      noMatches++;
      processed++;
      continue;
    }

    const topMatch = matches[0];
    console.log(
      `  ✓  ${label} → ${matches.length} match${matches.length !== 1 ? "es" : ""}, ` +
        `best: "${topMatch.product_name}" @ ${topMatch.company_name} (${topMatch.total_score})`
    );

    if (!DRY_RUN) {
      // Delete existing non-rejected matches
      await supabase
        .from("sourcing_matches")
        .delete()
        .eq("request_id", requestId)
        .neq("status", "rejected");

      // Insert new matches
      const { error: insertError } = await supabase.from("sourcing_matches").insert(
        matches.map((m, idx) => ({
          request_id: requestId,
          supplier_id: m.supplier_id,
          match_score: m.total_score,
          product_name: m.product_name,
          company_name: m.company_name,
          country: m.country,
          match_summary: m.match_summary,
          whatsapp_message: formatProductMatchWhatsApp(
            { product_name: productName, company },
            m,
            idx + 1
          ),
          match_breakdown: {
            reasons: m.match_reasons,
            summary: m.match_summary,
            score_breakdown: m.score_breakdown,
            kosher_types: m.kosher_types,
            certifications: m.certifications,
          },
          status: "pending",
        }))
      );

      if (insertError) {
        console.error(`    ↳ Insert failed: ${insertError.message}`);
      } else {
        // Update request stats
        await supabase
          .from("sourcing_requests")
          .update({
            last_matched_at: new Date().toISOString(),
            best_match_score: topMatch.total_score,
            match_count: matches.length,
            status: "matched",
          })
          .eq("id", requestId);
      }
    }

    withMatches++;
    totalMatchesCreated += matches.length;
    totalBestScore += topMatch.total_score;
    processed++;
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log(`Summary:`);
  console.log(`  Processed:       ${processed}`);
  console.log(`  With matches:    ${withMatches}`);
  console.log(`  No matches:      ${noMatches}`);
  if (withMatches > 0) {
    console.log(`  Total matches:   ${totalMatchesCreated}`);
    console.log(
      `  Avg best score:  ${Math.round(totalBestScore / withMatches)}`
    );
  }
  if (DRY_RUN) {
    console.log("\n  (Dry run — no data written)");
  }
  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

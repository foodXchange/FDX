import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export type FailureCategoryKey =
  | "no_products"
  | "empty_or_blocked"
  | "timeout"
  | "ai_billing"
  | "other";

export function categorizeFailureReason(internalNotes: string | null | undefined): {
  key: FailureCategoryKey;
  label: string;
  shortReason: string;
} {
  const raw = (internalNotes ?? "").trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("prepayment credits") ||
    lower.includes("credit balance is too low") ||
    lower.includes("resource_exhausted") ||
    lower.includes("organization has been disabled") ||
    lower.includes("402") ||
    lower.includes("quota")
  ) {
    return {
      key: "ai_billing",
      label: "Historical AI Credit / Quota Error (402/400)",
      shortReason: "AI API credits/quota depleted during past run (100% recoverable)",
    };
  }

  if (lower.includes("no products extracted") || lower.includes("no product urls")) {
    return {
      key: "no_products",
      label: "No Individual SKUs Extracted from Homepage",
      shortReason: "Site loaded, but only general B2B lines/categories found (no retail SKU list)",
    };
  }

  if (lower.includes("timeout") || lower.includes("network error")) {
    return {
      key: "timeout",
      label: "Website Timeout / Slow Server (>90s)",
      shortReason: "Slow factory server or heavy PDF/image pages timed out",
    };
  }

  if (
    !raw ||
    lower.includes("no content returned") ||
    lower.includes("website blocked") ||
    lower.includes("bot challenge")
  ) {
    return {
      key: "empty_or_blocked",
      label: "Unreachable / Dead Domain / Cloudflare Block",
      shortReason: raw
        ? "Website blocked by Cloudflare/bot challenge or returned empty body"
        : "Unreachable domain or empty crawl response",
    };
  }

  return {
    key: "other",
    label: "Other Crawl / Parse Error",
    shortReason: raw.slice(0, 120),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action:
        | "requeue_ai_billing"
        | "requeue_timeouts"
        | "requeue_no_products"
        | "sync_scraped_duplicates";
    };

    // Fetch all failed rows
    const { count } = await supabaseAdmin
      .from("supplier_offerings")
      .select("*", { count: "exact", head: true })
      .eq("scrape_status", "failed");

    const total = count ?? 0;
    const pages = Math.ceil(total / 1000);
    const failedRows: Array<{
      id: string;
      company_name: string;
      website: string | null;
      website_domain: string | null;
      internal_notes: string | null;
    }> = [];

    for (let i = 0; i < pages; i++) {
      const { data } = await supabaseAdmin
        .from("supplier_offerings")
        .select("id, company_name, website, website_domain, internal_notes")
        .eq("scrape_status", "failed")
        .range(i * 1000, (i + 1) * 1000 - 1);
      if (data) failedRows.push(...data);
    }

    if (body.action === "requeue_ai_billing") {
      const targetIds = failedRows
        .filter((r) => categorizeFailureReason(r.internal_notes).key === "ai_billing")
        .map((r) => r.id);

      let updated = 0;
      for (let i = 0; i < targetIds.length; i += 200) {
        const chunk = targetIds.slice(i, i + 200);
        const { error } = await supabaseAdmin
          .from("supplier_offerings")
          .update({
            scrape_status: "pending",
            internal_notes: "Re-queued from historical AI credit error",
          })
          .in("id", chunk);
        if (!error) updated += chunk.length;
      }

      return NextResponse.json({
        ok: true,
        updated,
        message: `Re-queued ${updated} suppliers (that failed from historical AI billing errors) back to Pending.`,
      });
    }

    if (body.action === "requeue_timeouts") {
      const targetIds = failedRows
        .filter((r) => categorizeFailureReason(r.internal_notes).key === "timeout")
        .map((r) => r.id);

      let updated = 0;
      for (let i = 0; i < targetIds.length; i += 200) {
        const chunk = targetIds.slice(i, i + 200);
        const { error } = await supabaseAdmin
          .from("supplier_offerings")
          .update({
            scrape_status: "pending",
            internal_notes: "Re-queued from timeout for 120s retry",
          })
          .in("id", chunk);
        if (!error) updated += chunk.length;
      }

      return NextResponse.json({
        ok: true,
        updated,
        message: `Re-queued ${updated} timed-out suppliers back to Pending.`,
      });
    }

    if (body.action === "requeue_no_products") {
      const targetIds = failedRows
        .filter((r) => categorizeFailureReason(r.internal_notes).key === "no_products")
        .map((r) => r.id);

      let updated = 0;
      for (let i = 0; i < targetIds.length; i += 200) {
        const chunk = targetIds.slice(i, i + 200);
        const { error } = await supabaseAdmin
          .from("supplier_offerings")
          .update({
            scrape_status: "pending",
            internal_notes: "Re-queued for B2B product-line extraction",
          })
          .in("id", chunk);
        if (!error) updated += chunk.length;
      }

      return NextResponse.json({
        ok: true,
        updated,
        message: `Re-queued ${updated} 'No products extracted' suppliers back to Pending.`,
      });
    }

    if (body.action === "sync_scraped_duplicates") {
      const { data: scrapedRows } = await supabaseAdmin
        .from("supplier_offerings")
        .select(
          "id, website_domain, product_count, qualification_status, product_description, contact_email, contact_phone, contact_name, linkedin_url, export_markets, founded_year, employees_range"
        )
        .eq("scrape_status", "scraped")
        .not("website_domain", "is", null);

      const domainMap = new Map<string, NonNullable<typeof scrapedRows>[number]>();
      for (const s of scrapedRows ?? []) {
        if (s.website_domain && !domainMap.has(s.website_domain)) {
          domainMap.set(s.website_domain, s);
        }
      }

      const toSync = failedRows.filter(
        (r) => r.website_domain && domainMap.has(r.website_domain)
      );

      let synced = 0;
      for (const row of toSync) {
        const src = domainMap.get(row.website_domain!);
        if (!src) continue;

        const { error } = await supabaseAdmin
          .from("supplier_offerings")
          .update({
            scrape_status: "scraped",
            qualification_status: src.qualification_status ?? "strong",
            product_count: src.product_count ?? 0,
            products_found: src.product_count ?? 0,
            product_description: src.product_description,
            contact_email: src.contact_email,
            contact_phone: src.contact_phone,
            contact_name: src.contact_name,
            linkedin_url: src.linkedin_url,
            export_markets: src.export_markets,
            founded_year: src.founded_year,
            employees_range: src.employees_range,
            internal_notes: `Auto-synced duplicate domain from scraped supplier (${src.id})`,
            last_scraped_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (!error) synced++;
      }

      return NextResponse.json({
        ok: true,
        updated: synced,
        message: `Synced ${synced} failed duplicate records from already-scraped domains (0 API credits used).`,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

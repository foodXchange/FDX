import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { crawlSupplier } from "@/lib/scraper/crawl";
import { extractProducts } from "@/lib/scraper/extract";
import type { ExtractedProduct } from "@/lib/scraper/extract";

// ─── GET — scrape stats ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supplierId = req.nextUrl.searchParams.get("supplierId");

  // If supplierId provided, return products for that supplier
  if (supplierId) {
    const { data, error } = await supabaseAdmin
      .from("supplier_products")
      .select(
        "id, product_name, category, subcategory, description, formats, sizes, certifications, kosher_types, product_type, primary_ingredients, private_label, tags, markets_suitable, scrape_confidence, manually_verified, last_scraped_at"
      )
      .eq("supplier_id", supplierId)
      .order("scrape_confidence", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] });
  }

  // Otherwise return aggregated stats
  const { data: statusRows } = await supabaseAdmin
    .from("supplier_offerings")
    .select("scrape_status")
    .not("website", "is", null)
    .neq("website", "");

  const rows = (statusRows ?? []) as { scrape_status: string | null }[];
  const stats = rows.reduce(
    (acc, r) => {
      const s = r.scrape_status ?? "pending";
      acc[s] = (acc[s] ?? 0) + 1;
      acc.total += 1;
      return acc;
    },
    { pending: 0, scraped: 0, failed: 0, skipped: 0, total: 0 } as Record<
      string,
      number
    >
  );

  const { count: productCount } = await supabaseAdmin
    .from("supplier_products")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ ...stats, totalProducts: productCount ?? 0 });
}

// ─── POST — scrape a single supplier ─────────────────────────────────────────
const PostSchema = z.object({
  supplierId: z.string().uuid(),
  action: z.enum(["scrape", "skip"]).default("scrape"),
});

async function recomputeSupplierQualification(supplierId: string) {
  const { count, error } = await supabaseAdmin
    .from("supplier_products")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);
  if (error) return;
  const product_count = count ?? 0;
  const qualification_status =
    product_count >= 3 ? "strong" : product_count >= 1 ? "thin" : "empty";
  await supabaseAdmin
    .from("supplier_offerings")
    .update({ product_count, qualification_status })
    .eq("id", supplierId);
}

async function insertProducts(
  supplierId: string,
  products: ExtractedProduct[],
  scrapeSource: string
): Promise<number> {
  if (products.length === 0) return 0;

  await supabaseAdmin
    .from("supplier_products")
    .delete()
    .eq("supplier_id", supplierId)
    .eq("manually_verified", false);

  const rows = products.map((p) => ({
    supplier_id: supplierId,
    product_name: p.product_name,
    category: p.category,
    subcategory: p.subcategory ?? null,
    description: p.description ?? null,
    formats: p.formats ?? [],
    sizes: p.sizes ?? [],
    brix_level: p.brix_level ?? null,
    shelf_life_months: p.shelf_life_months ?? null,
    certifications: p.certifications ?? [],
    kosher_types: p.kosher_types ?? [],
    product_type: p.product_type ?? null,
    primary_ingredients: p.primary_ingredients ?? [],
    private_label: p.private_label ?? false,
    tags: p.tags ?? [],
    markets_suitable: p.markets_suitable ?? [],
    scrape_source: scrapeSource,
    scrape_confidence: p.confidence ?? 0.5,
    last_scraped_at: new Date().toISOString(),
    manually_verified: false,
    is_published: true,
  }));

  const { error } = await supabaseAdmin.from("supplier_products").insert(rows);
  if (error) return 0;
  await recomputeSupplierQualification(supplierId);
  return rows.length;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { supplierId, action } = parsed.data;

  // Handle skip action
  if (action === "skip") {
    const { error } = await supabaseAdmin
      .from("supplier_offerings")
      .update({ scrape_status: "skipped" })
      .eq("id", supplierId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Fetch supplier
  const { data: supplier, error: fetchError } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, website, country_of_origin, certifications"
    )
    .eq("id", supplierId)
    .single();

  if (fetchError || !supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const row = supplier as {
    id: string;
    company_name: string;
    website: string | null;
    country_of_origin: string | null;
    certifications: string[] | null;
  };

  if (!row.website) {
    return NextResponse.json(
      { error: "Supplier has no website" },
      { status: 400 }
    );
  }

  // Mark as in progress
  await supabaseAdmin
    .from("supplier_offerings")
    .update({ scrape_status: "pending" })
    .eq("id", supplierId);

  try {
    const content = await crawlSupplier(row.website, row.company_name, row.country_of_origin);

    if (!content || content.length < 50) {
      await supabaseAdmin
        .from("supplier_offerings")
        .update({ scrape_status: "failed" })
        .eq("id", supplierId);
      return NextResponse.json({ ok: false, productsFound: 0, reason: "No content" });
    }

    const products = await extractProducts(content, {
      company_name: row.company_name,
      country_of_origin: row.country_of_origin,
      certifications: row.certifications ?? [],
    });

    const inserted = await insertProducts(supplierId, products, row.website);

    await supabaseAdmin
      .from("supplier_offerings")
      .update({
        scrape_status: "scraped",
        last_scraped_at: new Date().toISOString(),
        products_found: inserted,
      })
      .eq("id", supplierId);

    return NextResponse.json({ ok: true, productsFound: inserted });
  } catch (err) {
    console.error("Scrape error:", err);
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ scrape_status: "failed" })
      .eq("id", supplierId);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}

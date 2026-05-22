import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { crawlSupplier } from "@/lib/scraper/crawl";
import {
  extractProducts,
  extractSupplierProfile,
  detectManufacturerType,
} from "@/lib/scraper/extract";
import type { ExtractedProduct } from "@/lib/scraper/extract";

export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getHomepage(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
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
  }));

  const { error } = await supabaseAdmin.from("supplier_products").insert(rows);
  if (error) return 0;
  return rows.length;
}

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  scrape_status: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limitParam = searchParams.get("limit");
  const statusParam = searchParams.get("status");
  const supplierIdParam = searchParams.get("supplierId");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      }

      send({ type: "start", message: "Starting scraper..." });

      // Fetch suppliers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabaseAdmin
        .from("supplier_offerings")
        .select(
          "id, company_name, website, country_of_origin, categories, certifications, scrape_status"
        )
        .not("website", "is", null)
        .neq("website", "");

      if (supplierIdParam) {
        query = query.eq("id", supplierIdParam);
      } else if (statusParam === "pending") {
        query = query.not("scrape_status", "eq", "scraped");
      }

      if (limitParam) {
        query = query.limit(parseInt(limitParam, 10));
      }

      const { data, error } = (await query) as {
        data: SupplierRow[] | null;
        error: { message: string } | null;
      };

      if (error || !data) {
        send({ type: "error", message: `Failed to fetch suppliers: ${error?.message ?? "unknown"}` });
        send({ type: "done" });
        controller.close();
        return;
      }

      const suppliers = data as SupplierRow[];
      send({ type: "log", message: `Found ${suppliers.length} suppliers to process` });

      const succeeded: { name: string; products: number }[] = [];
      const failed: { name: string; reason: string }[] = [];
      const skippedList: { name: string; type: string }[] = [];

      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];

        send({
          type: "supplier",
          message: `[${i + 1}/${suppliers.length}] ${supplier.company_name}`,
        });
        send({ type: "log", message: `  Website: ${supplier.website}` });

        try {
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ scrape_status: "pending" })
            .eq("id", supplier.id);

          // Crawl
          send({ type: "log", message: "  → Crawling website..." });
          const crawlUrl = getHomepage(supplier.website!);
          const content = await crawlSupplier(crawlUrl);

          if (!content || content.length < 50) {
            send({ type: "error", message: "  ✗ Website blocked or no content" });
            await supabaseAdmin
              .from("supplier_offerings")
              .update({ scrape_status: "failed" })
              .eq("id", supplier.id);
            failed.push({ name: supplier.company_name, reason: "No content returned" });
            if (i < suppliers.length - 1) {
              send({ type: "log", message: "  ⏳ Waiting 25s before next supplier..." });
              await sleep(25000);
            }
            continue;
          }

          const pageCount = content.split("---PAGE BREAK---").length;
          send({
            type: "log",
            message: `  ✓ Fetched ${content.length.toLocaleString()} chars across ${pageCount} page${pageCount !== 1 ? "s" : ""}`,
          });

          // Manufacturer detection
          send({ type: "log", message: "  → Checking if manufacturer..." });
          const mfr = await detectManufacturerType(content, supplier.company_name);

          const shouldSkip =
            !mfr.isManufacturer &&
            !["manufacturer", "mixed", "unknown"].includes(mfr.companyType) &&
            mfr.confidence >= 0.4;

          if (shouldSkip) {
            send({
              type: "warning",
              message: `  ✗ SKIPPED — Not a manufacturer (${mfr.companyType}): ${mfr.reason}`,
            });
            await supabaseAdmin
              .from("supplier_offerings")
              .update({ scrape_status: "skipped" })
              .eq("id", supplier.id);
            skippedList.push({ name: supplier.company_name, type: mfr.companyType });
            if (i < suppliers.length - 1) {
              send({ type: "log", message: "  ⏳ Waiting 25s before next supplier..." });
              await sleep(25000);
            }
            continue;
          }

          if (mfr.companyType === "mixed") {
            send({ type: "warning", message: `  ⚠ Mixed company — ${mfr.reason}` });
          } else {
            send({ type: "log", message: `  ✓ Confirmed manufacturer` });
          }

          // Extract products
          send({ type: "log", message: "  → Extracting products..." });
          const products = await extractProducts(content, {
            company_name: supplier.company_name,
            country_of_origin: supplier.country_of_origin,
            certifications: supplier.certifications ?? [],
          });

          if (products.length === 0) {
            send({ type: "error", message: "  ✗ No products extracted" });
            await supabaseAdmin
              .from("supplier_offerings")
              .update({ scrape_status: "failed" })
              .eq("id", supplier.id);
            failed.push({ name: supplier.company_name, reason: "No products extracted" });
            if (i < suppliers.length - 1) {
              send({ type: "log", message: "  ⏳ Waiting 25s before next supplier..." });
              await sleep(25000);
            }
            continue;
          }

          const detectedLang = products[0]?.detected_language;
          if (detectedLang && detectedLang !== "english") {
            send({ type: "log", message: `  🌍 Content language: ${detectedLang}` });
          }

          // Save products
          const inserted = await insertProducts(supplier.id, products, supplier.website!);

          // Extract profile + factories
          send({ type: "log", message: "  → Extracting company profile..." });
          const profile = await extractSupplierProfile(content, supplier.company_name, {
            country: supplier.country_of_origin,
            categories: supplier.categories ?? [],
          });

          await supabaseAdmin
            .from("supplier_offerings")
            .update({
              scrape_status: "scraped",
              last_scraped_at: new Date().toISOString(),
              products_found: inserted,
              ...(profile.company_description
                ? { product_description: profile.company_description }
                : {}),
              ...(profile.contact_email ? { contact_email: profile.contact_email } : {}),
              ...(profile.contact_phone ? { contact_phone: profile.contact_phone } : {}),
              ...(profile.contact_name ? { contact_name: profile.contact_name } : {}),
              ...(profile.linkedin_url ? { linkedin_url: profile.linkedin_url } : {}),
              ...(profile.export_markets.length > 0
                ? { export_markets: profile.export_markets }
                : {}),
              ...(profile.founded_year ? { founded_year: profile.founded_year } : {}),
              ...(profile.employees_range
                ? { employees_range: profile.employees_range }
                : {}),
            })
            .eq("id", supplier.id);

          if (profile.factories.length > 0) {
            await supabaseAdmin
              .from("supplier_factories")
              .delete()
              .eq("supplier_id", supplier.id);

            await supabaseAdmin.from("supplier_factories").insert(
              profile.factories.map((f, idx) => ({
                supplier_id: supplier.id,
                factory_name: f.factory_name,
                country: f.country,
                city: f.city,
                is_primary: idx === 0,
                kosher_types: f.kosher_types,
                kosher_certifying_body: f.kosher_certifying_body,
                certifications_quality: f.certifications_quality,
                certifications_dietary: f.certifications_dietary,
                brc_grade: f.brc_grade,
                ifs_grade: f.ifs_grade,
                production_capacity: f.production_capacity,
              }))
            );

            send({
              type: "log",
              message: `  🏭 ${profile.factories.length} factory/factories found`,
            });
          }

          send({
            type: "success",
            message: `  ✓ ${inserted} products saved`,
            data: { products: inserted, supplier: supplier.company_name },
          });

          succeeded.push({ name: supplier.company_name, products: inserted });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          send({ type: "error", message: `  ✗ Error: ${msg}` });
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ scrape_status: "failed" })
            .eq("id", supplier.id);
          failed.push({ name: supplier.company_name, reason: msg });
        }

        if (i < suppliers.length - 1) {
          send({ type: "log", message: "  ⏳ Waiting 25s before next supplier..." });
          await sleep(25000);
        }
      }

      // Summary
      send({
        type: "summary",
        message: `Done — ${succeeded.length} succeeded, ${failed.length} failed, ${skippedList.length} skipped`,
        data: {
          succeeded: succeeded.length,
          failed: failed.length,
          skipped: skippedList.length,
          totalProducts: succeeded.reduce((s, r) => s + r.products, 0),
        },
      });

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const ManualEntrySchema = z.object({
  target: z.enum(["supplier", "buyer"]).default("supplier"),
  companyName: z.string().min(1, "Company name is required"),
  website: z.string().url("Must be a valid URL (including https://)"),
  country: z.string().optional().nullable(),
  categories: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

const BulkEntrySchema = z.object({
  target: z.enum(["supplier", "buyer"]).default("supplier"),
  urls: z.array(z.string().url()).min(1, "At least one valid URL is required"),
  defaultCountry: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode A: Bulk URLs
    if (Array.isArray(body.urls)) {
      const parsed = BulkEntrySchema.parse(body);
      const inserted: { id: string; companyName: string; website: string }[] = [];
      const skipped: string[] = [];

      for (const rawUrl of parsed.urls) {
        let domain = "";
        try {
          const parsedUrl = new URL(rawUrl);
          domain = parsedUrl.hostname.replace(/^www\./, "");
        } catch {
          skipped.push(rawUrl);
          continue;
        }

        const companyName = domain.split(".")[0].toUpperCase();

        if (parsed.target === "supplier") {
          // Check duplicate domain
          const { data: existing } = await supabaseAdmin
            .from("supplier_offerings")
            .select("id")
            .ilike("website", `%${domain}%`)
            .limit(1);

          if (existing && existing.length > 0) {
            skipped.push(`${rawUrl} (already exists)`);
            continue;
          }

          const { data: newRow, error } = await supabaseAdmin
            .from("supplier_offerings")
            .insert({
              company_name: companyName,
              website: rawUrl,
              country_of_origin: parsed.defaultCountry || null,
              scrape_status: "pending",
              source: "manual_bulk_admin",
              status: "pending",
            })
            .select("id, company_name, website")
            .single();

          if (!error && newRow) {
            inserted.push({ id: newRow.id, companyName: newRow.company_name, website: newRow.website! });
          }
        } else {
          // Buyer target
          const { data: existing } = await supabaseAdmin
            .from("buyers")
            .select("id")
            .ilike("website", `%${domain}%`)
            .limit(1);

          if (existing && existing.length > 0) {
            skipped.push(`${rawUrl} (already exists)`);
            continue;
          }

          const { data: newRow, error } = await supabaseAdmin
            .from("buyers")
            .insert({
              company_name: companyName,
              website: rawUrl,
              country: parsed.defaultCountry || "Israel",
              source: "manual_bulk_admin",
            })
            .select("id, company_name, website")
            .single();

          if (!error && newRow) {
            inserted.push({ id: newRow.id, companyName: newRow.company_name, website: newRow.website! });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        insertedCount: inserted.length,
        skippedCount: skipped.length,
        inserted,
        skipped,
      });
    }

    // Mode B: Single detailed entry
    const parsed = ManualEntrySchema.parse(body);

    if (parsed.target === "supplier") {
      const { data: newRow, error } = await supabaseAdmin
        .from("supplier_offerings")
        .insert({
          company_name: parsed.companyName.trim(),
          website: parsed.website.trim(),
          country_of_origin: parsed.country?.trim() || null,
          categories: parsed.categories,
          product_description: parsed.notes?.trim() || null,
          scrape_status: "pending",
          source: "manual_admin",
          status: "pending",
        })
        .select("id, company_name, website")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, record: newRow });
    } else {
      const { data: newRow, error } = await supabaseAdmin
        .from("buyers")
        .insert({
          company_name: parsed.companyName.trim(),
          website: parsed.website.trim(),
          country: parsed.country?.trim() || "Israel",
          categories: parsed.categories,
          notes: parsed.notes?.trim() || null,
          source: "manual_admin",
        })
        .select("id, company_name, website")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, record: newRow });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

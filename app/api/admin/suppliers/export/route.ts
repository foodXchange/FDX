import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qualification = searchParams.get("qualification") ?? undefined;
  const scrape_status = searchParams.get("scrape_status") ?? undefined;
  const country = searchParams.get("country") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  let query: any = supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, website, country_of_origin, qualification_status, product_count, scrape_status, internal_notes, created_at"
    )
    .order("company_name", { ascending: true })
    .limit(1000000);

  if (qualification) {
    query = query.eq("qualification_status", qualification);
  }

  if (scrape_status) {
    query = query.eq("scrape_status", scrape_status);
  }

  if (country) query = query.eq("country_of_origin", country);
  if (category) query = query.contains("categories", [category]);

  if (status === "approved") {
    query = query.in("status", ["approved", "active"]);
  } else if (status === "pending") {
    query = query.eq("status", "pending");
  }

  if (q) {
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.or(`company_name.ilike.%${safe}%,website.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows = (data ?? []) as Array<Record<string, any>>;

  function escapeCsv(value: unknown) {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (s.includes("\",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const header = [
    "id",
    "company_name",
    "website",
    "country",
    "qualification_status",
    "product_count",
    "scrape_status",
    "scrape_error",
    "created_at",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    const line = [
      escapeCsv(r.id),
      escapeCsv(r.company_name),
      escapeCsv(r.website),
      escapeCsv(r.country_of_origin),
      escapeCsv(r.qualification_status),
      escapeCsv(r.product_count),
      escapeCsv(r.scrape_status),
      escapeCsv(r.internal_notes),
      escapeCsv(r.created_at),
    ].join(",");
    lines.push(line);
  }

  const csv = lines.join("\n");
  const date = new Date().toISOString().split("T")[0];
  const filename = `suppliers_export_${date}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

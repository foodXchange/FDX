import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabaseAdmin.from("scrape_batches").select(
    `
    id,
    batch_key,
    filenames,
    status,
    total_rows,
    processed,
    success_count,
    failed_count,
    perplexity_fallback_count,
    skipped_count,
    products_found,
    created_at,
    updated_at
    `,
    { count: "exact" }
  );

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json(
      { error: `Failed to fetch batches: ${error.message}` },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    batches: data || [],
    total: count || 0,
    limit,
    offset,
  });
}

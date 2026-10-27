import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const requestId = searchParams.get("request_id");

    // 1. Fetch matches for a specific request
    if (requestId) {
      const { data: matches, error } = await supabaseAdmin
        .from("sourcing_matches")
        .select(`
          id,
          match_score,
          product_name,
          company_name,
          country,
          match_summary,
          status,
          supplier_id,
          match_breakdown
        `)
        .eq("request_id", requestId)
        .order("match_score", { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ ok: true, matches: matches || [] });
    }

    // 2. Search suppliers/products if free query
    if (q) {
      const { data: products, error } = await supabaseAdmin
        .from("supplier_products")
        .select(`
          id,
          product_name,
          category,
          private_label,
          is_gluten_free,
          is_sugar_free,
          supplier_id,
          supplier_offerings (
            id,
            company_name,
            country
          )
        `)
        .or(`product_name.ilike.%${q}%,category.ilike.%${q}%`)
        .limit(12);

      if (error) throw error;
      return NextResponse.json({ ok: true, products: products || [] });
    }

    return NextResponse.json({ ok: true, matches: [], products: [] });
  } catch (err: any) {
    console.error("Deal desk quick search error:", err);
    return NextResponse.json({ error: err.message || "Failed to search" }, { status: 500 });
  }
}

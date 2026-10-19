import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getGmailCredentials } from "@/lib/email/gmailEngine";
import {
  OpportunitiesDashboardClient,
  type AssortmentMatchRow,
} from "@/components/admin/opportunities/OpportunitiesDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminOpportunitiesPage() {
  const [{ data, error }, gmailCreds] = await Promise.all([
    supabaseAdmin
      .from("assortment_matches")
      .select(`
        id,
        match_score,
        vector_similarity,
        category_match,
        kosher_match,
        pitch_angle,
        potential_margin_gain,
        status,
        created_at,
        buyer:buyers(id, company_name, buyer_type, website, contact_email, contact_name),
        assortment:buyer_assortments(id, product_name, brand_name, manufacturer_country, retail_price_ils, package_size, barcode_gtin, category:product_categories(id, name)),
        supplier_product:supplier_products(id, product_name, category_id, subcategory, formats, image_url, category:product_categories(id, name)),
        supplier:supplier_offerings(id, company_name, country_of_origin, website, verified, certifications, contact_email)
      `)
      .order("match_score", { ascending: false })
      .limit(500),
    getGmailCredentials(),
  ]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-1">
            Failed to load assortment matches
          </h2>
          <p className="text-xs">{error.message}</p>
        </div>
      </main>
    );
  }

  // Normalize Supabase joins (which can return object or single array)
  const matches: AssortmentMatchRow[] = (data || []).map((row: any) => ({
    id: row.id,
    match_score: Number(row.match_score),
    vector_similarity: row.vector_similarity ? Number(row.vector_similarity) : null,
    category_match: row.category_match ?? null,
    kosher_match: row.kosher_match ?? null,
    pitch_angle: row.pitch_angle ?? null,
    potential_margin_gain: row.potential_margin_gain ?? null,
    status: row.status ?? "proposed",
    created_at: row.created_at,
    buyer: Array.isArray(row.buyer) ? row.buyer[0] : row.buyer,
    assortment: Array.isArray(row.assortment) ? row.assortment[0] : row.assortment,
    supplier_product: Array.isArray(row.supplier_product)
      ? row.supplier_product[0]
      : row.supplier_product,
    supplier: Array.isArray(row.supplier) ? row.supplier[0] : row.supplier,
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sticky Top Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-3.5 sticky top-0 z-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>💡</span>
              <span>Proactive Opportunities &amp; Reverse Matching</span>
            </h1>
            <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-0.5 font-bold">
              {matches.length} Match Proposals
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/matches"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              ⚡ Sourcing Requests Matcher →
            </Link>
            <Link
              href="/admin/buyers"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              👥 Buyers Directory
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <OpportunitiesDashboardClient
          initialMatches={matches}
          initialGmailUser={gmailCreds?.user ?? null}
        />
      </div>
    </main>
  );
}

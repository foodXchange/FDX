import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runMatchV3 } from "@/lib/matching/runMatchV3";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

// GET — return saved matches for a request
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      "id, supplier_id, match_score, product_name, company_name, country, match_summary, whatsapp_message, match_breakdown, status, approved_at, rejected_at"
    )
    .eq("request_id", id)
    .neq("status", "rejected")
    .order("match_score", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const matches = (data ?? []) as {
    id: string;
    supplier_id: string;
    match_score: number;
    product_name: string | null;
    company_name: string | null;
    country: string | null;
    match_summary: string | null;
    whatsapp_message: string | null;
    match_breakdown: Record<string, unknown> | null;
    status: string;
    approved_at: string | null;
    rejected_at: string | null;
  }[];

  // Best-effort enrichment with product thumbnails — looked up by (supplier_id, product_name)
  // since sourcing_matches doesn't store a product_id reference.
  const supplierIds = Array.from(new Set(matches.map((m) => m.supplier_id).filter(Boolean)));
  const productMap = new Map<
    string,
    { image_url: string | null; image_source: string | null; category: string | null }
  >();

  if (supplierIds.length > 0) {
    const { data: productRows } = await supabaseAdmin
      .from("supplier_products")
      .select("supplier_id, product_name, image_url, image_source, category")
      .in("supplier_id", supplierIds);

    for (const p of (productRows ?? []) as {
      supplier_id: string;
      product_name: string;
      image_url: string | null;
      image_source: string | null;
      category: string | null;
    }[]) {
      productMap.set(`${p.supplier_id}::${p.product_name}`, {
        image_url: p.image_url,
        image_source: p.image_source,
        category: p.category,
      });
    }
  }

  const enriched = matches.map((m) => {
    const product = m.product_name
      ? productMap.get(`${m.supplier_id}::${m.product_name}`)
      : undefined;
    return {
      ...m,
      image_url: product?.image_url ?? null,
      image_source: product?.image_source ?? null,
      category: product?.category ?? null,
    };
  });

  return Response.json({ ok: true, matches: enriched });
}

// POST — run matching and persist results
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the sourcing request
  const { data: request, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const result = await runMatchV3(id);
  return Response.json({
    ok: true,
    matches: result.inserted,
    topScore: result.topScore,
  });
}

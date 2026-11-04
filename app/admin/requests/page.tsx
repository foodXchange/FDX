import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SourcingDealDesk, { type BuyerOption } from "@/components/admin/SourcingDealDesk";

export type RequestRow = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  buyer_id: string | null;
  message: string | null;
  product_name: string | null;
  category: string | null;
  certifications: string[] | null;
  target_market: string | null;
  private_label: boolean | null;
  packaging_preference?: string | null;
  volume_per_year?: string | null;
  ai_analysis: Record<string, unknown> | null;
  source: string | null;
  status: string | null;
  brief_status?: "draft" | "sent" | "changes_requested" | "confirmed" | "reconfirm_needed" | null;
  brief_version?: number | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  confirmed_via?: string | null;
  deleted_at?: string | null;
  created_at: string;
  images: { url: string }[];
  match_count: number;
  best_match_score: number | null;
  sent_count?: number;
  replied_count?: number;
  is_published?: boolean | null;
  published_product_name?: string | null;
  published_message?: string | null;
  intent_json?: Record<string, unknown> | null;
  buyer_logo_url: string | null;
  dietary_requirements?: string[] | null;
  temperature_regime?: string | null;
  target_weight_min_g?: number | null;
  target_weight_max_g?: number | null;
  preferred_origins?: string[] | null;
  excluded_ingredients?: string[] | null;
  pipeline_stage?: string | null;
  pipeline_substage?: string | null;
  exception_status?: "cancelled_by_buyer" | "cancelled_by_system" | "irrelevant" | null;
  exception_reason?: string | null;
  active_supplier_id?: string | null;
  stage_updated_at?: string | null;
  stage_updated_by?: string | null;
  stage_notes?: string | null;
};

interface PageProps {
  searchParams?: Promise<{ edit?: string; view?: string; buyer_id?: string }>;
}

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const editId = resolvedParams?.edit;
  const initialView = resolvedParams?.view === "registry" ? "registry" : "desk";
  const initialBuyerId = resolvedParams?.buyer_id;

  const [requestsResult, imagesResult, buyersResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, name, email, company, buyer_id, message, product_name, category, certifications, target_market, private_label, packaging_preference, volume_per_year, temperature_regime, dietary_requirements, target_weight_min_g, target_weight_max_g, preferred_origins, excluded_ingredients, ai_analysis, source, status, brief_status, brief_version, confirmed_at, confirmed_by, confirmed_via, deleted_at, created_at, is_published, published_product_name, published_message, intent_json, pipeline_stage, pipeline_substage, exception_status, exception_reason, active_supplier_id, stage_updated_at, stage_updated_by, stage_notes"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("request_images").select("request_id, url"),
    supabaseAdmin
      .from("buyers")
      .select("id, company_name, contact_name, contact_email, contact_whatsapp, country, buyer_type, website")
      .order("company_name", { ascending: true }),
  ]);

  const rawRequests = (requestsResult.data ?? []) as Omit<
    RequestRow,
    "images" | "match_count" | "best_match_score"
  >[];
  const rawImages = (imagesResult.data ?? []) as {
    request_id: string;
    url: string;
  }[];
  const buyers = (buyersResult.data ?? []) as BuyerOption[];

  const requestIds = rawRequests.map((r) => r.id);

  const matchDataResult =
    requestIds.length > 0
      ? await supabaseAdmin
          .from("sourcing_matches")
          .select("request_id, match_score, status, sent_at, supplier_responded_at")
          .in("request_id", requestIds)
          .neq("status", "rejected")
      : { data: [] };

  const matchCountMap = new Map<string, number>();
  const bestScoreMap = new Map<string, number>();
  const sentCountMap = new Map<string, number>();
  const repliedCountMap = new Map<string, number>();

  for (const m of matchDataResult.data ?? []) {
    const row = m as {
      request_id: string;
      match_score: number;
      status: string | null;
      sent_at: string | null;
      supplier_responded_at: string | null;
    };
    matchCountMap.set(row.request_id, (matchCountMap.get(row.request_id) ?? 0) + 1);
    const current = bestScoreMap.get(row.request_id) ?? 0;
    if (row.match_score > current) bestScoreMap.set(row.request_id, row.match_score);
    if (row.status === "responded" || row.supplier_responded_at) {
      repliedCountMap.set(
        row.request_id,
        (repliedCountMap.get(row.request_id) ?? 0) + 1
      );
    } else if (
      row.status === "sent" ||
      row.status === "rfq_sent" ||
      row.sent_at
    ) {
      sentCountMap.set(row.request_id, (sentCountMap.get(row.request_id) ?? 0) + 1);
    }
  }

  const imageMap = new Map<string, { url: string }[]>();
  for (const img of rawImages) {
    const existing = imageMap.get(img.request_id) ?? [];
    existing.push({ url: img.url });
    imageMap.set(img.request_id, existing);
  }

  const buyerLogoMap = new Map<string, string | null>();
  for (const b of buyers) {
    // If buyer has logo or defaults
    buyerLogoMap.set(b.id, null);
  }

  const requests: RequestRow[] = rawRequests.map((r) => ({
    ...r,
    images: imageMap.get(r.id) ?? [],
    match_count: matchCountMap.get(r.id) ?? 0,
    best_match_score: bestScoreMap.get(r.id) ?? null,
    sent_count: sentCountMap.get(r.id) ?? 0,
    replied_count: repliedCountMap.get(r.id) ?? 0,
    buyer_logo_url: r.buyer_id ? buyerLogoMap.get(r.buyer_id) ?? null : null,
  }));

  const totalCount = requests.length;
  const matchedCount = requests.filter((r) => r.status === "matched").length;
  const unmatchedCount = requests.filter(
    (r) => r.status !== "matched" && r.status !== "closed"
  ).length;
  const highScoreCount = requests.filter(
    (r) => (r.best_match_score ?? 0) >= 70
  ).length;
  const awaitingCount = requests.filter((r) => r.status === "matched").length;

  return (
    <SourcingDealDesk
      buyers={buyers}
      requests={requests}
      initialEditId={editId}
      initialView={initialView}
      initialBuyerId={initialBuyerId}
      initialCounts={{
        total: totalCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
        highScore: highScoreCount,
        awaiting: awaitingCount,
      }}
    />
  );
}

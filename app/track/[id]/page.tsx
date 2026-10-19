import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import BuyerCollaborationPortal, {
  type BuyerPortalData,
} from "@/components/buyer-portal/BuyerCollaborationPortal";
import type {
  BuyerBriefApproval,
  SampleDispatchProtocol,
  PackagingArtworkWorkflow,
  CommercialOrderLifecycle,
  AgentQuotationMargin,
} from "@/app/admin/requests/actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: req } = await supabaseAdmin
    .from("sourcing_requests")
    .select("product_name, company, name")
    .eq("id", id)
    .maybeSingle();

  if (!req) return { title: "Sourcing Project | FoodXchange" };

  const name = cleanRequestName(req.product_name ?? "Food Product");
  const buyer = req.company || req.name || "Buyer";
  return {
    title: `${name} · Sourcing Project for ${buyer} | FoodXchange`,
    description: `Track your private label sourcing project, courier tasting samples, and container milestones.`,
  };
}

export default async function BuyerPortalPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Fetch Request
  const { data: request, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select(
      `id, name, company, product_name, category, certifications,
       packaging_preference, volume_per_year, message, ai_analysis, status`
    )
    .eq("id", id)
    .maybeSingle();

  if (reqErr || !request) {
    notFound();
  }

  // 2. Fetch Images & Matches
  const [imagesRes, matchesRes] = await Promise.all([
    supabaseAdmin
      .from("request_images")
      .select("url")
      .eq("request_id", id)
      .order("created_at", { ascending: true })
      .limit(1),
    supabaseAdmin
      .from("sourcing_matches")
      .select("id, supplier_id, company_name, product_name, country, match_score, status, match_breakdown")
      .eq("request_id", id)
      .neq("status", "rejected")
      .order("match_score", { ascending: false }),
  ]);

  const imageUrl = imagesRes.data?.[0]?.url ?? null;
  const matches = matchesRes.data ?? [];

  // Parse AI analysis
  const ai = (request.ai_analysis ?? {}) as Record<string, unknown>;
  const briefApproval = (ai.buyer_brief_approval as BuyerBriefApproval | null) ?? null;
  const sampleDispatch = (ai.sample_dispatch as SampleDispatchProtocol | null) ?? null;
  const packagingArtwork = (ai.packaging_artwork as PackagingArtworkWorkflow | null) ?? null;
  const orderWorkflow = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;
  const sellerBrief = typeof ai.seller_brief === "string" ? ai.seller_brief : null;
  const benchmarkBrand = typeof ai.benchmark_brand === "string" ? ai.benchmark_brand : null;

  const cleaned = cleanRequestName(request.product_name ?? "Food Product");
  const buyerCompany = request.company || request.name || "Buyer";

  // Build Anonymized Offers List for the Buyer
  const offers: BuyerPortalData["offers"] = matches.map((m) => {
    const breakdown = (m.match_breakdown ?? {}) as Record<string, unknown>;
    const quote = (breakdown.quote ?? {}) as Record<string, unknown>;
    const agentMargin = (breakdown.agent_margin ?? null) as AgentQuotationMargin | null;

    const countryCode = m.country ? m.country.slice(0, 2).toUpperCase() : "EU";
    const producerCode = `Producer #${countryCode}-${m.supplier_id.slice(0, 4).toUpperCase()}`;

    const rawFactoryCost = typeof quote.unit_price === "number" ? quote.unit_price : null;
    let sellingPrice: number | null = null;

    if (agentMargin?.buyer_quoted_price) {
      sellingPrice = agentMargin.buyer_quoted_price;
    } else if (rawFactoryCost !== null) {
      sellingPrice = Number((rawFactoryCost + 0.1).toFixed(2)); // Standard agent spread fallback
    }

    return {
      matchId: m.id,
      producerCode,
      country: m.country,
      productName: m.product_name || "Equivalent Private Label Line",
      matchScore: m.match_score,
      sellingPrice,
      currency: agentMargin?.currency || (typeof quote.currency === "string" ? quote.currency : "EUR"),
      incoterm: agentMargin?.incoterms || (typeof quote.incoterm === "string" ? quote.incoterm : "CIF Ashdod Port"),
      netWeight: (typeof quote.net_weight === "string" ? quote.net_weight : null) || request.packaging_preference,
      packagingFormat: typeof quote.packaging_format === "string" ? quote.packaging_format : null,
      kosherType: typeof quote.kosher_type === "string" ? quote.kosher_type : "Kosher Rabbinate",
      certifications: Array.isArray(quote.certifications) ? (quote.certifications as string[]) : ["BRC", "IFS"],
      leadTimeWeeks: typeof quote.lead_time_weeks === "number" ? quote.lead_time_weeks : 3,
      moq: typeof quote.moq === "string" ? quote.moq : "1 x 40ft HQ FCL",
    };
  });

  const portalData: BuyerPortalData = {
    requestId: request.id,
    productName: request.product_name ?? "Food Product",
    cleanedName: cleaned || request.product_name || "Food Product",
    buyerCompany,
    benchmarkBrand,
    category: request.category,
    packagingPreference: request.packaging_preference,
    volumePerYear: request.volume_per_year,
    certifications: request.certifications ?? [],
    imageUrl,
    briefApproval,
    sampleDispatch,
    packagingArtwork,
    orderWorkflow,
    sellerBrief,
    offers,
  };

  return <BuyerCollaborationPortal data={portalData} />;
}

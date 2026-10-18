import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMatchRefTag } from "@/lib/email/gmailEngine";
import SupplierMatchQuoteForm from "@/components/supplier-match/SupplierMatchQuoteForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierMatchPortalPage({ params }: PageProps) {
  const { id: matchId } = await params;

  const { data: match, error } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, supplier_id, company_name, product_name, match_score, status, supplier_response,
       supplier:supplier_offerings(company_name, country_of_origin, contact_email, contact_phone),
       request:sourcing_requests(id, product_name, category, volume_per_year, certifications, message, ai_analysis)`
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error || !match) {
    notFound();
  }

  const supplierObj = Array.isArray(match.supplier)
    ? match.supplier[0]
    : match.supplier;
  const reqObj = Array.isArray(match.request) ? match.request[0] : match.request;

  // Fetch benchmark images if any exist for this request
  let benchmarkImageUrl: string | null = null;
  if (match.request_id) {
    const { data: imgs } = await supabaseAdmin
      .from("request_images")
      .select("url")
      .eq("request_id", match.request_id)
      .order("created_at", { ascending: true })
      .limit(1);
    benchmarkImageUrl = imgs?.[0]?.url ?? null;
  }

  const aiAnalysis =
    reqObj?.ai_analysis && typeof reqObj.ai_analysis === "object"
      ? (reqObj.ai_analysis as Record<string, unknown>)
      : null;

  const sellerBrief =
    typeof aiAnalysis?.seller_brief === "string" ? aiAnalysis.seller_brief : null;
  const benchmarkBrand =
    typeof aiAnalysis?.benchmark_brand === "string"
      ? aiAnalysis.benchmark_brand
      : null;
  const packagingSpec =
    typeof aiAnalysis?.packaging_format === "string"
      ? aiAnalysis.packaging_format
      : null;

  const companyName =
    match.company_name || supplierObj?.company_name || "Export Partner";
  const matchedProductName =
    match.product_name || reqObj?.product_name || "Food Product";
  const refTag = getMatchRefTag(match.id);
  const certs = Array.isArray(reqObj?.certifications)
    ? (reqObj.certifications as string[])
    : [];

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-orange-400">
                FoodXchange · Direct Sourcing Desk
              </div>
              <h1 className="text-lg sm:text-xl font-bold mt-0.5">
                Commercial Inquiry for {companyName}
              </h1>
            </div>
            <span className="text-xs font-mono bg-white/10 border border-white/15 px-3 py-1 rounded-full text-slate-200">
              Ref: {refTag}
            </span>
          </div>

          {/* Buyer Target Requirement Summary */}
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start bg-orange-50/60 border border-orange-200/80 rounded-xl p-4">
              {benchmarkImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={benchmarkImageUrl}
                  alt="Buyer Benchmark Reference"
                  className="w-24 h-24 rounded-xl object-cover border border-orange-200 bg-white shrink-0"
                />
              )}
              <div className="space-y-1.5 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                  Buyer Target Requirement
                </div>
                <div className="text-base font-bold text-slate-900">
                  {reqObj?.product_name || matchedProductName}
                </div>
                <div className="text-xs text-slate-600">
                  Matched with your catalog item:{" "}
                  <strong className="text-slate-900">{matchedProductName}</strong>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {benchmarkBrand && (
                    <span className="text-[11px] bg-white border border-orange-200 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                      Benchmark: <strong>{benchmarkBrand}</strong>
                    </span>
                  )}
                  {(packagingSpec || reqObj?.volume_per_year) && (
                    <span className="text-[11px] bg-white border border-orange-200 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                      Volume / Pack:{" "}
                      <strong>{packagingSpec || reqObj?.volume_per_year}</strong>
                    </span>
                  )}
                  {certs.length > 0 && (
                    <span className="text-[11px] bg-white border border-orange-200 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                      Certifications: <strong>{certs.join(", ")}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(sellerBrief || reqObj?.message) && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sourcing Brief & Specifications
                </div>
                <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {(sellerBrief || reqObj?.message || "").slice(0, 800)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Quote & Availability Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Submit Your Commercial Response (30 Seconds)
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Confirm availability, share indicative export pricing & MOQ, or
            propose your closest catalog equivalent.
          </p>

          <SupplierMatchQuoteForm
            matchId={match.id}
            companyName={companyName}
            matchedProductName={matchedProductName}
            defaultEmail={supplierObj?.contact_email ?? ""}
            defaultPhone={supplierObj?.contact_phone ?? ""}
            existingResponse={match.supplier_response ?? null}
          />
        </div>
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { BuyerBriefView } from "@/components/brief/BuyerBriefView";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function BuyerBriefPage({ params }: PageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

  // Lookup token record
  const { data: tokenRow, error: tErr } = await supabaseAdmin
    .from("brief_tokens")
    .select("id, request_id, brief_version, expires_at, revoked_at, open_count, first_opened_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tErr || !tokenRow) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h1 className="text-lg font-bold text-slate-900">Brief Link Not Found</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            This sourcing brief link is invalid, expired, or may have been revoked. Please reach out to FoodXchange to obtain an updated link.
          </p>
          <div className="pt-2">
            <a
              href="mailto:udi@fdx.trading"
              className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Contact FoodXchange Deal Desk
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check expiration & revocation
  if (tokenRow.revoked_at || new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⏳
          </div>
          <h1 className="text-lg font-bold text-slate-900">Link Expired</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            This digital confirmation link has expired for security. Please ask your FoodXchange account manager to resend an updated link.
          </p>
          <div className="pt-2">
            <a
              href="mailto:udi@fdx.trading"
              className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Contact FoodXchange Deal Desk
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Update open metrics safely in background
  try {
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("brief_tokens")
      .update({
        first_opened_at: tokenRow.first_opened_at || nowIso,
        last_opened_at: nowIso,
        open_count: (tokenRow.open_count || 0) + 1,
      })
      .eq("id", tokenRow.id);

    if (!tokenRow.first_opened_at) {
      await supabaseAdmin.from("sourcing_request_activity").insert({
        request_id: tokenRow.request_id,
        version: tokenRow.brief_version || 1,
        type: "opened",
        actor_type: "buyer",
        actor_name: "Buyer",
        comment: "Buyer opened digital sourcing brief link",
      });
    }
  } catch (metricsErr) {
    console.warn("Failed to update token open metrics:", metricsErr);
  }

  // Fetch full request data
  const { data: request, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select(`
      id,
      product_name,
      company,
      name,
      email,
      category,
      target_market,
      packaging_preference,
      volume_per_year,
      certifications,
      message,
      brief_status,
      brief_version,
      confirmed_at,
      confirmed_by,
      created_at,
      ai_analysis,
      request_images (
        id,
        image_url,
        sort_order
      )
    `)
    .eq("id", tokenRow.request_id)
    .single();

  if (reqErr || !request) {
    notFound();
  }

  return <BuyerBriefView token={token} request={request as any} />;
}

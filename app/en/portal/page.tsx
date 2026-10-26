import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RequestsList, { type PortalRequest } from "@/components/portal/RequestsList";
import SupportForm from "@/components/portal/SupportForm";
import BuyerPortalGuidanceHeader from "@/components/buyer-portal/BuyerPortalGuidanceHeader";
import WorkflowVideoPlayer from "@/components/video/WorkflowVideoPlayer";

export default async function PortalDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/portal/login");

  if (user.email) {
    await supabaseAdmin
      .from("sourcing_requests")
      .update({ auth_user_id: user.id })
      .is("auth_user_id", null)
      .eq("email", user.email);
  }

  const { data: buyerProfile } = await supabaseAdmin
    .from("buyers")
    .select("id, contact_name, company_name, contact_email")
    .eq("contact_email", user.email ?? "")
    .single();

  const buyerId = buyerProfile?.id;

  const requestsFilter = buyerId
    ? `buyer_id.eq.${buyerId},email.eq.${user.email ?? ""}`
    : `email.eq.${user.email ?? ""}`;

  const newRequestUrl = `/en/buyers?name=${encodeURIComponent(
    buyerProfile?.contact_name ?? ""
  )}&email=${encodeURIComponent(user.email ?? "")}&company=${encodeURIComponent(
    buyerProfile?.company_name ?? ""
  )}`;

  const [{ data: rawRequests }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, product_name, category, message, status, certifications, private_label, match_count, created_at"
      )
      .or(requestsFilter)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("buyer_profiles").select("name, company").eq("id", user.id).maybeSingle(),
  ]);

  const requests = (rawRequests ?? []) as PortalRequest[];
  const greetingName = profile?.name || buyerProfile?.contact_name || user.email?.split("@")[0] || "Buyer";

  return (
    <section className="px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <BuyerPortalGuidanceHeader
          requests={requests}
          greetingName={greetingName}
          newRequestUrl={newRequestUrl}
        />

        {requests.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📑</span>
              <span>All Sourcing Briefs</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {requests.length}
              </span>
            </h2>
            <RequestsList requests={requests} />
          </div>
        )}

        <SupportForm />

        {/* Interactive Buyer Video Walkthrough */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Interactive Buyer Academy
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              End-to-End Sourcing, SI 1145 Compliance &amp; Container Tracking Walkthroughs
            </h2>
            <p className="text-xs text-slate-400">
              Switch between tracks to review sample box ordering, warehouse landed-cost simulation, and ocean container tracking.
            </p>
          </div>
          <WorkflowVideoPlayer lang="en" initialVideoId="sourcing-samples" />
        </div>
      </div>
    </section>
  );
}

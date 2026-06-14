import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RequestsList, { type PortalRequest } from "@/components/portal/RequestsList";
import SupportForm from "@/components/portal/SupportForm";

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
  const greetingName = profile?.name || user.email;

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Sourcing Requests</h1>
            <p className="text-sm text-slate-400 mt-1">Welcome back, {greetingName}</p>
          </div>
          <Link
            href={newRequestUrl}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
          >
            + New request
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="dark-card p-8 text-center">
            <p className="text-slate-200 font-medium">No requests yet</p>
            <p className="text-sm text-slate-400 mt-2 mb-5">
              Submit a sourcing request and we&apos;ll match you with verified suppliers.
            </p>
            <Link
              href={newRequestUrl}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
            >
              Submit a request →
            </Link>
          </div>
        ) : (
          <RequestsList requests={requests} />
        )}

        <SupportForm />
      </div>
    </section>
  );
}

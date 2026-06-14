import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import StatusBadge from "@/components/portal/StatusBadge";

type PortalRequest = {
  id: string;
  product_name: string | null;
  category: string | null;
  message: string | null;
  status: string | null;
  certifications: string[] | null;
  private_label: boolean | null;
  match_count: number | null;
  created_at: string;
};

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

  const [{ data: rawRequests }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, product_name, category, message, status, certifications, private_label, match_count, created_at"
      )
      .eq("email", user.email ?? "")
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
            href="/en/buyers"
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
              href="/en/buyers"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
            >
              Submit a request →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const productName = r.product_name ?? "";
              const cleanedName = productName ? cleanRequestName(productName) : "";
              const certs = r.certifications ?? [];
              const hasKosher = certs.some((c) => c.toLowerCase().includes("kosher"));
              const title =
                cleanedName || productName || r.message?.slice(0, 60) || "Sourcing request";

              return (
                <Link
                  key={r.id}
                  href={`/en/portal/requests/${r.id}`}
                  className="dark-card p-5 flex flex-col gap-2 hover:border-orange-400/40 transition block"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <h3 className="font-semibold text-white">{title}</h3>
                    <StatusBadge status={r.status} />
                  </div>

                  {(r.category || hasKosher || r.private_label) && (
                    <div className="flex flex-wrap gap-2">
                      {r.category && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-300">
                          {r.category}
                        </span>
                      )}
                      {hasKosher && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">
                          ✡ Kosher
                        </span>
                      )}
                      {r.private_label && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300">
                          Private label
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                    <span>
                      {r.match_count
                        ? `${r.match_count} match${r.match_count !== 1 ? "es" : ""}`
                        : "No matches yet"}
                    </span>
                    <span>
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

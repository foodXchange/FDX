import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NewRequestForm from "@/components/admin/NewRequestForm";

export const metadata: Metadata = { title: "New Request | Admin" };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer_id?: string; company?: string; name?: string; email?: string }>;
}) {
  const params = await searchParams;

  const { data: rawBuyers } = await supabaseAdmin
    .from("buyers")
    .select("id, company_name, contact_name, contact_email, contact_whatsapp, country, buyer_type")
    .order("company_name", { ascending: true });

  const buyers = rawBuyers ?? [];
  const initialBuyer = buyers.find((b) => b.id === params.buyer_id) ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/requests"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            ← Requests
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>✨</span>
            <span>New Sourcing Request (Machine Vision Intake)</span>
          </span>
        </div>
        {params.buyer_id && (
          <Link
            href={`/admin/buyers/${params.buyer_id}`}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline"
          >
            Buyer Profile →
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <NewRequestForm
          buyers={buyers}
          initialBuyerId={params.buyer_id ?? ""}
          initialCompany={params.company ?? initialBuyer?.company_name ?? ""}
          initialName={params.name ?? initialBuyer?.contact_name ?? ""}
          initialEmail={params.email ?? initialBuyer?.contact_email ?? ""}
        />
      </div>
    </main>
  );
}

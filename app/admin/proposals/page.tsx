import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ProposalTable from "@/components/admin/ProposalTable";

export type ProposalRow = {
  id: string;
  token: string;
  buyer_name: string;
  buyer_company: string | null;
  title: string | null;
  status: string;
  view_count: number;
  last_viewed_at: string | null;
  product_ids: string[];
  viewed_product_ids: string[];
  created_at: string;
  expires_at: string | null;
};

export default async function AdminProposalsPage() {
  const { data } = await supabaseAdmin
    .from("proposals")
    .select(
      "id,token,buyer_name,buyer_company,title,status,view_count,last_viewed_at,product_ids,viewed_product_ids,created_at,expires_at"
    )
    .order("created_at", { ascending: false });

  const proposals = (data ?? []) as ProposalRow[];
  const activeCount = proposals.filter((p) => p.status === "active").length;
  const totalViews = proposals.reduce((sum, p) => sum + p.view_count, 0);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Proposals</span>
          <span className="text-xs text-gray-400 flex gap-1.5">
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">
              {activeCount} active
            </span>
            <span className="text-gray-300">·</span>
            <span>{totalViews} total views</span>
          </span>
        </div>
        <Link
          href="/admin/catalogue"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
        >
          + New proposal
        </Link>
      </div>

      {/* TABLE */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <ProposalTable proposals={proposals} />
        </div>
      </div>
    </main>
  );
}

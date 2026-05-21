import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortfolioForm from "@/components/admin/PortfolioForm";
import { updatePortfolioItem } from "@/app/admin/portfolio/actions";
import { getItemAnalytics } from "@/lib/analytics/portfolioAnalytics";

export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("portfolio_items")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) return notFound();

  const analytics = await getItemAnalytics(data.slug as string);
  const bound = updatePortfolioItem.bind(null, id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a href="/admin/portfolio" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
          ← Portfolio
        </a>
        <span className="text-sm font-semibold text-gray-800">{data.title}</span>
        <span className="text-xs text-gray-400 ml-auto">
          Updated{" "}
          {data.updated_at
            ? new Date(data.updated_at as string).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-6 grid grid-cols-2 gap-4 mb-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-3xl font-semibold text-slate-900">{analytics.shownCount}</p>
          <p className="text-sm text-slate-500 mt-1">Times shown in matches</p>
          <p className="text-xs text-slate-400 mt-1">last 30 days</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-3xl font-semibold text-slate-900">{analytics.clickedCount}</p>
          <p className="text-sm text-slate-500 mt-1">Times clicked from matches</p>
          <p className="text-xs text-slate-400 mt-1">last 30 days</p>
        </div>
      </div>

      <PortfolioForm action={bound} initialData={data} />
    </main>
  );
}

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cardCls } from "./shared";

export async function SupplierPipelineSection() {
  const [totalResult, approvedResult, pendingResult, emptyResult, withLogoResult, withProductsResult] =
    await Promise.all([
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .in("status", ["approved", "active"]),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("qualification_status", "empty"),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .not("logo_url", "is", null),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .gt("product_count", 0),
    ]);

  const total = totalResult.count ?? 0;
  const approved = approvedResult.count ?? 0;
  const pending = pendingResult.count ?? 0;
  const empty = emptyResult.count ?? 0;
  const withLogo = withLogoResult.count ?? 0;
  const withoutLogo = total - withLogo;
  const withProducts = withProductsResult.count ?? 0;
  const withoutProducts = total - withProducts;

  const statusRows = [
    { label: "Approved", value: approved, color: "bg-green-500" },
    { label: "Pending", value: pending, color: "bg-yellow-400" },
    { label: "Empty (no qualification)", value: empty, color: "bg-gray-300" },
  ];

  const completeness = [
    { label: "With logo", value: withLogo, total },
    { label: "Without logo", value: withoutLogo, total },
    { label: "With products", value: withProducts, total },
    { label: "Without products", value: withoutProducts, total },
  ];

  return (
    <div className={`${cardCls} h-full`}>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Supplier pipeline health</h2>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Status ({total} total)</p>
      <div className="space-y-2 mb-5">
        {statusRows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">{r.label}</span>
              <span className="text-xs font-semibold text-gray-700">{r.value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`${r.color} rounded-full h-2`}
                style={{ width: `${total > 0 ? Math.round((r.value / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Completeness</p>
      <div className="grid grid-cols-2 gap-3">
        {completeness.map((c) => (
          <div key={c.label}>
            <p className="text-lg font-bold text-gray-700">
              {c.value}
              <span className="text-xs text-gray-400 font-normal">/{c.total}</span>
            </p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

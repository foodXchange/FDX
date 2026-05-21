import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SupplierRowActions from "@/components/admin/SupplierRowActions";

const COUNTRY_FLAGS: Record<string, string> = {
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  Belgium: "🇧🇪",
  Portugal: "🇵🇹",
  Greece: "🇬🇷",
  Poland: "🇵🇱",
  Turkey: "🇹🇷",
  Israel: "🇮🇱",
};

type SupplierRow = {
  id: string;
  company_name: string;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  status: string | null;
  priority: number | null;
  verified: boolean | null;
  product_type: string | null;
  private_label: boolean | null;
  markets_served: string[] | null;
  price_positioning: string | null;
  supplier_contacts: { id: string }[];
  supplier_documents: { id: string }[];
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
  const cls =
    s === "approved" || s === "active"
      ? "bg-green-100 text-green-700"
      : s === "pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>
  );
}

function ProductTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-gray-300">—</span>;
  const label =
    type === "pure_ingredient"
      ? "Pure ingredient"
      : type === "processed_food"
      ? "Processed"
      : type === "semi_processed"
      ? "Semi-processed"
      : "Mixed";
  const cls =
    type === "pure_ingredient"
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

export default async function AdminSuppliersPage() {
  const { data } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      `id, company_name, country_of_origin, categories, certifications,
       status, priority, verified, product_type, private_label,
       markets_served, price_positioning,
       supplier_contacts(id), supplier_documents(id)`
    )
    .order("priority", { ascending: false });

  const suppliers = (data ?? []) as SupplierRow[];

  const approvedCount = suppliers.filter(
    (s) => s.status === "approved" || s.status === "active"
  ).length;
  const pendingCount = suppliers.filter((s) => s.status === "pending").length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Supplier Database</span>
          <span className="text-xs text-gray-400">
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold mr-1">
              {approvedCount} approved
            </span>
            {pendingCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-semibold mr-1">
                {pendingCount} pending
              </span>
            )}
            {suppliers.length} total
          </span>
        </div>
        <Link
          href="/admin/suppliers/new"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
        >
          + Add supplier
        </Link>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {suppliers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No suppliers yet.{" "}
            <Link href="/admin/suppliers/new" className="text-orange-500 hover:underline">
              Add one
            </Link>
            .
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Company",
                    "Country",
                    "Categories",
                    "Certs",
                    "Type",
                    "Markets",
                    "Status",
                    "Prio",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => {
                  const flag = s.country_of_origin
                    ? (COUNTRY_FLAGS[s.country_of_origin] ?? "")
                    : "";
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      {/* Company */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/suppliers/${s.id}`}
                            className="font-medium text-gray-900 hover:text-orange-600 transition text-sm"
                          >
                            {s.company_name}
                          </Link>
                          {s.verified && (
                            <span
                              className="text-green-500 text-xs font-bold"
                              title="Verified"
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {flag && <span className="mr-1">{flag}</span>}
                        {s.country_of_origin ?? "—"}
                      </td>

                      {/* Categories */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(s.categories ?? []).slice(0, 2).map((c) => (
                            <span
                              key={c}
                              className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5"
                            >
                              {c}
                            </span>
                          ))}
                          {(s.categories?.length ?? 0) > 2 && (
                            <span className="text-xs text-gray-400">
                              +{(s.categories?.length ?? 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Certs */}
                      <td className="px-4 py-3">
                        <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                          {s.certifications?.length ?? 0} certs
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <ProductTypeBadge type={s.product_type} />
                      </td>

                      {/* Markets */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(s.markets_served ?? []).slice(0, 2).map((m) => (
                            <span
                              key={m}
                              className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {s.priority ?? 0}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/suppliers/${s.id}`}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Edit
                          </Link>
                          <SupplierRowActions id={s.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

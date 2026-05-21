import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SupplierRowActions from "@/components/admin/SupplierRowActions";

type SupplierRow = {
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  status: string | null;
  priority: number;
  updated_at: string | null;
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "active";
  const cls =
    s === "active"
      ? "bg-green-100 text-green-700"
      : s === "prospect"
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-gray-500";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>;
}

export default async function AdminSuppliersPage() {
  const { data } = await supabaseAdmin
    .from("suppliers")
    .select("id, name, company, country, categories, certifications, status, priority, updated_at")
    .order("priority", { ascending: false });

  const suppliers = (data ?? []) as SupplierRow[];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">
          Suppliers
          <span className="text-xs text-gray-400 font-normal ml-2">{suppliers.length} total</span>
        </span>
        <Link
          href="/admin/suppliers/new"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
        >
          + New supplier
        </Link>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
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
                  {["Name", "Company", "Country", "Categories", "Certs", "Status", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/admin/suppliers/${s.id}`}
                        className="hover:text-orange-600 transition"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.company ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.country ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
                      {s.categories?.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">
                      {s.certifications?.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

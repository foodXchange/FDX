import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 0;

const ACTION_OPTIONS = ["impersonation_started", "impersonation_ended", "acted_on_behalf"];

interface AuditLogRow {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_email: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function targetHref(row: AuditLogRow): string | null {
  if (!row.target_id) return null;
  if (row.target_type === "buyer") return `/admin/buyers/${row.target_id}`;
  if (row.target_type === "supplier") return `/admin/suppliers/${row.target_id}`;
  return null;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;

  let query = supabaseAdmin
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.action) query = query.eq("action", params.action);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", `${params.to}T23:59:59`);

  const { data, error } = await query;
  const rows = (data ?? []) as AuditLogRow[];

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Admin impersonation and act-on-behalf actions
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 mb-4" method="get">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
          <select
            name="action"
            defaultValue={params.action ?? ""}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <button
          type="submit"
          className="text-sm font-medium px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
        >
          Filter
        </button>
        {(params.action || params.from || params.to) && (
          <Link href="/admin/settings/audit-log" className="text-sm text-slate-400 hover:text-slate-600">
            Clear
          </Link>
        )}
      </form>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          Failed to load audit log: {error.message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Admin</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No audit log entries
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const href = targetHref(row);
              return (
                <tr key={row.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                    {new Date(row.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{row.admin_email}</td>
                  <td className="px-4 py-2 text-gray-700">{row.action}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {href ? (
                      <Link href={href} className="text-orange-600 hover:text-orange-700">
                        {row.target_type} →
                      </Link>
                    ) : (
                      row.target_type
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {row.target_email && <div>{row.target_email}</div>}
                    {row.metadata && Object.keys(row.metadata).length > 0 && (
                      <div className="text-xs text-gray-400 truncate max-w-xs">
                        {JSON.stringify(row.metadata)}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

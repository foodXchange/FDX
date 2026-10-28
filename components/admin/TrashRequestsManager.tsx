"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreRequestAction, permanentDeleteRequestAction } from "@/app/admin/requests/actions";

export type TrashedRequestItem = {
  id: string;
  product_name: string | null;
  company: string | null;
  name: string | null;
  email: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  brief_status: string | null;
  status: string | null;
  created_at: string;
};

export default function TrashRequestsManager({
  initialRequests,
}: {
  initialRequests: TrashedRequestItem[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<TrashedRequestItem[]>(initialRequests);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore(id: string) {
    setActingId(id);
    setActionType("restore");
    setError(null);
    try {
      const res = await restoreRequestAction(id);
      if (!res.ok) throw new Error(res.error);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to restore request");
    } finally {
      setActingId(null);
      setActionType(null);
    }
  }

  async function handlePermanentDelete(req: TrashedRequestItem) {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${req.product_name || "Untitled"}"? This will permanently erase matches, PIPs, and brief records from the database.`
      )
    ) {
      return;
    }

    setActingId(req.id);
    setActionType("delete");
    setError(null);
    try {
      const res = await permanentDeleteRequestAction(req.id);
      if (!res.ok) throw new Error(res.error);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to permanently delete request");
    } finally {
      setActingId(null);
      setActionType(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <span className="text-2xl block mb-2">🗑️</span>
        <p className="text-sm font-semibold text-slate-800">No trashed sourcing requests</p>
        <p className="text-xs text-slate-400 mt-1">Deleted requests will appear here with instant restore</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  {req.product_name || "Untitled Request"}
                </h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {req.status || "draft"}
                </span>
                {req.brief_status && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    Brief: {req.brief_status}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                {req.company && <span>🏢 {req.company}</span>}
                {req.name && <span>👤 {req.name}</span>}
                {req.email && <span>✉️ {req.email}</span>}
              </div>

              {req.deleted_at && (
                <div className="text-[11px] text-red-500 font-mono">
                  Deleted {new Date(req.deleted_at).toLocaleString("en-GB")} {req.deleted_by ? `by ${req.deleted_by}` : ""}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={actingId === req.id}
                onClick={() => handleRestore(req.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <span>↩️</span>
                <span>{actingId === req.id && actionType === "restore" ? "Restoring..." : "Restore"}</span>
              </button>

              <button
                type="button"
                disabled={actingId === req.id}
                onClick={() => handlePermanentDelete(req)}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <span>🗑️</span>
                <span>{actingId === req.id && actionType === "delete" ? "Deleting..." : "Delete Forever"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STAGE_COLORS, STAGE_LABELS, statusToStage } from "./stage";

export type PipelineRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  status: string;
  match_score: number;
  product_name: string;
  company_name: string;
  country: string | null;
  approved_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  closed_at: string | null;
  sent_via: string | null;
  buyer_company: string | null;
  buyer_product: string | null;
  buyer_id: string | null;
};

function lastUpdated(row: PipelineRow): string {
  const ts =
    row.responded_at ?? row.closed_at ?? row.sent_at ?? row.approved_at;
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function StatusBadge({ status }: { status: string }) {
  const stage = statusToStage(status);
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

function actionLabel(status: string): string | null {
  if (status === "pending" || status === "new") return "Send proposal";
  if (status === "approved") return "Send";
  if (status === "sent") return "Mark responded";
  if (status === "responded") return "Close";
  return null;
}

function actionPayload(
  status: string
): { action: string; sent_via?: string } | null {
  if (status === "pending" || status === "new") return { action: "approve" };
  if (status === "approved") return { action: "send", sent_via: "whatsapp" };
  if (status === "sent") return { action: "respond" };
  if (status === "responded") return { action: "close" };
  return null;
}

export default function PipelineTable({ rows }: { rows: PipelineRow[] }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.id, r.status]))
  );
  const [loading, setLoading] = useState<Set<string>>(new Set());

  async function handleAction(e: React.MouseEvent, row: PipelineRow) {
    e.stopPropagation();
    const status = statuses[row.id];
    const payload = actionPayload(status);
    if (!payload) return;

    setLoading((prev) => new Set([...prev, row.id]));

    const nextMap: Record<string, string> = {
      approve: "approved",
      send: "sent",
      respond: "responded",
      close: "closed",
    };
    const nextStatus = nextMap[payload.action] ?? status;

    setStatuses((prev) => ({ ...prev, [row.id]: nextStatus }));

    try {
      await fetch(`/api/matching/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [row.id]: status }));
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">No matches found.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-2 pr-4 font-medium text-gray-500">Buyer</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Product</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Supplier</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Country</th>
            <th className="pb-2 pr-4 font-medium text-gray-500 text-center">Score</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Status</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Updated</th>
            <th className="pb-2 font-medium text-gray-500 w-28"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const currentStatus = statuses[row.id];
            const label = actionLabel(currentStatus);
            const isLoading = loading.has(row.id);

            return (
              <tr
                key={row.id}
                onClick={() => router.push(`/admin/requests/${row.request_id}`)}
                className="cursor-pointer hover:bg-gray-50 transition-colors group"
              >
                <td className="py-2.5 pr-4 text-gray-600 text-xs max-w-[120px] truncate">
                  {row.buyer_id ? (
                    <Link
                      href={`/admin/buyers/${row.buyer_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-orange-600 hover:underline"
                    >
                      {row.buyer_company ?? "—"}
                    </Link>
                  ) : (
                    row.buyer_company ?? "—"
                  )}
                </td>
                <td
                  className="py-2.5 pr-4 text-gray-800 font-medium text-xs max-w-[140px] truncate"
                  title={row.product_name}
                >
                  {truncate(row.product_name, 40)}
                </td>
                <td className="py-2.5 pr-4 text-gray-700 text-xs max-w-[140px] truncate">
                  <Link
                    href={`/admin/suppliers/${row.supplier_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-orange-600 hover:underline"
                  >
                    {row.company_name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-gray-400 text-xs">
                  {row.country ?? "—"}
                </td>
                <td className="py-2.5 pr-4 text-center">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      row.match_score >= 70
                        ? "bg-green-100 text-green-700"
                        : row.match_score >= 50
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {row.match_score}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={currentStatus} />
                </td>
                <td className="py-2.5 pr-4 text-gray-400 text-xs whitespace-nowrap">
                  {lastUpdated(row)}
                </td>
                <td className="py-2.5">
                  {label && (
                    <button
                      onClick={(e) => handleAction(e, row)}
                      disabled={isLoading}
                      className="text-xs font-medium text-orange-600 border border-orange-200 hover:bg-orange-50 disabled:opacity-40 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isLoading ? "…" : label}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

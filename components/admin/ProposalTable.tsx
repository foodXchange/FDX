"use client";

import { useState } from "react";
import type { ProposalRow } from "@/app/admin/proposals/page";

interface ProposalViewEvent {
  id: string;
  event_type: string;
  product_id: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Props {
  proposals: ProposalRow[];
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function eventBadge(type: string): string {
  if (type === "page_view") return "👁️ Page view";
  if (type === "product_view") return "📦 Product view";
  if (type === "request_click") return "🟠 Request click";
  if (type === "whatsapp_click") return "💬 WhatsApp";
  return type;
}

function viewsColor(count: number): string {
  if (count === 0) return "text-slate-300";
  if (count <= 5) return "text-slate-600";
  return "text-orange-600 font-semibold";
}

export default function ProposalTable({ proposals }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, ProposalViewEvent[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function toggleAnalytics(proposalId: string) {
    if (expandedId === proposalId) {
      setExpandedId(null);
      return;
    }

    if (!events[proposalId]) {
      setLoadingId(proposalId);
      try {
        const res = await fetch(
          `/api/admin/proposals/events?id=${proposalId}`
        );
        const data = (await res.json()) as { ok: boolean; events: ProposalViewEvent[] };
        if (data.ok) {
          setEvents((prev) => ({ ...prev, [proposalId]: data.events }));
        }
      } catch {
        setEvents((prev) => ({ ...prev, [proposalId]: [] }));
      } finally {
        setLoadingId(null);
      }
    }

    setExpandedId(proposalId);
  }

  function copyLink(token: string, id: string) {
    navigator.clipboard
      .writeText(`https://fdx.trading/proposals/${token}`)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {});
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No proposals yet. Create one from the{" "}
        <a href="/admin/catalogue" className="text-orange-500 hover:underline">
          Catalogue builder
        </a>
        .
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Buyer
            </th>
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Title
            </th>
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Products
            </th>
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Views
            </th>
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Last viewed
            </th>
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Viewed
            </th>
            <th className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Status
            </th>
            <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((p) => {
            const totalProducts = (p.product_ids as string[]).length;
            const viewedProducts = (p.viewed_product_ids as string[]).length;
            const waText = encodeURIComponent(
              `Hi ${p.buyer_name}, I've put together a selection of products that might interest you. Have a look: https://fdx.trading/proposals/${p.token}`
            );
            const isExpanded = expandedId === p.id;
            const rowEvents = events[p.id] ?? [];

            return (
              <>
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{p.buyer_name}</p>
                    {p.buyer_company && (
                      <p className="text-xs text-gray-400">{p.buyer_company}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 max-w-[180px]">
                    <p className="text-gray-700 truncate">{p.title ?? "—"}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {totalProducts} products
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={viewsColor(p.view_count)}>{p.view_count}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {p.last_viewed_at ? (
                      relativeTime(p.last_viewed_at)
                    ) : (
                      <span className="text-gray-300">Not yet</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">
                    {viewedProducts}/{totalProducts} viewed
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        p.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => copyLink(p.token, p.id)}
                        className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:border-orange-300 hover:text-orange-600 transition"
                      >
                        {copiedId === p.id ? "Copied ✓" : "Copy link"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://fdx.trading/proposals/${p.token}`,
                            "_blank"
                          )
                        }
                        className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:border-slate-400 transition"
                      >
                        Preview
                      </button>
                      <a
                        href={`https://wa.me/972525222291?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-green-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-600 transition"
                      >
                        WA
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleAnalytics(p.id)}
                        disabled={loadingId === p.id}
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
                          isExpanded
                            ? "bg-slate-800 text-white"
                            : "border border-gray-200 text-gray-600 hover:border-slate-400"
                        }`}
                      >
                        {loadingId === p.id ? "..." : "Analytics"}
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded analytics row */}
                {isExpanded && (
                  <tr key={`${p.id}-analytics`} className="bg-slate-50">
                    <td colSpan={8} className="px-6 py-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        View events ({rowEvents.length})
                      </p>
                      {rowEvents.length === 0 ? (
                        <p className="text-sm text-gray-400">No events recorded yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {rowEvents.map((evt) => (
                            <div
                              key={evt.id}
                              className="flex items-center gap-3 text-xs text-gray-600"
                            >
                              <span className="text-gray-400 font-mono">
                                {new Date(evt.created_at).toLocaleTimeString()}
                              </span>
                              <span>{eventBadge(evt.event_type)}</span>
                              {evt.product_id && (
                                <span className="text-gray-400 font-mono text-[10px]">
                                  {evt.product_id.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

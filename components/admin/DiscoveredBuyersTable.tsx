"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";
import { promoteDiscoveredBuyer } from "@/app/admin/buyers/actions";

export type DiscoveredBuyerRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  business_role: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  offerings_summary: string | null;
  product_description: string | null;
  internal_notes: string | null;
  logo_url: string | null;
  is_promoted: boolean;
  promoted_buyer_id: string | null;
};

interface Props {
  initialBuyers: DiscoveredBuyerRow[];
}

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  importer: { label: "Direct Importer", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  wholesaler: { label: "Wholesaler", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  retailer: { label: "Retail / Supermarket", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  trader: { label: "Trader / Broker", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  distributor: { label: "Distributor", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

const PAGE_SIZE = 25;

export function DiscoveredBuyersTable({ initialBuyers }: Props) {
  const [buyers, setBuyers] = useState<DiscoveredBuyerRow[]>(initialBuyers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "promoted">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [promotedIds, setPromotedIds] = useState<Record<string, string>>({});
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Role counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: buyers.length, importer: 0, wholesaler: 0, retailer: 0, trader: 0, distributor: 0 };
    for (const b of buyers) {
      const r = b.business_role?.toLowerCase() || "other";
      counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }, [buyers]);

  // Filtered buyers
  const filtered = useMemo(() => {
    let result = buyers;

    if (roleFilter !== "all") {
      result = result.filter((b) => (b.business_role?.toLowerCase() || "") === roleFilter);
    }

    if (statusFilter === "ready") {
      result = result.filter((b) => !b.is_promoted && !promotedIds[b.id]);
    } else if (statusFilter === "promoted") {
      result = result.filter((b) => b.is_promoted || Boolean(promotedIds[b.id]));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((b) => {
        return (
          b.company_name.toLowerCase().includes(q) ||
          (b.country_of_origin ?? "").toLowerCase().includes(q) ||
          (b.contact_name ?? "").toLowerCase().includes(q) ||
          (b.contact_email ?? "").toLowerCase().includes(q) ||
          (b.offerings_summary ?? "").toLowerCase().includes(q) ||
          (b.product_description ?? "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [buyers, roleFilter, statusFilter, search, promotedIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handlePromote = async (item: DiscoveredBuyerRow) => {
    if (promotingId) return;
    setPromotingId(item.id);
    setActionMessage(null);

    try {
      const res = await promoteDiscoveredBuyer(item.id);
      if (res.ok) {
        setPromotedIds((prev) => ({ ...prev, [item.id]: res.buyerId }));
        // Update item in list
        setBuyers((prev) =>
          prev.map((b) =>
            b.id === item.id
              ? { ...b, is_promoted: true, promoted_buyer_id: res.buyerId }
              : b
          )
        );
        setActionMessage({
          text: `Successfully promoted "${item.company_name}" to Enterprise Buyer Directory!`,
          ok: true,
        });
      } else {
        setActionMessage({
          text: `Promotion failed: ${res.error}`,
          ok: false,
        });
      }
    } catch (e) {
      setActionMessage({
        text: `Error during promotion: ${String(e)}`,
        ok: false,
      });
    } finally {
      setPromotingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between shadow-xs transition-all ${
            actionMessage.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.ok ? "✓" : "⚠️"}</span>
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search companies, countries, contacts, products…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 self-start md:self-auto text-xs bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: "all", label: "All Status" },
                { id: "ready", label: "⚡ Ready to Promote" },
                { id: "promoted", label: "✓ Already Promoted" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStatusFilter(st.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === st.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Role Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1">Role:</span>
          {(
            [
              { key: "all", label: "All Roles", count: roleCounts.all },
              { key: "importer", label: "🚢 Direct Importers", count: roleCounts.importer },
              { key: "wholesaler", label: "🏢 Wholesalers", count: roleCounts.wholesaler },
              { key: "retailer", label: "🛒 Retailers / Chains", count: roleCounts.retailer },
              { key: "trader", label: "🤝 Traders / Brokers", count: roleCounts.trader },
              { key: "distributor", label: "🚚 Distributors", count: roleCounts.distributor },
            ] as const
          ).map((item) => {
            const active = roleFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setRoleFilter(item.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                  active
                    ? "bg-slate-900 text-white shadow-2xs font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active ? "bg-slate-700 text-slate-200" : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  {item.count ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left w-12">Logo</th>
                <th className="px-4 py-3 text-left min-w-[240px]">Company &amp; Origin</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Verified Contacts</th>
                <th className="px-4 py-3 text-left max-w-sm">Offerings &amp; Imported Products</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((item) => {
                const isPromoted = item.is_promoted || Boolean(promotedIds[item.id]);
                const buyerId = item.promoted_buyer_id || promotedIds[item.id];
                const roleMeta = ROLE_BADGES[item.business_role?.toLowerCase() || ""] ?? {
                  label: item.business_role || "Buyer Lead",
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  border: "border-slate-200",
                };

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Logo / Initials */}
                    <td className="px-4 py-3">
                      {item.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.logo_url}
                          alt=""
                          onClick={() => setLightboxImage(item.logo_url)}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                        />
                      ) : (
                        (() => {
                          const { bg, text } = avatarColors(item.company_name);
                          return (
                            <div
                              className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold ${bg} ${text}`}
                            >
                              {getInitials(item.company_name)}
                            </div>
                          );
                        })()
                      )}
                    </td>

                    {/* Company & Country */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{item.company_name}</span>
                        {item.website && (
                          <a
                            href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-orange-600 transition-colors text-xs"
                            title="Visit website"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>📍 {item.country_of_origin || "Unknown country"}</span>
                        <Link
                          href={`/admin/suppliers/${item.id}`}
                          className="text-slate-400 hover:text-slate-600 underline text-[11px]"
                        >
                          Crawl snapshot
                        </Link>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${roleMeta.bg} ${roleMeta.text} ${roleMeta.border}`}
                      >
                        {roleMeta.label}
                      </span>
                    </td>

                    {/* Verified Contacts */}
                    <td className="px-4 py-3 text-xs space-y-1">
                      {item.contact_email ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-slate-400">✉️</span>
                          <a
                            href={`mailto:${item.contact_email}`}
                            className="hover:text-orange-600 hover:underline font-mono"
                          >
                            {item.contact_email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No email</span>
                      )}

                      {item.contact_phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                          <span className="text-slate-400">📞</span>
                          <span>{item.contact_phone}</span>
                        </div>
                      )}

                      {item.contact_name && (
                        <div className="text-slate-500 font-sans">
                          👤 {item.contact_name}
                        </div>
                      )}
                    </td>

                    {/* Offerings & Scope */}
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-sm">
                      <p className="line-clamp-2 leading-relaxed">
                        {item.offerings_summary || item.product_description || "Discovered wholesale food buyer profile."}
                      </p>
                    </td>

                    {/* Action Column */}
                    <td className="px-4 py-3 text-right">
                      {isPromoted ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            ✓ Active Buyer
                          </span>
                          {buyerId && (
                            <Link
                              href={`/admin/buyers/${buyerId}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                            >
                              Manage &rarr;
                            </Link>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePromote(item)}
                          disabled={promotingId === item.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                          {promotingId === item.id ? (
                            <>
                              <span className="animate-spin text-sm">⏳</span>
                              <span>Promoting…</span>
                            </>
                          ) : (
                            <>
                              <span>🚀</span>
                              <span>Promote to Buyer</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="text-3xl mb-2">🔍</div>
            <h4 className="text-sm font-bold text-slate-800">No discovered buyers found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query, status, or role filter.
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of <span className="font-bold text-slate-800">{filtered.length}</span> wholesale buyers
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              >
                &larr; Previous
              </button>
              <span className="px-2 font-mono text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox for Logo */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import type { MatchRow } from "@/app/admin/matches/page";
import type { EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";
import BulkOutreachModal from "@/components/admin/BulkOutreachModal";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";

const PAGE_SIZE = 50;
const FOLLOW_UP_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function getMatchRefTagClient(matchId: string): string {
  return `FDX-${matchId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function buildGmailUrlClient(opts: {
  matchId: string;
  supplierEmail?: string | null;
  messageId?: string | null;
}): string {
  if (opts.messageId) {
    const cleanId = opts.messageId.replace(/^<|>$/g, "");
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      `rfc822msgid:${cleanId}`
    )}`;
  }
  const ref = getMatchRefTagClient(opts.matchId);
  if (opts.supplierEmail) {
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      `(${opts.supplierEmail} OR ${ref})`
    )}`;
  }
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(ref)}`;
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : score >= 70
      ? "text-green-700 bg-green-50 border-green-200"
      : score >= 60
      ? "text-orange-700 bg-orange-50 border-orange-200"
      : "text-red-600 bg-red-50 border-red-200";
  return (
    <span
      title={`Match Score: ${score} / 100`}
      className={`inline-flex items-center justify-center text-xs font-extrabold px-2.5 py-1 rounded-lg border ${cls}`}
    >
      {score}/100
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    responded: "bg-purple-50 text-purple-700 border-purple-200",
    closed: "bg-gray-100 text-gray-600 border-gray-200",
    suggested: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  const label =
    status === "responded"
      ? "🟢 Replied"
      : status === "sent"
      ? "📧 Sent"
      : status;
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
        map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

const SENT_VIA_ICON: Record<string, string> = { email: "📧", whatsapp: "💬" };

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function daysUntilFollowUp(sentAt: string): number {
  const elapsedMs = Date.now() - new Date(sentAt).getTime();
  const remainingMs = FOLLOW_UP_DAYS_MS - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

function SupplierAvatar({
  logoUrl,
  name,
}: {
  logoUrl?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const { bg, text } = avatarColors(name || "Supplier");

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className="w-7 h-7 rounded-full object-contain bg-white border border-gray-200 shrink-0 p-0.5"
      />
    );
  }

  return (
    <div
      className={`w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold shrink-0 ${bg} ${text}`}
    >
      {getInitials(name || "S")}
    </div>
  );
}

type PipelineBucket =
  | "all"
  | "replied"
  | "followup_due"
  | "waiting"
  | "ready_to_send"
  | "rejected";

type FilterScore = "all" | "tier1" | "tier2" | "tier3";
type ViewMode = "grouped" | "table";

interface Props {
  matches: MatchRow[];
  templates: EmailTemplateRow[];
  initialGmailConnected?: boolean;
  initialGmailUser?: string | null;
}

export default function MatchDashboardClient({
  matches,
  templates,
  initialGmailConnected = false,
  initialGmailUser = null,
}: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [bucketFilter, setBucketFilter] = useState<PipelineBucket>("all");
  const [scoreFilter, setScoreFilter] = useState<FilterScore>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [localEmails, setLocalEmails] = useState<Record<string, string>>({});
  const [findingEmailId, setFindingEmailId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalState, setBulkModalState] = useState<{
    items: MatchRow[];
    isFollowUp: boolean;
  } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Gmail connection & sync state
  const [gmailConnected, setGmailConnected] = useState(initialGmailConnected);
  const [gmailUser, setGmailUser] = useState<string | null>(initialGmailUser);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailFormUser, setGmailFormUser] = useState(initialGmailUser ?? "");
  const [gmailFormPass, setGmailFormPass] = useState("");
  const [gmailSaving, setGmailSaving] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  function getMatchBucket(m: MatchRow): PipelineBucket {
    const st = localStatuses[m.id] ?? m.status;
    if (st === "rejected" || st === "closed") return "rejected";
    if (st === "responded" || !!m.supplier_responded_at) return "replied";
    if (st === "sent" && m.sent_at) {
      const elapsed = Date.now() - new Date(m.sent_at).getTime();
      return elapsed >= FOLLOW_UP_DAYS_MS ? "followup_due" : "waiting";
    }
    return "ready_to_send";
  }

  const bucketCounts = useMemo(() => {
    const counts = {
      all: matches.length,
      replied: 0,
      followup_due: 0,
      waiting: 0,
      ready_to_send: 0,
      rejected: 0,
    };
    for (const m of matches) {
      const b = getMatchBucket(m);
      counts[b]++;
    }
    return counts;
  }, [matches, localStatuses]); // eslint-disable-line react-hooks/exhaustive-deps

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.request?.company) set.add(m.request.company);
    }
    return Array.from(set).sort();
  }, [matches]);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      const c = m.country ?? m.supplier?.country_of_origin;
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [matches]);

  const filtered = useMemo(() => {
    const sq = searchQuery.toLowerCase();
    return matches
      .filter((m) => {
        const b = getMatchBucket(m);
        if (bucketFilter !== "all" && b !== bucketFilter) return false;
        if (scoreFilter === "tier1" && m.match_score < 80) return false;
        if (
          scoreFilter === "tier2" &&
          (m.match_score < 60 || m.match_score >= 80)
        )
          return false;
        if (scoreFilter === "tier3" && m.match_score >= 60) return false;
        if (buyerFilter && m.request?.company !== buyerFilter) return false;
        if (
          countryFilter &&
          (m.country ?? m.supplier?.country_of_origin) !== countryFilter
        )
          return false;
        if (sq) {
          const haystack = [
            m.product_name,
            m.company_name,
            m.supplier?.company_name,
            m.request?.product_name,
            m.request?.company,
            m.request?.category,
            m.match_summary,
            m.supplier_message,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(sq)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  }, [
    matches,
    bucketFilter,
    scoreFilter,
    searchQuery,
    buyerFilter,
    countryFilter,
    localStatuses,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group filtered matches by Buyer Request, keeping items inside each request sorted 100 -> 10
  const groupedByRequest = useMemo(() => {
    const map = new Map<
      string,
      {
        requestId: string;
        request: MatchRow["request"];
        items: MatchRow[];
        topScore: number;
      }
    >();

    for (const m of filtered) {
      const rid = m.request_id || "unlinked";
      let group = map.get(rid);
      if (!group) {
        group = {
          requestId: rid,
          request: m.request,
          items: [],
          topScore: m.match_score,
        };
        map.set(rid, group);
      }
      group.items.push(m);
      if (m.match_score > group.topScore) group.topScore = m.match_score;
    }

    return Array.from(map.values()).sort((a, b) => b.topScore - a.topScore);
  }, [filtered]);

  const shown = filtered.slice(0, visibleCount);
  const allShownSelected =
    shown.length > 0 && shown.every((m) => selectedIds.has(m.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allShownSelected) {
        for (const m of shown) next.delete(m.id);
      } else {
        for (const m of shown) next.add(m.id);
      }
      return next;
    });
  }

  function selectGroup(items: MatchRow[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allInGroupSelected = items.every((i) => next.has(i.id));
      if (allInGroupSelected) {
        for (const i of items) next.delete(i.id);
      } else {
        for (const i of items) next.add(i.id);
      }
      return next;
    });
  }

  function selectTopTierMatches() {
    const topIds = filtered
      .filter((m) => m.match_score >= 75 && getMatchBucket(m) === "ready_to_send")
      .map((m) => m.id);
    setSelectedIds(new Set(topIds));
  }

  async function handleSaveGmailCredentials() {
    if (!gmailFormUser.trim() || !gmailFormPass.trim()) return;
    setGmailSaving(true);
    try {
      const res = await fetch("/api/admin/outreach/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_credentials",
          user: gmailFormUser.trim(),
          appPassword: gmailFormPass.trim(),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        user?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        alert(json.error ?? "Failed to save Gmail credentials");
        return;
      }
      setGmailConnected(true);
      setGmailUser(json.user ?? gmailFormUser.trim());
      setShowGmailModal(false);
      setGmailFormPass("");
      setSyncNotice("✓ Gmail connected! Emails will now be sent through your Gmail and replies will sync automatically.");
    } finally {
      setGmailSaving(false);
    }
  }

  async function handleSyncGmailReplies() {
    setSyncingGmail(true);
    setSyncNotice(null);
    try {
      const res = await fetch("/api/admin/outreach/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_replies" }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        syncedCount?: number;
        error?: string;
      };
      if (!json.ok) {
        setSyncNotice(`⚠ ${json.error ?? "Could not sync Gmail"}`);
        if (json.error?.includes("Connect Gmail")) {
          setShowGmailModal(true);
        }
        return;
      }
      const count = json.syncedCount ?? 0;
      setSyncNotice(
        count > 0
          ? `🟢 Found ${count} new supplier repl${count === 1 ? "y" : "ies"} in your Gmail!`
          : "✓ Gmail synced — no new unread supplier replies since last check."
      );
      if (count > 0) {
        setBucketFilter("replied");
        router.refresh();
      }
    } finally {
      setSyncingGmail(false);
    }
  }

  async function handleFindEmail(supplierId: string) {
    setFindingEmailId(supplierId);
    try {
      const res = await fetch("/api/admin/outreach/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "find_supplier_email",
          supplierId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        email?: string;
        error?: string;
      };
      if (json.ok && json.email) {
        setLocalEmails((prev) => ({ ...prev, [supplierId]: json.email! }));
        setSyncNotice(`✓ Found supplier email: ${json.email}`);
      } else {
        setSyncNotice(`⚠ ${json.error ?? "No public email found on website"}`);
      }
    } finally {
      setFindingEmailId(null);
    }
  }

  function handleBulkDone(matchIds: string[]) {
    setLocalStatuses((prev) => {
      const next = { ...prev };
      for (const id of matchIds) next[id] = "sent";
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of matchIds) next.delete(id);
      return next;
    });
    setBulkModalState(null);
    router.refresh();
  }

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/sourcing-matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setLocalStatuses((prev) => ({ ...prev, [id]: status }));
    } finally {
      setActionLoading(null);
    }
  }

  async function bulkUpdateStatus(ids: string[], status: string) {
    if (ids.length === 0) return;
    setActionLoading("bulk");
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/sourcing-matches/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setLocalStatuses((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = status;
        return next;
      });
    } finally {
      setActionLoading(null);
    }
  }

  function clearAll() {
    setSearchQuery("");
    setBucketFilter("all");
    setScoreFilter("all");
    setBuyerFilter("");
    setCountryFilter("");
    resetPage();
  }

  const hasActiveFilters =
    !!searchQuery ||
    bucketFilter !== "all" ||
    scoreFilter !== "all" ||
    !!buyerFilter ||
    !!countryFilter;

  return (
    <div className="space-y-4">
      {/* Gmail Status & 1-Click Sync Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lg">
            📧
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">
                Gmail Supplier Outreach &amp; Follow-Up Pipeline
              </span>
              {gmailConnected ? (
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                  ✓ Connected: {gmailUser}
                </span>
              ) : (
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                  ⚠ Gmail Not Connected Yet
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Suppliers are ranked by Match Score (<strong>100 → 10</strong>). Sent emails appear in your Gmail Sent folder and replies sync back automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {bucketCounts.ready_to_send > 0 && (
            <button
              type="button"
              onClick={selectTopTierMatches}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
            >
              ⚡ Select Top 75–100 Matches
            </button>
          )}
          <button
            type="button"
            disabled={syncingGmail}
            onClick={handleSyncGmailReplies}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
          >
            {syncingGmail ? "🔄 Checking Gmail…" : "🔄 Sync Gmail Replies"}
          </button>
          <button
            type="button"
            onClick={() => setShowGmailModal(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition"
          >
            ⚙ {gmailConnected ? "Gmail Settings" : "Connect Gmail"}
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 shadow-2xs">
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      )}

      {/* 4-Bucket Follow-Up Pipeline Tabs + View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setBucketFilter("all");
              resetPage();
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              bucketFilter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            All ({bucketCounts.all})
          </button>

          <button
            type="button"
            onClick={() => {
              setBucketFilter("replied");
              resetPage();
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              bucketFilter === "replied"
                ? "bg-purple-600 text-white border-purple-600 ring-2 ring-purple-200"
                : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
            }`}
          >
            🟢 1. Replied — Action Needed ({bucketCounts.replied})
          </button>

          <button
            type="button"
            onClick={() => {
              setBucketFilter("followup_due");
              resetPage();
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              bucketFilter === "followup_due"
                ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-200"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            🟡 2. Follow-Up Due 3d+ ({bucketCounts.followup_due})
          </button>

          <button
            type="button"
            onClick={() => {
              setBucketFilter("waiting");
              resetPage();
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              bucketFilter === "waiting"
                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
          >
            🔵 3. Waiting &lt;3d ({bucketCounts.waiting})
          </button>

          <button
            type="button"
            onClick={() => {
              setBucketFilter("ready_to_send");
              resetPage();
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              bucketFilter === "ready_to_send"
                ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            ⚪ 4. Ready to Contact ({bucketCounts.ready_to_send})
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "grouped"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            🗂 By Buyer Request ({groupedByRequest.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "table"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            ☰ Ranked Table 100→10 ({filtered.length})
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search benchmark, product, supplier, reply text..."
            className="pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white w-72"
          />
          <span className="absolute left-2.5 top-2 text-gray-400 text-xs pointer-events-none">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                resetPage();
              }}
              className="absolute right-2 top-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        <select
          value={scoreFilter}
          onChange={(e) => {
            setScoreFilter(e.target.value as FilterScore);
            resetPage();
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="all">All Scores (10–100)</option>
          <option value="tier1">Tier 1: Best Fit (80–100)</option>
          <option value="tier2">Tier 2: Strong Alternatives (60–79)</option>
          <option value="tier3">Tier 3: Exploratory (10–59)</option>
        </select>

        <CategoryCombobox
          value={buyerFilter}
          categories={uniqueBuyers.map((b) => ({ id: b, name: b }))}
          onChange={(v) => {
            setBuyerFilter(v);
            resetPage();
          }}
          placeholder="All buyers"
        />

        <CategoryCombobox
          value={countryFilter}
          categories={uniqueCountries.map((c) => ({ id: c, name: c }))}
          onChange={(v) => {
            setCountryFilter(v);
            resetPage();
          }}
          placeholder="All countries"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            Clear filters
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          Showing {filtered.length} match{filtered.length !== 1 ? "es" : ""}{" "}
          ranked 100→10
        </span>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 shadow-xs sticky top-16 z-10">
          <span className="text-sm font-bold text-orange-800">
            ✓ {selectedIds.size} supplier{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                setBulkModalState({
                  items: matches.filter((m) => selectedIds.has(m.id)),
                  isFollowUp: bucketFilter === "followup_due",
                })
              }
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
            >
              📧 Compose &amp; Send via Gmail ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() =>
                setBulkModalState({
                  items: matches.filter((m) => selectedIds.has(m.id)),
                  isFollowUp: true,
                })
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition"
            >
              ↻ Send Thread Follow-Up
            </button>
            <button
              type="button"
              disabled={actionLoading === "bulk"}
              onClick={() =>
                bulkUpdateStatus(Array.from(selectedIds), "approved")
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
            >
              ✓ Approve Selected
            </button>
            <button
              type="button"
              disabled={actionLoading === "bulk"}
              onClick={() =>
                bulkUpdateStatus(Array.from(selectedIds), "rejected")
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              ✗ Reject
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-16 text-gray-400 text-sm">
          No matches found in this bucket.
        </div>
      ) : viewMode === "grouped" ? (
        /* GROUPED BY BUYER REQUEST VIEW */
        <div className="space-y-6">
          {groupedByRequest.map((group) => {
            const req = group.request;
            const benchmarkImg = req?.reference_image_urls?.[0] ?? null;
            const allGroupSelected =
              group.items.length > 0 &&
              group.items.every((i) => selectedIds.has(i.id));
            const followUpDueInGroup = group.items.filter(
              (i) => getMatchBucket(i) === "followup_due"
            );

            return (
              <div
                key={group.requestId}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Buyer Request Header Card */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      onChange={() => selectGroup(group.items)}
                      title="Select all matches for this request"
                      className="mt-1.5 h-4 w-4 rounded border-slate-500 text-orange-500 focus:ring-orange-400"
                    />
                    {benchmarkImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={benchmarkImg}
                        alt={req?.product_name ?? "Benchmark"}
                        onClick={() => setLightboxImage(benchmarkImg)}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-orange-400/70 bg-white shrink-0 cursor-pointer hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600 flex flex-col items-center justify-center text-slate-300 shrink-0 text-[10px]">
                        <span className="text-lg">🎯</span>
                        <span>Benchmark</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-orange-400">
                          Buyer Benchmark Request
                        </span>
                        {req?.category && (
                          <span className="text-[11px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
                            {req.category}
                          </span>
                        )}
                        {req?.kosher && req.kosher !== "none" && (
                          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                            ✡ Kosher: {req.kosher}
                          </span>
                        )}
                        {req?.quantity && (
                          <span className="text-[11px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
                            📦 Qty: {req.quantity} {req.unit ?? ""}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>
                          {req?.product_name ?? "Untitled Buyer Request"}
                        </span>
                        <span className="text-xs font-normal text-slate-300">
                          — {req?.company ?? "Direct Buyer"}
                        </span>
                      </h2>

                      {req?.notes && (
                        <p className="text-xs text-slate-300 line-clamp-1 max-w-3xl">
                          {req.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Request-level quick actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {followUpDueInGroup.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setBulkModalState({
                            items: followUpDueInGroup,
                            isFollowUp: true,
                          })
                        }
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition"
                      >
                        ↻ Follow-Up Due ({followUpDueInGroup.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setBulkModalState({
                          items: group.items,
                          isFollowUp: false,
                        })
                      }
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
                    >
                      📧 Email Ranked Suppliers ({group.items.length})
                    </button>
                    {req?.id && (
                      <>
                        <Link
                          href={`/admin/products?request_id=${req.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
                        >
                          🎯 + Match Products
                        </Link>
                        <Link
                          href={`/admin/requests/${req.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
                        >
                          📄 Brief →
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Matched Supplier Products List (Ranked 100 -> 10) */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((m) => {
                    const effectiveStatus = localStatuses[m.id] ?? m.status;
                    const bucket = getMatchBucket(m);
                    const waMsg = m.whatsapp_message ?? m.match_summary ?? "";
                    const country = m.country ?? m.supplier?.country_of_origin;
                    const supplierName =
                      m.company_name ?? m.supplier?.company_name ?? "Supplier";
                    const supplierEmail =
                      localEmails[m.supplier_id] ??
                      m.supplier?.contact_email ??
                      null;
                    const reasons = m.match_breakdown?.reasons ?? [];
                    const certs =
                      m.match_breakdown?.certifications ??
                      m.supplier?.certifications ??
                      [];
                    const kosherList = m.match_breakdown?.kosher_types ?? [];
                    const replySnippet =
                      m.supplier_message ??
                      m.match_breakdown?.last_reply_snippet ??
                      null;
                    const followupCount =
                      m.match_breakdown?.followup_count ?? 0;
                    const gmailUrl = buildGmailUrlClient({
                      matchId: m.id,
                      supplierEmail,
                      messageId: m.match_breakdown?.gmail_message_id,
                    });

                    return (
                      <div
                        key={m.id}
                        className={`p-4 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                          bucket === "replied"
                            ? "bg-purple-50/30 hover:bg-purple-50/50"
                            : bucket === "followup_due"
                            ? "bg-amber-50/20 hover:bg-amber-50/40"
                            : "hover:bg-orange-50/20"
                        }`}
                      >
                        {/* Left: Checkbox + Score + Product Photo + Product & Supplier Info */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={() => toggleSelect(m.id)}
                            className="mt-2 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 shrink-0"
                          />

                          <div className="shrink-0 pt-0.5">
                            <ScoreBadge score={m.match_score} />
                          </div>

                          {/* Matched Product Photo */}
                          {m.product_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.product_image_url}
                              alt={m.product_name ?? ""}
                              onClick={() =>
                                setLightboxImage(m.product_image_url ?? null)
                              }
                              className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-white shrink-0 cursor-pointer hover:scale-105 transition"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-[10px] shrink-0">
                              <span>📦</span>
                              <span>No img</span>
                            </div>
                          )}

                          {/* Product & Supplier Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">
                                {m.product_name ?? "Catalog Product Match"}
                              </span>
                              <StatusBadge status={effectiveStatus} />
                              {bucket === "followup_due" && m.sent_at && (
                                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                                  ⏰ No reply ({relativeTime(m.sent_at)}) — Follow-Up Due
                                </span>
                              )}
                              {bucket === "waiting" && m.sent_at && (
                                <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                  {SENT_VIA_ICON[m.sent_via ?? ""] ?? "📧"} Sent{" "}
                                  {relativeTime(m.sent_at)} · Follow-up in{" "}
                                  {daysUntilFollowUp(m.sent_at)}d
                                </span>
                              )}
                              {followupCount > 0 && (
                                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Follow-ups sent: {followupCount}
                                </span>
                              )}
                            </div>

                            {/* Supplier row with logo + email */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              <SupplierAvatar
                                logoUrl={m.supplier?.logo_url}
                                name={supplierName}
                              />
                              <Link
                                href={`/admin/suppliers/${m.supplier_id}`}
                                className="font-semibold text-gray-800 hover:text-orange-600 hover:underline"
                              >
                                {supplierName}
                              </Link>
                              {country && (
                                <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-[11px]">
                                  📍 {country}
                                </span>
                              )}
                              {supplierEmail ? (
                                <span className="text-emerald-700 font-mono text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  ✉ {supplierEmail}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={findingEmailId === m.supplier_id}
                                  onClick={() => handleFindEmail(m.supplier_id)}
                                  className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 px-2 py-0.5 rounded-full transition"
                                >
                                  {findingEmailId === m.supplier_id
                                    ? "Searching website…"
                                    : "🔍 Find Email"}
                                </button>
                              )}
                              {m.supplier?.website && (
                                <a
                                  href={
                                    m.supplier.website.startsWith("http")
                                      ? m.supplier.website
                                      : `https://${m.supplier.website}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-600 hover:underline text-[11px]"
                                >
                                  Website ↗
                                </a>
                              )}
                            </div>

                            {/* Supplier Reply Snippet Box (when supplier replied in Gmail) */}
                            {replySnippet && (
                              <div className="mt-1.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-bold text-[11px] text-purple-800 uppercase tracking-wider">
                                    💬 Latest Supplier Reply{" "}
                                    {m.supplier_responded_at
                                      ? `(${relativeTime(
                                          m.supplier_responded_at
                                        )})`
                                      : ""}
                                  </span>
                                  <a
                                    href={gmailUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-purple-700 hover:underline"
                                  >
                                    Open Thread in Gmail ↗
                                  </a>
                                </div>
                                <p className="text-xs text-slate-700 line-clamp-2">
                                  {replySnippet}
                                </p>
                              </div>
                            )}

                            {/* Formats, Certs, Reasons */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {(m.product_formats ?? [])
                                .slice(0, 3)
                                .map((fmt) => (
                                  <span
                                    key={fmt}
                                    className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md"
                                  >
                                    📐 {fmt}
                                  </span>
                                ))}
                              {kosherList.map((k) => (
                                <span
                                  key={k}
                                  className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md"
                                >
                                  ✡ {k}
                                </span>
                              ))}
                              {certs.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md"
                                >
                                  ✓ {c}
                                </span>
                              ))}
                              {reasons.slice(0, 3).map((r, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {bucket === "ready_to_send" && (
                            <button
                              type="button"
                              onClick={() =>
                                setBulkModalState({
                                  items: [m],
                                  isFollowUp: false,
                                })
                              }
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition shadow-2xs"
                            >
                              📧 Send Email
                            </button>
                          )}

                          {(bucket === "followup_due" ||
                            bucket === "waiting" ||
                            bucket === "replied") && (
                            <button
                              type="button"
                              onClick={() =>
                                setBulkModalState({
                                  items: [m],
                                  isFollowUp: true,
                                })
                              }
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                                bucket === "followup_due"
                                  ? "bg-amber-500 text-white hover:bg-amber-600"
                                  : "bg-slate-900 text-white hover:bg-slate-800"
                              }`}
                            >
                              {bucket === "replied"
                                ? "↩ Reply"
                                : "↻ Follow-Up"}
                            </button>
                          )}

                          {(m.sent_at || m.supplier_responded_at || supplierEmail) && (
                            <a
                              href={gmailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open this conversation directly in your Gmail"
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                            >
                              Gmail ↗
                            </a>
                          )}

                          {waMsg && (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                waMsg
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition"
                            >
                              💬 WA ↗
                            </a>
                          )}

                          <a
                            href={`/admin/proposals/new?request=${m.request_id}&supplier=${m.supplier_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Proposal ↗
                          </a>

                          <Link
                            href={`/admin/matches/${m.id}`}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Thread →
                          </Link>

                          {effectiveStatus !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(m.id, "rejected")}
                              disabled={actionLoading === m.id}
                              title="Reject match"
                              className="text-xs font-medium px-2 py-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              ✗
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT RANKED TABLE VIEW (100 -> 10) */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {[
                  "Score (10–100)",
                  "Buyer Benchmark",
                  "Matched Product",
                  "Supplier & Email",
                  "Follow-Up Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((m) => {
                const effectiveStatus = localStatuses[m.id] ?? m.status;
                const bucket = getMatchBucket(m);
                const supplierName =
                  m.company_name ?? m.supplier?.company_name ?? "—";
                const supplierEmail =
                  localEmails[m.supplier_id] ??
                  m.supplier?.contact_email ??
                  null;
                const gmailUrl = buildGmailUrlClient({
                  matchId: m.id,
                  supplierEmail,
                  messageId: m.match_breakdown?.gmail_message_id,
                });

                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        className="rounded border-gray-300"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <ScoreBadge score={m.match_score} />
                    </td>

                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/requests/${m.request_id}`}
                        className="text-xs font-semibold text-gray-900 hover:text-orange-600 hover:underline block"
                      >
                        {m.request?.product_name ?? "—"}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {m.request?.company ?? "—"}
                      </p>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        {m.product_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.product_image_url}
                            alt=""
                            onClick={() =>
                              setLightboxImage(m.product_image_url ?? null)
                            }
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 cursor-pointer shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-xs shrink-0">
                            📦
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-900 max-w-[200px] truncate">
                            {m.product_name ?? "—"}
                          </p>
                          {(m.product_formats ?? []).length > 0 && (
                            <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                              {(m.product_formats ?? []).slice(0, 2).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <SupplierAvatar
                          logoUrl={m.supplier?.logo_url}
                          name={supplierName}
                        />
                        <div>
                          <Link
                            href={`/admin/suppliers/${m.supplier_id}`}
                            className="text-xs font-semibold text-gray-900 hover:text-orange-600 hover:underline block"
                          >
                            {supplierName}
                          </Link>
                          {supplierEmail ? (
                            <span className="text-[11px] text-emerald-700 font-mono">
                              {supplierEmail}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFindEmail(m.supplier_id)}
                              className="text-[11px] text-orange-600 hover:underline"
                            >
                              🔍 Find Email
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status={effectiveStatus} />
                      {bucket === "followup_due" && m.sent_at && (
                        <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                          ⏰ Follow-up due ({relativeTime(m.sent_at)})
                        </p>
                      )}
                      {bucket === "waiting" && m.sent_at && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Sent {relativeTime(m.sent_at)}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setBulkModalState({
                              items: [m],
                              isFollowUp: bucket !== "ready_to_send",
                            })
                          }
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition"
                        >
                          {bucket === "ready_to_send"
                            ? "📧 Email"
                            : "↻ Follow-Up"}
                        </button>
                        <a
                          href={gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        >
                          Gmail ↗
                        </a>
                        <Link
                          href={`/admin/matches/${m.id}`}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          Thread →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length > shown.length && (
            <div className="py-3 text-center border-t border-gray-100">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                Load more ({filtered.length - shown.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Smart Outreach & Follow-Up Modal */}
      {bulkModalState && (
        <BulkOutreachModal
          matches={bulkModalState.items}
          templates={templates}
          isFollowUpInitial={bulkModalState.isFollowUp}
          gmailConnected={gmailConnected}
          gmailUser={gmailUser}
          onEmailDiscovered={(supId, email) =>
            setLocalEmails((prev) => ({ ...prev, [supId]: email }))
          }
          onClose={() => setBulkModalState(null)}
          onDone={handleBulkDone}
        />
      )}

      {/* Connect Gmail App Password Modal */}
      {showGmailModal && (
        <div
          className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 p-4 backdrop-blur-2xs"
          onClick={() => setShowGmailModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Connect Your Gmail Account
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send supplier outreach directly from your Gmail (appears in
                  your Sent folder) and sync supplier replies automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGmailModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">
                60-Second Setup Instructions:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Open{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 font-semibold hover:underline"
                  >
                    Google App Passwords ↗
                  </a>
                </li>
                <li>
                  Create an app password named <strong>FoodXchange</strong>
                </li>
                <li>
                  Paste your Gmail address and the 16-character password below.
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Gmail Address
                </label>
                <input
                  type="email"
                  value={gmailFormUser}
                  onChange={(e) => setGmailFormUser(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  16-Character Google App Password
                </label>
                <input
                  type="password"
                  value={gmailFormPass}
                  onChange={(e) => setGmailFormPass(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGmailModal(false)}
                className="text-xs font-medium px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  gmailSaving || !gmailFormUser.trim() || !gmailFormPass.trim()
                }
                onClick={handleSaveGmailCredentials}
                className="text-xs font-bold px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition"
              >
                {gmailSaving ? "Saving…" : "Save & Connect Gmail"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-[85vw] max-h-[85vh] object-contain rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

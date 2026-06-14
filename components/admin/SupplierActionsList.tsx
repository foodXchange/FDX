"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UploadedFile = {
  name: string;
  url: string;
  doc_label: string | null;
  size: number;
  mime_type: string;
};

export interface SupplierActionRow {
  id: string;
  action_type: string;
  request_message: string | null;
  requested_docs: string[] | null;
  response_text: string | null;
  uploaded_files: UploadedFile[] | null;
  status: string | null;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
  resend_count: number | null;
  last_resent_at: string | null;
  revoked_at: string | null;
}

type EffectiveStatus = "pending" | "opened" | "completed" | "expired" | "revoked";

function effectiveStatus(action: SupplierActionRow): EffectiveStatus {
  if (action.status === "completed") return "completed";
  if (action.status === "revoked") return "revoked";
  if (new Date(action.expires_at) < new Date()) return "expired";
  if (action.status === "opened") return "opened";
  return "pending";
}

function daysAgo(value: string): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
}

function timeAgo(value: string): string {
  const days = daysAgo(value);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "1 month ago";
  return `${months} months ago`;
}

const STATUS_STYLES: Record<EffectiveStatus, string> = {
  pending: "bg-orange-100 text-orange-700",
  opened: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  revoked: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  pending: "Pending",
  opened: "Opened",
  completed: "Completed",
  expired: "Expired",
  revoked: "Revoked",
};

function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const MESSAGE_TRUNCATE_LENGTH = 140;

function ActionCard({ action }: { action: SupplierActionRow }) {
  const router = useRouter();
  const status = effectiveStatus(action);
  const [messageExpanded, setMessageExpanded] = useState(false);
  const [responseExpanded, setResponseExpanded] = useState(false);
  const [resending, setResending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [resent, setResent] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const displayStatus = revoked ? "revoked" : status;
  const ageDays = daysAgo(action.created_at);
  const isOverdue = (displayStatus === "pending" || displayStatus === "opened") && ageDays > 5;
  const showActions = displayStatus === "pending" || displayStatus === "opened";

  const message = action.request_message ?? "";
  const isLongMessage = message.length > MESSAGE_TRUNCATE_LENGTH;
  const displayedMessage =
    isLongMessage && !messageExpanded ? `${message.slice(0, MESSAGE_TRUNCATE_LENGTH)}…` : message;

  async function handleResend() {
    setResending(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/supplier-actions/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to resend");
      setResent(true);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Revoke this request? The supplier's link will stop working.")) return;
    setRevoking(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/supplier-actions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to revoke");
      setRevoked(true);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <StatusBadge status={displayStatus} />
        <span className="text-xs text-gray-400">Sent {timeAgo(action.created_at)}</span>
        {(action.resend_count ?? 0) > 0 && action.last_resent_at && (
          <span className="text-xs text-gray-400">
            · Resent {timeAgo(action.last_resent_at)} ({action.resend_count}x)
          </span>
        )}
        {action.responded_at && (
          <span className="text-xs text-gray-400">· Responded {timeAgo(action.responded_at)}</span>
        )}
        {isOverdue && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            No response — {ageDays} days
          </span>
        )}
      </div>

      {action.requested_docs && action.requested_docs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {action.requested_docs.map((doc) => (
            <span key={doc} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {doc}
            </span>
          ))}
        </div>
      )}

      {message && (
        <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
          {displayedMessage}
          {isLongMessage && (
            <button
              type="button"
              onClick={() => setMessageExpanded((v) => !v)}
              className="ml-1 text-orange-600 hover:text-orange-700 font-medium"
            >
              {messageExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </p>
      )}

      {status === "completed" && (
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setResponseExpanded((v) => !v)}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            {responseExpanded ? "Hide response" : "View response"}
          </button>

          {responseExpanded && (
            <div className="mt-2">
              {action.response_text && (
                <div className="bg-gray-50 rounded-md px-3 py-2 mb-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Supplier&apos;s response</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{action.response_text}</p>
                </div>
              )}
              {action.uploaded_files && action.uploaded_files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {action.uploaded_files.map((file, i) => (
                    <a
                      key={`${file.url}-${i}`}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:text-orange-700 underline"
                    >
                      {file.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}

      {showActions && (
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
          >
            {resending ? "Resending…" : resent ? "Sent ✓" : "Resend email"}
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={revoking}
            className="text-xs text-gray-500 hover:text-red-600 font-medium disabled:opacity-50"
          >
            {revoking ? "Revoking…" : "Revoke"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SupplierActionsList({ actions }: { actions: SupplierActionRow[] }) {
  if (actions.length === 0) return null;

  const completedCount = actions.filter((a) => effectiveStatus(a) === "completed").length;
  const pendingActions = actions.filter((a) => {
    const s = effectiveStatus(a);
    return s === "pending" || s === "opened";
  });
  const overdueCount = pendingActions.filter((a) => daysAgo(a.created_at) > 5).length;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-1">Document requests</h2>
      <p className="text-xs text-gray-400 mb-3">
        {actions.length} request{actions.length !== 1 ? "s" : ""} sent · {completedCount} completed ·{" "}
        {pendingActions.length} pending{overdueCount > 0 ? ` (${overdueCount} overdue)` : ""}
      </p>
      <div className="space-y-3">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

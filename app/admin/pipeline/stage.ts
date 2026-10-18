export type Stage =
  | "matched"
  | "proposal"
  | "sent"
  | "responded"
  | "closed"
  | "rejected";

export const STAGES: Stage[] = [
  "matched",
  "proposal",
  "sent",
  "responded",
  "closed",
  "rejected",
];

export const BOARD_STAGES: Stage[] = [
  "matched",
  "proposal",
  "sent",
  "responded",
  "closed",
];

export const STAGE_LABELS: Record<Stage, string> = {
  matched: "Matched",
  proposal: "Proposal",
  sent: "Outreach Sent",
  responded: "Responded",
  closed: "Deal Closed",
  rejected: "Rejected",
};

export const STAGE_ICONS: Record<Stage, string> = {
  matched: "🎯",
  proposal: "📑",
  sent: "🚀",
  responded: "💬",
  closed: "🏆",
  rejected: "✕",
};

export const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  matched: "Algorithmically matched deals ready for review",
  proposal: "Approved matches ready for outreach dispatch",
  sent: "Outreach message dispatched to supplier",
  responded: "Supplier replied with interest or pricing",
  closed: "Deal finalized & confirmed with buyer",
  rejected: "Dismissed or unsuitable matches",
};

export const STAGE_COLORS: Record<Stage, string> = {
  matched: "bg-slate-100 text-slate-700 border-slate-200",
  proposal: "bg-blue-50 text-blue-700 border-blue-200",
  sent: "bg-amber-50 text-amber-700 border-amber-200",
  responded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export const STAGE_COLUMN_COLORS: Record<Stage, { border: string; bg: string; badge: string }> = {
  matched: {
    border: "border-slate-300",
    bg: "bg-slate-50/70",
    badge: "bg-slate-200 text-slate-700",
  },
  proposal: {
    border: "border-blue-300",
    bg: "bg-blue-50/40",
    badge: "bg-blue-100 text-blue-800",
  },
  sent: {
    border: "border-amber-300",
    bg: "bg-amber-50/40",
    badge: "bg-amber-100 text-amber-800",
  },
  responded: {
    border: "border-emerald-300",
    bg: "bg-emerald-50/40",
    badge: "bg-emerald-100 text-emerald-800",
  },
  closed: {
    border: "border-purple-300",
    bg: "bg-purple-50/40",
    badge: "bg-purple-100 text-purple-800",
  },
  rejected: {
    border: "border-rose-300",
    bg: "bg-rose-50/40",
    badge: "bg-rose-100 text-rose-800",
  },
};

export function statusToStage(status: string): Stage {
  if (status === "approved") return "proposal";
  if (status === "sent") return "sent";
  if (status === "responded") return "responded";
  if (status === "closed") return "closed";
  if (status === "rejected") return "rejected";
  return "matched"; // covers "suggested", "pending", "new"
}

export function getNextActionLabel(status: string): string | null {
  const norm = status?.toLowerCase() || "suggested";
  if (norm === "suggested" || norm === "pending" || norm === "new") {
    return "Approve Proposal →";
  }
  if (norm === "approved") return "Send Outreach 🚀";
  if (norm === "sent") return "Log Response 💬";
  if (norm === "responded") return "Close Deal 🏆";
  return null;
}

export function getNextStatus(currentStatus: string): string | null {
  const norm = currentStatus?.toLowerCase() || "suggested";
  if (norm === "suggested" || norm === "pending" || norm === "new") {
    return "approved";
  }
  if (norm === "approved") return "sent";
  if (norm === "sent") return "responded";
  if (norm === "responded") return "closed";
  return null;
}

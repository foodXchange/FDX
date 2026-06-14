export type PipelineStatus = "proposed" | "countered" | "accepted" | "declined" | "closed";

export interface MatchPipelineFields {
  status: string | null;
  supplier_response: string | null;
  closed_at: string | null;
}

/**
 * Derives the buyer/supplier-facing deal pipeline status from the existing
 * admin `status` workflow plus the supplier's reply — without renaming or
 * replacing either field.
 */
export function getPipelineStatus(m: MatchPipelineFields): PipelineStatus {
  if (m.status === "closed" || m.closed_at) return "closed";
  if (m.supplier_response === "declined") return "declined";
  if (m.supplier_response === "accepted") return "accepted";
  if (m.supplier_response === "countered") return "countered";
  return "proposed";
}

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  proposed: "Proposed",
  countered: "Countered",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

export const PIPELINE_BADGE_CLASSES: Record<PipelineStatus, string> = {
  proposed: "bg-gray-100 text-gray-600 border-gray-200",
  countered: "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-600 border-red-200",
  closed: "bg-blue-50 text-blue-700 border-blue-200",
};

export const PIPELINE_ORDER: PipelineStatus[] = ["proposed", "countered", "accepted", "closed"];

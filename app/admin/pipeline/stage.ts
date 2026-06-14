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

export const STAGE_LABELS: Record<Stage, string> = {
  matched: "Matched",
  proposal: "Proposal",
  sent: "Sent",
  responded: "Responded",
  closed: "Closed",
  rejected: "Rejected",
};

export const STAGE_COLORS: Record<Stage, string> = {
  matched: "bg-gray-100 text-gray-600",
  proposal: "bg-blue-50 text-blue-700",
  sent: "bg-orange-50 text-orange-700",
  responded: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  rejected: "bg-red-50 text-red-600",
};

export function statusToStage(status: string): Stage {
  if (status === "approved") return "proposal";
  if (status === "sent") return "sent";
  if (status === "responded") return "responded";
  if (status === "closed") return "closed";
  if (status === "rejected") return "rejected";
  return "matched"; // pending / new
}

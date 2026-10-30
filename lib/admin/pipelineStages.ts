/**
 * FDX Sourcing Deal Pipeline Stages & Exception Definitions
 * Supports 11 macro stages with sub-stages, user-friendly tooltips, and terminal exception handling.
 */

export type PipelineStageId =
  | "stage_1_brief"
  | "stage_2_sourcing"
  | "stage_3_samples"
  | "stage_4_approved_samples"
  | "stage_5_qa_compliance"
  | "stage_6_packaging_graphics"
  | "stage_7_contract"
  | "stage_8_ordering_po"
  | "stage_9_shipment_tracking"
  | "stage_10_warehouse_arrival"
  | "stage_11_billing";

export type PipelineSubstageId =
  // Stage 1
  | "1.1_draft"
  | "1.2_waiting_buyer"
  | "1.3_changes_requested"
  // Stage 2
  | "2.1_matches_found"
  | "2.2_rfq_sent"
  | "2.3_replies_received"
  | "2.4_suppliers_chosen"
  // Stage 3
  | "3.1_dispatched"
  | "3.2_customs_held"
  | "3.3_customs_cleared"
  | "3.4_buyer_received"
  | "3.5_tasting_in_progress"
  // Stage 4-11 generic
  | "in_progress"
  | "completed";

export type ExceptionStatus =
  | "cancelled_by_buyer"
  | "cancelled_by_system"
  | "irrelevant";

export interface PipelineSubstageConfig {
  id: string;
  name: string;
  short: string;
  description: string;
}

export interface PipelineStageConfig {
  id: PipelineStageId;
  order: number;
  name: string;
  short: string;
  icon: string;
  color: {
    bg: string;
    text: string;
    border: string;
    dot: string;
    badgeCls: string;
    gradient: string;
  };
  tooltip: string;
  responsibleParty: "Buyer / Admin" | "Agent / Sourcing Engine" | "Factory & Courier" | "Buyer & Agent" | "QA Advisor & Factory" | "Designer, QA & Buyer" | "Buyer, Supplier & Legal" | "Buyer & Factory Finance" | "Freight Forwarder" | "Customs Broker & Logistics" | "Buyer, FDX & Factory";
  substages: PipelineSubstageConfig[];
}

export interface ExceptionStatusConfig {
  id: ExceptionStatus;
  name: string;
  short: string;
  icon: string;
  color: {
    bg: string;
    text: string;
    border: string;
    badgeCls: string;
  };
  tooltip: string;
}

export const PIPELINE_STAGES: Record<PipelineStageId, PipelineStageConfig> = {
  stage_1_brief: {
    id: "stage_1_brief",
    order: 1,
    name: "1. Brief & Draft",
    short: "1. Brief",
    icon: "📝",
    color: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-300",
      dot: "bg-slate-400",
      badgeCls: "bg-slate-100 text-slate-700 border-slate-300",
      gradient: "from-slate-500 to-slate-700",
    },
    tooltip:
      "Brief is being prepared or awaiting buyer/admin confirmation. Reverse matching is on hold until specifications are verified.",
    responsibleParty: "Buyer / Admin",
    substages: [
      { id: "1.1_draft", name: "Draft / Incomplete Specs", short: "Draft", description: "Brief is incomplete or waiting on initial buyer input" },
      { id: "1.2_waiting_buyer", name: "Waiting for Buyer Sign-off", short: "Awaiting Sign-off", description: "Brief link dispatched to buyer, awaiting confirmation" },
      { id: "1.3_changes_requested", name: "Changes Requested", short: "Changes Requested", description: "Buyer requested adjustments to specs or benchmark" },
    ],
  },
  stage_2_sourcing: {
    id: "stage_2_sourcing",
    order: 2,
    name: "2. Sourcing & Outreach",
    short: "2. Sourcing",
    icon: "🔍",
    color: {
      bg: "bg-indigo-50",
      text: "text-indigo-800",
      border: "border-indigo-300",
      dot: "bg-indigo-500",
      badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-300",
      gradient: "from-indigo-500 to-indigo-700",
    },
    tooltip:
      "Matching factories identified. RFQs are dispatched via email/WhatsApp, inbound Gmail replies are tracked, and high-scoring candidates shortlisted.",
    responsibleParty: "Agent / Sourcing Engine",
    substages: [
      { id: "2.1_matches_found", name: "2.1 Matching Suppliers Found", short: "2.1 Matches Found", description: "Theoretical capability match found in FDX catalog" },
      { id: "2.2_rfq_sent", name: "2.2 Bulk RFQ Dispatched", short: "2.2 RFQs Sent", description: "Outreach emails dispatched to selected supplier pool" },
      { id: "2.3_replies_received", name: "2.3 Supplier Responded (Gmail)", short: "2.3 Gmail Reply", description: "Supplier submitted pricing or catalog specs via email" },
      { id: "2.4_suppliers_chosen", name: "2.4 Shortlist Selected", short: "2.4 Shortlisted", description: "Top candidate suppliers selected to proceed to sampling" },
    ],
  },
  stage_3_samples: {
    id: "stage_3_samples",
    order: 3,
    name: "3. Samples Follow-up",
    short: "3. Samples",
    icon: "📦",
    color: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
      dot: "bg-amber-500",
      badgeCls: "bg-amber-50 text-amber-800 border-amber-300",
      gradient: "from-amber-500 to-orange-600",
    },
    tooltip:
      "Physical sample shipment tracking (DHL/FedEx/UPS), customs clearance, arrival confirmation with photo proof, and sensory tasting evaluation.",
    responsibleParty: "Factory & Courier",
    substages: [
      { id: "3.1_dispatched", name: "Sent by Factory (AWB Issued)", short: "Dispatched", description: "Courier tracking number issued by supplier" },
      { id: "3.2_customs_held", name: "In Destination / Customs Hold", short: "Customs Hold", description: "Arrived in destination country, pending import clearance" },
      { id: "3.3_customs_cleared", name: "Customs Cleared", short: "Cleared", description: "Released from customs and in domestic courier transit" },
      { id: "3.4_buyer_received", name: "Delivered to Buyer", short: "Delivered", description: "Arrived at buyer office/warehouse; photos uploaded" },
      { id: "3.5_tasting_in_progress", name: "Sensory Tasting & Review", short: "Tasting", description: "Buyer sensory tasting and evaluation in progress" },
    ],
  },
  stage_4_approved_samples: {
    id: "stage_4_approved_samples",
    order: 4,
    name: "4. Approved Samples",
    short: "4. Approved",
    icon: "✅",
    color: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-300",
      dot: "bg-emerald-500",
      badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-300",
      gradient: "from-emerald-500 to-teal-600",
    },
    tooltip:
      "Buyer approved physical sample formulation, taste, and packaging. Target unit pricing, payment terms, and MOQ pre-aligned.",
    responsibleParty: "Buyer & Agent",
    substages: [
      { id: "in_progress", name: "Commercial Pre-Alignment", short: "Aligning", description: "Confirming pricing, MOQ, and factory terms" },
      { id: "completed", name: "Approved to Proceed to QA", short: "Approved", description: "Greenlit to commence compliance and regulatory dossier" },
    ],
  },
  stage_5_qa_compliance: {
    id: "stage_5_qa_compliance",
    order: 5,
    name: "5. QA & Regulation",
    short: "5. QA / Reg",
    icon: "🔬",
    color: {
      bg: "bg-teal-50",
      text: "text-teal-800",
      border: "border-teal-300",
      dot: "bg-teal-500",
      badgeCls: "bg-teal-50 text-teal-700 border-teal-300",
      gradient: "from-teal-500 to-cyan-600",
    },
    tooltip:
      "Gathering factory certificates (ISO/BRC/IFS), allergens declaration, nutritional testing, Kosher supervision clearance, and Ministry of Health takin.",
    responsibleParty: "QA Advisor & Factory",
    substages: [
      { id: "in_progress", name: "Dossier Assembly & Auditing", short: "In Review", description: "Collecting factory lab tests and compliance docs" },
      { id: "completed", name: "QA & Regulatory Cleared", short: "Cleared", description: "All food safety and rabbinate approvals secured" },
    ],
  },
  stage_6_packaging_graphics: {
    id: "stage_6_packaging_graphics",
    order: 6,
    name: "6. Graphics & Packaging",
    short: "6. Packaging",
    icon: "🎨",
    color: {
      bg: "bg-cyan-50",
      text: "text-cyan-800",
      border: "border-cyan-300",
      dot: "bg-cyan-500",
      badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-300",
      gradient: "from-cyan-500 to-blue-600",
    },
    tooltip:
      "Private label die-cut dielines, label artwork, Hebrew/local language translations, barcode/EAN, and 3-way sign-off between QA, Buyer, and Factory.",
    responsibleParty: "Designer, QA & Buyer",
    substages: [
      { id: "in_progress", name: "Dieline & Artwork Formulation", short: "Artwork", description: "Designer preparing label prints according to QA specs" },
      { id: "completed", name: "Approved for Print", short: "Approved", description: "3-way signed-off for printing and production" },
    ],
  },
  stage_7_contract: {
    id: "stage_7_contract",
    order: 7,
    name: "7. Contract Signing",
    short: "7. Contract",
    icon: "📜",
    color: {
      bg: "bg-violet-50",
      text: "text-violet-800",
      border: "border-violet-300",
      dot: "bg-violet-500",
      badgeCls: "bg-violet-50 text-violet-700 border-violet-300",
      gradient: "from-violet-500 to-purple-700",
    },
    tooltip:
      "Drafting and signing commercial supply agreements, Incoterms (CIF/FOB/DDP), payment terms (LC/TT), agent commission agreements, and signed NDAs.",
    responsibleParty: "Buyer, Supplier & Legal",
    substages: [
      { id: "in_progress", name: "Legal Terms Drafting & Review", short: "Drafting", description: "Commercial terms alignment and signature collection" },
      { id: "completed", name: "Contracts Executed", short: "Signed", description: "All bilateral and tripartite contracts signed" },
    ],
  },
  stage_8_ordering_po: {
    id: "stage_8_ordering_po",
    order: 8,
    name: "8. Purchase Order (PO)",
    short: "8. PO Issued",
    icon: "📑",
    color: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      border: "border-blue-300",
      dot: "bg-blue-600",
      badgeCls: "bg-blue-50 text-blue-700 border-blue-300",
      gradient: "from-blue-600 to-indigo-700",
    },
    tooltip:
      "Buyer issues official Purchase Order (PO) and wires factory advance deposit (e.g. 30%) to trigger manufacturing on factory production lines.",
    responsibleParty: "Buyer & Factory Finance",
    substages: [
      { id: "in_progress", name: "PO Issued, Awaiting Deposit", short: "Awaiting Deposit", description: "PO generated, factory awaiting 30% wire" },
      { id: "completed", name: "Production Commenced", short: "In Production", description: "Deposit cleared and raw materials booked" },
    ],
  },
  stage_9_shipment_tracking: {
    id: "stage_9_shipment_tracking",
    order: 9,
    name: "9. Freight & Shipping",
    short: "9. Shipping",
    icon: "🚢",
    color: {
      bg: "bg-sky-50",
      text: "text-sky-800",
      border: "border-sky-300",
      dot: "bg-sky-600",
      badgeCls: "bg-sky-50 text-sky-700 border-sky-300",
      gradient: "from-sky-500 to-blue-700",
    },
    tooltip:
      "Production completed, palletized, and loaded. Tracks ocean vessel / air freight, Bill of Lading (BL), container number, and port ETA.",
    responsibleParty: "Freight Forwarder",
    substages: [
      { id: "in_progress", name: "Vessel in Transit", short: "In Transit", description: "Container sailing to destination seaport" },
      { id: "completed", name: "Arrived at Destination Port", short: "At Port", description: "Container discharged at port terminal" },
    ],
  },
  stage_10_warehouse_arrival: {
    id: "stage_10_warehouse_arrival",
    order: 10,
    name: "10. Port Customs & Warehouse",
    short: "10. Warehouse",
    icon: "🏭",
    color: {
      bg: "bg-lime-50",
      text: "text-lime-800",
      border: "border-lime-300",
      dot: "bg-lime-600",
      badgeCls: "bg-lime-50 text-lime-700 border-lime-300",
      gradient: "from-lime-600 to-green-700",
    },
    tooltip:
      "Container cleared through customs and veterinary inspections, inland drayage transport completed, and goods received at buyer's warehouse.",
    responsibleParty: "Customs Broker & Logistics",
    substages: [
      { id: "in_progress", name: "Port Customs & Inspection", short: "Customs", description: "Customs declaration, quarantine, and health clearance" },
      { id: "completed", name: "Received in Buyer Warehouse", short: "Delivered", description: "Pallets unloaded and receiving slip signed" },
    ],
  },
  stage_11_billing: {
    id: "stage_11_billing",
    order: 11,
    name: "11. Billing & Settlement",
    short: "11. Billing",
    icon: "💳",
    color: {
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      border: "border-emerald-400",
      dot: "bg-emerald-600",
      badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-400 font-bold",
      gradient: "from-emerald-600 to-teal-800",
    },
    tooltip:
      "Final balance wire (70%) settled upon warehouse inspection. Agent brokerage commission disbursed and deal successfully completed.",
    responsibleParty: "Buyer, FDX & Factory",
    substages: [
      { id: "in_progress", name: "Final Invoicing & Clearance", short: "Invoicing", description: "Verifying final commercial invoice and deductions" },
      { id: "completed", name: "Settled & Deal Completed", short: "Closed Won", description: "Commission cleared and deal archived as successful" },
    ],
  },
};

export const EXCEPTION_STATUSES: Record<ExceptionStatus, ExceptionStatusConfig> = {
  cancelled_by_buyer: {
    id: "cancelled_by_buyer",
    name: "Cancelled by Buyer",
    short: "Buyer Cancelled",
    icon: "🚫",
    color: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-300",
      badgeCls: "bg-rose-50 text-rose-700 border-rose-300",
    },
    tooltip: "Buyer formally cancelled the request, altered strategic priorities, or withdrew project budget.",
  },
  cancelled_by_system: {
    id: "cancelled_by_system",
    name: "Cancelled by System",
    short: "System Expired",
    icon: "⏱️",
    color: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-300",
      badgeCls: "bg-orange-50 text-orange-700 border-orange-300",
    },
    tooltip: "Closed by admin or system due to persistent lack of buyer response (7+ days) or missing required specifications.",
  },
  irrelevant: {
    id: "irrelevant",
    name: "Irrelevant / Archived",
    short: "Archived",
    icon: "📦",
    color: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      border: "border-gray-300",
      badgeCls: "bg-gray-100 text-gray-600 border-gray-300",
    },
    tooltip: "Marked as duplicate, non-viable, commodity mismatch, or archived test record.",
  },
};

export function getPipelineStageConfig(
  stageId?: string | null,
  exceptionStatus?: string | null
): {
  isException: boolean;
  name: string;
  short: string;
  icon: string;
  badgeCls: string;
  tooltip: string;
  order?: number;
  stageConfig?: PipelineStageConfig;
  exceptionConfig?: ExceptionStatusConfig;
} {
  if (exceptionStatus && exceptionStatus in EXCEPTION_STATUSES) {
    const ex = EXCEPTION_STATUSES[exceptionStatus as ExceptionStatus];
    return {
      isException: true,
      name: ex.name,
      short: ex.short,
      icon: ex.icon,
      badgeCls: ex.color.badgeCls,
      tooltip: ex.tooltip,
      exceptionConfig: ex,
    };
  }

  const validStageId = (stageId && stageId in PIPELINE_STAGES)
    ? (stageId as PipelineStageId)
    : "stage_1_brief";

  const stg = PIPELINE_STAGES[validStageId];
  return {
    isException: false,
    name: stg.name,
    short: stg.short,
    icon: stg.icon,
    badgeCls: stg.color.badgeCls,
    tooltip: stg.tooltip,
    order: stg.order,
    stageConfig: stg,
  };
}

export function getAllPipelineStages(): PipelineStageConfig[] {
  return Object.values(PIPELINE_STAGES).sort((a, b) => a.order - b.order);
}

export function getAllExceptionStatuses(): ExceptionStatusConfig[] {
  return Object.values(EXCEPTION_STATUSES);
}

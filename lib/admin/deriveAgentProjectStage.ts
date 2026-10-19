import type { RequestRow } from "@/app/admin/requests/page";
import type {
  CommercialOrderLifecycle,
  BuyerBriefApproval,
  SampleDispatchProtocol,
  QaRegulatoryDossier,
  PackagingArtworkWorkflow,
  OrderWorkflowStage,
} from "@/app/admin/requests/actions";

export interface AgentProjectStageInfo {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  stageName: string;
  stageShortCode: string;
  bottleneckParty: "buyer" | "factory" | "subcontractor" | "logistics" | "agent" | "clear";
  bottleneckLabel: string;
  actionMessage: string;
  urgency: "urgent" | "action_needed" | "in_transit" | "on_track";
  estimatedDealValueEur: number;
  estimatedCommissionEur: number;
  highlightDetails: string;
}

export const STAGE_DEFINITIONS: Record<
  number,
  { name: string; short: string; description: string; color: string }
> = {
  1: {
    name: "Intake & Brief Sign-Off",
    short: "Brief Sign-Off",
    description: "Benchmark vision specs and buyer sign-off",
    color: "from-blue-500 to-indigo-600",
  },
  2: {
    name: "Sourcing & Bulk RFQ",
    short: "65-100% RFQ",
    description: "Multi-supplier RFQ outreach with FDX tags",
    color: "from-indigo-500 to-purple-600",
  },
  3: {
    name: "Comparison Matrix & Margin",
    short: "Decision Matrix",
    description: "Factory quotes evaluation & agent spread",
    color: "from-purple-500 to-pink-600",
  },
  4: {
    name: "Courier Samples & Tasting",
    short: "Courier Samples",
    description: "DHL/FedEx protocol & buyer sensory tasting",
    color: "from-amber-500 to-orange-600",
  },
  5: {
    name: "QA, Regulatory & Kosher",
    short: "QA & Kosher",
    description: "ISO/BRC, MOH Takin, & Kosher clearance",
    color: "from-emerald-500 to-teal-600",
  },
  6: {
    name: "Private Label & Dieline",
    short: "Packaging Dieline",
    description: "3-Way advisory, buyer, & factory print approval",
    color: "from-teal-500 to-cyan-600",
  },
  7: {
    name: "PO & Ocean Logistics",
    short: "Ocean Freight",
    description: "Export PO, container tracking, & port delivery",
    color: "from-sky-500 to-blue-700",
  },
};

const STAGE_MAP: Record<OrderWorkflowStage, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
  intake: 1,
  reverse_matched: 2,
  rfq_dispatched: 2,
  buyer_pitched: 3,
  commercial_negotiation: 4,
  order_po_issued: 7,
  shipping_customs_warehouse: 7,
};

export function deriveAgentProjectStage(req: RequestRow): AgentProjectStageInfo {
  const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
  const orderWf = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;
  const briefAppr = (ai.buyer_brief_approval as BuyerBriefApproval | null) ?? null;
  const sampleDisp = (ai.sample_dispatch as SampleDispatchProtocol | null) ?? null;
  const qaDossier = (ai.qa_regulatory_dossier as QaRegulatoryDossier | null) ?? null;
  const pkgArtwork = (ai.packaging_artwork as PackagingArtworkWorkflow | null) ?? null;

  // 1. Determine Stage
  let stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1;

  if (orderWf?.current_stage && STAGE_MAP[orderWf.current_stage]) {
    stage = STAGE_MAP[orderWf.current_stage];
  } else if (
    orderWf?.po_number ||
    orderWf?.container_number ||
    orderWf?.production_status
  ) {
    stage = 7;
  } else if (
    pkgArtwork?.packaging_specs?.dieline_dimensions_mm ||
    pkgArtwork?.status === "artwork_approved" ||
    pkgArtwork?.status === "print_master_released"
  ) {
    stage = 6;
  } else if (
    qaDossier?.status === "approved" ||
    qaDossier?.regulatory_compliance?.moh_import_permit_status !== "not_started" ||
    qaDossier?.kosher_gateway?.audit_status !== "not_started"
  ) {
    stage = 5;
  } else if (
    sampleDisp?.shipment?.awb_tracking_number ||
    sampleDisp?.status === "in_transit" ||
    sampleDisp?.status === "delivered" ||
    sampleDisp?.status === "tasting_passed"
  ) {
    stage = 4;
  } else if ((req.replied_count ?? 0) > 0) {
    stage = 3;
  } else if ((req.sent_count ?? 0) > 0 || briefAppr?.status === "approved") {
    stage = 2;
  } else {
    stage = 1;
  }

  // 2. Determine Bottleneck & Urgency
  let bottleneckParty: "buyer" | "factory" | "subcontractor" | "logistics" | "agent" | "clear" = "agent";
  let bottleneckLabel = "Agent Action";
  let actionMessage = "Review project parameters";
  let urgency: "urgent" | "action_needed" | "in_transit" | "on_track" = "action_needed";
  let highlightDetails = "";

  switch (stage) {
    case 1: {
      if (briefAppr?.status === "approved") {
        bottleneckParty = "agent";
        bottleneckLabel = "Agent Action";
        actionMessage = "Brief approved by buyer — Launch 65-100% RFQ outreach";
        urgency = "urgent";
        highlightDetails = `Approved on ${new Date(briefAppr.approved_at || Date.now()).toLocaleDateString()}`;
      } else {
        bottleneckParty = "buyer";
        bottleneckLabel = "Waiting on Buyer";
        actionMessage = "Awaiting buyer review & sign-off on product brief";
        urgency = "action_needed";
        highlightDetails = briefAppr?.notes ? `Buyer note: "${briefAppr.notes.slice(0, 40)}..."` : "Brief drafted";
      }
      break;
    }
    case 2: {
      if ((req.sent_count ?? 0) > 0) {
        bottleneckParty = "factory";
        bottleneckLabel = "Waiting on Factories";
        actionMessage = `Awaiting quotes from ${req.sent_count} supplier(s) [FDX-REQ-${req.id.slice(0, 8).toUpperCase()}]`;
        urgency = "in_transit";
        highlightDetails = `${req.sent_count} RFQs dispatched`;
      } else if (req.match_count > 0) {
        bottleneckParty = "agent";
        bottleneckLabel = "Agent Action";
        actionMessage = `${req.match_count} qualified factory matches (Top: ${req.best_match_score ?? 80}%) — Dispatch RFQ`;
        urgency = "urgent";
        highlightDetails = `${req.match_count} suppliers eligible`;
      } else {
        bottleneckParty = "agent";
        bottleneckLabel = "Agent Action";
        actionMessage = "Run AI catalog matcher or scraper for factory discovery";
        urgency = "action_needed";
        highlightDetails = "0 matches found";
      }
      break;
    }
    case 3: {
      if ((req.replied_count ?? 0) > 0) {
        bottleneckParty = "buyer";
        bottleneckLabel = "Waiting on Buyer";
        actionMessage = `${req.replied_count} factory quote(s) in — Present Comparison Matrix & lock margin`;
        urgency = "urgent";
        highlightDetails = `${req.replied_count} factory offers evaluated`;
      } else {
        bottleneckParty = "factory";
        bottleneckLabel = "Waiting on Factories";
        actionMessage = "Quotes pending evaluation — Check Inbound AI hub";
        urgency = "action_needed";
        highlightDetails = "RFQ active";
      }
      break;
    }
    case 4: {
      if (sampleDisp?.status === "delivered" || sampleDisp?.status === "tasting_passed") {
        if (sampleDisp.sensory_evaluation?.overall_verdict === "passed") {
          bottleneckParty = "clear";
          bottleneckLabel = "Stage Cleared";
          actionMessage = "Sample tasting passed — Proceed to QA & Regulatory Dossier";
          urgency = "on_track";
          highlightDetails = `Tasting verdict: Passed`;
        } else {
          bottleneckParty = "buyer";
          bottleneckLabel = "Waiting on Buyer";
          actionMessage = `Sample delivered (${sampleDisp.shipment.courier_name ?? "Courier"}) — Awaiting buyer sensory tasting`;
          urgency = "urgent";
          highlightDetails = `AWB #${sampleDisp.shipment.awb_tracking_number || "Delivered"}`;
        }
      } else if (sampleDisp?.shipment?.awb_tracking_number) {
        bottleneckParty = "logistics";
        bottleneckLabel = "Courier in Transit";
        actionMessage = `${sampleDisp.shipment.courier_name ?? "Courier"} AWB #${sampleDisp.shipment.awb_tracking_number} in flight to buyer`;
        urgency = "in_transit";
        highlightDetails = `${sampleDisp.shipment.courier_name ?? "Express"} tracking live`;
      } else {
        bottleneckParty = "factory";
        bottleneckLabel = "Waiting on Factory";
        actionMessage = "Courier sample requested — Awaiting AWB & dispatch confirmation";
        urgency = "action_needed";
        highlightDetails = "Customs proforma sent";
      }
      break;
    }
    case 5: {
      if (qaDossier?.status === "approved" || qaDossier?.final_signoff?.is_approved) {
        bottleneckParty = "clear";
        bottleneckLabel = "Stage Cleared";
        actionMessage = "MOH, Takin & Kosher approved — Advance to Packaging";
        urgency = "on_track";
        highlightDetails = "Full compliance clearance";
      } else if (qaDossier?.kosher_gateway?.audit_status === "rabbi_audit_scheduled") {
        bottleneckParty = "subcontractor";
        bottleneckLabel = "Waiting on Kosher Subcontractor";
        actionMessage = "Kosher Rabbinate audit in progress at factory";
        urgency = "in_transit";
        highlightDetails = "Rabbinate audit active";
      } else if (qaDossier?.regulatory_compliance?.moh_import_permit_status === "under_review") {
        bottleneckParty = "subcontractor";
        bottleneckLabel = "Waiting on MOH / Lab";
        actionMessage = "Import permit application submitted to Ministry of Health";
        urgency = "in_transit";
        highlightDetails = "MOH dossier pending";
      } else {
        bottleneckParty = "factory";
        bottleneckLabel = "Waiting on Factory";
        actionMessage = "Awaiting factory specs (TDS) and QA certificates (BRC/IFS)";
        urgency = "action_needed";
        highlightDetails = "Audit documents pending";
      }
      break;
    }
    case 6: {
      if (pkgArtwork?.status === "artwork_approved" || pkgArtwork?.print_master_release?.is_released_to_factory) {
        bottleneckParty = "clear";
        bottleneckLabel = "Stage Cleared";
        actionMessage = "3-Way packaging artwork signed off — Ready to issue PO";
        urgency = "on_track";
        highlightDetails = "Print proof locked";
      } else if (pkgArtwork?.approval_gates?.food_advisory?.status !== "approved") {
        bottleneckParty = "subcontractor";
        bottleneckLabel = "Waiting on Food Advisory";
        actionMessage = "Hebrew regulatory label under review with food advisor";
        urgency = "action_needed";
        highlightDetails = "Legal advisory pending";
      } else if (pkgArtwork?.approval_gates?.buyer_marketing?.status !== "approved") {
        bottleneckParty = "buyer";
        bottleneckLabel = "Waiting on Buyer";
        actionMessage = "Awaiting buyer CEO/marketing final sign-off on dieline";
        urgency = "urgent";
        highlightDetails = "Artwork proof submitted";
      } else if (pkgArtwork?.approval_gates?.supplier_technical?.status !== "approved") {
        bottleneckParty = "factory";
        bottleneckLabel = "Waiting on Factory";
        actionMessage = "Awaiting factory print engineer sign-off on packaging foil";
        urgency = "action_needed";
        highlightDetails = "Cylinder & foil verification";
      } else {
        bottleneckParty = "agent";
        bottleneckLabel = "Agent Action";
        actionMessage = "Private label dieline in progress";
        urgency = "action_needed";
        highlightDetails = "Artwork in review";
      }
      break;
    }
    case 7: {
      if (orderWf?.delivery_status === "arrived_at_warehouse") {
        bottleneckParty = "logistics";
        bottleneckLabel = "Final Delivery";
        actionMessage = "Customs cleared at port — Goods arrived at buyer warehouse";
        urgency = "on_track";
        highlightDetails = "Delivery confirmed";
      } else if (orderWf?.container_number) {
        bottleneckParty = "logistics";
        bottleneckLabel = "Ocean Freight Live";
        actionMessage = `Container ${orderWf.container_number} on vessel ${orderWf.vessel_name ?? ""} — ETA ${orderWf.eta_port ?? "Port"}`;
        urgency = "in_transit";
        highlightDetails = `${orderWf.shipping_line ?? "Shipping Line"}`;
      } else if (orderWf?.po_number) {
        bottleneckParty = "factory";
        bottleneckLabel = "Factory Production";
        actionMessage = `PO #${orderWf.po_number} issued — Production & container loading in progress`;
        urgency = "on_track";
        highlightDetails = "30% deposit received";
      } else {
        bottleneckParty = "agent";
        bottleneckLabel = "Agent Action";
        actionMessage = "Generate Commercial PO & collect initial 30% production deposit";
        urgency = "urgent";
        highlightDetails = "PO drafting required";
      }
      break;
    }
  }

  // Financial Estimates
  const estimatedDealValueEur = orderWf?.total_order_value || 35000;
  const estimatedCommissionEur = Math.round(estimatedDealValueEur * 0.05); // 5% average agency brokerage fee

  return {
    stageNumber: stage,
    stageName: STAGE_DEFINITIONS[stage].name,
    stageShortCode: STAGE_DEFINITIONS[stage].short,
    bottleneckParty,
    bottleneckLabel,
    actionMessage,
    urgency,
    estimatedDealValueEur,
    estimatedCommissionEur,
    highlightDetails,
  };
}

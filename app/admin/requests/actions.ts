"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getAdminEmail } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
import { groupImages } from "@/lib/pip/groupImages";
import { runMatchV3 } from "@/lib/matching/runMatchV3";
import {
  getSupplierContactEmail,
  getSupplierContactPhone,
} from "@/lib/email/supplierOutreach";
import {
  sendSupplierEmailSmart,
  getMatchRefTag,
} from "@/lib/email/gmailEngine";
import { renderTemplate } from "@/lib/outreach/renderTemplate";
import { waLink } from "@/lib/outreach/waLink";
import {
  CHASER_TEMPLATES,
  detectSupplierLanguage,
  evaluateFollowUpUrgency,
  type ChaserLanguage,
  type ChaserRound,
} from "@/lib/outreach/chaserTemplates";


export async function updateRequestStatus(
  id: string,
  status: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("updateRequestStatus error:", error);
    return { ok: false, error: error.message };
  }

  try {
    revalidatePath("/admin/requests");
  } catch {}
  return { ok: true };
}

export interface CreateQuickBuyerInput {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_whatsapp?: string | null;
  country?: string | null;
  buyer_type?: string | null;
}

export async function createQuickBuyer(
  input: CreateQuickBuyerInput
): Promise<
  | {
      ok: true;
      buyer: {
        id: string;
        company_name: string;
        contact_name: string;
        contact_email: string;
        country: string | null;
        buyer_type: string | null;
      };
    }
  | { ok: false; error: string }
> {
  if (!input.company_name?.trim() || !input.contact_email?.trim()) {
    return { ok: false, error: "Company name and email are required" };
  }

  const { data: newBuyer, error } = await supabaseAdmin
    .from("buyers")
    .insert({
      company_name: input.company_name.trim(),
      contact_name: input.contact_name.trim() || input.company_name.trim(),
      contact_email: input.contact_email.trim().toLowerCase(),
      contact_whatsapp: input.contact_whatsapp?.trim() || null,
      country: input.country?.trim() || "Israel",
      buyer_type: input.buyer_type || "retail_chain",
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, company_name, contact_name, contact_email, country, buyer_type")
    .single();

  if (error || !newBuyer) {
    console.error("createQuickBuyer error:", error);
    return { ok: false, error: error?.message ?? "Failed to create buyer" };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "create_buyer",
    targetType: "buyer",
    targetId: newBuyer.id,
    targetEmail: newBuyer.contact_email,
    metadata: { company_name: newBuyer.company_name },
  });

  try {
    revalidatePath("/admin/buyers");
  } catch {}
  return { ok: true, buyer: newBuyer };
}

export interface CreateRequestForBuyerInput {
  buyer_id: string;
  name: string;
  email: string | null;
  company: string | null;
  product_name: string | null;
  category: string | null;
  benchmark_brand?: string | null;
  packaging_preference?: string | null;
  volume_per_year?: string | null;
  message: string | null;
  certifications: string[];
  target_market: string | null;
  private_label: boolean | null;
  image_urls?: string[];
  ai_analysis?: Record<string, unknown> | null;
  seller_brief?: string | null;
}

export async function createRequestForBuyer(
  input: CreateRequestForBuyerInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("contact_email, company_name")
    .eq("id", input.buyer_id)
    .single();

  const autoBrief =
    input.seller_brief ||
    (typeof input.ai_analysis?.seller_brief === "string" ? input.ai_analysis.seller_brief : "") ||
    `Hello! We are working with ${input.company || buyer?.company_name || "a qualified retail buyer"} in ${input.target_market ?? "Israel"} actively sourcing ${input.product_name ?? "Food & Beverage products"}${input.benchmark_brand ? ` (benchmarking quality similar to ${input.benchmark_brand})` : ""}. Packaging: ${input.packaging_preference ?? "Standard retail packaging"}. Brand: ${input.private_label === false ? "Supplier Brand" : input.private_label === true ? "Private Label" : "Open"}. Compliance: ${input.certifications.length > 0 ? input.certifications.join(", ") : "Standard export quality"}${input.volume_per_year ? ` for an estimated volume of ${input.volume_per_year}` : ""}. If your factory produces an equivalent line, please send specs and terms!`;

  const enrichedAiAnalysis: Record<string, unknown> = {
    ...(input.ai_analysis ?? {}),
    ...(input.benchmark_brand ? { benchmark_brand: input.benchmark_brand } : {}),
    seller_brief: autoBrief,
    ...(input.packaging_preference ? { packaging_format: input.packaging_preference } : {}),
  };

  const { data: newRequest, error } = await supabaseAdmin
    .from("sourcing_requests")
    .insert({
      buyer_id: input.buyer_id,
      name: input.name,
      email: input.email,
      company: input.company || buyer?.company_name || null,
      product_name: input.product_name,
      category: input.category,
      message: input.message,
      certifications: input.certifications,
      target_market: input.target_market,
      private_label: input.private_label,
      packaging_preference: input.packaging_preference || null,
      volume_per_year: input.volume_per_year || null,
      ai_analysis: Object.keys(enrichedAiAnalysis).length > 0 ? enrichedAiAnalysis : null,
      source: "admin_on_behalf",
      status: "new",
    })
    .select("id")
    .single();

  if (error || !newRequest) {
    console.error("createRequestForBuyer error:", error);
    return { ok: false, error: error?.message ?? "Failed to create request" };
  }

  // 1. Insert image URLs if provided
  if (input.image_urls && input.image_urls.length > 0) {
    try {
      await supabaseAdmin.from("request_images").insert(
        input.image_urls.map((url) => ({
          request_id: newRequest.id,
          url,
          ai_analysis: input.ai_analysis ?? null,
        }))
      );
    } catch (imgErr) {
      console.warn("Failed to insert request_images:", imgErr);
    }
  }

  // 2. Build PIP v1, resolve canonical category, and store intent_json
  try {
    const pip = buildPipV1({
      product_name: input.product_name ?? null,
      message: input.message ?? null,
      category: input.category ?? null,
      certifications: input.certifications,
      target_market: input.target_market ?? null,
      private_label: input.private_label ?? null,
      ai_analysis: enrichedAiAnalysis,
    });

    if (input.volume_per_year) {
      pip.commercial.volume = input.volume_per_year;
    }

    const extraTokens: string[] = [];
    if (input.benchmark_brand) extraTokens.push(`Benchmark profile similar to ${input.benchmark_brand}`);
    if (input.packaging_preference) extraTokens.push(`Packaging: ${input.packaging_preference}`);
    for (const cert of input.certifications) {
      extraTokens.push(`cert:${cert}`);
    }
    pip.match_config.nice_to_have = Array.from(
      new Set([...pip.match_config.nice_to_have, ...extraTokens])
    );

    const categoryClassificationText = [
      input.product_name,
      input.benchmark_brand,
      input.category,
      input.message,
    ]
      .filter(Boolean)
      .join(" — ");

    const { category_id, category_name } = await resolveCategoryId(categoryClassificationText);
    if (category_id) {
      pip.category.category_id = category_id;
      pip.category.category_name = category_name;
    }

    await supabaseAdmin
      .from("sourcing_requests")
      .update({
        intent_json: pip,
        ...(category_name && !input.category ? { category: category_name } : {}),
      })
      .eq("id", newRequest.id);

    // Run image grouping if images exist
    if (input.image_urls && input.image_urls.length > 0) {
      try {
        await groupImages(newRequest.id);
      } catch (err) {
        console.warn("groupImages failed (continuing to match):", err);
      }
    }

    // Run reverse-matching v3
    await runMatchV3(newRequest.id);
  } catch (matchErr) {
    console.error("Automated PIP / match generation error:", matchErr);
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "acted_on_behalf",
    targetType: "buyer",
    targetId: input.buyer_id,
    targetEmail: (buyer?.contact_email as string | null) ?? null,
    metadata: {
      sourcing_request_id: newRequest.id,
      product_name: input.product_name,
      note: "Submitted request on behalf of buyer with machine vision and reverse-matched",
    },
  });

  try {
    revalidatePath("/admin/requests");
  } catch {}
  return { ok: true, id: newRequest.id as string };
}

export type OrderWorkflowStage =
  | "intake"
  | "reverse_matched"
  | "rfq_dispatched"
  | "buyer_pitched"
  | "commercial_negotiation"
  | "order_po_issued"
  | "shipping_customs_warehouse";

export interface FinancialMilestoneWire {
  status?: "pending_buyer_wire" | "wire_submitted_by_buyer" | "cleared_in_escrow" | "released_to_factory" | "pending_bl_copy";
  buyer_wire_amount?: number;
  agent_commission_amount?: number;
  factory_wire_amount?: number;
  swift_mt103_reference?: string;
  uetr_reference?: string;
  remitter_bank?: string;
  beneficiary_bank?: string;
  wire_date?: string;
  cleared_date?: string;
  wire_slip_url?: string;
  notes?: string;
}

export interface FinancialClearanceLifecycle {
  buyer_unit_price?: number;
  factory_unit_price?: number;
  agent_margin_per_unit?: number;
  total_units?: number;
  gross_buyer_contract_value?: number;
  factory_contract_cost?: number;
  total_agent_brokerage_pool?: number;
  advance_milestone_30?: FinancialMilestoneWire;
  balance_milestone_70?: FinancialMilestoneWire;
  ncnda_signed?: boolean;
  ncnda_signed_at?: string;
  escrow_split_verified?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface CommercialOrderLifecycle {
  current_stage: OrderWorkflowStage;
  selected_supplier_id?: string | null;
  selected_supplier_name?: string | null;
  agreed_product_name?: string | null;
  agreed_unit_price?: string | null;
  currency?: string | null;
  order_volume?: string | null;
  total_order_value?: number | null;
  incoterms?: string | null;
  payment_terms?: string | null;
  po_number?: string | null;
  po_date?: string | null;
  production_status?: "queued" | "in_production" | "qc_inspection_passed" | "ready_to_load";
  production_milestones?: {
    deposit_transferred?: boolean;
    raw_materials_procured?: boolean;
    bottling_completed?: boolean;
    psi_inspection_passed?: boolean;
    container_loaded?: boolean;
  };
  shipping_line?: string | null;
  vessel_name?: string | null;
  container_number?: string | null;
  container_type?: string | null;
  bill_of_lading?: string | null;
  bill_of_lading_url?: string | null;
  port_of_origin?: string | null;
  port_of_destination?: string | null;
  buyer_warehouse_address?: string | null;
  etd?: string | null;
  eta_port?: string | null;
  customs_status?: "pending_documents" | "customs_broker_clearing" | "customs_cleared" | "inspection_hold";
  customs_declaration_number?: string | null;
  delivery_status?: "at_port" | "inland_trucking" | "arrived_at_warehouse";
  arrived_at?: string | null;
  warehouse_pallet_count?: number | null;
  goods_accepted_by?: string | null;
  logistics_notes?: string | null;
  financial_clearance?: FinancialClearanceLifecycle;
  updated_at?: string;
  updated_by?: string;
}

export interface UpdateOrderWorkflowInput {
  requestId: string;
  workflow: CommercialOrderLifecycle;
}

export async function updateRequestOrderWorkflow(
  input: UpdateOrderWorkflowInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("ai_analysis, intent_json, company")
    .eq("id", input.requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAiAnalysis = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const updatedAiAnalysis = {
    ...existingAiAnalysis,
    order_workflow: {
      ...input.workflow,
      updated_at: new Date().toISOString(),
      updated_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ ai_analysis: updatedAiAnalysis })
    .eq("id", input.requestId);

  if (updateErr) {
    console.error("updateRequestOrderWorkflow error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "update_order_workflow",
    targetType: "sourcing_request",
    targetId: input.requestId,
    metadata: {
      stage: input.workflow.current_stage,
      po_number: input.workflow.po_number,
      container_number: input.workflow.container_number,
    },
  });

  try {
    revalidatePath(`/admin/requests/${input.requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}

export interface BuyerBriefApproval {
  status: "draft" | "submitted_to_buyer" | "approved";
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
}

export async function updateBuyerBriefApproval(
  requestId: string,
  approval: BuyerBriefApproval
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("ai_analysis")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAiAnalysis = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const updatedAiAnalysis = {
    ...existingAiAnalysis,
    buyer_brief_approval: {
      ...approval,
      updated_at: new Date().toISOString(),
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ ai_analysis: updatedAiAnalysis })
    .eq("id", requestId);

  if (updateErr) {
    console.error("updateBuyerBriefApproval error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "approve_buyer_brief",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: { status: approval.status, approved_by: approval.approved_by },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}

export interface SupplierQuotePayload {
  unit_price: number | null;
  currency: string;
  net_weight: string | null;
  packaging_format: string | null;
  moq: string | null;
  lead_time_weeks?: number | null;
  incoterm?: string | null;
  kosher_type?: string | null;
  certifications?: string[];
  cooperation_status: "cooperating" | "counter_offer" | "declined";
  supplier_notes?: string | null;
}

export async function recordSupplierQuote(
  matchId: string,
  quote: SupplierQuotePayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: match, error: fetchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, request_id, match_breakdown, company_name")
    .eq("id", matchId)
    .single();

  if (fetchErr || !match) {
    return { ok: false, error: fetchErr?.message || "Match not found" };
  }

  const existingBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
  const updatedBreakdown = {
    ...existingBreakdown,
    quote: {
      ...quote,
      quoted_at: new Date().toISOString(),
      recorded_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_matches")
    .update({
      match_breakdown: updatedBreakdown,
      supplier_response: quote.cooperation_status === "declined" ? "declined" : "accepted",
      supplier_message: quote.supplier_notes ?? null,
      supplier_responded_at: new Date().toISOString(),
      status: "responded",
    })
    .eq("id", matchId);

  if (updateErr) {
    console.error("recordSupplierQuote error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "record_supplier_quote",
    targetType: "sourcing_match",
    targetId: matchId,
    metadata: {
      supplier_name: match.company_name,
      unit_price: quote.unit_price,
      currency: quote.currency,
    },
  });

  try {
    revalidatePath(`/admin/requests/${match.request_id}`);
  } catch {}

  return { ok: true };
}

export interface AgentQuotationMargin {
  margin_type: "markup" | "percentage";
  margin_value: number;
  factory_cost: number;
  buyer_quoted_price: number;
  currency: string;
  container_units: number;
  container_profit_eur: number;
  payment_terms: string;
  incoterms: string;
  valid_days: number;
  notes?: string;
  updated_at?: string;
  updated_by?: string;
}

export async function saveAgentQuotationMargin(
  matchId: string,
  margin: AgentQuotationMargin
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: match, error: fetchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, request_id, match_breakdown, company_name")
    .eq("id", matchId)
    .single();

  if (fetchErr || !match) {
    return { ok: false, error: fetchErr?.message || "Match not found" };
  }

  const existingBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
  const updatedBreakdown = {
    ...existingBreakdown,
    agent_margin: {
      ...margin,
      updated_at: new Date().toISOString(),
      updated_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_matches")
    .update({
      match_breakdown: updatedBreakdown,
    })
    .eq("id", matchId);

  if (updateErr) {
    console.error("saveAgentQuotationMargin error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "save_agent_quotation_margin",
    targetType: "sourcing_match",
    targetId: matchId,
    metadata: {
      factory_cost: margin.factory_cost,
      buyer_quoted_price: margin.buyer_quoted_price,
      profit_eur: margin.container_profit_eur,
      margin_type: margin.margin_type,
    },
  });

  try {
    revalidatePath(`/admin/requests/${match.request_id}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}

export interface SampleDispatchProtocol {
  status:
    | "pre_alignment"
    | "instructions_issued"
    | "in_transit"
    | "delivered"
    | "tasting_passed"
    | "tasting_rejected";
  selected_supplier?: {
    match_id?: string;
    supplier_id?: string;
    company_name?: string;
    product_name?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  commercial_pre_alignment: {
    unit_price?: number | null;
    currency?: string;
    pack_weight?: string;
    payment_terms?: string;
    moq?: string;
    kosher_type?: string;
    organic?: boolean;
    gluten_free?: boolean;
    aligned_at?: string | null;
    aligned_by?: string | null;
    is_aligned: boolean;
  };
  courier_instructions: {
    courier_name: "DHL Express" | "FedEx" | "UPS" | "TNT" | "Aramex" | "Other";
    courier_account_number?: string;
    bill_recipient: "buyer_account" | "factory_prepaid" | "broker_account";
    declared_value_eur: number;
    customs_declaration_text: string;
    awb_description: string;
    hs_code_suggestion?: string;
    consignee: {
      company: string;
      contact_person: string;
      phone: string;
      email: string;
      address_line1: string;
      address_city: string;
      address_country: string;
      postal_code: string;
    };
    breakage_packaging_mandate: string;
    issued_at?: string | null;
  };
  shipment: {
    courier_name?: string;
    awb_tracking_number?: string;
    awb_tracking_url?: string;
    proforma_invoice_url?: string;
    dispatched_date?: string | null;
    estimated_arrival_date?: string | null;
    delivered_date?: string | null;
  };
  sensory_evaluation: {
    evaluator_name?: string;
    evaluated_at?: string | null;
    taste_score: number; // 1-5
    texture_score: number; // 1-5
    aroma_score: number; // 1-5
    packaging_score: number; // 1-5
    overall_verdict: "passed" | "rejected" | "reformulation_needed" | "pending";
    notes?: string;
    approved_for_qa: boolean;
  };
  updated_at?: string;
  updated_by?: string;
}

export async function updateSampleDispatchProtocol(
  requestId: string,
  protocol: SampleDispatchProtocol
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("ai_analysis, company, product_name")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAiAnalysis = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const updatedAiAnalysis = {
    ...existingAiAnalysis,
    sample_dispatch: {
      ...protocol,
      updated_at: new Date().toISOString(),
      updated_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ ai_analysis: updatedAiAnalysis })
    .eq("id", requestId);

  if (updateErr) {
    console.error("updateSampleDispatchProtocol error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "update_sample_dispatch_protocol",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      status: protocol.status,
      courier: protocol.courier_instructions.courier_name,
      awb: protocol.shipment.awb_tracking_number,
      verdict: protocol.sensory_evaluation.overall_verdict,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}

export interface FactoryCertificateItem {
  id: string;
  name: "BRCGS" | "IFS Food" | "ISO 22000" | "HACCP" | "GMP" | "FSSC 22000" | "Other";
  issuer?: string;
  certificate_number?: string;
  grade?: string; // e.g. "Grade AA", "Higher Level (98.5%)"
  valid_until?: string;
  file_url?: string;
  status: "verified" | "pending_review" | "expired" | "not_provided";
}

export interface QaRegulatoryDossier {
  status:
    | "in_progress"
    | "documents_submitted"
    | "regulatory_review"
    | "approved"
    | "rejected";
  factory_safety: {
    certificates: FactoryCertificateItem[];
    technical_data_sheet_url?: string;
    allergen_matrix_url?: string;
    microbiological_lab_url?: string;
    pesticide_screening_url?: string;
    shelf_life_months?: number;
    storage_conditions?: string;
  };
  regulatory_compliance: {
    target_country: string;
    moh_import_permit_status:
      | "not_started"
      | "dossier_submitted"
      | "under_review"
      | "approved"
      | "clarifications_needed";
    moh_file_number?: string;
    moh_permit_url?: string;
    takin_standard_number?: string;
    takin_compliance_status: "compliant" | "lab_test_pending" | "exempt";
    agricultural_permit_required: boolean;
    agricultural_permit_status?: "approved" | "pending" | "not_required";
    organic_eu_equivalence_verified: boolean;
  };
  kosher_gateway: {
    is_kosher_required: boolean;
    kosher_type: string;
    supervising_agency: string;
    audit_status:
      | "not_started"
      | "raw_materials_approved"
      | "rabbi_audit_scheduled"
      | "rabbi_audit_completed"
      | "certificate_issued";
    rabbi_inspector_name?: string;
    audit_scheduled_date?: string;
    production_supervision_type:
      | "year_round_kosher"
      | "special_kosher_run"
      | "kashering_required";
    kosher_certificate_url?: string;
    kosher_notes?: string;
  };
  final_signoff: {
    is_approved: boolean;
    approved_at?: string | null;
    approved_by?: string | null;
    qa_director_notes?: string;
  };
  updated_at?: string;
  updated_by?: string;
}

export async function updateQaRegulatoryDossier(
  requestId: string,
  dossier: QaRegulatoryDossier
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("ai_analysis, company, product_name")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAiAnalysis = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const updatedAiAnalysis = {
    ...existingAiAnalysis,
    qa_regulatory_dossier: {
      ...dossier,
      updated_at: new Date().toISOString(),
      updated_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ ai_analysis: updatedAiAnalysis })
    .eq("id", requestId);

  if (updateErr) {
    console.error("updateQaRegulatoryDossier error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "update_qa_regulatory_dossier",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      status: dossier.status,
      moh_status: dossier.regulatory_compliance.moh_import_permit_status,
      kosher_status: dossier.kosher_gateway.audit_status,
      is_approved: dossier.final_signoff.is_approved,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}

export interface PackagingArtworkWorkflow {
  status:
    | "dieline_staging"
    | "food_advisory_review"
    | "buyer_marketing_review"
    | "supplier_technical_proof"
    | "artwork_approved"
    | "print_master_released";
  packaging_specs: {
    packaging_type:
      | "PET Bottle"
      | "Glass Jar"
      | "Tin Can"
      | "Flexible Foil / Pouch"
      | "Tetra Pak"
      | "Corrugated Box"
      | "Other";
    dieline_template_url?: string;
    dieline_dimensions_mm?: string;
    artwork_pdf_url?: string;
    artwork_version: number;
    barcode_ean13?: string;
    inkjet_zone_position?: string;
    cylinder_unwind_direction?: "1" | "2" | "3" | "4" | "sheet_fed";
    color_profile?: "CMYK + 2 Pantone" | "CMYK" | "Pantone Spot Colors";
  };
  approval_gates: {
    food_advisory: {
      status: "pending" | "approved" | "changes_requested";
      advisory_company_name: string;
      reviewed_by?: string;
      reviewed_at?: string | null;
      hebrew_nutrition_table_verified: boolean;
      allergen_bolding_verified: boolean;
      legal_origin_marking_verified: boolean;
      front_warning_labels_verified: boolean;
      notes?: string;
    };
    buyer_marketing: {
      status: "pending" | "approved" | "changes_requested";
      approver_name: string;
      reviewed_at?: string | null;
      brand_compliance_verified: boolean;
      finish_and_coating: "Glossy" | "Matte" | "Soft-touch" | "Metallic Foil Stamp";
      notes?: string;
    };
    supplier_technical: {
      status: "pending" | "approved" | "changes_requested";
      factory_print_engineer_name?: string;
      reviewed_at?: string | null;
      roll_unwinding_confirmed: boolean;
      inkjet_code_gap_confirmed: boolean;
      die_cut_tolerances_confirmed: boolean;
      notes?: string;
    };
  };
  print_master_release: {
    is_released_to_factory: boolean;
    released_at?: string | null;
    released_by?: string | null;
    signed_proof_pdf_url?: string;
  };
  updated_at?: string;
  updated_by?: string;
}

export async function updatePackagingArtworkWorkflow(
  requestId: string,
  artwork: PackagingArtworkWorkflow
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("ai_analysis, company, product_name")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAiAnalysis = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const updatedAiAnalysis = {
    ...existingAiAnalysis,
    packaging_artwork: {
      ...artwork,
      updated_at: new Date().toISOString(),
      updated_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ ai_analysis: updatedAiAnalysis })
    .eq("id", requestId);

  if (updateErr) {
    console.error("updatePackagingArtworkWorkflow error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "update_packaging_artwork_workflow",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      status: artwork.status,
      version: artwork.packaging_specs.artwork_version,
      is_released: artwork.print_master_release.is_released_to_factory,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}


// ==========================================
// AUTOMATED SUPPLIER FOLLOW-UP & CHASER QUEUE
// ==========================================

export interface SendSupplierFollowUpInput {
  matchId: string;
  requestId: string;
  channel: "email" | "whatsapp";
  language?: ChaserLanguage;
  round?: ChaserRound;
  customSubject?: string;
  customMessage?: string;
}

export interface SendSupplierFollowUpResult {
  ok: boolean;
  error?: string;
  channel: "email" | "whatsapp";
  round: ChaserRound;
  language: ChaserLanguage;
  waUrl?: string;
  subject?: string;
  via?: "gmail" | "resend" | "whatsapp";
}

export async function sendSupplierFollowUp(
  input: SendSupplierFollowUpInput
): Promise<SendSupplierFollowUpResult> {
  const { matchId, requestId, channel, customSubject, customMessage } = input;

  const { data: match, error: matchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select(`
      id, request_id, supplier_id, status, product_name, company_name, country, match_score, sent_at, match_breakdown,
      request:sourcing_requests(id, product_name, category, kosher_type, certifications, volume_per_year, packaging_preference, message, ai_analysis)
    `)
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return {
      ok: false,
      error: matchErr?.message || "Match not found",
      channel,
      round: input.round ?? 1,
      language: input.language ?? "en",
    };
  }

  const assessment = evaluateFollowUpUrgency(match as any);
  const round: ChaserRound = input.round ?? assessment.recommendedRound ?? 1;
  const language: ChaserLanguage = input.language ?? detectSupplierLanguage(match.country);

  const rawReq = Array.isArray(match.request) ? match.request[0] : match.request;
  const reqImages = await supabaseAdmin
    .from("request_images")
    .select("url")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .limit(1);

  const reqObj = rawReq
    ? {
        id: rawReq.id,
        product_name: rawReq.product_name,
        category: rawReq.category,
        kosher: rawReq.kosher_type,
        certifications: rawReq.certifications,
        quantity: rawReq.volume_per_year,
        unit: rawReq.packaging_preference,
        notes: rawReq.message,
        reference_image_urls: reqImages.data?.map((i) => i.url) ?? null,
      }
    : null;

  const specsParts: string[] = [];
  if (reqObj?.kosher && reqObj.kosher !== "none") specsParts.push(`Kosher (${reqObj.kosher})`);
  if (reqObj?.certifications && reqObj.certifications.length > 0) {
    specsParts.push(reqObj.certifications.join(", "));
  }
  if (reqObj?.quantity) specsParts.push(`Qty: ${reqObj.quantity} ${reqObj.unit ?? ""}`.trim());
  const specsSummary = specsParts.length > 0 ? specsParts.join(" · ") : "Standard export specifications, Kosher preferred";

  const refTag = getMatchRefTag(match.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fdx.trading";
  const portalUrl = `${appUrl}/supplier-match/${match.id}`;

  const vars: Record<string, string> = {
    company_name: match.company_name ?? "Supplier Team",
    product_name: match.product_name ?? reqObj?.product_name ?? "food products",
    buyer_product: reqObj?.product_name ?? match.product_name ?? "food item",
    category: reqObj?.category ?? "Food & Beverage",
    specs_summary: specsSummary,
    country: match.country ?? "",
    match_score: String(match.match_score ?? 100),
    ref_tag: refTag,
    portal_url: portalUrl,
  };

  const templateObj = CHASER_TEMPLATES[round][language];
  const renderedSubject = customSubject?.trim() || renderTemplate(templateObj.subject, vars);
  const renderedBody =
    customMessage?.trim() ||
    renderTemplate(channel === "whatsapp" ? templateObj.whatsAppText : templateObj.body, vars);

  const prevBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
  const prevFollowUps = Array.isArray(prevBreakdown.follow_ups) ? prevBreakdown.follow_ups : [];
  const prevCount = typeof prevBreakdown.followup_count === "number" ? prevBreakdown.followup_count : prevFollowUps.length;
  const now = new Date().toISOString();

  if (channel === "whatsapp") {
    const contactPhone = await getSupplierContactPhone(match.supplier_id);
    const waUrl = waLink(contactPhone, renderedBody);

    const updatedFollowUps = [
      ...prevFollowUps,
      {
        date: now,
        channel: "whatsapp",
        round,
        language,
        recipient: contactPhone,
        notes: renderedBody.slice(0, 100),
      },
    ];

    const updatedBreakdown = {
      ...prevBreakdown,
      follow_ups: updatedFollowUps,
      follow_up_count: prevCount + 1,
      followup_count: prevCount + 1,
      last_follow_up_at: now,
      last_outreach_at: now,
    };

    await supabaseAdmin
      .from("sourcing_matches")
      .update({
        match_breakdown: updatedBreakdown,
        sent_at: now,
        sent_via: "whatsapp",
      })
      .eq("id", match.id);

    await supabaseAdmin.from("match_messages").insert({
      match_id: match.id,
      sender_type: "admin",
      message: `[Follow-Up Round ${round} via WHATSAPP (${language.toUpperCase()}) → ${contactPhone ?? match.company_name}]

${renderedBody}`,
    });

    try {
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath("/admin/requests");
    } catch {}

    return {
      ok: true,
      channel: "whatsapp",
      round,
      language,
      waUrl,
      via: "whatsapp",
    };
  }

  // Email channel
  const contactEmail = await getSupplierContactEmail(match.supplier_id);
  if (!contactEmail) {
    return {
      ok: false,
      error: "No contact email on file for this supplier. Please update supplier contact or use WhatsApp.",
      channel: "email",
      round,
      language,
    };
  }

  const prevMessageId = typeof prevBreakdown.gmail_message_id === "string" ? prevBreakdown.gmail_message_id : null;
  const prevBody = typeof prevBreakdown.last_outreach_body === "string" ? prevBreakdown.last_outreach_body : null;

  const sendResult = await sendSupplierEmailSmart({
    matchId: match.id,
    to: contactEmail,
    subject: renderedSubject,
    bodyText: renderedBody,
    isFollowUp: true,
    previousMessageId: prevMessageId,
    previousSentAt: match.sent_at,
    previousBodyText: prevBody,
  });

  if (!sendResult.success) {
    return {
      ok: false,
      error: sendResult.error || "Failed to send follow-up email",
      channel: "email",
      round,
      language,
    };
  }

  const updatedFollowUps = [
    ...prevFollowUps,
    {
      date: now,
      channel: "email",
      round,
      language,
      subject: sendResult.subjectUsed ?? renderedSubject,
      messageId: sendResult.messageId,
      recipient: contactEmail,
      via: sendResult.via,
    },
  ];

  const updatedBreakdown = {
    ...prevBreakdown,
    follow_ups: updatedFollowUps,
    follow_up_count: prevCount + 1,
    followup_count: prevCount + 1,
    last_follow_up_at: now,
    last_outreach_at: now,
    last_outreach_email: contactEmail,
    last_outreach_body: renderedBody,
    gmail_message_id: sendResult.messageId ?? prevBreakdown.gmail_message_id,
    gmail_subject: sendResult.subjectUsed ?? renderedSubject,
  };

  await supabaseAdmin
    .from("sourcing_matches")
    .update({
      match_breakdown: updatedBreakdown,
      sent_at: now,
      sent_via: "email",
    })
    .eq("id", match.id);

  await supabaseAdmin.from("match_messages").insert({
    match_id: match.id,
    sender_type: "admin",
    message: `[Follow-Up Round ${round} via EMAIL (${language.toUpperCase()}) → ${contactEmail}]
Subject: ${sendResult.subjectUsed ?? renderedSubject}

${renderedBody}`,
  });

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "send_supplier_followup",
    targetType: "sourcing_match",
    targetId: match.id,
    metadata: {
      round,
      language,
      via: sendResult.via,
      to: contactEmail,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return {
    ok: true,
    channel: "email",
    round,
    language,
    subject: sendResult.subjectUsed ?? renderedSubject,
    via: sendResult.via,
  };
}

export interface SendBulkSupplierFollowUpsInput {
  requestId: string;
  matchIds: string[];
  preferredLanguage?: "auto" | ChaserLanguage;
  preferredRound?: "auto" | ChaserRound;
}

export interface SendBulkSupplierFollowUpsResult {
  ok: boolean;
  sent: number;
  failed: number;
  results: Array<{
    matchId: string;
    companyName: string | null;
    success: boolean;
    error?: string;
    via?: "gmail" | "resend" | "whatsapp";
    language: ChaserLanguage;
    round: ChaserRound;
  }>;
}

export async function sendBulkSupplierFollowUps(
  input: SendBulkSupplierFollowUpsInput
): Promise<SendBulkSupplierFollowUpsResult> {
  const { requestId, matchIds, preferredLanguage = "auto", preferredRound = "auto" } = input;
  const results: SendBulkSupplierFollowUpsResult["results"] = [];

  for (const matchId of matchIds) {
    try {
      const { data: match } = await supabaseAdmin
        .from("sourcing_matches")
        .select("company_name, country, status, sent_at, match_breakdown")
        .eq("id", matchId)
        .maybeSingle();

      const assessment = evaluateFollowUpUrgency((match as any) ?? { status: "sent" });
      const targetRound: ChaserRound =
        preferredRound === "auto" ? assessment.recommendedRound || 1 : preferredRound;
      const targetLang: ChaserLanguage =
        preferredLanguage === "auto"
          ? detectSupplierLanguage(match?.country)
          : preferredLanguage;

      const res = await sendSupplierFollowUp({
        matchId,
        requestId,
        channel: "email",
        round: targetRound,
        language: targetLang,
      });

      results.push({
        matchId,
        companyName: match?.company_name ?? null,
        success: res.ok,
        error: res.error,
        via: res.via,
        language: res.language,
        round: res.round,
      });
    } catch (err: unknown) {
      results.push({
        matchId,
        companyName: null,
        success: false,
        error: err instanceof Error ? err.message : "Follow-up error",
        language: "en",
        round: 1,
      });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return {
    ok: true,
    sent,
    failed,
    results,
  };
}

export async function updateOrderFinancialClearance(
  requestId: string,
  financial: FinancialClearanceLifecycle
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("ai_analysis, company, product_name")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAiAnalysis = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const existingOrderWorkflow =
    typeof existingAiAnalysis.order_workflow === "object" && existingAiAnalysis.order_workflow !== null
      ? (existingAiAnalysis.order_workflow as Record<string, unknown>)
      : {};

  const updatedAiAnalysis = {
    ...existingAiAnalysis,
    order_workflow: {
      ...existingOrderWorkflow,
      financial_clearance: {
        ...financial,
        updated_at: new Date().toISOString(),
        updated_by: getAdminEmail() || "admin",
      },
      updated_at: new Date().toISOString(),
      updated_by: getAdminEmail() || "admin",
    },
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ ai_analysis: updatedAiAnalysis })
    .eq("id", requestId);

  if (updateErr) {
    console.error("updateOrderFinancialClearance error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "update_order_financial_clearance",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      buyer_total: financial.gross_buyer_contract_value,
      agent_pool: financial.total_agent_brokerage_pool,
      advance_status: financial.advance_milestone_30?.status,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true };
}

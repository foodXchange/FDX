"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getAdminEmail } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
import { groupImages } from "@/lib/pip/groupImages";
import { runMatchV3 } from "@/lib/matching/runMatchV3";

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

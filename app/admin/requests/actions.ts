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
  incoterms?: string | null;
  payment_terms?: string | null;
  po_number?: string | null;
  po_date?: string | null;
  production_status?: "queued" | "in_production" | "qc_inspection_passed" | "ready_to_load";
  shipping_line?: string | null;
  vessel_name?: string | null;
  container_number?: string | null;
  container_type?: string | null;
  bill_of_lading?: string | null;
  port_of_origin?: string | null;
  port_of_destination?: string | null;
  buyer_warehouse_address?: string | null;
  etd?: string | null;
  eta_port?: string | null;
  customs_status?: "pending_documents" | "customs_broker_clearing" | "customs_cleared" | "inspection_hold";
  delivery_status?: "at_port" | "inland_trucking" | "arrived_at_warehouse";
  arrived_at?: string | null;
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

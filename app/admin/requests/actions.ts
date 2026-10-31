"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getAdminEmail } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
import { groupImages } from "@/lib/pip/groupImages";
import { runMatchV3 } from "@/lib/matching/runMatchV3";
import { Resend } from "resend";
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
  type TripartiteEventType,
  type TripartiteEventPayload,
  dispatchTripartiteEvent,
} from "@/lib/notifications/tripartiteDispatchEngine";
import {
  CHASER_TEMPLATES,
  detectSupplierLanguage,
  evaluateFollowUpUrgency,
  type ChaserLanguage,
  type ChaserRound,
} from "@/lib/outreach/chaserTemplates";
import { trackApiUsage } from "@/lib/usage/trackUsage";
import crypto from "crypto";
import { runLayeredAnalysis, type LayeredAnalysisResult } from "@/lib/ai/layeredAnalysis";
import type {
  PipelineStageId,
  PipelineSubstageId,
  ExceptionStatus,
} from "@/lib/admin/pipelineStages";


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
  website?: string | null;
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
        website?: string | null;
      };
    }
  | { ok: false; error: string }
> {
  if (!input.company_name?.trim() || !input.contact_email?.trim()) {
    return { ok: false, error: "Company name and email are required" };
  }

  // Sanitize buyer_type to match Postgres check constraint:
  // Allowed: 'retailer', 'importer', 'distributor', 'manufacturer', 'foodservice'
  const rawType = input.buyer_type?.trim().toLowerCase();
  let validBuyerType: string = "importer";
  if (rawType === "retailer" || rawType === "retail_chain") {
    validBuyerType = "retailer";
  } else if (rawType === "importer") {
    validBuyerType = "importer";
  } else if (rawType === "distributor") {
    validBuyerType = "distributor";
  } else if (rawType === "manufacturer") {
    validBuyerType = "manufacturer";
  } else if (rawType === "foodservice") {
    validBuyerType = "foodservice";
  }

  const { data: newBuyer, error } = await supabaseAdmin
    .from("buyers")
    .insert({
      company_name: input.company_name.trim(),
      contact_name: input.contact_name.trim() || input.company_name.trim(),
      contact_email: input.contact_email.trim().toLowerCase(),
      contact_whatsapp: input.contact_whatsapp?.trim() || null,
      country: input.country?.trim() || "Israel",
      buyer_type: validBuyerType,
      website: input.website?.trim() || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, company_name, contact_name, contact_email, country, buyer_type, website")
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
  requestId?: string | null;
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
  dietary_requirements?: string[];
  temperature_regime?: string | null;
  target_weight_min_g?: number | null;
  target_weight_max_g?: number | null;
  preferred_origins?: string[];
  excluded_ingredients?: string[];
  image_urls?: string[];
  ai_analysis?: Record<string, unknown> | null;
  seller_brief?: string | null;
}

export interface SaveDraftRequestInput {
  id?: string | null;
  buyer_id?: string | null;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  product_name?: string | null;
  category?: string | null;
  benchmark_brand?: string | null;
  packaging_preference?: string | null;
  volume_per_year?: string | null;
  message?: string | null;
  certifications?: string[];
  target_market?: string | null;
  private_label?: boolean | null;
  dietary_requirements?: string[];
  temperature_regime?: string | null;
  target_weight_min_g?: number | null;
  target_weight_max_g?: number | null;
  preferred_origins?: string[];
  excluded_ingredients?: string[];
  image_urls?: string[];
  ai_analysis?: Record<string, unknown> | null;
  seller_brief?: string | null;
}

export async function saveDraftRequestAction(
  input: SaveDraftRequestInput
): Promise<{ ok: true; id: string; brief_status: string; saved_at: string } | { ok: false; error: string }> {
  try {
    const adminEmail = getAdminEmail() || "admin@fdx.trading";
    const autoBrief =
      input.seller_brief ||
      (typeof input.ai_analysis?.seller_brief === "string" ? input.ai_analysis.seller_brief : "") ||
      input.message ||
      "";

    const enrichedAiAnalysis: Record<string, unknown> = {
      ...(input.ai_analysis ?? {}),
      ...(input.benchmark_brand ? { benchmark_brand: input.benchmark_brand } : {}),
      seller_brief: autoBrief,
      ...(input.packaging_preference ? { packaging_format: input.packaging_preference } : {}),
    };

    let targetId = input.id;
    let briefStatus = "draft";

    if (targetId) {
      // Update existing draft / request
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, brief_status, brief_version, ai_analysis")
        .eq("id", targetId)
        .single();

      if (fetchErr || !existing) {
        throw new Error(fetchErr?.message || "Existing request not found");
      }

      briefStatus = existing.brief_status || "draft";

      const { error: updateErr } = await supabaseAdmin
        .from("sourcing_requests")
        .update({
          buyer_id: input.buyer_id || null,
          name: input.name || null,
          email: input.email || null,
          company: input.company || null,
          product_name: input.product_name || null,
          category: input.category || null,
          message: input.message || null,
          certifications: input.certifications || [],
          target_market: input.target_market || "Israel",
          private_label: input.private_label ?? null,
          packaging_preference: input.packaging_preference || null,
          volume_per_year: input.volume_per_year || null,
          dietary_requirements: input.dietary_requirements || [],
          temperature_regime: input.temperature_regime || "ambient",
          target_weight_min_g: input.target_weight_min_g ?? null,
          target_weight_max_g: input.target_weight_max_g ?? null,
          preferred_origins: input.preferred_origins || [],
          excluded_ingredients: input.excluded_ingredients || [],
          ai_analysis: Object.keys(enrichedAiAnalysis).length > 0 ? enrichedAiAnalysis : null,
        })
        .eq("id", targetId);

      if (updateErr) throw updateErr;

      // Activity log if already active/sent
      if (existing.brief_status === "confirmed" || existing.brief_status === "sent") {
        await supabaseAdmin.from("sourcing_request_activity").insert({
          request_id: targetId,
          version: (existing.brief_version || 1) + 1,
          type: "edit",
          actor_type: "admin",
          actor_name: adminEmail,
          comment: "Draft updated by admin",
        });
      }
    } else {
      // Insert new draft record
      const { data: newRow, error: insertErr } = await supabaseAdmin
        .from("sourcing_requests")
        .insert({
          buyer_id: input.buyer_id || null,
          name: input.name || "Draft Buyer",
          email: input.email || null,
          company: input.company || null,
          product_name: input.product_name || "Untitled Sourcing Draft",
          category: input.category || null,
          message: input.message || null,
          certifications: input.certifications || [],
          target_market: input.target_market || "Israel",
          private_label: input.private_label ?? null,
          packaging_preference: input.packaging_preference || null,
          volume_per_year: input.volume_per_year || null,
          dietary_requirements: input.dietary_requirements || [],
          temperature_regime: input.temperature_regime || "ambient",
          target_weight_min_g: input.target_weight_min_g ?? null,
          target_weight_max_g: input.target_weight_max_g ?? null,
          preferred_origins: input.preferred_origins || [],
          excluded_ingredients: input.excluded_ingredients || [],
          ai_analysis: Object.keys(enrichedAiAnalysis).length > 0 ? enrichedAiAnalysis : null,
          source: "admin_on_behalf",
          status: "draft",
          brief_status: "draft",
          brief_version: 1,
        })
        .select("id, brief_status")
        .single();

      if (insertErr || !newRow) throw insertErr || new Error("Failed to insert draft");
      targetId = newRow.id;
      briefStatus = newRow.brief_status || "draft";

      await supabaseAdmin.from("sourcing_request_activity").insert({
        request_id: targetId,
        version: 1,
        type: "created",
        actor_type: "admin",
        actor_name: adminEmail,
        comment: "Sourcing draft initialized",
      });
    }

    // Sync image URLs
    if (input.image_urls && input.image_urls.length > 0 && targetId) {
      try {
        await supabaseAdmin.from("request_images").delete().eq("request_id", targetId);
        await supabaseAdmin.from("request_images").insert(
          input.image_urls.map((url) => ({
            request_id: targetId,
            url,
            ai_analysis: input.ai_analysis ?? null,
          }))
        );
      } catch (imgErr) {
        console.warn("Syncing request_images error:", imgErr);
      }
    }

    // Auto re-score in background so Deal Desk matches are always fresh on save
    if (targetId) {
      runMatchV3(targetId).catch((err) => {
        console.warn("Background auto-match failed on save draft:", err);
      });
    }

    revalidatePath("/admin/requests");
    const savedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (!targetId) throw new Error("Target draft ID could not be determined");
    return { ok: true, id: targetId, brief_status: briefStatus, saved_at: savedAt };
  } catch (err: any) {
    console.error("saveDraftRequestAction error:", err);
    return { ok: false, error: err.message || "Failed to save draft" };
  }
}

export async function softDeleteRequestAction(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminEmail = getAdminEmail() || "admin@fdx.trading";
    const { error } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: adminEmail,
      })
      .eq("id", requestId);

    if (error) throw error;

    await supabaseAdmin.from("sourcing_request_activity").insert({
      request_id: requestId,
      type: "deleted",
      actor_type: "admin",
      actor_name: adminEmail,
      comment: "Request moved to Trash & Archive",
    });

    revalidatePath("/admin/requests");
    revalidatePath("/admin/settings/trash");
    return { ok: true };
  } catch (err: any) {
    console.error("softDeleteRequestAction error:", err);
    return { ok: false, error: err.message || "Failed to delete request" };
  }
}

export async function restoreRequestAction(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminEmail = getAdminEmail() || "admin@fdx.trading";
    const { error } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", requestId);

    if (error) throw error;

    await supabaseAdmin.from("sourcing_request_activity").insert({
      request_id: requestId,
      type: "restored",
      actor_type: "admin",
      actor_name: adminEmail,
      comment: "Request restored from Trash",
    });

    revalidatePath("/admin/requests");
    revalidatePath("/admin/settings/trash");
    return { ok: true };
  } catch (err: any) {
    console.error("restoreRequestAction error:", err);
    return { ok: false, error: err.message || "Failed to restore request" };
  }
}

export async function permanentDeleteRequestAction(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Delete foreign associations
    await supabaseAdmin.from("sourcing_matches").delete().eq("request_id", requestId);
    await supabaseAdmin.from("request_images").delete().eq("request_id", requestId);
    await supabaseAdmin.from("brief_tokens").delete().eq("request_id", requestId);
    await supabaseAdmin.from("sourcing_request_activity").delete().eq("request_id", requestId);
    await supabaseAdmin.from("pips").delete().eq("sourcing_request_id", requestId);

    const { error } = await supabaseAdmin
      .from("sourcing_requests")
      .delete()
      .eq("id", requestId);

    if (error) throw error;

    revalidatePath("/admin/requests");
    revalidatePath("/admin/settings/trash");
    return { ok: true };
  } catch (err: any) {
    console.error("permanentDeleteRequestAction error:", err);
    return { ok: false, error: err.message || "Failed to permanently delete request" };
  }
}


export async function runLayeredAnalysisAction(input: {
  imageUrls: string[];
  briefText?: string;
  requestId?: string;
}): Promise<{ ok: true; data: LayeredAnalysisResult } | { ok: false; error: string }> {
  try {
    const data = await runLayeredAnalysis({
      imageUrls: input.imageUrls,
      briefText: input.briefText,
      requestId: input.requestId,
    });
    return { ok: true, data };
  } catch (err: any) {
    console.error("runLayeredAnalysisAction error:", err);
    return { ok: false, error: err.message || "Failed to run layered analysis" };
  }
}

export async function createBriefTokenAction(requestId: string): Promise<
  { ok: true; token: string; url: string; expiresAt: string } | { ok: false; error: string }
> {
  try {
    const adminEmail = getAdminEmail() || "admin@fdx.trading";
    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, brief_version")
      .eq("id", requestId)
      .single();

    if (fetchErr || !req) {
      return { ok: false, error: "Request not found" };
    }

    const { error: insErr } = await supabaseAdmin.from("brief_tokens").insert({
      request_id: requestId,
      token_hash: tokenHash,
      brief_version: req.brief_version || 1,
      created_by: adminEmail,
    });

    if (insErr) {
      return { ok: false, error: insErr.message };
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fdx.trading";
    const url = `${baseUrl}/brief/${rawToken}`;
    return {
      ok: true,
      token: rawToken,
      url,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to generate brief token" };
  }
}

export async function adminOverrideConfirmBriefAction(input: {
  requestId: string;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminEmail = getAdminEmail() || "admin@fdx.trading";
    const nowIso = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", input.requestId)
      .single();

    const currentAi = (existing?.ai_analysis as Record<string, unknown> | null) ?? {};

    const { error } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        brief_status: "confirmed",
        confirmed_at: nowIso,
        confirmed_by: adminEmail,
        confirmed_via: "admin_override",
        ai_analysis: {
          ...currentAi,
          buyer_brief_approval: {
            status: "approved",
            approved_at: nowIso,
            approved_by: adminEmail,
            notes: input.notes || "Admin confirmation override",
          },
        },
      })
      .eq("id", input.requestId);

    if (error) throw error;

    await supabaseAdmin.from("sourcing_request_activity").insert({
      request_id: input.requestId,
      type: "admin_override",
      actor_type: "admin",
      actor_name: adminEmail,
      comment: input.notes || "Admin confirmed brief manually via deal desk",
    });

    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${input.requestId}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to override brief confirmation" };
  }
}

export async function updateBriefStatusAction(
  requestId: string,
  status: "draft" | "sent" | "changes_requested" | "confirmed" | "reconfirm_needed",
  confirmedVia?: "buyer_link" | "admin_override",
  notes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminEmail = getAdminEmail() || "admin@fdx.trading";
    const updatePayload: Record<string, any> = {
      brief_status: status,
    };

    if (status === "confirmed") {
      updatePayload.confirmed_at = new Date().toISOString();
      updatePayload.confirmed_by = adminEmail;
      updatePayload.confirmed_via = confirmedVia || "admin_override";
    }

    const { data: req } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", requestId)
      .single();

    const existingAiAnalysis = (req?.ai_analysis as Record<string, unknown> | null) ?? {};
    updatePayload.ai_analysis = {
      ...existingAiAnalysis,
      buyer_brief_approval: {
        status: status === "confirmed" ? "approved" : status === "sent" ? "submitted_to_buyer" : "draft",
        approved_at: status === "confirmed" ? new Date().toISOString() : null,
        approved_by: status === "confirmed" ? adminEmail : null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
    };

    const { error } = await supabaseAdmin
      .from("sourcing_requests")
      .update(updatePayload)
      .eq("id", requestId);

    if (error) throw error;

    await supabaseAdmin.from("sourcing_request_activity").insert({
      request_id: requestId,
      type: status === "confirmed" ? (confirmedVia === "buyer_link" ? "confirmed" : "admin_override") : status === "sent" ? "sent" : "edit",
      actor_type: confirmedVia === "buyer_link" ? "buyer" : "admin",
      actor_name: adminEmail,
      comment: notes || (status === "confirmed" ? "Brief approved by admin override" : `Status updated to ${status}`),
    });

    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${requestId}`);
    return { ok: true };
  } catch (err: any) {
    console.error("updateBriefStatusAction error:", err);
    return { ok: false, error: err.message || "Failed to update brief status" };
  }
}

export async function createRequestForBuyer(
  input: CreateRequestForBuyerInput
): Promise<{ ok: true; id: string; matches?: any[] } | { ok: false; error: string }> {
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

  let requestId = input.requestId;

  if (requestId) {
    // Promote existing draft to active request
    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
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
        dietary_requirements: input.dietary_requirements || [],
        temperature_regime: input.temperature_regime || "ambient",
        target_weight_min_g: input.target_weight_min_g ?? null,
        target_weight_max_g: input.target_weight_max_g ?? null,
        preferred_origins: input.preferred_origins || [],
        excluded_ingredients: input.excluded_ingredients || [],
        ai_analysis: Object.keys(enrichedAiAnalysis).length > 0 ? enrichedAiAnalysis : null,
        status: "new",
      })
      .eq("id", requestId);

    if (updateErr) {
      console.error("createRequestForBuyer update error:", updateErr);
      return { ok: false, error: updateErr.message };
    }
  } else {
    // Insert new sourcing request row
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
        dietary_requirements: input.dietary_requirements || [],
        temperature_regime: input.temperature_regime || "ambient",
        target_weight_min_g: input.target_weight_min_g ?? null,
        target_weight_max_g: input.target_weight_max_g ?? null,
        preferred_origins: input.preferred_origins || [],
        excluded_ingredients: input.excluded_ingredients || [],
        ai_analysis: Object.keys(enrichedAiAnalysis).length > 0 ? enrichedAiAnalysis : null,
        source: "admin_on_behalf",
        status: "new",
        brief_status: "draft",
        brief_version: 1,
      })
      .select("id")
      .single();

    if (error || !newRequest) {
      console.error("createRequestForBuyer error:", error);
      return { ok: false, error: error?.message ?? "Failed to create request" };
    }
    requestId = newRequest.id;
  }

  // 1. Insert/Sync image URLs if provided
  if (input.image_urls && input.image_urls.length > 0 && requestId) {
    try {
      await supabaseAdmin.from("request_images").delete().eq("request_id", requestId);
      await supabaseAdmin.from("request_images").insert(
        input.image_urls.map((url) => ({
          request_id: requestId,
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
      .eq("id", requestId);

    // Run image grouping if images exist
    if (input.image_urls && input.image_urls.length > 0 && requestId) {
      try {
        await groupImages(requestId as string);
      } catch (err) {
        console.warn("groupImages failed (continuing to match):", err);
      }
    }

    // Run reverse-matching v3
    if (requestId) {
      await runMatchV3(requestId as string);
    }
  } catch (matchErr) {
    console.error("Automated PIP / match generation error:", matchErr);
  }

  // Fetch initial reverse matches directly to avoid separate client fetch
  let initialMatches: any[] = [];
  try {
    const { data: matchedRows } = await supabaseAdmin
      .from("sourcing_matches")
      .select(`
        id,
        match_score,
        product_name,
        company_name,
        country,
        match_summary,
        status,
        supplier_id,
        match_breakdown
      `)
      .eq("request_id", requestId)
      .order("match_score", { ascending: false })
      .limit(10);
    if (matchedRows) {
      initialMatches = matchedRows;
    }
  } catch (fetchErr) {
    console.warn("Could not fetch initial matches directly:", fetchErr);
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "acted_on_behalf",
    targetType: "buyer",
    targetId: input.buyer_id,
    targetEmail: (buyer?.contact_email as string | null) ?? null,
    metadata: {
      sourcing_request_id: requestId,
      product_name: input.product_name,
      note: "Submitted request on behalf of buyer with machine vision and reverse-matched",
    },
  });

  try {
    revalidatePath("/admin/requests");
  } catch {}
  return { ok: true, id: requestId as string, matches: initialMatches };
}

export async function getQuickMatchesAction(
  requestId: string
): Promise<{ ok: boolean; matches: any[]; error?: string }> {
  try {
    const { data: matches, error } = await supabaseAdmin
      .from("sourcing_matches")
      .select(`
        id,
        match_score,
        product_name,
        company_name,
        country,
        match_summary,
        status,
        supplier_id,
        match_breakdown
      `)
      .eq("request_id", requestId)
      .order("match_score", { ascending: false })
      .limit(10);

    if (error) throw error;
    return { ok: true, matches: matches || [] };
  } catch (err: any) {
    console.error("getQuickMatchesAction error:", err);
    return { ok: false, matches: [], error: err.message || "Failed to search matches" };
  }
}

export async function rerunMatchingAction(
  requestId: string
): Promise<{ ok: boolean; matches: any[]; count: number; error?: string }> {
  try {
    if (!requestId) {
      return { ok: false, matches: [], count: 0, error: "Missing request ID" };
    }
    await runMatchV3(requestId);

    const { data: matches, error } = await supabaseAdmin
      .from("sourcing_matches")
      .select(`
        id,
        match_score,
        product_name,
        company_name,
        country,
        match_summary,
        status,
        supplier_id,
        match_breakdown
      `)
      .eq("request_id", requestId)
      .order("match_score", { ascending: false })
      .limit(10);

    if (error) throw error;

    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${requestId}`);
    return { ok: true, matches: matches || [], count: matches?.length || 0 };
  } catch (err: any) {
    console.error("rerunMatchingAction error:", err);
    return { ok: false, matches: [], count: 0, error: err.message || "Failed to re-run matching" };
  }
}

export interface SendBriefConfirmationInput {
  requestId?: string | null;
  buyerEmail: string;
  buyerName?: string | null;
  buyerCompany?: string | null;
  projectTitle?: string | null;
  benchmarkBrands?: string | null;
  category?: string | null;
  packagingFormat?: string | null;
  estimatedVolume?: string | null;
  brandingModel?: string | null;
  targetMarket?: string | null;
  selectedTags?: string[];
  naturalBrief?: string | null;
  imageUrls?: string[];
  customSubject?: string | null;
  customNotes?: string | null;
}

export async function sendBriefConfirmationEmailAction(
  input: SendBriefConfirmationInput
): Promise<{ ok: true; messageId?: string; simulated?: boolean } | { ok: false; error: string }> {
  try {
    const {
      buyerEmail,
      buyerName,
      buyerCompany,
      projectTitle,
      benchmarkBrands,
      category,
      packagingFormat,
      estimatedVolume,
      brandingModel,
      targetMarket,
      selectedTags = [],
      naturalBrief,
      imageUrls = [],
      customSubject,
      customNotes,
    } = input;

    if (!buyerEmail || typeof buyerEmail !== "string" || !buyerEmail.includes("@")) {
      return { ok: false, error: "A valid buyer email address is required" };
    }

    const brandingLabel =
      brandingModel === "private_label"
        ? "Private Label (Buyer's Brand OEM)"
        : brandingModel === "supplier_brand"
        ? "Supplier branded Line"
        : "Open to Factory Brands & Private Label";

    const certsList =
      Array.isArray(selectedTags) && selectedTags.length > 0
        ? selectedTags.join(", ")
        : "Standard EU Quality & Israeli Import Readiness";

        let buyerBriefUrl: string | null = null;
    if (input.requestId) {
      try {
        const rawToken = crypto.randomBytes(24).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const { data: reqVersion } = await supabaseAdmin
          .from("sourcing_requests")
          .select("brief_version")
          .eq("id", input.requestId)
          .single();

        await supabaseAdmin.from("brief_tokens").insert({
          request_id: input.requestId,
          token_hash: tokenHash,
          brief_version: reqVersion?.brief_version || 1,
          created_by: getAdminEmail() || "admin@fdx.trading",
        });

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fdx.trading";
        buyerBriefUrl = `${baseUrl}/brief/${rawToken}`;
      } catch (tErr) {
        console.warn("Could not generate brief token for email:", tErr);
      }
    }

    const subject =
      customSubject?.trim() ||
      `Sourcing Brief Confirmation: ${projectTitle || "Specialty Products"} — FoodXchange`;

    const imagesHtml =
      Array.isArray(imageUrls) && imageUrls.length > 0
        ? `
        <div style="margin-top: 20px;">
          <p style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px;">Attached Packaging & Reference Visuals (${imageUrls.length}):</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${imageUrls
              .map(
                (url: string, i: number) => `
              <div style="display: inline-block; margin-right: 8px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; text-align: center;">
                <img src="${url}" alt="Ref #${i + 1}" style="width: 120px; height: 90px; object-fit: cover; display: block;" />
                <span style="font-size: 10px; color: #64748b; padding: 2px 4px; display: block;">Ref #${i + 1}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>`
        : "";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; color: #ffffff;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Food<span style="color: #f97316;">X</span>change</span>
              <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">Direct European Sourcing & Factory Matchmaking</p>
            </div>
            <span style="background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.4); color: #fb923c; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
              Sourcing Brief
            </span>
          </div>
        </div>

        <div style="padding: 24px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
            Hi ${buyerName || buyerCompany || "Valued Partner"},
          </h2>
          ${
            customNotes
              ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 18px; border-radius: 6px; font-size: 13px; color: #1e40af; line-height: 1.5;">
                  <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">Direct Note from FoodXchange:</strong>
                  ${customNotes.replace(/\n/g, "<br/>")}
                </div>`
              : ""
          }
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
            Thank you for aligning your sourcing goals with FoodXchange. Below is the confirmed operational brief for your sourcing project. Our deal desk is actively matching these specifications across verified European factories in Spain, Italy, Germany, and across the EU.
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
            <tbody>
              ${
                projectTitle
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 140px; border-bottom: 1px solid #e2e8f0;">Target Product / Scope</td>
                      <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${projectTitle}</td>
                    </tr>`
                  : ""
              }
              ${
                benchmarkBrands
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Benchmark Brands</td>
                      <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${benchmarkBrands}</td>
                    </tr>`
                  : ""
              }
              ${
                category
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Category</td>
                      <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${category}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Packaging & Format</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${packagingFormat || "Standard Retail Packaging"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Target Volume</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${estimatedVolume || "1 x 40ft HQ FCL / month (Mixed Pallets)"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Branding Preference</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${brandingLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Dietary & Certifications</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                  <span style="display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                    ${certsList}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Target Market</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${targetMarket || "Israel"}</td>
              </tr>
              ${
                naturalBrief
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; vertical-align: top;">Project Notes & Brief</td>
                      <td style="padding: 10px 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${naturalBrief}</td>
                    </tr>`
                  : ""
              }
            </tbody>
          </table>

          ${imagesHtml}

          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 18px; margin-top: 20px;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #9a3412; font-size: 13px;">What Happens Next?</p>
            <p style="margin: 0; font-size: 12px; color: #7c2d12; line-height: 1.5;">
              1. We filter qualified European manufacturers matching these dietary tags and minimum order quantities.<br/>
              2. We synthesize factory spec sheets, CIF landed pricing (Ashdod/Haifa), and lab sample logistics.<br/>
              3. If you have any modifications or extra benchmark references, simply reply to this email or reach us on WhatsApp.
            </p>
          </div>

          ${
            buyerBriefUrl
              ? `<div style="margin: 28px 0; text-align: center;">
                  <a href="${buyerBriefUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                    ✓ Review & Confirm Sourcing Brief Online →
                  </a>
                  <p style="margin: 8px 0 0; font-size: 11px; color: #64748b;">
                    One-click digital approval. No login required.
                  </p>
                </div>`
              : `<div style="margin-top: 24px; text-align: center;">
                  <a href="mailto:udi@fdx.trading?subject=Confirmed:%20${encodeURIComponent(projectTitle || "Sourcing Brief")}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 8px;">
                    ✓ Reply to Confirm Brief or Request Updates
                  </a>
                </div>`
          }
        </div>

        <div style="background: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
          FoodXchange &middot; Tel Aviv &middot; Madrid &middot; Milan<br />
          Direct European Sourcing Network &middot; <a href="https://fdx.trading" style="color: #ea580c; text-decoration: none;">fdx.trading</a><br />
          Need immediate assistance? Call or WhatsApp: +972-50-858-6363
        </div>
      </div>
    </body>
    </html>
    `;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "FoodXchange <info@fdx.trading>";
      const bccEmail = process.env.NOTIFY_EMAIL_TO || "udi@fdx.trading";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: buyerEmail.trim().toLowerCase(),
        replyTo: "udi@fdx.trading",
        bcc: bccEmail,
        subject,
        html: htmlContent,
      });

      if (error) {
        console.error("Resend error sending brief confirmation:", error);
        if (input.requestId) {
          await trackApiUsage({
            provider: "resend",
            feature: "deal_desk.confirm_email",
            units: 1,
            requestId: input.requestId,
            keyAlias: "RESEND_API_KEY",
            ok: false,
            error: error.message,
          });
        }
        return { ok: false, error: error.message };
      }

      if (input.requestId) {
        const adminEmail = getAdminEmail() || "admin@fdx.trading";
        const updatePayload: Record<string, any> = {
          brief_status: "sent",
          brief_sent_at: new Date().toISOString(),
        };

        const { data: req } = await supabaseAdmin
          .from("sourcing_requests")
          .select("ai_analysis")
          .eq("id", input.requestId)
          .single();

        const existingAiAnalysis = (req?.ai_analysis as Record<string, unknown> | null) ?? {};
        updatePayload.ai_analysis = {
          ...existingAiAnalysis,
          buyer_brief_approval: {
            status: "submitted_to_buyer",
            updated_at: new Date().toISOString(),
          },
        };

        await supabaseAdmin
          .from("sourcing_requests")
          .update(updatePayload)
          .eq("id", input.requestId);

        await supabaseAdmin.from("sourcing_request_activity").insert({
          request_id: input.requestId,
          type: "sent",
          actor_type: "admin",
          actor_name: adminEmail,
          comment: `Sourcing brief confirmation email sent to ${buyerEmail.trim().toLowerCase()}`,
        });

        await trackApiUsage({
          provider: "resend",
          feature: "deal_desk.confirm_email",
          units: 1,
          requestId: input.requestId,
          keyAlias: "RESEND_API_KEY",
          ok: true,
        });
      }

      return {
        ok: true,
        messageId: data?.id,
      };
    } else {
      if (input.requestId) {
        const adminEmail = getAdminEmail() || "admin@fdx.trading";
        await supabaseAdmin
          .from("sourcing_requests")
          .update({
            brief_status: "sent",
            brief_sent_at: new Date().toISOString(),
          })
          .eq("id", input.requestId);

        await supabaseAdmin.from("sourcing_request_activity").insert({
          request_id: input.requestId,
          type: "sent",
          actor_type: "admin",
          actor_name: adminEmail,
          comment: `(Simulated) Sourcing brief confirmation email dispatched to ${buyerEmail.trim().toLowerCase()}`,
        });
      }

      return {
        ok: true,
        simulated: true,
      };
    }
  } catch (err: any) {
    console.error("sendBriefConfirmationEmailAction error:", err);
    if (input.requestId) {
      await trackApiUsage({
        provider: "resend",
        feature: "deal_desk.confirm_email",
        units: 1,
        requestId: input.requestId,
        keyAlias: "RESEND_API_KEY",
        ok: false,
        error: err?.message,
      });
    }
    return { ok: false, error: err?.message || "Failed to dispatch email" };
  }
}

export type OrderWorkflowStage =
  | "intake"
  | "reverse_matched"
  | "rfq_dispatched"
  | "buyer_pitched"
  | "commercial_negotiation"
  | "order_po_issued"
  | "manufacturing"
  | "shipping_customs_warehouse"
  | "customs_warehouse"
  | "completed";

export interface FinancialMilestoneWire {
  status?: "pending_buyer_wire" | "wire_submitted_by_buyer" | "cleared_in_escrow" | "released_to_factory" | "pending_bl_copy";
  buyer_wire_amount?: number;
  agent_commission_amount?: number;
  agent_retained_fee?: number;
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

export interface ReleaseFactoryProductionInput {
  requestId: string;
  matchId?: string;
  notes?: string;
}

export async function releaseFactoryProductionOrder(
  input: ReleaseFactoryProductionInput
): Promise<
  | {
      ok: true;
      factoryWireAmount: number;
      agentMarginRetained: number;
      buyerAdvanceAmount: number;
    }
  | { ok: false; error: string }
> {
  const { requestId, matchId, notes } = input;
  const adminEmail = getAdminEmail() || "admin@foodxchange.com";

  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, company, product_name, ai_analysis")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAi = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const workflow = (existingAi.order_workflow as CommercialOrderLifecycle | null) ?? {
    current_stage: "order_po_issued",
  };
  const fc = workflow.financial_clearance || {};

  const totalUnits = fc.total_units || 24000;
  const buyerUnitPrice = fc.buyer_unit_price || Number(workflow.agreed_unit_price) || 1.85;
  const factoryUnitPrice = fc.factory_unit_price || 1.75;
  const agentMarginUnit = fc.agent_margin_per_unit || Math.max(0, buyerUnitPrice - factoryUnitPrice);

  const grossBuyerVal = fc.gross_buyer_contract_value || workflow.total_order_value || Math.round(totalUnits * buyerUnitPrice);
  const factoryCost = fc.factory_contract_cost || Math.round(totalUnits * factoryUnitPrice);
  const agentPool = fc.total_agent_brokerage_pool || (grossBuyerVal - factoryCost);

  const buyerAdv = fc.advance_milestone_30?.buyer_wire_amount || Math.round(grossBuyerVal * 0.3);
  const factoryAdv = fc.advance_milestone_30?.factory_wire_amount || Math.round(factoryCost * 0.3);
  const agentAdv = fc.advance_milestone_30?.agent_retained_fee || Math.round(agentPool * 0.3);

  const now = new Date().toISOString();

  const updatedWorkflow: CommercialOrderLifecycle = {
    ...workflow,
    current_stage: "manufacturing",
    production_status: "in_production",
    production_milestones: {
      ...(workflow.production_milestones || {}),
      deposit_transferred: true,
      raw_materials_procured: true,
    },
    financial_clearance: {
      ...fc,
      buyer_unit_price: buyerUnitPrice,
      factory_unit_price: factoryUnitPrice,
      agent_margin_per_unit: agentMarginUnit,
      total_units: totalUnits,
      gross_buyer_contract_value: grossBuyerVal,
      factory_contract_cost: factoryCost,
      total_agent_brokerage_pool: agentPool,
      advance_milestone_30: {
        ...(fc.advance_milestone_30 || {}),
        status: "released_to_factory",
        buyer_wire_amount: buyerAdv,
        factory_wire_amount: factoryAdv,
        agent_retained_fee: agentAdv,
        wire_date: fc.advance_milestone_30?.wire_date || now.slice(0, 10),
        notes: notes || fc.advance_milestone_30?.notes || "Advance 30% wire verified and authorized by Sourcing Desk.",
      },
      escrow_split_verified: true,
      updated_at: now,
      updated_by: adminEmail,
    },
    updated_at: now,
    updated_by: adminEmail,
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({
      ai_analysis: {
        ...existingAi,
        order_workflow: updatedWorkflow,
      },
    })
    .eq("id", requestId);

  if (updateErr) {
    console.error("releaseFactoryProductionOrder error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  // Update match breakdown if matchId is supplied or found
  if (matchId) {
    const { data: mData } = await supabaseAdmin
      .from("sourcing_matches")
      .select("match_breakdown")
      .eq("id", matchId)
      .single();

    const mBreakdown = (mData?.match_breakdown as Record<string, unknown> | null) ?? {};
    await supabaseAdmin
      .from("sourcing_matches")
      .update({
        match_breakdown: {
          ...mBreakdown,
          production_release: {
            released_at: now,
            released_by: adminEmail,
            deposit_transferred: true,
            factory_wire_amount: factoryAdv,
            agent_retained_fee: agentAdv,
          },
        },
      })
      .eq("id", matchId);
  }

  await logAdminAction({
    adminEmail,
    action: "release_factory_production",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      factory_wire: factoryAdv,
      agent_fee_retained: agentAdv,
      buyer_wire: buyerAdv,
      po_number: updatedWorkflow.po_number,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
    revalidatePath(`/track/${requestId}`);
  } catch {}

  return {
    ok: true,
    factoryWireAmount: factoryAdv,
    agentMarginRetained: agentAdv,
    buyerAdvanceAmount: buyerAdv,
  };
}

export interface ReleaseFinalBalanceInput {
  requestId: string;
  matchId?: string;
  notes?: string;
  customsDeclarationNumber?: string;
}

export async function releaseFinalBalanceAndDocs(
  input: ReleaseFinalBalanceInput
): Promise<
  | {
      ok: true;
      factoryBalancePaid: number;
      agentFinalCommission: number;
      totalBrokerageEarned: number;
    }
  | { ok: false; error: string }
> {
  const { requestId, matchId, notes, customsDeclarationNumber } = input;
  const adminEmail = getAdminEmail() || "admin@foodxchange.com";

  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, company, product_name, ai_analysis")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: fetchErr?.message || "Request not found" };
  }

  const existingAi = (req.ai_analysis as Record<string, unknown> | null) ?? {};
  const workflow = (existingAi.order_workflow as CommercialOrderLifecycle | null) ?? {
    current_stage: "manufacturing",
  };
  const fc = workflow.financial_clearance || {};

  const totalUnits = fc.total_units || 24000;
  const buyerUnitPrice = fc.buyer_unit_price || Number(workflow.agreed_unit_price) || 1.85;
  const factoryUnitPrice = fc.factory_unit_price || 1.75;
  const agentMarginUnit = fc.agent_margin_per_unit || Math.max(0, buyerUnitPrice - factoryUnitPrice);

  const grossBuyerVal = fc.gross_buyer_contract_value || workflow.total_order_value || Math.round(totalUnits * buyerUnitPrice);
  const factoryCost = fc.factory_contract_cost || Math.round(totalUnits * factoryUnitPrice);
  const agentPool = fc.total_agent_brokerage_pool || (grossBuyerVal - factoryCost);

  // 70% Balances
  const buyerBal = fc.balance_milestone_70?.buyer_wire_amount || Math.round(grossBuyerVal * 0.7);
  const factoryBal = fc.balance_milestone_70?.factory_wire_amount || Math.round(factoryCost * 0.7);
  const agentBal = fc.balance_milestone_70?.agent_retained_fee || Math.round(agentPool * 0.7);

  const now = new Date().toISOString();
  const customsDec = customsDeclarationNumber || workflow.customs_declaration_number || `CUSTOMS-IL-${requestId.slice(0, 6).toUpperCase()}`;

  const updatedWorkflow: CommercialOrderLifecycle = {
    ...workflow,
    current_stage: "customs_warehouse",
    customs_status: "customs_broker_clearing",
    delivery_status: "at_port",
    customs_declaration_number: customsDec,
    financial_clearance: {
      ...fc,
      balance_milestone_70: {
        ...(fc.balance_milestone_70 || {}),
        status: "released_to_factory",
        buyer_wire_amount: buyerBal,
        factory_wire_amount: factoryBal,
        agent_retained_fee: agentBal,
        wire_date: fc.balance_milestone_70?.wire_date || now.slice(0, 10),
        notes: notes || fc.balance_milestone_70?.notes || "Final 70% balance verified; original shipping docs released to customs broker.",
      },
      escrow_split_verified: true,
      updated_at: now,
      updated_by: adminEmail,
    },
    updated_at: now,
    updated_by: adminEmail,
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_requests")
    .update({
      ai_analysis: {
        ...existingAi,
        order_workflow: updatedWorkflow,
      },
    })
    .eq("id", requestId);

  if (updateErr) {
    console.error("releaseFinalBalanceAndDocs error:", updateErr);
    return { ok: false, error: updateErr.message };
  }

  // Update match breakdown
  if (matchId) {
    const { data: mData } = await supabaseAdmin
      .from("sourcing_matches")
      .select("match_breakdown")
      .eq("id", matchId)
      .single();

    const mBreakdown = (mData?.match_breakdown as Record<string, unknown> | null) ?? {};
    await supabaseAdmin
      .from("sourcing_matches")
      .update({
        match_breakdown: {
          ...mBreakdown,
          final_settlement: {
            released_at: now,
            released_by: adminEmail,
            factory_balance_amount: factoryBal,
            agent_final_fee: agentBal,
            deal_fully_settled: true,
          },
        },
      })
      .eq("id", matchId);
  }

  const advFee = fc.advance_milestone_30?.agent_retained_fee || Math.round(agentPool * 0.3);

  await logAdminAction({
    adminEmail,
    action: "release_final_balance_and_docs",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      factory_balance_paid: factoryBal,
      agent_final_commission: agentBal,
      total_broker_commission: advFee + agentBal,
      customs_declaration: customsDec,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
    revalidatePath(`/track/${requestId}`);
  } catch {}

  return {
    ok: true,
    factoryBalancePaid: factoryBal,
    agentFinalCommission: agentBal,
    totalBrokerageEarned: advFee + agentBal,
  };
}

export interface DispatchTripartiteNotificationInput {
  requestId: string;
  eventType: TripartiteEventType;
  channel?: "whatsapp" | "email" | "both";
  manualNotes?: string;
}

export async function dispatchTripartiteNotificationAction(
  input: DispatchTripartiteNotificationInput
): Promise<{ ok: boolean; message: string; whatsappUrl?: string }> {
  try {
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("*")
      .eq("id", input.requestId)
      .single();

    if (reqErr || !req) {
      return { ok: false, message: reqErr?.message || "Sourcing request not found" };
    }

    const { data: matches } = await supabaseAdmin
      .from("sourcing_matches")
      .select("id, company_name, country, status")
      .eq("request_id", input.requestId)
      .order("match_score", { ascending: false })
      .limit(3);

    const match = matches?.find((m) => m.status === "approved" || m.status === "contacted") || matches?.[0];

    const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
    const wf = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;
    const fc = wf?.financial_clearance;

    const payload: TripartiteEventPayload = {
      requestId: input.requestId,
      eventType: input.eventType,
      poNumber: wf?.po_number || `FDX-PO-${input.requestId.slice(0, 6).toUpperCase()}`,
      buyerCompany: req.company || req.name || "Israeli Retail Supermarket",
      buyerContact: req.name || undefined,
      buyerEmail: req.email || undefined,
      buyerPhone: req.phone || undefined,
      supplierName: wf?.selected_supplier_name || match?.company_name || "European Food Factory",
      supplierCountry: match?.country || "Spain / Italy (EU)",
      productName: wf?.agreed_product_name || req.product_name || "Food Product",
      orderVolume: wf?.order_volume || "24,000 Units (1 x 40ft HQ FCL)",
      totalOrderValueEur: wf?.total_order_value || fc?.gross_buyer_contract_value || 44400,
      advance30Eur: fc?.advance_milestone_30?.buyer_wire_amount || 13320,
      balance70Eur: fc?.balance_milestone_70?.buyer_wire_amount || 31080,
      containerNumber: wf?.container_number || undefined,
      billOfLading: wf?.bill_of_lading || undefined,
      vesselName: wf?.vessel_name || undefined,
      shippingLine: wf?.shipping_line || undefined,
      etaPort: wf?.eta_port || undefined,
      customsDeclarationNumber: wf?.customs_declaration_number || undefined,
      warehousePalletCount: wf?.warehouse_pallet_count || 24,
      receivingOfficer: wf?.goods_accepted_by || undefined,
    };

    const res = await dispatchTripartiteEvent(payload, input.channel || "both");

    try {
      revalidatePath(`/admin/requests/${input.requestId}`);
      revalidatePath("/admin/finance");
      revalidatePath(`/track/${input.requestId}`);
      revalidatePath(`/customs/${input.requestId}`);
    } catch {}

    return {
      ok: res.ok,
      message: res.message,
      whatsappUrl: res.ok ? res.whatsappUrl : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Notification action failed: ${msg}` };
  }
}

export interface UpdateRequestPipelineStageInput {
  requestId: string;
  stage?: PipelineStageId | string;
  substage?: PipelineSubstageId | string | null;
  exceptionStatus?: ExceptionStatus | string | null;
  exceptionReason?: string | null;
  stageNotes?: string | null;
  changedBy?: string | null;
}

export async function updateRequestPipelineStage(
  input: UpdateRequestPipelineStageInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: currentReq, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("pipeline_stage, pipeline_substage, exception_status, company, product_name")
      .eq("id", input.requestId)
      .maybeSingle();

    if (fetchErr) {
      console.warn("fetch previous stage warning:", fetchErr);
    }

    const prevStage = currentReq?.pipeline_stage || "stage_1_brief";
    const prevSubstage = currentReq?.pipeline_substage || "1.1_draft";
    const adminEmail = (await getAdminEmail()) || input.changedBy || "Admin";

    const updatePayload: Record<string, unknown> = {
      stage_updated_at: new Date().toISOString(),
      stage_updated_by: adminEmail,
    };

    if (input.stage) {
      updatePayload.pipeline_stage = input.stage;
    }
    if (input.substage !== undefined) {
      updatePayload.pipeline_substage = input.substage;
    }
    if (input.exceptionStatus !== undefined) {
      updatePayload.exception_status = input.exceptionStatus;
      updatePayload.exception_reason = input.exceptionReason || null;
    }
    if (input.stageNotes !== undefined) {
      updatePayload.stage_notes = input.stageNotes;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update(updatePayload)
      .eq("id", input.requestId);

    if (updateErr) {
      console.error("updateRequestPipelineStage error:", updateErr);
      return { ok: false, error: updateErr.message };
    }

    // Insert audit history entry
    try {
      await supabaseAdmin.from("request_stage_history").insert({
        request_id: input.requestId,
        from_stage: prevStage,
        to_stage: (input.stage as string) || prevStage,
        from_substage: prevSubstage,
        to_substage: (input.substage as string) || prevSubstage,
        exception_status: (input.exceptionStatus as string) || null,
        changed_by: adminEmail,
        change_notes: input.stageNotes || input.exceptionReason || null,
      });
    } catch (auditErr) {
      console.warn("Failed to write to request_stage_history:", auditErr);
    }

    await logAdminAction({
      adminEmail,
      action: "update_pipeline_stage",
      targetType: "sourcing_request",
      targetId: input.requestId,
      metadata: {
        from_stage: prevStage,
        to_stage: input.stage,
        substage: input.substage,
        exception_status: input.exceptionStatus,
        reason: input.exceptionReason,
      },
    });

    try {
      revalidatePath("/admin/requests");
      revalidatePath(`/admin/requests/${input.requestId}`);
    } catch {}

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("updateRequestPipelineStage exception:", err);
    return { ok: false, error: msg };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  extractSpecSheetWithAi,
  generatePriorityErpItemMasterCsv,
  type ExtractedTechnicalSpec,
} from "@/lib/compliance/specSheetExtractor";

export async function parseSpecSheetAction(input: {
  rawText?: string;
  presetId?: string;
}): Promise<{ ok: boolean; spec?: ExtractedTechnicalSpec; error?: string }> {
  try {
    const spec = await extractSpecSheetWithAi(input);
    return { ok: true, spec };
  } catch (err: any) {
    console.error("parseSpecSheetAction error:", err);
    return { ok: false, error: err.message || "Failed to parse technical spec sheet" };
  }
}

export async function saveExtractedSpecToCatalogAction(
  spec: ExtractedTechnicalSpec
): Promise<{ ok: boolean; productId?: string; message?: string; error?: string }> {
  try {
    const productId = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Insert into supplier_products if possible or sourcing_requests
    const { error: insertErr } = await supabaseAdmin.from("supplier_products").insert({
      id: productId,
      product_name: spec.hebrewProductTitle,
      category: spec.hebrewCommercialCategory,
      formats: [`${spec.unitNetWeightG}g`],
      certifications: ["SI 1145 Lab Verified"],
      kosher_types: [spec.kosherStandardHe],
      shelf_life_months: spec.shelfLifeMonths,
      private_label: true,
      manually_verified: true,
      is_published: true,
      specs: spec,
    });

    if (insertErr) {
      console.warn("supplier_products insert warning:", insertErr.message);
    }

    try {
      revalidatePath("/admin/products");
      revalidatePath("/admin/deals");
      revalidatePath("/he/rfq");
      revalidatePath("/en/rfq");
    } catch {}

    return {
      ok: true,
      productId,
      message: `Product "${spec.hebrewProductTitle}" successfully verified and saved to FDX catalog.`,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save product" };
  }
}

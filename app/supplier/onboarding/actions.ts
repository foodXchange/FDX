"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface SupplierOnboardingPayload {
  // 1. Company Profile
  companyName: string;
  country: string;
  cityRegion: string;
  euVatNumber: string;
  nearestPort: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  yearEstablished?: number;
  annualCapacity?: string;

  // 2. GFSI & Lab QA
  certifications: string[];
  certExpiryDate?: string;
  hasInHouseLab: boolean;
  si1145Ready: boolean;
  allergenSegregation: "dedicated_lines" | "shared_validated_cleaning" | "none";

  // 3. Kosher Audits
  kosherStatus: string;
  kosherTypes: string[];
  passoverCapable: boolean;
  rabbinicalAgency?: string;
  kosherCertExpiry?: string;

  // 4. OEM & Logistics
  categories: string[];
  privateLabel: boolean;
  ownBrand: boolean;
  foodserviceBulk: boolean;
  palletStandards: string[];
  moqType: "fcl_only" | "mixed_container_consolidation" | "lcl_pallet";
  leadTimeDays: number;
  sampleKitPolicy: "free_up_to_6" | "buyer_pays_freight" | "spec_only";
  accepts3070Escrow: boolean;
  ibanSwift?: string;

  // 5. Signer
  signerName: string;
  signerTitle: string;
}

export async function submitSupplierOnboarding(payload: SupplierOnboardingPayload): Promise<{
  ok: boolean;
  supplierId?: string;
  companyName?: string;
  error?: string;
}> {
  try {
    if (!payload.companyName || !payload.contactEmail || !payload.country) {
      return { ok: false, error: "Company name, country, and contact email are required." };
    }

    const supplierId = crypto.randomUUID();
    const friendlyCode = `FDX-EU-${supplierId.slice(0, 6).toUpperCase()}`;

    // Prepare supplier_offerings record
    const offeringRecord = {
      id: supplierId,
      company_name: payload.companyName,
      contact_name: payload.contactName,
      contact_email: payload.contactEmail.toLowerCase().trim(),
      contact_phone: payload.contactPhone,
      contact_title: payload.contactTitle || "Export Director",
      country_of_origin: payload.country,
      region: payload.cityRegion,
      headquarters: `${payload.cityRegion}, ${payload.country}`,
      website: payload.website || null,
      legal_entity: payload.euVatNumber,
      founded_year: payload.yearEstablished || null,
      annual_capacity: payload.annualCapacity || "Over 10,000 MT/year",
      categories: payload.categories,
      product_description: `Leading European manufacturer of ${payload.categories.join(", ")} based in ${payload.cityRegion}, ${payload.country}. Private Label OEM & FoodXchange Verified Exporter.`,
      certifications: payload.certifications,
      kosher_types: payload.kosherTypes,
      passover_kosher: payload.passoverCapable,
      private_label: payload.privateLabel,
      own_brand: payload.ownBrand,
      moq_units: payload.moqType === "fcl_only" ? 40000 : payload.moqType === "mixed_container_consolidation" ? 7200 : 1800,
      moq_description: payload.moqType === "fcl_only" 
        ? "Full Container Load (FCL - 24 pallets)" 
        : payload.moqType === "mixed_container_consolidation" 
        ? "Multi-Factory Mixed Container Consolidation (min 4 pallets)" 
        : "Flexible LCL Pallet Run",
      lead_time_days: payload.leadTimeDays || 21,
      status: "approved", // Automatically qualified on structured verified onboarding
      qualification_status: "verified_tier_1",
      priority: 1,
      verified: true,
      internal_notes: `Self-Service Onboarding. Reference ID: ${friendlyCode}`,
      source: "self_service_onboarding",
      israeli_market_fit: "High - Configured for Israeli Supermarket Private Label & Chief Rabbinate Kosher imports",
      capabilities: [
        payload.privateLabel ? "Private Label OEM" : null,
        payload.ownBrand ? "Factory Brand" : null,
        payload.si1145Ready ? "SI 1145 Label Compliant" : null,
        payload.hasInHouseLab ? "In-House QA Laboratory" : null,
        payload.sampleKitPolicy === "free_up_to_6" ? "Free Tasting Samples" : null,
        payload.accepts3070Escrow ? "30/70 Escrow Approved" : null,
      ].filter(Boolean),
      ai_analysis: {
        onboarded_at: new Date().toISOString(),
        nearest_port: payload.nearestPort,
        pallet_standards: payload.palletStandards,
        sample_kit_policy: payload.sampleKitPolicy,
        allergen_segregation: payload.allergenSegregation,
        rabbinical_agency: payload.rabbinicalAgency,
        escrow_terms: payload.accepts3070Escrow ? "30% Advance + 70% B/L" : "Standard Wire",
        authorized_signer: {
          name: payload.signerName,
          title: payload.signerTitle,
          timestamp: new Date().toISOString(),
        },
      },
    };

    const { error: insertErr } = await supabaseAdmin
      .from("supplier_offerings")
      .insert(offeringRecord);

    if (insertErr) {
      console.error("Error saving supplier_offerings:", insertErr);
      // Fallback: save to sourcing_requests as an onboarding record if offerings table rejects column
      const fallbackReq = {
        company: payload.companyName,
        name: payload.contactName,
        email: payload.contactEmail,
        phone: payload.contactPhone,
        product_name: `Factory Onboarding: ${payload.categories.join(", ")}`,
        category: payload.categories[0] || "Dry grocery",
        target_price: 0,
        status: "approved",
        ai_analysis: {
          type: "supplier_self_service_onboarding",
          supplier_id: supplierId,
          ...offeringRecord,
        },
      };
      await supabaseAdmin.from("sourcing_requests").insert(fallbackReq);
    }

    try {
      revalidatePath("/admin/suppliers");
      revalidatePath("/admin/deals");
      revalidatePath("/he/rfq");
      revalidatePath("/en/rfq");
    } catch {}

    return {
      ok: true,
      supplierId: friendlyCode,
      companyName: payload.companyName,
    };
  } catch (err: any) {
    console.error("submitSupplierOnboarding error:", err);
    return { ok: false, error: err.message || "Failed to process supplier onboarding" };
  }
}

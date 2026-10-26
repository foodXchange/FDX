import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { type B2BContractData, CONTRACT_PRESETS } from "@/lib/documents/b2bContractGenerator";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";

export async function getContractData(requestId: string): Promise<B2BContractData> {
  // If sample or demo, return the Shufersal EVOO preset immediately
  if (
    requestId.startsWith("sample-") ||
    requestId.startsWith("demo-") ||
    requestId === "sample-deal-1" ||
    requestId === "demo"
  ) {
    return {
      ...CONTRACT_PRESETS.shufersal_evoo,
      contractNumber: `FDX-SPA-2026-${requestId.slice(0, 6).toUpperCase()}`,
    };
  }

  // Fetch from Supabase
  const { data: req, error } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !req) {
    // Graceful fallback to default preset
    return {
      ...CONTRACT_PRESETS.shufersal_evoo,
      contractNumber: `FDX-SPA-2026-${requestId.slice(0, 6).toUpperCase()}`,
    };
  }

  // Fetch awarded supplier match
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, company_name, product_name, country, status")
    .eq("request_id", requestId)
    .order("match_score", { ascending: false })
    .limit(1);

  const awarded = matches?.[0];
  const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
  const orderWf = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;

  const buyerCompany = req.company || "Retail Supermarket Chain Israel";
  const buyerName = req.name || "Procurement Director";
  const supplierName = orderWf?.selected_supplier_name || awarded?.company_name || "Aceites del Sur Foods S.A.";
  const supplierCountry = awarded?.country || "Spain (European Union)";
  const productName = orderWf?.agreed_product_name || req.product_name || "Extra Virgin Olive Oil 1L";

  const totalUnits = 24000;
  const unitPrice = 1.512;
  const totalSum = totalUnits * unitPrice;
  const advance = totalSum * 0.3;
  const balance = totalSum * 0.7;

  return {
    contractNumber: orderWf?.po_number
      ? `FDX-SPA-${orderWf.po_number.replace("FDX-PO-", "")}`
      : `FDX-SPA-2026-${requestId.slice(0, 6).toUpperCase()}`,
    contractDate: new Date().toISOString().slice(0, 10),
    buyer: {
      companyName: buyerCompany,
      companyNameHe: buyerCompany,
      legalEntity: "Israeli Commercial Importer of Record",
      country: "Israel",
      regNumber: "51-598410-2",
      registeredAddress: orderWf?.buyer_warehouse_address || "Central Distribution Center, Soreq Park, Israel",
      signatoryName: buyerName,
      signatoryTitle: "VP Procurement & Private Label Division",
      signatoryEmail: req.email || "sourcing@retailer.co.il",
      signatoryPhone: req.phone || "+972-54-9218840",
      signatureData: null,
      signedAt: null,
    },
    seller: {
      companyName: supplierName,
      companyNameHe: supplierName,
      legalEntity: "European Certified Food Manufacturer",
      country: supplierCountry,
      regNumber: "ES-A41002918",
      registeredAddress: "Industrial Food Park, European Union",
      signatoryName: "Mateo Fernandez",
      signatoryTitle: "Export Director",
      signatoryEmail: "export@producer.eu",
      signatoryPhone: "+34-954-689-100",
      signatureData: null,
      signedAt: null,
    },
    escrowAgent: CONTRACT_PRESETS.shufersal_evoo.escrowAgent,
    productNameEn: productName,
    productNameHe: req.product_name || productName,
    productSpecification: "Premium Grade Private Label, compliant with Israeli Standard SI 1145 and EU Food Safety regulations.",
    hsTariffCode: "1509.2000 (EUR.1 0% Customs Duty)",
    originCountry: supplierCountry,
    quantityUnits: totalUnits,
    unitPriceEur: unitPrice,
    currency: "EUR (€)",
    totalContractValueEur: totalSum,
    packagingSpec: "Standard retail private label export packaging, tamper-evident closure, Hebrew compliant label.",
    palletConfiguration: "24 Euro Pallets (120x80cm, HT ISPM-15), 1,000 units/pallet. Total gross 21,600 kg.",
    incoterm: "CIF Ashdod Port (Incoterms 2020)",
    portOfLoading: "European Hub Port (Valencia / Genoa)",
    portOfDischarge: "Ashdod Port (ILASH), Israel",
    vesselLinePreference: "MSC / ZIM Direct East Med Service",
    productionLeadDays: 14,
    estimatedTransitDays: 10,
    advanceDepositPct: 30,
    advanceDepositEur: advance,
    finalBalancePct: 70,
    finalBalanceEur: balance,
    escrowBankAccount: "FoodXchange Fiduciary Client Escrow Account (IBAN: IL58-0128-0000-0009-4819-20)",
    kosherCertifier: "Authorized European Rabbinate & Chief Rabbinate of Israel (מחלקת היבוא ברבנות הראשית)",
    kosherStandardText: "Kosher Parve for All Year Round (excluding Passover). Verified by permanent Mashgiach.",
    minimumRemainingShelfLifePct: 75,
    foodStandardCompliance: "Israeli Standard SI 1145, Public Health (Food) Regulations, EFSA Standards.",
    inspectionCompany: "SGS / Bureau Veritas (Pre-shipment loading supervision and seal verification).",
    governingLaw: "ICC Model International Sale Contract 758 & English Law, supplemented by Israeli Commercial Code.",
    arbitrationVenue: "International Chamber of Commerce (ICC) Arbitration, Tel Aviv.",
    status: "draft",
    verificationHash: `SHA256: ${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
  };
}

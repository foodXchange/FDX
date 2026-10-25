import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchDealById, type DealRecord } from "@/app/admin/deals/actions";
import ProFormaViewer from "@/components/proforma/ProFormaViewer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { deal } = await fetchDealById(id);

  if (!deal) {
    return {
      title: "Commercial Pro-Forma Invoice | FoodXchange",
    };
  }

  return {
    title: `${deal.poNumber} · Commercial Pro-Forma Invoice for ${deal.buyerCompany} | FoodXchange`,
    description: `Official B2B Pro-Forma Invoice & Sales Contract for ${deal.productName}. 30/70 Escrow payment terms & SI 1145 compliance.`,
  };
}

export default async function ProFormaPage({ params }: PageProps) {
  const { id } = await params;
  const { deal, ok } = await fetchDealById(id);

  if (!ok || !deal) {
    // If id looks like demo or not in database, build fallback demo record
    const fallbackDeal: DealRecord = {
      id,
      poNumber: `FDX-PI-${id.slice(0, 6).toUpperCase()}`,
      poDate: new Date().toISOString().slice(0, 10),
      buyerCompany: "Shufersal Retail Chain Ltd",
      buyerContact: "Rani Mor",
      buyerEmail: "procurement@shufersal.co.il",
      buyerPhone: "+972-54-9988221",
      buyerVat: "51-008492-3",
      supplierName: "Pastificio Attilio Mastromauro Granoro Srl",
      supplierCountry: "Corato (Bari), Italy",
      supplierEmail: "export@granoro.it",
      supplierPhone: "+39 080 872 1611",
      supplierIban: "IT60X0542811101000000123456",
      productName: "Penne Rigate Trafilata al Bronzo 500g",
      productHebrewName: "פנה ריגטה ברונזה 500 גרם",
      orderVolume: "43,200 Units (1 x 40ft HQ FCL)",
      containerType: "40ft_hc",
      palletCount: 24,
      totalUnits: 43200,
      unitsPerCarton: 18,
      cartonsPerPallet: 100,
      netWeightKg: 21600,
      grossWeightKg: 23900,
      currency: "EUR",
      buyerUnitPrice: 0.84,
      factoryUnitPrice: 0.72,
      agentMarginUnit: 0.12,
      grossContractValue: 36288,
      advanceDeposit30: 10886.4,
      balanceAgainstBl70: 25401.6,
      agentPool: 5184,
      incoterms: "CIF Ashdod Port, Israel (Incoterms 2020)",
      portOfOrigin: "Port of Salerno / Genoa, Italy",
      portOfDestination: "Port of Ashdod, Israel",
      currentStage: "order_po_issued",
      productionStatus: "queued",
      shippingLine: "MSC Mediterranean Shipping",
      vesselName: "MSC ISRAEL V.2604",
      billOfLading: `MSCU-${id.slice(0, 6).toUpperCase()}`,
      containerNumber: "MEDU8829103",
      customsDeclaration: "IL-2604-9841",
      buyerSigned: false,
      supplierSigned: false,
      kosherStandard: "Chief Rabbinate of Israel / OU Kosher Pareve",
      si1145Compliant: true,
      createdAt: new Date().toISOString(),
    };

    return <ProFormaViewer deal={fallbackDeal} />;
  }

  return <ProFormaViewer deal={deal} />;
}

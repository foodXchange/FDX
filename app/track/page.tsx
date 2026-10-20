import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";
import BuyerPortfolioCockpit, {
  type BuyerPortfolioItem,
} from "@/components/buyer-portfolio/BuyerPortfolioCockpit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "פורטל רכש וניהול מכולות יבוא | FoodXchange B2B Enterprise",
  description:
    "מערכת ניהול תיק מכולות, מעקב מטענים ימיים בזמן אמת והזמנות חוזרות לרשתות שיווק ומפיצים קמעונאיים בישראל.",
};

const COUNTRY_FLAGS: Record<string, string> = {
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Greece: "🇬🇷",
  Poland: "🇵🇱",
  Netherlands: "🇳🇱",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Turkey: "🇹🇷",
  Israel: "🇮🇱",
};

const HEBREW_PRODUCT_TRANSLATIONS: Record<string, string> = {
  "Chopped Peeled Tomatoes": "עגבניות מרוסקות ומקולפות 400 גרם",
  "Pure Sunflower Oil 1L": "שמן חמניות מזוכך 1 ליטר",
  "Wafers 250g , Shufersal": "ופלים מובחרים 250 גרם",
  "wafer cubes, balconi, Yochananof": "קוביות ופל איטלקיות",
  "wafer cubes, balconi, Shufersal": "קוביות ופל פרימיום",
  "Extra Virgin Olive Oil": "שמן זית כתית מעולה",
  "Spaghetti No. 5": "ספגטי איטלקי מקמח דורום",
  "Canned Tuna in Olive Oil": "טונה בהירה בשמן זית",
};

interface PageProps {
  searchParams: Promise<{
    buyer?: string;
  }>;
}

export default async function BuyerPortfolioPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const buyerQuery = params?.buyer || "all";

  // 1. Fetch Sourcing Requests
  const { data: requests } = await supabaseAdmin
    .from("sourcing_requests")
    .select(
      `id, name, company, product_name, category, certifications, volume_per_year, status, created_at, ai_analysis`
    )
    .order("created_at", { ascending: false })
    .limit(60);

  // 2. Fetch Approved Matches
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, request_id, company_name, product_name, country, status, match_score")
    .order("match_score", { ascending: false });

  // 3. Assemble Portfolio Items
  const items: BuyerPortfolioItem[] = (requests || []).map((req) => {
    const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
    const wf = (ai.order_workflow ?? null) as CommercialOrderLifecycle | null;
    const reqMatches = (matches || []).filter((m) => m.request_id === req.id);
    const approvedMatch = reqMatches.find((m) => m.status === "approved") || reqMatches[0];

    const prodName = cleanRequestName(req.product_name || "Food Product");
    const hebrewName =
      HEBREW_PRODUCT_TRANSLATIONS[prodName] ||
      (req.product_name && req.product_name.length > 0 ? req.product_name : "מוצר מזון מיובא");

    const country = approvedMatch?.country || "Italy";
    const flag = COUNTRY_FLAGS[country] || "🇪🇺";

    const poNumber = wf?.po_number || `PO-FDX-${req.id.slice(0, 8).toUpperCase()}`;
    const buyerCompany = req.company || req.name || "רשת שיווק קמעונאית";
    const supplierFactory = wf?.selected_supplier_name || approvedMatch?.company_name || "Approved European Manufacturer";

    // Stage calculation
    let stage: BuyerPortfolioItem["stage"] = "po_drafting";
    let stageLabel = "הסכם והנפקת PO";
    let progress = 25;

    if (wf?.delivery_status === "arrived_at_warehouse" || wf?.current_stage === "completed") {
      stage = "completed";
      stageLabel = "נפרק במרלוג (GRN חתום)";
      progress = 100;
    } else if (wf?.customs_status === "customs_cleared" || wf?.current_stage === "customs_warehouse") {
      stage = "customs_clearance";
      stageLabel = "שחרור מכס אשדוד";
      progress = 85;
    } else if (
      wf?.current_stage === "shipping_customs_warehouse" ||
      wf?.customs_status === "customs_broker_clearing" ||
      wf?.customs_status === "pending_documents"
    ) {
      stage = "maritime_transit";
      stageLabel = "בהפלגה בים (AIS Transit)";
      progress = 65;
    } else if (wf?.production_status === "in_production" || wf?.current_stage === "manufacturing") {
      stage = "production";
      stageLabel = "בייצור במפעל באירופה";
      progress = 45;
    }

    const volume = wf?.order_volume || req.volume_per_year || "1 x 40ft HC (24,000 units)";
    const totalEur = wf?.total_order_value || 44400;

    const kosherCert =
      Array.isArray(req.certifications) && req.certifications.length > 0
        ? req.certifications.find((c: string) => c.toLowerCase().includes("kosher") || c.includes("כשרות")) || "בד״ץ מהדרין"
        : "אישור הרבנות הראשית לישראל";

    const grnSignoff = (ai.warehouse_grn_signoff ?? {}) as Record<string, unknown>;
    const grnNumber = (grnSignoff.grnNumber as string | undefined) || undefined;

    return {
      id: req.id,
      poNumber,
      productName: prodName,
      hebrewName,
      buyerCompany,
      supplierFactory,
      originCountry: country,
      originFlag: flag,
      volume,
      palletCount: wf?.warehouse_pallet_count || 24,
      unitCount: 24000,
      category: req.category || "מזון יבש ומכולת",
      kosherCert,
      stage,
      stageLabelHebrew: stageLabel,
      progressPercent: progress,
      containerNumber: wf?.container_number || undefined,
      billOfLading: wf?.bill_of_lading || undefined,
      vesselName: wf?.vessel_name || undefined,
      etaAshdod: wf?.eta_port || "נמל אשדוד",
      temperature: "+18.2°C (תקין)",
      customsDeclaration: wf?.customs_declaration_number || undefined,
      grnNumber,
      totalEur,
      createdAt: req.created_at,
      canReorder: true,
    };
  });

  // Extract Top Supermarket Chains for Quick Filter
  const availableCompanies = [
    "Shufersal",
    "Victory",
    "Yochananof",
    "Carrefour",
    "Leiman Schlussel",
  ];

  return (
    <BuyerPortfolioCockpit
      initialItems={items}
      availableCompanies={availableCompanies}
      selectedCompanyFilter={buyerQuery}
    />
  );
}

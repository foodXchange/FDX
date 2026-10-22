import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export interface TrackedSampleItem {
  id: string;
  product_name: string;
  category: string;
  supplier_name?: string | null;
  country_of_origin?: string | null;
  sample_format?: string | null;
  sample_image_url?: string | null;
}

export interface SensoryScores {
  taste?: number;
  texture?: number;
  packaging?: number;
  viability?: number;
  overall?: number;
}

export interface TrackedSampleKit {
  type: "sample_kit";
  tracking_code: string;
  company: string;
  buyer_name: string;
  created_at: string;
  sample_status:
    | "new"
    | "coordinating_factory"
    | "dispatched_air"
    | "customs_tlv"
    | "delivered"
    | "feedback_approved"
    | "feedback_rejected";
  courier_name: string | null;
  tracking_awb: string | null;
  delivery_address: string | null;
  target_tasting_date: string | null;
  items: TrackedSampleItem[];
  sensory_scores?: SensoryScores | null;
  buyer_tasting_feedback?: string | null;
  is_demo?: boolean;
}

export interface TrackedCommercialRequest {
  type: "commercial_request";
  id: string;
  product_name: string;
  company: string;
  buyer_name: string;
  created_at: string;
  status: string;
  category?: string | null;
  portal_url: string;
}

export type TrackingLookupResponse =
  | { found: true; data: TrackedSampleKit | TrackedCommercialRequest }
  | { found: false; message: string };

const DEMO_SAMPLE_KIT: TrackedSampleKit = {
  type: "sample_kit",
  tracking_code: "FDX-SMP-DEMO88",
  company: "רשת שיווק קמעונאית מובילה",
  buyer_name: "דני כהן (מנהל קטגוריה)",
  created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  sample_status: "dispatched_air",
  courier_name: "DHL Express",
  tracking_awb: "9482018374",
  delivery_address: "דרך ששת הימים 30, בני ברק (מטה רכש קומה 6)",
  target_tasting_date: "השבוע הקרוב (שולחן טעימות הנהלה)",
  items: [
    {
      id: "demo-item-1",
      product_name: "עגבניות מרוסקות ומקולפות 400 גרם (100% איטלקי)",
      category: "Canned Foods",
      supplier_name: "Conserve Italia Soc. Coop.",
      country_of_origin: "Italy",
      sample_format: "פחית 400 גרם Easy-Open לטעימת מעבדה",
      sample_image_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "demo-item-2",
      product_name: "שמן זית כתית מעולה חמיצות 0.3% (בקבוק Marasca)",
      category: "Oils & Vinegars",
      supplier_name: "Acesur Grupo Oleícola",
      country_of_origin: "Spain",
      sample_format: "בקבוק זכוכית כהה 750 מ״ל",
      sample_image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "demo-item-3",
      product_name: "ספגטי פרימיום 100% חיטת דורום ברונזה No. 5",
      category: "Pasta & Grains",
      supplier_name: "Pastificio Fabianelli S.p.A.",
      country_of_origin: "Italy",
      sample_format: "אריזת 500 גרם מודפסת",
      sample_image_url: "https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "demo-item-4",
      product_name: "קוביות ופל קראנצ׳י במילוי 74% קרם אגוזי לוז",
      category: "Sweets & Confectionery",
      supplier_name: "Balconi S.p.A.",
      country_of_origin: "Italy",
      sample_format: "שקית 250 גרם סגורה הרמטית",
      sample_image_url: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
    },
  ],
  sensory_scores: null,
  buyer_tasting_feedback: null,
  is_demo: true,
};

export async function GET(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { found: false, message: "Too many tracking lookups. Please wait." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = (
    searchParams.get("query") ||
    searchParams.get("q") ||
    searchParams.get("code") ||
    ""
  ).trim();

  // Strip dangerous SQL wildcard characters
  const cleanQuery = rawQuery.replace(/[%_\\]/g, "").trim();

  if (!cleanQuery || cleanQuery.length < 3) {
    return NextResponse.json(
      { found: false, message: "Please enter a valid tracking number, DHL AWB, or contact phone." },
      { status: 400 }
    );
  }

  const queryUpper = cleanQuery.toUpperCase();

  // Demo shortcut for buyers / reviewers
  if (
    queryUpper === "DEMO" ||
    queryUpper === "FDX-SMP-DEMO" ||
    queryUpper === "FDX-SMP-DEMO88" ||
    queryUpper === "9482018374"
  ) {
    return NextResponse.json({ found: true, data: DEMO_SAMPLE_KIT });
  }

  try {
    let rows: Array<{
      id: string;
      name: string | null;
      company: string | null;
      product_name: string | null;
      category: string | null;
      whatsapp: string | null;
      ai_analysis: unknown;
      created_at: string;
      status: string;
    }> = [];

    // 1. Try finding by tracking_code in ai_analysis (exact match if full code, or prefix-safe match)
    if (queryUpper.startsWith("FDX-SMP-")) {
      const { data: exactMatches } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, category, whatsapp, ai_analysis, created_at, status")
        .eq("ai_analysis->>tracking_code", queryUpper)
        .order("created_at", { ascending: false })
        .limit(20);

      if (exactMatches && exactMatches.length > 0) {
        rows = exactMatches;
      }
    } else if (cleanQuery.length >= 5) {
      // Suffix search (e.g. buyer enters only the 6-8 digit suffix)
      const { data: suffixMatches } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, category, whatsapp, ai_analysis, created_at, status")
        .ilike("ai_analysis->>tracking_code", `FDX-SMP-%${cleanQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (suffixMatches && suffixMatches.length > 0) {
        rows = suffixMatches;
      }
    }

    // 2. If not found by tracking_code, try by DHL AWB (must be >= 8 digits to prevent loose collisions)
    if (rows.length === 0 && cleanQuery.length >= 8) {
      const { data: awbMatches } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, category, whatsapp, ai_analysis, created_at, status")
        .eq("ai_analysis->>tracking_awb", cleanQuery)
        .order("created_at", { ascending: false })
        .limit(20);

      if (awbMatches && awbMatches.length > 0) {
        rows = awbMatches;
      }
    }

    // 3. Try by session_id (exact match only)
    if (rows.length === 0 && cleanQuery.length >= 8) {
      const { data: sessionMatches } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, category, whatsapp, ai_analysis, created_at, status")
        .eq("session_id", cleanQuery)
        .order("created_at", { ascending: false })
        .limit(20);

      if (sessionMatches && sessionMatches.length > 0) {
        rows = sessionMatches;
      }
    }

    // 4. Try by phone number if query contains >= 9 digits (Israeli mobile numbers: 05X-XXXXXXX or 9725XXXXXXXX)
    const digitsOnly = cleanQuery.replace(/\D/g, "");
    if (rows.length === 0 && digitsOnly.length >= 9) {
      const { data: phoneMatches } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, category, whatsapp, ai_analysis, created_at, status")
        .ilike("whatsapp", `%${digitsOnly.slice(-9)}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (phoneMatches && phoneMatches.length > 0) {
        rows = phoneMatches;
      }
    }

    // 5. Try by exact UUID if formatted as UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);
    if (rows.length === 0 && isUuid) {
      const { data: idMatches } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, category, whatsapp, ai_analysis, created_at, status")
        .eq("id", cleanQuery)
        .limit(1);

      if (idMatches && idMatches.length > 0) {
        rows = idMatches;
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({
        found: false,
        message: "No active sample box or sourcing request matched this tracking code.",
      });
    }

    // Determine if this is a sample kit
    const firstAi = (rows[0].ai_analysis ?? {}) as Record<string, unknown>;
    const hasSampleCode = Boolean(firstAi.tracking_code);

    if (hasSampleCode) {
      const trackingCode = (firstAi.tracking_code as string) || `FDX-SMP-${rows[0].id.slice(0, 8).toUpperCase()}`;
      const sampleStatus = ((firstAi.sample_status as string) || "coordinating_factory") as TrackedSampleKit["sample_status"];
      const courierName = (firstAi.courier_name as string) || (firstAi.tracking_awb ? "DHL Express" : null);
      const trackingAwb = (firstAi.tracking_awb as string) || null;
      const deliveryAddress = (firstAi.delivery_address as string) || null;
      const targetTastingDate = (firstAi.target_tasting_date as string) || null;
      const sensoryScores = (firstAi.sensory_scores as SensoryScores) || null;
      const buyerTastingFeedback = (firstAi.buyer_tasting_feedback as string) || null;

      const items: TrackedSampleItem[] = rows.map((r) => {
        const ai = (r.ai_analysis ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          product_name: r.product_name || "Factory Sample Product",
          category: r.category || "General Grocery",
          supplier_name: (ai.supplier_name as string) || null,
          country_of_origin: (ai.country_of_origin as string) || null,
          sample_format: (ai.sample_format as string) || null,
          sample_image_url: (ai.sample_image_url as string) || null,
        };
      });

      const responseKit: TrackedSampleKit = {
        type: "sample_kit",
        tracking_code: trackingCode,
        company: rows[0].company || "Retail Partner",
        buyer_name: rows[0].name || "Buyer",
        created_at: rows[0].created_at,
        sample_status: sampleStatus,
        courier_name: courierName,
        tracking_awb: trackingAwb,
        delivery_address: deliveryAddress,
        target_tasting_date: targetTastingDate,
        items,
        sensory_scores: sensoryScores,
        buyer_tasting_feedback: buyerTastingFeedback,
      };

      return NextResponse.json({ found: true, data: responseKit });
    }

    // Otherwise it's a commercial sourcing project
    const commercialReq: TrackedCommercialRequest = {
      type: "commercial_request",
      id: rows[0].id,
      product_name: rows[0].product_name || "Commercial Sourcing Deal",
      company: rows[0].company || "Buyer",
      buyer_name: rows[0].name || "Buyer",
      created_at: rows[0].created_at,
      status: rows[0].status,
      category: rows[0].category,
      portal_url: `/track/${rows[0].id}`,
    };

    return NextResponse.json({ found: true, data: commercialReq });
  } catch (error) {
    console.error("Tracking lookup error:", error);
    return NextResponse.json(
      { found: false, message: "Internal server error performing tracking lookup." },
      { status: 500 }
    );
  }
}

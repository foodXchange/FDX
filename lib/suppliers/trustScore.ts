import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface TrustScoreBreakdown {
  profile: number;
  verification: number;
  activity: number;
  deals: number;
  total: number;
}

const RESPONSE_TIME_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export async function calculateTrustScore(supplierId: string): Promise<TrustScoreBreakdown> {
  const [offeringResult, productsResult, matchesResult] = await Promise.all([
    supabaseAdmin
      .from("supplier_offerings")
      .select("logo_url, product_description, certifications, website, contact_email, contact_phone, verified")
      .eq("id", supplierId)
      .single(),
    supabaseAdmin
      .from("supplier_products")
      .select("manually_verified, kosher_types")
      .eq("supplier_id", supplierId),
    supabaseAdmin
      .from("sourcing_matches")
      .select("status, sent_at, responded_at")
      .eq("supplier_id", supplierId),
  ]);

  const offering = offeringResult.data as {
    logo_url: string | null;
    product_description: string | null;
    certifications: string[] | null;
    website: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    verified: boolean | null;
  } | null;

  const products = (productsResult.data ?? []) as {
    manually_verified: boolean | null;
    kosher_types: string[] | null;
  }[];

  const matches = (matchesResult.data ?? []) as {
    status: string | null;
    sent_at: string | null;
    responded_at: string | null;
  }[];

  // Profile completeness (25 pts max)
  let profile = 0;
  if (offering?.logo_url) profile += 5;
  if (offering?.product_description) profile += 5;
  if ((offering?.certifications?.length ?? 0) > 0) profile += 5;
  if (offering?.website) profile += 3;
  if (offering?.contact_email) profile += 3;
  if (offering?.contact_phone) profile += 2;
  if (products.length > 0) profile += 2;

  // Verification (25 pts max)
  let verification = 0;
  if (offering?.verified) verification += 15;
  if (products.some((p) => p.manually_verified)) verification += 5;
  if (products.some((p) => (p.kosher_types?.length ?? 0) > 0)) verification += 5;

  // Activity (25 pts max)
  const sentMatches = matches.filter((m) => m.sent_at);
  const respondedMatches = matches.filter((m) => m.responded_at);
  let activity = 0;
  if (respondedMatches.length >= 1) activity += 10;
  if (sentMatches.length > 0 && respondedMatches.length / sentMatches.length > 0.5) activity += 10;
  if (respondedMatches.length > 0) {
    const totalResponseMs = respondedMatches.reduce((sum, m) => {
      const sentAt = m.sent_at ? new Date(m.sent_at).getTime() : null;
      const respondedAt = new Date(m.responded_at as string).getTime();
      return sum + (sentAt ? respondedAt - sentAt : 0);
    }, 0);
    const avgResponseMs = totalResponseMs / respondedMatches.length;
    if (avgResponseMs < RESPONSE_TIME_THRESHOLD_MS) activity += 5;
  }

  // Deal success (25 pts max)
  const wonMatches = matches.filter((m) => m.status === "won");
  let deals = 0;
  if (wonMatches.length >= 1) deals += 15;
  if (sentMatches.length > 0 && wonMatches.length / sentMatches.length > 0.3) deals += 10;

  return {
    profile,
    verification,
    activity,
    deals,
    total: profile + verification + activity + deals,
  };
}

export async function recalculateAndSaveTrustScore(supplierId: string): Promise<TrustScoreBreakdown> {
  const breakdown = await calculateTrustScore(supplierId);

  await supabaseAdmin
    .from("supplier_offerings")
    .update({
      trust_score: breakdown.total,
      trust_score_updated_at: new Date().toISOString(),
    })
    .eq("id", supplierId);

  return breakdown;
}

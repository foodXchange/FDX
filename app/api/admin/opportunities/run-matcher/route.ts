import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseVector(val: unknown): number[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val as number[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as number[];
    } catch {}
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: { minScore?: number; limit?: number } = {};
    try {
      body = await req.json();
    } catch {}

    const minScore = body.minScore ?? 65;
    const limit = body.limit ?? 25;

    // Fetch buyer assortments that need matching
    const { data: assortments, error: aErr } = await supabaseAdmin
      .from("buyer_assortments")
      .select("id, buyer_id, product_name, category_id, manufacturer_country, retail_price_ils, embedding, buyers(company_name)")
      .not("embedding", "is", null)
      .limit(limit);

    if (aErr || !assortments) {
      return Response.json({ error: aErr?.message || "Failed to load buyer assortments" }, { status: 500 });
    }

    let newlyCreated = 0;

    for (const item of assortments) {
      const buyerName = (item.buyers as any)?.company_name || "Enterprise Retailer";
      const itemVec = parseVector(item.embedding);
      if (!itemVec) continue;

      let candidateQuery = supabaseAdmin
        .from("supplier_products")
        .select("id, product_name, category_id, embedding, supplier_id, supplier_offerings(id, company_name, country_of_origin, verified, certifications)")
        .limit(150);

      if (item.category_id) {
        candidateQuery = candidateQuery.eq("category_id", item.category_id);
      }

      const { data: candidates } = await candidateQuery;
      if (!candidates || candidates.length === 0) continue;

      const scoredMatches: any[] = [];

      for (const c of candidates as any[]) {
        const sup = Array.isArray(c.supplier_offerings) ? c.supplier_offerings[0] : c.supplier_offerings;
        if (!sup) continue;

        let vectorSim = 0;
        let ptsVector = 20;
        const prodVec = parseVector(c.embedding);
        if (itemVec && prodVec) {
          vectorSim = cosineSimilarity(itemVec, prodVec);
          ptsVector = Math.round(vectorSim * 40 * 10) / 10;
        }

        const ptsCategory = c.category_id === item.category_id ? 30 : 15;
        let ptsOrigin = 5;
        const supCountry = (sup.country_of_origin || "").toLowerCase();
        if (item.manufacturer_country && supCountry.includes(item.manufacturer_country.toLowerCase())) {
          ptsOrigin = 15;
        }
        const ptsEvidence = (sup.verified ? 10 : 0) + ((sup.certifications || []).length > 0 ? 5 : 0);
        const totalScore = Math.min(100, Math.round(ptsVector + ptsCategory + ptsOrigin + ptsEvidence));

        if (totalScore >= minScore) {
          const pitch =
            sup.country_of_origin?.toLowerCase() === item.manufacturer_country?.toLowerCase()
              ? `Direct ${sup.country_of_origin} manufacturer alternative to ${buyerName} co-packer.`
              : `Qualified manufacturer with potential cost-advantage over existing ${buyerName} line.`;

          scoredMatches.push({
            buyer_assortment_id: item.id,
            buyer_id: item.buyer_id,
            supplier_product_id: c.id,
            supplier_id: sup.id,
            match_score: totalScore,
            vector_similarity: vectorSim,
            category_match: c.category_id === item.category_id,
            kosher_match: true,
            pitch_angle: pitch,
            potential_margin_gain: "15-25% estimated margin improvement over distributor import",
            status: "proposed",
          });
        }
      }

      scoredMatches.sort((a, b) => b.match_score - a.match_score);
      const topMatches = scoredMatches.slice(0, 3);

      if (topMatches.length > 0) {
        // Check for existing matches to avoid duplicates
        for (const m of topMatches) {
          const { data: existing } = await supabaseAdmin
            .from("assortment_matches")
            .select("id")
            .eq("buyer_assortment_id", m.buyer_assortment_id)
            .eq("supplier_product_id", m.supplier_product_id)
            .maybeSingle();

          if (!existing) {
            const { error: insErr } = await supabaseAdmin.from("assortment_matches").insert(m);
            if (!insErr) newlyCreated++;
          }
        }
      }
    }

    return Response.json({
      ok: true,
      assortmentsEvaluated: assortments.length,
      newMatchesCreated: newlyCreated,
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { matchSuppliers } from "@/lib/matching/matchSuppliers";
import type { MatchRequestInput } from "@/lib/matching/matchSuppliers";

const Schema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  // Accept admin session cookie OR internal service key
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const validSession = session ? await verifySession(session) : false;

  const internalKey = req.headers.get("x-internal-key");
  const validInternal = Boolean(
    internalKey &&
      internalKey === process.env.INTERNAL_API_KEY &&
      internalKey.length > 0
  );

  if (!validSession && !validInternal) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { requestId } = parsed.data;

  const { data: request, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const aiAnalysis = request.ai_analysis as Record<string, unknown> | null;

  const input: MatchRequestInput = {
    product_name: (request.product_name as string | null) ?? null,
    category: (request.category as string | null) ?? null,
    certifications: (request.certifications as string[] | null) ?? [],
    target_market: (request.target_market as string | null) ?? null,
    private_label: (request.private_label as boolean | null) ?? null,
    ai_analysis: aiAnalysis,
    tags: Array.isArray(aiAnalysis?.sourcing_keywords)
      ? (aiAnalysis!.sourcing_keywords as string[])
      : [],
    formats: aiAnalysis?.packaging_format
      ? [aiAnalysis.packaging_format as string]
      : [],
    product_type:
      aiAnalysis?.is_primary_product === true ? "pure_ingredient" : null,
  };

  const matches = await matchSuppliers(input, 10);

  // Persist top 3 matches to sourcing_matches
  for (const match of matches.slice(0, 3)) {
    await Promise.resolve(
      supabaseAdmin
        .from("sourcing_matches")
        .upsert(
          {
            request_id: requestId,
            supplier_id: match.supplier_id,
            match_score: match.score,
            match_breakdown: match.score_breakdown,
            status: "suggested",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "request_id,supplier_id" }
        )
    ).catch(console.error);
  }

  return Response.json({ ok: true, matches });
}

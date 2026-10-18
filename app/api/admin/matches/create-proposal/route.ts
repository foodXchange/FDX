import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";

const CreateProposalSchema = z.object({
  matchIds: z.array(z.string().uuid()).min(1).max(30),
  buyerName: z.string().trim().optional(),
  buyerCompany: z.string().trim().optional(),
  title: z.string().trim().optional(),
  personalMessage: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie || !(await verifySession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateProposalSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Select at least 1 match to create a proposal" },
      { status: 400 }
    );
  }

  const { matchIds, buyerName, buyerCompany, title, personalMessage } =
    parsed.data;

  // Fetch matches & their parent buyer request to auto-fill buyer details
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, product_name, company_name, match_score,
       request:sourcing_requests(id, product_name, company, name, email)`
    )
    .in("id", matchIds);

  const firstMatch = matches?.[0];
  const reqObj = firstMatch
    ? Array.isArray(firstMatch.request)
      ? firstMatch.request[0]
      : firstMatch.request
    : null;

  const resolvedBuyerName =
    buyerName ||
    (reqObj as { name?: string | null; company?: string | null } | null)?.name ||
    reqObj?.company ||
    "Valued Partner";

  const resolvedBuyerCompany =
    buyerCompany || reqObj?.company || null;

  const resolvedProductTitle =
    reqObj?.product_name || firstMatch?.product_name || "Sourced Selection";

  const resolvedTitle =
    title || `Curated Supplier Shortlist: ${resolvedProductTitle}`;

  const resolvedMessage =
    personalMessage ||
    `We have vetted and matched the top manufacturing options for your ${resolvedProductTitle} requirement. Review the shortlisted products below and click "Request Samples / Quote" on your preferred options.`;

  const token = crypto.randomBytes(9).toString("base64url");
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: inserted, error } = await supabaseAdmin
    .from("proposals")
    .insert({
      token,
      buyer_name: resolvedBuyerName,
      buyer_company: resolvedBuyerCompany,
      title: resolvedTitle,
      personal_message: resolvedMessage,
      status: "active",
      product_ids: matchIds,
      viewed_product_ids: [],
      view_count: 0,
      expires_at: expiresAt,
    })
    .select("id, token")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create proposal" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    proposalId: inserted.id,
    token: inserted.token,
    url: `/proposals/${inserted.token}`,
  });
}

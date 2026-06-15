import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME, getAdminEmail } from "@/lib/adminAuth";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { sendRfqEmail } from "@/lib/email/mailer";
import { renderTemplate } from "@/lib/outreach/renderTemplate";
import { getPipForRequest } from "@/lib/pip/getPipForRequest";
import { logEvent } from "@/lib/events/logEvent";

const BodySchema = z.object({
  requestId: z.string().uuid(),
  matchIds: z.array(z.string().uuid()).min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  deadline: z.string().min(1),
});

type MatchRow = {
  id: string;
  supplier_id: string;
  company_name: string | null;
  product_name: string | null;
  status: string | null;
};

type RfqResult = {
  matchId: string;
  company_name: string | null;
  success: boolean;
  error?: string;
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!adminCookie || !(await verifySession(adminCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { requestId, matchIds, subject, body, deadline } = parsed.data;

  const { data: request } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, company, product_name, message")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { data: matchData } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, company_name, product_name, status")
    .eq("request_id", requestId)
    .in("id", matchIds);

  const matches = (matchData ?? []) as MatchRow[];

  const pip = await getPipForRequest(requestId);
  const certifications = [...pip.compliance.kosher_types, ...pip.compliance.certifications].join(", ");
  const deadlineLabel = new Date(deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const requestVars = {
    buyer_company: request.company ?? "",
    product_name: request.product_name ?? "",
    volume: pip.commercial.volume ?? "",
    certifications,
    request_description: request.message ?? pip.product.raw_description ?? "",
    deadline: deadlineLabel,
  };

  const adminEmail = getAdminEmail();
  const results: RfqResult[] = [];

  for (const match of matches) {
    const vars = {
      ...requestVars,
      supplier_company: match.company_name ?? "",
      product_name: match.product_name || requestVars.product_name,
    };

    const renderedSubject = renderTemplate(subject, vars);
    const renderedBody = renderTemplate(body, vars);

    try {
      const contactEmail = await getSupplierContactEmail(match.supplier_id);
      if (!contactEmail) {
        results.push({ matchId: match.id, company_name: match.company_name, success: false, error: "No email on file" });
        continue;
      }

      const sendResult = await sendRfqEmail({
        supplierEmail: contactEmail,
        subject: renderedSubject,
        body: renderedBody,
      });

      if (!sendResult.success) {
        results.push({ matchId: match.id, company_name: match.company_name, success: false, error: sendResult.error });
        continue;
      }

      const now = new Date().toISOString();

      await supabaseAdmin
        .from("sourcing_matches")
        .update({ status: "rfq_sent", sent_at: now, sent_via: "email" })
        .eq("id", match.id);

      await supabaseAdmin.from("supplier_outreach_logs").insert({
        match_id: match.id,
        supplier_id: match.supplier_id,
        channel: "email",
        message: renderedBody,
        sent_by: adminEmail,
      });

      await supabaseAdmin.from("match_messages").insert({
        match_id: match.id,
        sender_type: "admin",
        message: renderedBody,
      });

      void logEvent(null, "admin", "rfq_sent", "match", match.id, {
        request_id: requestId,
        supplier_id: match.supplier_id,
        deadline,
      });

      results.push({ matchId: match.id, company_name: match.company_name, success: true });
    } catch (err) {
      results.push({
        matchId: match.id,
        company_name: match.company_name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, results });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { sendSupplierEmailSmart } from "@/lib/email/gmailEngine";
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
  match_breakdown: Record<string, unknown> | null;
};

type RfqResult = {
  matchId: string;
  company_name: string | null;
  success: boolean;
  via?: "gmail" | "resend";
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
    .select("id, company, product_name, message, ai_analysis")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { data: reqImages } = await supabaseAdmin
    .from("request_images")
    .select("url")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .limit(1);

  const benchmarkImageUrl = reqImages?.[0]?.url ?? null;

  const { data: matchData } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, company_name, product_name, status, match_breakdown")
    .eq("request_id", requestId)
    .in("id", matchIds);

  const matches = (matchData ?? []) as MatchRow[];

  const pip = await getPipForRequest(requestId);
  const certifications = [
    ...pip.compliance.kosher_types,
    ...pip.compliance.certifications,
  ].join(", ");
  const deadlineLabel = new Date(deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const aiAnalysis =
    request.ai_analysis && typeof request.ai_analysis === "object"
      ? (request.ai_analysis as Record<string, unknown>)
      : null;
  const benchmarkBrand =
    typeof aiAnalysis?.benchmark_brand === "string"
      ? aiAnalysis.benchmark_brand
      : null;

  const requestVars = {
    buyer_company: request.company ?? "",
    product_name: request.product_name ?? "",
    volume: pip.commercial.volume ?? "",
    certifications,
    request_description: request.message ?? pip.product.raw_description ?? "",
    deadline: deadlineLabel,
  };

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
        results.push({
          matchId: match.id,
          company_name: match.company_name,
          success: false,
          error: "No email on file",
        });
        continue;
      }

      const benchmarkCardHtml = `<div style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#ea580c;">Buyer Sourcing Brief Summary</p>
        <div style="font-size:13px;color:#334155;line-height:1.5;">
          ${benchmarkImageUrl ? `<img src="${benchmarkImageUrl}" alt="Benchmark Product" style="width:76px;height:76px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;float:left;margin-right:12px;" />` : ""}
          <div><strong>Target Product:</strong> ${request.product_name || match.product_name || "Sourcing Inquiry"}</div>
          ${benchmarkBrand ? `<div><strong>Benchmark Brand:</strong> ${benchmarkBrand}</div>` : ""}
          ${pip.commercial.volume ? `<div><strong>Target Volume:</strong> ${pip.commercial.volume}</div>` : ""}
          ${certifications ? `<div><strong>Certifications:</strong> ${certifications}</div>` : ""}
          <div style="clear:both;"></div>
        </div>
      </div>`;

      const sendResult = await sendSupplierEmailSmart({
        to: contactEmail,
        subject: renderedSubject,
        bodyText: renderedBody,
        matchId: match.id,
        benchmarkCardHtml,
      });

      if (!sendResult.success) {
        results.push({
          matchId: match.id,
          company_name: match.company_name,
          success: false,
          error: sendResult.error,
        });
        continue;
      }

      const now = new Date().toISOString();
      const prevBreakdown =
        match.match_breakdown && typeof match.match_breakdown === "object"
          ? match.match_breakdown
          : {};

      const updatedBreakdown: Record<string, unknown> = {
        ...prevBreakdown,
        gmail_message_id: sendResult.messageId ?? prevBreakdown.gmail_message_id,
        gmail_subject: sendResult.subjectUsed ?? renderedSubject,
        last_outreach_body: renderedBody,
        last_outreach_at: now,
        sent_via_provider: sendResult.via,
      };

      await supabaseAdmin
        .from("sourcing_matches")
        .update({
          status: "rfq_sent",
          sent_at: now,
          sent_via: "email",
          match_breakdown: updatedBreakdown,
        })
        .eq("id", match.id);

      await supabaseAdmin.from("match_messages").insert({
        match_id: match.id,
        sender_type: "admin",
        message: `[SUBJECT: ${sendResult.subjectUsed ?? renderedSubject}]\n\n${renderedBody}`,
      });

      void logEvent(null, "admin", "rfq_sent", "match", match.id, {
        request_id: requestId,
        supplier_id: match.supplier_id,
        deadline,
        via: sendResult.via,
      });

      results.push({
        matchId: match.id,
        company_name: match.company_name,
        success: true,
        via: sendResult.via,
      });
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

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
  emailOverrides: z.record(z.string(), z.string()).optional(),
  isFollowUp: z.boolean().optional(),
  nativeLanguagePrefix: z.boolean().optional(),
});

function buildNativeLanguageBanner(country: string | null | undefined, companyName: string, reqRef: string): string {
  const c = (country || "").toLowerCase().trim();
  if (c.includes("spain") || c.includes("españa") || c.includes("mexico") || c.includes("argentina")) {
    return `[ES] Estimado equipo de exportación de ${companyName}: Le contactamos desde FoodXchange (${reqRef}) para una consulta comercial B2B de distribución e importación. A continuación encontrará las especificaciones técnicas en inglés.\n────────────────────────────────────────\n\n`;
  }
  if (c.includes("italy") || c.includes("italia")) {
    return `[IT] Gentile Ufficio Export di ${companyName}, Vi contattiamo da FoodXchange (${reqRef}) per una richiesta di fornitura e distribuzione B2B. Di seguito trovate le specifiche tecniche del progetto in inglese.\n────────────────────────────────────────\n\n`;
  }
  if (c.includes("germany") || c.includes("austria") || c.includes("switzerland")) {
    return `[DE] Sehr geehrtes Export-Team von ${companyName}, wir kontaktieren Sie von FoodXchange (${reqRef}) bezüglich einer B2B-Beschaffungs- und Vertriebsanfrage. Nachfolgend finden Sie die Projektspezifikationen.\n────────────────────────────────────────\n\n`;
  }
  if (c.includes("france") || c.includes("belgium")) {
    return `[FR] Cher service Export de ${companyName}, nous vous contactons de la part de FoodXchange (${reqRef}) concernant une demande d'approvisionnement et de distribution B2B. Vous trouverez ci-dessous le cahier des charges.\n────────────────────────────────────────\n\n`;
  }
  if (c.includes("greece")) {
    return `[EL] Αγαπητή ομάδα εξαγωγών της ${companyName}, επικοινωνούμε μαζί σας από την FoodXchange (${reqRef}) σχετικά με ένα έργο προμήθειας και διανομής B2B. Παρακάτω θα βρείτε τις προδιαγραφές στα αγγλικά.\n────────────────────────────────────────\n\n`;
  }
  if (c.includes("poland")) {
    return `[PL] Szanowny Dziale Eksportu ${companyName}, kontaktujemy się z Państwem z platformy FoodXchange (${reqRef}) w sprawie zapytania ofertowego B2B. Poniżej znajdują się szczegółowe specyfikacje.\n────────────────────────────────────────\n\n`;
  }
  return "";
}

type MatchRow = {
  id: string;
  supplier_id: string;
  company_name: string | null;
  product_name: string | null;
  country: string | null;
  status: string | null;
  sent_at: string | null;
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

  const { requestId, matchIds, subject, body, deadline, emailOverrides, isFollowUp, nativeLanguagePrefix } = parsed.data;
  const requestRefTag = `[FDX-REQ-${requestId.replace(/-/g, "").slice(0, 8).toUpperCase()}]`;

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
    .select("id, supplier_id, company_name, product_name, country, status, sent_at, match_breakdown")
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
    request_ref: requestRefTag,
    buyer_company: request.company ?? "",
    product_name: request.product_name ?? "",
    volume: pip.commercial.volume ?? "",
    certifications,
    request_description: request.message ?? pip.product.raw_description ?? "",
    deadline: deadlineLabel,
  };

  const results: RfqResult[] = [];
  const CONCURRENCY = 4;

  async function processSingleMatch(match: MatchRow): Promise<RfqResult> {
    const vars = {
      ...requestVars,
      supplier_company: match.company_name ?? "",
      matched_product: match.product_name ?? "",
      product_name: match.product_name || requestVars.product_name,
    };

    const renderedSubject = renderTemplate(subject, vars);
    const nativePrefix = nativeLanguagePrefix
      ? buildNativeLanguageBanner(match.country, match.company_name || "Partner", requestRefTag)
      : "";
    const renderedBody = `${nativePrefix}${renderTemplate(body, vars)}`;

    try {
      const overrideEmail = emailOverrides?.[match.id]?.trim();
      const contactEmail = overrideEmail || (await getSupplierContactEmail(match.supplier_id));

      if (overrideEmail && match.supplier_id) {
        await supabaseAdmin
          .from("supplier_offerings")
          .update({ contact_email: overrideEmail })
          .eq("id", match.supplier_id);
      }

      if (!contactEmail) {
        return {
          matchId: match.id,
          company_name: match.company_name,
          success: false,
          error: "No email on file — enter email in composer",
        };
      }

      const prevBreakdown =
        match.match_breakdown && typeof match.match_breakdown === "object"
          ? match.match_breakdown
          : {};

      const benchmarkCardHtml = `<div style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#ea580c;">Buyer Sourcing Brief Summary · ${requestRefTag}</p>
        <div style="font-size:13px;color:#334155;line-height:1.5;">
          ${benchmarkImageUrl ? `<img src="${benchmarkImageUrl}" alt="Benchmark Product" style="width:76px;height:76px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;float:left;margin-right:12px;" />` : ""}
          <div><strong>Project Reference:</strong> ${requestRefTag}</div>
          <div><strong>Target Product:</strong> ${request?.product_name || match.product_name || "Sourcing Inquiry"}</div>
          ${match.product_name ? `<div><strong>Matched Factory SKU:</strong> ${match.product_name}</div>` : ""}
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
        requestId,
        benchmarkCardHtml,
        isFollowUp: Boolean(isFollowUp),
        previousMessageId: (prevBreakdown.gmail_message_id as string | undefined) ?? null,
        previousSentAt: (prevBreakdown.last_outreach_at as string | undefined) ?? match.sent_at ?? null,
        previousBodyText: (prevBreakdown.last_outreach_body as string | undefined) ?? null,
      });

      if (!sendResult.success) {
        return {
          matchId: match.id,
          company_name: match.company_name,
          success: false,
          error: sendResult.error,
        };
      }

      const now = new Date().toISOString();
      const prevHistory = Array.isArray(prevBreakdown.outreach_history)
        ? (prevBreakdown.outreach_history as Array<Record<string, unknown>>)
        : [];

      const updatedBreakdown: Record<string, unknown> = {
        ...prevBreakdown,
        gmail_message_id: sendResult.messageId ?? prevBreakdown.gmail_message_id,
        gmail_subject: sendResult.subjectUsed ?? renderedSubject,
        last_outreach_body: renderedBody,
        last_outreach_at: now,
        sent_via_provider: sendResult.via,
        recipient_email: contactEmail,
        outreach_count: ((prevBreakdown.outreach_count as number) || 0) + 1,
        outreach_history: [
          ...prevHistory,
          {
            direction: "outbound",
            type: isFollowUp ? "chaser" : "initial_rfq",
            to: contactEmail,
            subject: sendResult.subjectUsed ?? renderedSubject,
            body: renderedBody,
            sent_at: now,
            via: sendResult.via,
          },
        ],
      };

      await supabaseAdmin
        .from("sourcing_matches")
        .update({
          status: match.status === "responded" ? "responded" : "rfq_sent",
          sent_at: now,
          sent_via: "email",
          match_breakdown: updatedBreakdown,
        })
        .eq("id", match.id);

      await supabaseAdmin
        .from("supplier_outreach_logs")
        .insert({
          match_id: match.id,
          supplier_id: match.supplier_id,
          channel: "email",
          message: `[SUBJECT: ${sendResult.subjectUsed ?? renderedSubject}]\n\n${renderedBody}`,
          sent_by: "admin",
          sent_at: now,
        })
        .then(() => {});

      void logEvent(null, "admin", "rfq_sent", "match", match.id, {
        request_id: requestId,
        supplier_id: match.supplier_id,
        deadline,
        via: sendResult.via,
        is_follow_up: Boolean(isFollowUp),
      });

      return {
        matchId: match.id,
        company_name: match.company_name,
        success: true,
        via: sendResult.via,
      };
    } catch (err) {
      return {
        matchId: match.id,
        company_name: match.company_name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  for (let i = 0; i < matches.length; i += CONCURRENCY) {
    const batch = matches.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((m) => processSingleMatch(m)));
    results.push(...batchResults);
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, results });
}

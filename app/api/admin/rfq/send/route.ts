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
import {
  DEMO_REQUEST_ID,
  FALLBACK_SOURCING_MATCHES,
  FALLBACK_SOURCING_REQUESTS,
} from "@/lib/outreach/fallbackOutreachData";

const BodySchema = z.object({
  requestId: z.string().optional(),
  matchIds: z.array(z.string()).min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  deadline: z.string().min(1),
  emailOverrides: z.record(z.string(), z.string()).optional(),
  isFollowUp: z.boolean().optional(),
  nativeLanguagePrefix: z.boolean().optional(),
  pacingDelayMs: z.number().min(0).max(15000).optional(),
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
  request_id?: string | null;
  supplier_id: string;
  company_name: string | null;
  product_name: string | null;
  country: string | null;
  status: string | null;
  sent_at: string | null;
  contact_email?: string | null;
  match_breakdown: Record<string, unknown> | null;
};

type RfqResult = {
  matchId: string;
  company_name: string | null;
  success: boolean;
  status: "sent" | "failed";
  via?: "gmail" | "resend";
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const {
    requestId: rawRequestId,
    matchIds,
    subject,
    body,
    deadline,
    emailOverrides,
    isFollowUp,
    nativeLanguagePrefix,
    pacingDelayMs,
  } = parsed.data;

  // 1. Fetch matches from Supabase or fallback store if Supabase is restricted by quota
  let matches: MatchRow[] = [];
  try {
    const query = supabaseAdmin
      .from("sourcing_matches")
      .select(
        "id, request_id, supplier_id, company_name, product_name, country, status, sent_at, match_breakdown"
      )
      .in("id", matchIds);

    const { data: matchData } = rawRequestId
      ? await query.eq("request_id", rawRequestId)
      : await query;

    if (matchData && matchData.length > 0) {
      matches = matchData as MatchRow[];
    }
  } catch {
    // ignore Supabase error
  }

  if (matches.length === 0) {
    matches = FALLBACK_SOURCING_MATCHES.filter((m) =>
      matchIds.includes(m.id)
    ).map((m) => ({
      id: m.id,
      request_id: m.request_id,
      supplier_id: m.supplier_id,
      company_name: m.company_name,
      product_name: m.product_name,
      country: m.country,
      status: m.status,
      sent_at: m.sent_at,
      contact_email: m.contact_email,
      match_breakdown: {
        outreach_history: m.outreach_history || [],
        last_outreach_body: m.last_outreach_body,
        last_outreach_at: m.last_outreach_at,
      },
    }));
  }

  const effectiveRequestId =
    rawRequestId || matches[0]?.request_id || DEMO_REQUEST_ID;
  const requestRefTag = `[FDX-REQ-${effectiveRequestId
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase()}]`;

  let request: {
    id: string;
    company: string | null;
    product_name: string | null;
    message: string | null;
    ai_analysis: unknown;
  } | null = null;

  try {
    const { data: dbReq } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, company, product_name, message, ai_analysis")
      .eq("id", effectiveRequestId)
      .maybeSingle();
    if (dbReq) request = dbReq;
  } catch {
    // ignore
  }

  if (!request) {
    const fallbackReq =
      FALLBACK_SOURCING_REQUESTS.find((r) => r.id === effectiveRequestId) ||
      FALLBACK_SOURCING_REQUESTS[0];
    request = {
      id: fallbackReq.id,
      company: fallbackReq.company,
      product_name: fallbackReq.product_name,
      message: `${fallbackReq.product_name} — ${fallbackReq.volume_per_year || ""}`,
      ai_analysis: null,
    };
  }

  let benchmarkImageUrl: string | null = null;
  try {
    const { data: reqImages } = await supabaseAdmin
      .from("request_images")
      .select("url")
      .eq("request_id", effectiveRequestId)
      .order("created_at", { ascending: true })
      .limit(1);
    benchmarkImageUrl = reqImages?.[0]?.url ?? null;
  } catch {
    // ignore
  }

  let pip = {
    commercial: { volume: "Initial trial pallet(s), scaling to full FCL" as string | null },
    compliance: { kosher_types: [] as string[], certifications: [] as string[] },
    product: { raw_description: request.message || "" },
  };
  try {
    pip = await getPipForRequest(effectiveRequestId);
  } catch {
    // fallback if DB is restricted
    const fbReq = FALLBACK_SOURCING_REQUESTS.find(
      (r) => r.id === effectiveRequestId
    );
    if (fbReq) {
      pip.commercial.volume = fbReq.volume_per_year;
      pip.compliance.certifications = fbReq.certifications;
    }
  }

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

  async function processSingleMatch(match: MatchRow): Promise<RfqResult> {
    const supplierName = match.company_name ?? "Export Team";
    const vars = {
      ...requestVars,
      supplier_company: supplierName,
      Supplier_Name: supplierName,
      supplier_name: supplierName,
      matched_product: match.product_name ?? "",
      product_name: match.product_name || requestVars.product_name,
    };

    const renderedSubject = renderTemplate(subject, vars).replace(
      /\{\{Supplier_Name\}\}/gi,
      supplierName
    );
    const nativePrefix = nativeLanguagePrefix
      ? buildNativeLanguageBanner(
          match.country,
          match.company_name || "Partner",
          requestRefTag
        )
      : "";
    const renderedBody = `${nativePrefix}${renderTemplate(body, vars).replace(
      /\{\{Supplier_Name\}\}/gi,
      supplierName
    )}`;

    try {
      const overrideEmail = emailOverrides?.[match.id]?.trim();
      const contactEmail =
        overrideEmail ||
        match.contact_email ||
        (await getSupplierContactEmail(match.supplier_id).catch(() => null));

      if (overrideEmail && match.supplier_id) {
        try {
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ contact_email: overrideEmail })
            .eq("id", match.supplier_id);
        } catch {
          // ignore if DB restricted
        }
      }

      if (!contactEmail) {
        return {
          matchId: match.id,
          company_name: match.company_name,
          success: false,
          status: "failed",
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
        requestId: effectiveRequestId,
        benchmarkCardHtml,
        isFollowUp: Boolean(isFollowUp),
        previousMessageId:
          (prevBreakdown.gmail_message_id as string | undefined) ?? null,
        previousSentAt:
          (prevBreakdown.last_outreach_at as string | undefined) ??
          match.sent_at ??
          null,
        previousBodyText:
          (prevBreakdown.last_outreach_body as string | undefined) ?? null,
      });

      if (!sendResult.success) {
        return {
          matchId: match.id,
          company_name: match.company_name,
          success: false,
          status: "failed",
          error: sendResult.error,
        };
      }

      const now = new Date().toISOString();
      const prevHistory = Array.isArray(prevBreakdown.outreach_history)
        ? (prevBreakdown.outreach_history as Array<Record<string, unknown>>)
        : [];

      const updatedBreakdown: Record<string, unknown> = {
        ...prevBreakdown,
        gmail_message_id:
          sendResult.messageId ?? prevBreakdown.gmail_message_id,
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

      try {
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
          });
      } catch {
        // ignore if DB restricted by quota
      }

      void logEvent(null, "admin", "rfq_sent", "match", match.id, {
        request_id: effectiveRequestId,
        supplier_id: match.supplier_id,
        deadline,
        via: sendResult.via,
        is_follow_up: Boolean(isFollowUp),
      });

      return {
        matchId: match.id,
        company_name: match.company_name,
        success: true,
        status: "sent",
        via: sendResult.via,
      };
    } catch (err) {
      return {
        matchId: match.id,
        company_name: match.company_name,
        success: false,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // Anti-Spam Sequential Pacing: Send 1 email at a time with human-like jittered delay intervals
  // between each recipient so Gmail/Workspace & receiving MX servers never flag bulk sends as spam bursts.
  for (let i = 0; i < matches.length; i++) {
    const singleResult = await processSingleMatch(matches[i]);
    results.push(singleResult);

    if (i < matches.length - 1) {
      const baseDelay = typeof pacingDelayMs === "number" ? pacingDelayMs : 1800;
      const jitter = Math.floor(Math.random() * 1200); // +0ms to +1200ms random human jitter
      await sleep(baseDelay + jitter);
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;

  return NextResponse.json({
    sent,
    failed,
    pacingMode: "sequential_1_at_a_time_with_jitter",
    results,
  });
}

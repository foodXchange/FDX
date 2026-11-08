import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  parseInboundCorrespondenceWithAI,
  applyInboundParseToRequest,
} from "@/lib/email/inboundAiParser";
import { createNotification } from "@/lib/notifications/createNotification";

/**
 * POST /api/webhooks/resend
 * Handles Resend Webhooks:
 * - email.received (Inbound supplier replies via Resend Inbound)
 * - email.delivered
 * - email.bounced
 * - email.complained
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const eventType = typeof payload?.type === "string" ? payload.type : "";
    const data = payload?.data || {};

    if (!eventType) {
      return NextResponse.json({ ok: false, error: "Missing Resend event type" }, { status: 400 });
    }

    // Helper to resolve matchId and requestId from headers, To plus-address, subject tags, or email address
    async function resolveTargetMatch(opts: {
      toList: string[];
      fromEmail: string;
      subject: string;
      bodyText: string;
      headers?: Record<string, string> | Array<{ name: string; value: string }>;
    }): Promise<{ matchId: string | null; requestId: string | null }> {
      let matchId: string | null = null;
      let requestId: string | null = null;

      // 1. Check custom X-FDX-Match-ID header if present
      if (opts.headers) {
        if (Array.isArray(opts.headers)) {
          const hMatch = opts.headers.find(
            (h) => h.name?.toLowerCase() === "x-fdx-match-id"
          );
          if (hMatch?.value) matchId = hMatch.value;
        } else if (typeof opts.headers === "object") {
          const val =
            opts.headers["x-fdx-match-id"] || opts.headers["X-FDX-Match-ID"];
          if (val) matchId = val;
        }
      }

      if (matchId) {
        const { data: mRow } = await supabaseAdmin
          .from("sourcing_matches")
          .select("id, request_id")
          .eq("id", matchId)
          .maybeSingle();
        if (mRow) {
          return { matchId: mRow.id, requestId: mRow.request_id };
        }
      }

      // 2. Check plus-addressed To address: +fdx-<shortMatchId>@
      const joinedTo = opts.toList.join(" ");
      const plusMatch = joinedTo.match(/\+fdx-([a-f0-9]{8})@/i);
      if (plusMatch) {
        const shortMId = plusMatch[1].toLowerCase();
        const { data: mRow } = await supabaseAdmin
          .from("sourcing_matches")
          .select("id, request_id")
          .ilike("id", `${shortMId}%`)
          .maybeSingle();
        if (mRow) {
          return { matchId: mRow.id, requestId: mRow.request_id };
        }
      }

      // 3. Check [FDX-REQ-XXXXXXXX] and [FDX-XXXXXXXX] in subject + body
      const combined = `${opts.subject} ${opts.bodyText}`;
      const reqTagMatch = combined.match(/FDX-REQ-([A-F0-9]{8})/i);
      if (reqTagMatch) {
        const shortReqId = reqTagMatch[1].toLowerCase();
        const { data: reqRow } = await supabaseAdmin
          .from("sourcing_requests")
          .select("id")
          .ilike("id", `${shortReqId}%`)
          .maybeSingle();
        if (reqRow) requestId = reqRow.id;
      }

      const matchTag = combined.match(/FDX-(?!REQ-)([A-F0-9]{8})/i);
      if (matchTag) {
        const shortMatchId = matchTag[1].toLowerCase();
        const { data: mRow } = await supabaseAdmin
          .from("sourcing_matches")
          .select("id, request_id")
          .ilike("id", `${shortMatchId}%`)
          .maybeSingle();
        if (mRow) {
          matchId = mRow.id;
          if (!requestId) requestId = mRow.request_id;
        }
      }

      // 4. Fallback: Match by sender or recipient supplier email
      const lookupEmail = (opts.fromEmail || opts.toList[0] || "").trim().toLowerCase();
      if (!matchId && lookupEmail) {
        const { data: offRow } = await supabaseAdmin
          .from("supplier_offerings")
          .select("id")
          .ilike("contact_email", lookupEmail)
          .limit(1)
          .maybeSingle();

        let supplierId = offRow?.id || null;
        if (!supplierId) {
          const { data: cRow } = await supabaseAdmin
            .from("supplier_contacts")
            .select("supplier_id")
            .ilike("email", lookupEmail)
            .limit(1)
            .maybeSingle();
          supplierId = cRow?.supplier_id || null;
        }

        if (supplierId) {
          const q = supabaseAdmin
            .from("sourcing_matches")
            .select("id, request_id")
            .eq("supplier_id", supplierId)
            .order("updated_at", { ascending: false })
            .limit(1);
          if (requestId) q.eq("request_id", requestId);
          const { data: mRows } = await q;
          if (mRows && mRows.length > 0) {
            matchId = mRows[0].id;
            if (!requestId) requestId = mRows[0].request_id;
          }
        }
      }

      return { matchId, requestId };
    }

    // CASE A: Delivery & Bounce Events (email.delivered, email.bounced, email.complained)
    if (
      eventType === "email.delivered" ||
      eventType === "email.bounced" ||
      eventType === "email.complained"
    ) {
      const toList: string[] = Array.isArray(data.to)
        ? data.to
        : typeof data.to === "string"
        ? [data.to]
        : [];
      const subject = typeof data.subject === "string" ? data.subject : "";
      const { matchId, requestId } = await resolveTargetMatch({
        toList,
        fromEmail: toList[0] || "",
        subject,
        bodyText: "",
        headers: data.headers,
      });

      if (matchId) {
        const { data: matchRow } = await supabaseAdmin
          .from("sourcing_matches")
          .select("id, company_name, product_name, match_breakdown")
          .eq("id", matchId)
          .maybeSingle();

        if (matchRow) {
          const bd = (matchRow.match_breakdown as Record<string, any>) || {};
          const statusLabel =
            eventType === "email.delivered"
              ? "delivered"
              : eventType === "email.bounced"
              ? "bounced"
              : "complained";

          await supabaseAdmin
            .from("sourcing_matches")
            .update({
              match_breakdown: {
                ...bd,
                delivery_status: statusLabel,
                delivery_updated_at: new Date().toISOString(),
                ...(statusLabel === "bounced"
                  ? {
                      bounced_at: new Date().toISOString(),
                      bounce_reason:
                        data.bounce?.message || "Recipient address bounced",
                    }
                  : {}),
              },
            })
            .eq("id", matchId);

          if (statusLabel === "bounced") {
            await createNotification(
              "system",
              `⚠️ Email Bounced: ${matchRow.company_name}`,
              `Outreach email to ${toList.join(", ")} for ${matchRow.product_name} bounced. Please update the supplier email in the Email Outreach Hub.`,
              { match_id: matchId, request_id: requestId }
            );
          }
        }
      }

      return NextResponse.json({ ok: true, handled: eventType, matchId });
    }

    // CASE B: Inbound Supplier Reply (email.received)
    if (eventType === "email.received") {
      const fromEmail =
        typeof data.from === "string"
          ? data.from.replace(/.*<([^>]+)>.*/, "$1").trim().toLowerCase()
          : "";
      const toList: string[] = Array.isArray(data.to)
        ? data.to
        : typeof data.to === "string"
        ? [data.to]
        : [];
      const subject = typeof data.subject === "string" ? data.subject : "Re: Sourcing Inquiry";

      let bodyText =
        typeof data.text === "string"
          ? data.text
          : typeof data.html === "string"
          ? data.html.replace(/<[^>]+>/g, " ")
          : "";

      // If Resend webhook payload only contains email_id, fetch full body from Resend API if key is configured
      if (!bodyText && data.email_id && process.env.RESEND_API_KEY) {
        try {
          const res = await fetch(
            `https://api.resend.com/emails/receiving/${data.email_id}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              },
            }
          );
          if (res.ok) {
            const fullEmail = await res.json();
            bodyText =
              fullEmail.text ||
              (typeof fullEmail.html === "string"
                ? fullEmail.html.replace(/<[^>]+>/g, " ")
                : "");
          }
        } catch (fetchErr) {
          console.warn("Resend receiving fetch fallback warning:", fetchErr);
        }
      }

      const { matchId, requestId } = await resolveTargetMatch({
        toList,
        fromEmail,
        subject,
        bodyText,
        headers: data.headers,
      });

      const parsed = await parseInboundCorrespondenceWithAI(
        bodyText || subject,
        subject,
        fromEmail
      );

      let updatedStages: string[] = [];
      if (requestId) {
        const applyRes = await applyInboundParseToRequest(
          requestId,
          matchId,
          parsed,
          {
            fromEmail,
            subject,
            bodyText: bodyText || subject,
            receivedAt: data.created_at || new Date().toISOString(),
          }
        );
        if (applyRes.ok) {
          updatedStages = applyRes.updatedStages;
        }
      }

      await createNotification(
        "response",
        `📥 Supplier Reply (${parsed.intent.replace("_", " ").toUpperCase()}): ${fromEmail}`,
        parsed.english_summary,
        {
          match_id: matchId,
          request_id: requestId,
          from_email: fromEmail,
          subject,
          intent: parsed.intent,
        }
      );

      return NextResponse.json({
        ok: true,
        handled: "email.received",
        matchId,
        requestId,
        intent: parsed.intent,
        updatedStages,
      });
    }

    return NextResponse.json({ ok: true, ignored: eventType });
  } catch (err: any) {
    console.error("POST /api/webhooks/resend error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME, getAdminEmail } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getSupplierContactEmail,
  getSupplierContactPhone,
} from "@/lib/email/supplierOutreach";
import {
  sendSupplierEmailSmart,
  getMatchRefTag,
} from "@/lib/email/gmailEngine";
import { renderTemplate } from "@/lib/outreach/renderTemplate";
import { waLink } from "@/lib/outreach/waLink";
import { logEvent } from "@/lib/events/logEvent";

const BodySchema = z.object({
  matchIds: z.array(z.string().uuid()).min(1),
  channel: z.enum(["email", "whatsapp"]),
  templateId: z.string().uuid().optional(),
  customSubject: z.string().optional(),
  customMessage: z.string().optional(),
  isFollowUp: z.boolean().optional(),
  includeBenchmarkCard: z.boolean().optional(),
});

const DEFAULT_SUBJECT =
  "Sourcing Inquiry: {{product_name}} (Israel Market) — FoodXchange";
const DEFAULT_BODY = `Dear {{company_name}} Export / Sales Team,

We represent a major food importer & distributor in Israel currently sourcing a benchmark equivalent for:
• Matched Product in Your Catalog: {{product_name}}
• Buyer Requirement / Category: {{buyer_product}} ({{category}})
• Required Specs & Compliance: {{specs_summary}}

Given your strong product fit (Match Score: {{match_score}}/100), could you please confirm:
1. Export availability & available packaging formats (retail / foodservice / private label)
2. Kosher certification status & BRC/IFS certificates
3. Indicative FOB/EXW pricing and MOQ

We look forward to your reply.`;

const DEFAULT_FOLLOWUP_BODY = `Dear {{company_name}} Team,

Following up on our previous sourcing inquiry regarding {{product_name}} for our buyer in Israel ({{specs_summary}}).

We are finalizing the shortlist of manufacturers to present to the buyer this week. Please let us know if you can supply this item and share your packaging formats and MOQ.`;

type MatchRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  status: string;
  product_name: string | null;
  company_name: string | null;
  country: string | null;
  match_score: number;
  sent_at: string | null;
  match_breakdown: Record<string, unknown> | null;
  request: {
    id: string;
    product_name: string | null;
    category: string | null;
    kosher: string | null;
    certifications: string[] | null;
    quantity: string | null;
    unit: string | null;
    notes: string | null;
    reference_image_urls: string[] | null;
  } | null;
};

type TemplateRow = {
  id: string;
  subject: string | null;
  body: string;
};

type BulkResult = {
  matchId: string;
  success: boolean;
  via?: "gmail" | "resend" | "whatsapp";
  emailUsed?: string;
  error?: string;
  url?: string;
  company_name?: string | null;
};

function buildSpecsSummary(req: MatchRow["request"]): string {
  if (!req) return "Standard export specifications, Kosher preferred";
  const parts: string[] = [];
  if (req.kosher && req.kosher !== "none") parts.push(`Kosher (${req.kosher})`);
  if (req.certifications && req.certifications.length > 0) {
    parts.push(req.certifications.join(", "));
  }
  if (req.quantity) {
    parts.push(`Qty: ${req.quantity} ${req.unit ?? ""}`.trim());
  }
  if (req.notes) {
    parts.push(req.notes.slice(0, 140));
  }
  return parts.length > 0
    ? parts.join(" · ")
    : "Standard export specifications, Kosher preferred";
}

function buildBenchmarkCardHtml(
  req: MatchRow["request"],
  matchedProductName: string | null
): string {
  if (!req) return "";
  const imgUrl = req.reference_image_urls?.[0] ?? null;
  const specs = buildSpecsSummary(req);

  return `<div style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#ea580c;">
      Buyer Sourcing Brief Summary
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        ${
          imgUrl
            ? `<td style="width:88px;vertical-align:top;padding-right:14px;">
                <img src="${imgUrl}" alt="Benchmark Product" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;background:#fff;" />
              </td>`
            : ""
        }
        <td style="vertical-align:top;font-size:13px;color:#334155;line-height:1.5;">
          <div><strong>Target Benchmark:</strong> ${
            req.product_name ?? matchedProductName ?? "Food Product"
          }</div>
          ${
            matchedProductName
              ? `<div><strong>Matched Catalog Item:</strong> ${matchedProductName}</div>`
              : ""
          }
          ${
            req.category
              ? `<div><strong>Category:</strong> ${req.category}</div>`
              : ""
          }
          <div><strong>Key Requirements:</strong> ${specs}</div>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    matchIds,
    channel,
    templateId,
    customSubject,
    customMessage,
    isFollowUp = false,
    includeBenchmarkCard = true,
  } = parsed.data;

  const { data: matchData, error: matchError } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, supplier_id, status, product_name, company_name, country, match_score, sent_at, match_breakdown,
       request:sourcing_requests(id, product_name, category, kosher, certifications, quantity, unit, notes, reference_image_urls)`
    )
    .in("id", matchIds);

  if (matchError) {
    return Response.json({ error: matchError.message }, { status: 500 });
  }

  // Sort by match_score DESC (100 down to 10)
  const matches = ((matchData ?? []) as unknown as MatchRow[]).sort(
    (a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)
  );

  let template: TemplateRow | null = null;
  if (templateId) {
    const { data: templateData } = await supabaseAdmin
      .from("supplier_email_templates")
      .select("id, subject, body")
      .eq("id", templateId)
      .maybeSingle();
    template = (templateData ?? null) as TemplateRow | null;
  }

  const adminEmail = getAdminEmail();
  const results: BulkResult[] = [];

  for (const match of matches) {
    const specsSummary = buildSpecsSummary(match.request);
    const vars = {
      company_name: match.company_name ?? "Supplier Team",
      product_name:
        match.product_name ??
        match.request?.product_name ??
        "your food products",
      buyer_product:
        match.request?.product_name ?? match.product_name ?? "requested item",
      category: match.request?.category ?? "Food & Beverage",
      specs_summary: specsSummary,
      country: match.country ?? "",
      match_score: String(match.match_score),
      ref_tag: getMatchRefTag(match.id),
    };

    const prevSubject =
      typeof match.match_breakdown?.gmail_subject === "string"
        ? match.match_breakdown.gmail_subject
        : null;
    const prevMessageId =
      typeof match.match_breakdown?.gmail_message_id === "string"
        ? match.match_breakdown.gmail_message_id
        : null;
    const prevBody =
      typeof match.match_breakdown?.last_outreach_body === "string"
        ? match.match_breakdown.last_outreach_body
        : null;

    const subjectTemplate =
      customSubject?.trim() ||
      (isFollowUp && prevSubject ? prevSubject : null) ||
      template?.subject ||
      DEFAULT_SUBJECT;

    const bodyTemplate =
      customMessage?.trim() ||
      template?.body ||
      (isFollowUp ? DEFAULT_FOLLOWUP_BODY : DEFAULT_BODY);

    const subject = renderTemplate(subjectTemplate, vars);
    const message = renderTemplate(bodyTemplate, vars);

    if (channel === "email") {
      const contactEmail = await getSupplierContactEmail(match.supplier_id);
      if (!contactEmail) {
        results.push({
          matchId: match.id,
          success: false,
          error: "No contact email on file — click '🔍 Find Email' first",
        });
        continue;
      }

      const benchmarkCardHtml = includeBenchmarkCard
        ? buildBenchmarkCardHtml(match.request, match.product_name)
        : undefined;

      const sendResult = await sendSupplierEmailSmart({
        matchId: match.id,
        to: contactEmail,
        subject,
        bodyText: message,
        benchmarkCardHtml,
        isFollowUp,
        previousMessageId: prevMessageId,
        previousSentAt: match.sent_at,
        previousBodyText: prevBody,
      });

      if (!sendResult.success) {
        results.push({
          matchId: match.id,
          success: false,
          error: sendResult.error,
        });
        continue;
      }

      await recordSent({
        match,
        channel: "email",
        message,
        subjectUsed: sendResult.subjectUsed ?? subject,
        messageId: sendResult.messageId,
        emailUsed: contactEmail,
        isFollowUp,
        templateId,
        adminEmail,
      });

      results.push({
        matchId: match.id,
        success: true,
        via: sendResult.via,
        emailUsed: contactEmail,
      });
    } else {
      const contactPhone = await getSupplierContactPhone(match.supplier_id);
      const url = waLink(contactPhone, message);

      await recordSent({
        match,
        channel: "whatsapp",
        message,
        subjectUsed: "WhatsApp Outreach",
        isFollowUp,
        templateId,
        adminEmail,
      });

      results.push({
        matchId: match.id,
        success: true,
        via: "whatsapp",
        url,
        company_name: match.company_name,
      });
    }
  }

  return Response.json({ results });
}

async function recordSent(opts: {
  match: MatchRow;
  channel: "email" | "whatsapp";
  message: string;
  subjectUsed: string;
  messageId?: string;
  emailUsed?: string;
  isFollowUp: boolean;
  templateId: string | undefined;
  adminEmail: string;
}): Promise<void> {
  const { match, channel, message, subjectUsed, messageId, emailUsed, isFollowUp } =
    opts;
  const now = new Date().toISOString();
  const prevFollowups =
    typeof match.match_breakdown?.followup_count === "number"
      ? match.match_breakdown.followup_count
      : 0;

  const updatedBreakdown: Record<string, unknown> = {
    ...(match.match_breakdown ?? {}),
    last_outreach_body: message,
    last_outreach_at: now,
    last_outreach_email: emailUsed ?? match.match_breakdown?.last_outreach_email ?? null,
    followup_count: isFollowUp ? prevFollowups + 1 : prevFollowups,
  };

  if (messageId) {
    updatedBreakdown.gmail_message_id = messageId;
  }
  if (subjectUsed) {
    updatedBreakdown.gmail_subject = subjectUsed;
  }

  const updatePayload: Record<string, unknown> = {
    sent_at: now,
    sent_via: channel,
    match_breakdown: updatedBreakdown,
  };

  if (match.status !== "responded") {
    updatePayload.status = "sent";
  }

  await supabaseAdmin
    .from("sourcing_matches")
    .update(updatePayload)
    .eq("id", match.id);

  // Log into match_messages so the full email history appears in the Match Thread
  await supabaseAdmin.from("match_messages").insert({
    match_id: match.id,
    sender_type: "admin",
    message: `[${isFollowUp ? "Follow-Up" : "Initial"} ${channel.toUpperCase()} → ${
      emailUsed ?? match.company_name ?? "Supplier"
    }]\nSubject: ${subjectUsed}\n\n${message}`,
  });

  void logEvent(
    null,
    "admin",
    channel === "email" ? "bulk_email_sent" : "bulk_whatsapp_sent",
    "match",
    match.id,
    {
      supplier_id: match.supplier_id,
      template_id: opts.templateId ?? null,
      is_follow_up: isFollowUp,
    }
  );
}

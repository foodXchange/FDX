import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME, getAdminEmail } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getSupplierContactEmail,
  getSupplierContactPhone,
  sendOutreachEmail,
} from "@/lib/email/supplierOutreach";
import { renderTemplate } from "@/lib/outreach/renderTemplate";
import { waLink } from "@/lib/outreach/waLink";
import { logEvent } from "@/lib/events/logEvent";

const BodySchema = z.object({
  matchIds: z.array(z.string().uuid()).min(1),
  channel: z.enum(["email", "whatsapp"]),
  templateId: z.string().uuid().optional(),
  customMessage: z.string().optional(),
});

const DEFAULT_SUBJECT = "Sourcing inquiry: {{product_name}} — FoodXchange";
const DEFAULT_BODY =
  "Hi {{company_name}}, we're sourcing {{product_name}} for a buyer and would love to hear from you. Please reply with availability, pricing, and MOQ.";

const SENT_STATUSES = new Set(["pending", "new", "approved"]);

type MatchRow = {
  id: string;
  supplier_id: string;
  status: string;
  product_name: string | null;
  company_name: string | null;
  country: string | null;
  match_score: number;
};

type TemplateRow = {
  id: string;
  subject: string | null;
  body: string;
};

type BulkResult = {
  matchId: string;
  success: boolean;
  error?: string;
  url?: string;
  company_name?: string | null;
};

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

  const { matchIds, channel, templateId, customMessage } = parsed.data;

  const { data: matchData, error: matchError } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, status, product_name, company_name, country, match_score")
    .in("id", matchIds);

  if (matchError) {
    return Response.json({ error: matchError.message }, { status: 500 });
  }

  const matches = (matchData ?? []) as MatchRow[];

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
    const vars = {
      company_name: match.company_name ?? "",
      product_name: match.product_name ?? "",
      country: match.country ?? "",
      match_score: String(match.match_score),
    };

    const subject = renderTemplate(template?.subject ?? DEFAULT_SUBJECT, vars);
    const message = renderTemplate(customMessage ?? template?.body ?? DEFAULT_BODY, vars);

    if (channel === "email") {
      const contactEmail = await getSupplierContactEmail(match.supplier_id);
      if (!contactEmail) {
        results.push({ matchId: match.id, success: false, error: "No contact email on file" });
        continue;
      }

      const bodyHtml = `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;white-space:pre-wrap;">${message}</p>`;
      const sendResult = await sendOutreachEmail({ to: contactEmail, subject, bodyHtml });

      if (!sendResult.success) {
        results.push({ matchId: match.id, success: false, error: sendResult.error });
        continue;
      }

      await recordSent(match, channel, message, templateId, adminEmail);
      results.push({ matchId: match.id, success: true });
    } else {
      const contactPhone = await getSupplierContactPhone(match.supplier_id);
      const url = waLink(contactPhone, message);

      await recordSent(match, channel, message, templateId, adminEmail);
      results.push({ matchId: match.id, success: true, url, company_name: match.company_name });
    }
  }

  return Response.json({ results });
}

async function recordSent(
  match: MatchRow,
  channel: "email" | "whatsapp",
  message: string,
  templateId: string | undefined,
  adminEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const update: Record<string, string> = { sent_at: now, sent_via: channel };
  if (SENT_STATUSES.has(match.status)) {
    update.status = "sent";
  }

  await supabaseAdmin.from("sourcing_matches").update(update).eq("id", match.id);

  await supabaseAdmin.from("supplier_outreach_logs").insert({
    match_id: match.id,
    supplier_id: match.supplier_id,
    channel,
    template_id: templateId ?? null,
    message,
    sent_by: adminEmail,
  });

  void logEvent(
    null,
    "admin",
    channel === "email" ? "bulk_email_sent" : "bulk_whatsapp_sent",
    "match",
    match.id,
    { supplier_id: match.supplier_id, template_id: templateId ?? null }
  );
}

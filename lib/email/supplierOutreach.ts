import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPipForRequest } from "@/lib/pip/getPipForRequest";

export type SendSupplierOutreachResult = {
  success: boolean;
  messageId?: string;
  sent_at?: string;
  error?: string;
};

export async function getSupplierContactEmail(supplierId: string): Promise<string | null> {
  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("contact_email")
    .eq("id", supplierId)
    .single();

  let contactEmail = (supplier as { contact_email: string | null } | null)?.contact_email ?? null;

  if (!contactEmail) {
    const { data: contact } = await supabaseAdmin
      .from("supplier_contacts")
      .select("email")
      .eq("supplier_id", supplierId)
      .not("email", "is", null)
      .order("scraped_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    contactEmail = (contact as { email: string | null } | null)?.email ?? null;
  }

  return contactEmail;
}

export async function getSupplierContactPhone(supplierId: string): Promise<string | null> {
  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("contact_phone")
    .eq("id", supplierId)
    .single();

  let contactPhone = (supplier as { contact_phone: string | null } | null)?.contact_phone ?? null;

  if (!contactPhone) {
    const { data: contact } = await supabaseAdmin
      .from("supplier_contacts")
      .select("phone")
      .eq("supplier_id", supplierId)
      .not("phone", "is", null)
      .order("scraped_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    contactPhone = (contact as { phone: string | null } | null)?.phone ?? null;
  }

  return contactPhone;
}

export type SendOutreachEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendOutreachEmail({
  to,
  subject,
  bodyHtml,
}: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<SendOutreachEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not set" };
  }

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange Sourcing</p>
  ${bodyHtml}
  <p style="color:#334155;font-size:15px;line-height:1.7;margin:24px 0 0;">Best regards,<br/>FoodXchange Sourcing Team</p>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · Strategic sourcing · fdx.trading</p>
  </div>
</div>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.SOURCING_FROM_EMAIL ?? "FoodXchange Sourcing <sourcing@fdx.trading>";

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendSupplierOutreachEmail(
  matchId: string,
  customMessage?: string
): Promise<SendSupplierOutreachResult> {
  const { data: match } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, request_id, product_name, company_name, country, match_score")
    .eq("id", matchId)
    .single();

  if (!match) {
    return { success: false, error: "Match not found" };
  }

  const matchRow = match as {
    id: string;
    supplier_id: string;
    request_id: string;
    product_name: string | null;
    company_name: string | null;
    country: string | null;
    match_score: number;
  };

  const contactEmail = await getSupplierContactEmail(matchRow.supplier_id);

  if (!contactEmail) {
    return { success: false, error: "No contact email on file for this supplier" };
  }

  const companyName = matchRow.company_name ?? "there";
  const productName = matchRow.product_name ?? "your products";

  let bodyHtml: string;

  if (customMessage) {
    bodyHtml = `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;white-space:pre-wrap;">${customMessage}</p>`;
  } else {
    const pip = await getPipForRequest(matchRow.request_id);

    const requirements: string[] = [];
    if (pip.commercial.volume) requirements.push(pip.commercial.volume);

    const certs = [...pip.compliance.kosher_types, ...pip.compliance.certifications];
    if (certs.length > 0) requirements.push(certs.join(", "));

    const formatsAndPackaging = [...pip.specifications.formats];
    if (pip.specifications.packaging) formatsAndPackaging.push(pip.specifications.packaging);
    if (formatsAndPackaging.length > 0) requirements.push(formatsAndPackaging.join(", "));

    const requirementsLine =
      requirements.length > 0
        ? `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">Requirements: ${requirements.join(" · ")}</p>`
        : "";

    bodyHtml = `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">Dear ${companyName},</p>
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">We represent a buyer looking for <strong>${productName}</strong>.</p>
${requirementsLine}
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">Please reply with your availability, pricing, and MOQ.</p>`;
  }

  const result = await sendOutreachEmail({
    to: contactEmail,
    subject: `Sourcing inquiry: ${productName} — FoodXchange`,
    bodyHtml,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const sentAt = new Date().toISOString();

  await supabaseAdmin
    .from("sourcing_matches")
    .update({ sent_at: sentAt, sent_via: "email", status: "sent" })
    .eq("id", matchId);

  return { success: true, messageId: result.messageId, sent_at: sentAt };
}

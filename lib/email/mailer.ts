import { Resend } from "resend";

export interface LeadEmailPayload {
  name: string;
  email: string;
  company: string;
  message: string;
  intentSummary: string;
  matchedItems: { title: string; slug: string }[];
  submittedAt: string;
  matchedSuppliers?: {
    company_name: string;
    score: number;
    match_reasons: string[];
    country_of_origin: string | null;
  }[];
}

export async function sendLeadNotification(payload: LeadEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { name, email, company, message, intentSummary, matchedItems, submittedAt, matchedSuppliers } = payload;

  const matchedSection =
    matchedItems.length > 0
      ? `<h3 style="color:#1e293b;font-size:14px;margin:20px 0 8px;">Matched scenarios (${matchedItems.length})</h3>
<ul style="padding-left:16px;margin:0;">
${matchedItems
  .map(
    (item) =>
      `<li style="margin-bottom:6px;"><a href="https://foodz-x.com/en/portfolio/${item.slug}" style="color:#ea580c;font-size:14px;">${item.title}</a></li>`
  )
  .join("")}
</ul>`
      : "";

  const suppliersSection =
    matchedSuppliers && matchedSuppliers.length > 0
      ? `<h3 style="color:#1e293b;font-size:14px;margin:20px 0 8px;">Matching suppliers (${matchedSuppliers.length})</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
${matchedSuppliers
  .map(
    (s) =>
      `<tr style="border-bottom:1px solid #f1f5f9;">
  <td style="padding:8px 0;color:#1e293b;font-weight:500;">${s.country_of_origin ? `${s.country_of_origin} · ` : ""}${s.company_name}</td>
  <td style="padding:8px 0;color:#64748b;text-align:right;">${s.score} pts</td>
</tr>
<tr style="border-bottom:1px solid #f1f5f9;">
  <td colspan="2" style="padding:0 0 8px;color:#94a3b8;font-size:12px;">${s.match_reasons.join(" · ")}</td>
</tr>`
  )
  .join("")}
</table>`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1e293b;margin-bottom:4px;">New sourcing request</h2>
  <p style="color:#64748b;font-size:13px;">${submittedAt}</p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>

  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="color:#64748b;padding:4px 0;width:120px;">Name</td>
      <td style="color:#1e293b;font-weight:500;">${name}</td>
    </tr>
    <tr>
      <td style="color:#64748b;padding:4px 0;">Email</td>
      <td><a href="mailto:${email}" style="color:#ea580c;">${email}</a></td>
    </tr>
    <tr>
      <td style="color:#64748b;padding:4px 0;">Company</td>
      <td style="color:#1e293b;">${company || "—"}</td>
    </tr>
  </table>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>

  <h3 style="color:#1e293b;font-size:14px;margin-bottom:8px;">Message</h3>
  <p style="color:#334155;font-size:14px;line-height:1.6;background:#f8fafc;padding:16px;border-radius:8px;">${message}</p>

  <h3 style="color:#1e293b;font-size:14px;margin:20px 0 8px;">Parsed intent</h3>
  <p style="color:#64748b;font-size:13px;font-style:italic;">${intentSummary || "No specific intent detected"}</p>

  ${matchedSection}

  ${suppliersSection}

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
  <p style="color:#94a3b8;font-size:12px;">FoodXchange · foodz-x.com</p>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `New sourcing request — ${name} (${company || "no company"})`,
      html,
    });
  } catch (err) {
    console.error("sendLeadNotification email send failed:", err);
  }
}

export interface BuyerConfirmationPayload {
  name: string;
  email: string;
  intentSummary: string;
  matchedItems: { title: string; slug: string }[];
}

export async function sendBuyerConfirmation(
  payload: BuyerConfirmationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping buyer confirmation email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { name, email, intentSummary, matchedItems } = payload;

  const intentBlock =
    intentSummary !== "No specific intent detected"
      ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 24px;">
    <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">
      What we understood from your request
    </p>
    <p style="color:#1e293b;font-size:14px;margin:0;font-style:italic;">${intentSummary}</p>
  </div>`
      : "";

  const matchedBlock =
    matchedItems.length > 0
      ? `<div style="margin:0 0 24px;">
    <p style="color:#1e293b;font-size:14px;font-weight:500;margin:0 0 10px;">
      Related sourcing scenarios you might find useful:
    </p>
    ${matchedItems
      .map(
        (item) =>
          `<div style="margin-bottom:8px;"><a href="https://foodz-x.com/en/portfolio/${item.slug}" style="color:#ea580c;font-size:14px;text-decoration:none;">→ ${item.title}</a></div>`
      )
      .join("")}
  </div>`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="margin-bottom:24px;">
    <p style="color:#64748b;font-size:13px;margin:0;">FoodXchange</p>
  </div>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    Hi ${name}, we received your request
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
    Thank you for reaching out. We have received your sourcing request
    and will review it internally.
  </p>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
    We follow up only when there is a clear fit — usually within
    1–2 business days. If we do not follow up, it means the request
    is outside our current focus, not that we did not receive it.
  </p>

  ${intentBlock}

  ${matchedBlock}

  <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:8px;">
    <p style="color:#475569;font-size:14px;margin:0 0 6px;">
      Questions? Reply to this email or reach us at:
    </p>
    <a href="mailto:info@foodz-x.com" style="color:#ea580c;font-size:14px;">
      info@foodz-x.com
    </a>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · foodz-x.com
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: "We received your sourcing request — FoodXchange",
      html,
    });
  } catch (err) {
    console.error("sendBuyerConfirmation email send failed:", err);
  }
}

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
    match_summary?: string;
    country_of_origin: string | null;
  }[];
  supplierMatches?: {
    company_name: string;
    country: string | null;
    score: number;
    reasons: string[];
    match_summary?: string;
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
  const { name, email, company, message, intentSummary, matchedItems, submittedAt, matchedSuppliers, supplierMatches } = payload;

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
  <td colspan="2" style="padding:0 0 8px;color:#94a3b8;font-size:12px;">${s.match_summary ?? s.match_reasons.join(" · ")}</td>
</tr>`
  )
  .join("")}
</table>`
      : "";

  const autoMatchSection =
    supplierMatches && supplierMatches.length > 0
      ? `<div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
  <p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 12px;">⚡ Auto-matched suppliers (${supplierMatches.length})</p>
  ${supplierMatches
    .map(
      (m) =>
        `<div style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <span style="font-weight:500;color:#1e293b;font-size:13px;">${m.company_name}</span>
      <span style="background:#ea580c;color:white;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;">${m.score} pts</span>
    </div>
    <p style="color:#64748b;font-size:12px;margin:0 0 4px;">${m.country ?? "—"}</p>
    <p style="color:#94a3b8;font-size:11px;margin:0;">${m.match_summary ?? m.reasons.join(" · ")}</p>
  </div>`
    )
    .join("")}
  <a href="https://fdx.trading/admin/requests" style="display:inline-block;margin-top:16px;background:#ea580c;color:white;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:8px;">Review in admin →</a>
</div>`
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

  ${autoMatchSection}

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
  portalLink?: string;
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
  const { name, email, intentSummary, matchedItems, portalLink } = payload;

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

  const portalBlock = portalLink
    ? `<a href="${portalLink}" style="display:inline-block;margin:8px 0 24px;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
    Track your request →
  </a>`
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

  ${portalBlock}

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

export interface SupplierEmailPayload {
  company_name: string;
  country: string | null;
  website: string | null;
  contact_name: string;
  contact_email: string;
  contact_whatsapp: string | null;
  categories: string[];
  certifications: string[];
  image_count: number;
  detected_products: string[];
  description: string | null;
  supplier_id: string;
}

export async function sendSupplierNotification(
  payload: SupplierEmailPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const {
    company_name, country, website, contact_name, contact_email,
    contact_whatsapp, categories, certifications, image_count,
    detected_products, description, supplier_id,
  } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">New Manufacturer Submission</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange manufacturer widget</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:130px;">Company</td>
        <td style="color:#1e293b;font-weight:600;">${company_name}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Country</td>
        <td style="color:#1e293b;">${country ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Website</td>
        <td>${website ? `<a href="${website}" style="color:#ea580c;">${website}</a>` : "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Contact</td>
        <td style="color:#1e293b;">${contact_name} — <a href="mailto:${contact_email}" style="color:#ea580c;">${contact_email}</a></td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">WhatsApp</td>
        <td style="color:#1e293b;">${contact_whatsapp ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Images</td>
        <td style="color:#1e293b;">${image_count}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Categories</td>
        <td style="color:#1e293b;">${categories.length > 0 ? categories.join(", ") : "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Certifications</td>
        <td style="color:#1e293b;">${certifications.length > 0 ? certifications.join(", ") : "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">AI detected</td>
        <td style="color:#1e293b;">${detected_products.length > 0 ? detected_products.join(", ") : "—"}</td>
      </tr>
    </table>

    ${description ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">What they make</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">${description}</p>
    </div>` : ""}

    <a href="https://fdx.trading/admin/suppliers/${supplier_id}"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review in admin →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `🏭 New manufacturer — ${company_name}${country ? ` (${country})` : ""}`,
      html,
    });
  } catch (err) {
    console.error("sendSupplierNotification email send failed:", err);
  }
}

export interface SupplierConfirmationPayload {
  contact_name: string;
  contact_email: string;
  company_name: string;
  image_count: number;
  portalLink?: string;
}

export async function sendSupplierConfirmation(
  payload: SupplierConfirmationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier confirmation");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { contact_name, contact_email, company_name, image_count, portalLink } = payload;

  const portalBlock = portalLink
    ? `<a href="${portalLink}" style="display:inline-block;margin:0 0 16px;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
    Track your application →
  </a>`
    : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="background:#ea580c;padding:4px 0;border-radius:4px;margin-bottom:28px;"></div>

  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange</p>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    Thank you, ${contact_name}
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
    We received your submission for <strong style="color:#1e293b;">${company_name}</strong>${image_count > 0 ? ` — including ${image_count} image${image_count > 1 ? "s" : ""}` : ""}.
  </p>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
    We review every manufacturer personally. If there is a fit with buyers we work with in Israel, we will be in touch within 5 business days.
  </p>

  <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
    In the meantime, feel free to reach us directly on WhatsApp if you have any questions.
  </p>

  ${portalBlock}

  <a href="https://wa.me/972525222291"
    style="display:inline-flex;align-items:center;gap:8px;background:#22c55e;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:32px;">
    WhatsApp us
  </a>

  <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
    <p style="color:#475569;font-size:14px;margin:0 0 6px;">
      Questions? Reply to this email or write to:
    </p>
    <a href="mailto:info@foodz-x.com" style="color:#ea580c;font-size:14px;">info@foodz-x.com</a>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · fdx.trading
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to: contact_email,
      subject: "We received your submission — FoodXchange",
      html,
    });
  } catch (err) {
    console.error("sendSupplierConfirmation email send failed:", err);
  }
}

export interface SupplierResponseNotificationPayload {
  company_name: string;
  product_name: string | null;
  request_id: string | null;
  response_note: string | null;
}

export async function sendSupplierResponseNotification(
  payload: SupplierResponseNotificationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier response notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { company_name, product_name, request_id, response_note } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Supplier responded to a match</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange supplier portal</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:130px;">Supplier</td>
        <td style="color:#1e293b;font-weight:600;">${company_name}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Product</td>
        <td style="color:#1e293b;">${product_name ?? "—"}</td>
      </tr>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Response note</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">${response_note ?? "No note provided"}</p>
    </div>

    ${request_id ? `<a href="https://fdx.trading/admin/requests/${request_id}"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review request →
    </a>` : ""}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `💬 Supplier responded — ${company_name}`,
      html,
    });
  } catch (err) {
    console.error("sendSupplierResponseNotification email send failed:", err);
  }
}

export interface SupplierApprovalEmailPayload {
  contact_name: string | null;
  contact_email: string;
  company_name: string;
  portalLink?: string;
}

export async function sendSupplierApprovalEmail(payload: SupplierApprovalEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier approval email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { contact_name, contact_email, company_name, portalLink } = payload;
  const link = portalLink ?? "https://fdx.trading/en/supplier-portal/login";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="background:#ea580c;padding:4px 0;border-radius:4px;margin-bottom:28px;"></div>

  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange</p>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    You're approved — welcome to FoodXchange!
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
    Hi ${contact_name ?? "there"}, great news — <strong style="color:#1e293b;">${company_name}</strong> has been
    approved and is now listed on FoodXchange.
  </p>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
    Next steps: log in to your supplier portal to add your products,
    review your certifications, and complete your company profile so
    buyers can find you.
  </p>

  <a href="${link}"
    style="display:inline-block;margin:0 0 24px;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
    Go to your supplier portal →
  </a>

  <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
    <p style="color:#475569;font-size:14px;margin:0 0 6px;">
      Questions? Reply to this email or write to:
    </p>
    <a href="mailto:info@foodz-x.com" style="color:#ea580c;font-size:14px;">info@foodz-x.com</a>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · fdx.trading
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to: contact_email,
      subject: "You're approved — welcome to FoodXchange",
      html,
    });
  } catch (err) {
    console.error("sendSupplierApprovalEmail send failed:", err);
  }
}

export interface SupplierRejectionEmailPayload {
  contact_name: string | null;
  contact_email: string;
  company_name: string;
  reason?: string | null;
}

export async function sendSupplierRejectionEmail(payload: SupplierRejectionEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier rejection email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { contact_name, contact_email, company_name, reason } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="background:#ea580c;padding:4px 0;border-radius:4px;margin-bottom:28px;"></div>

  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange</p>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    Update on your FoodXchange application
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
    Hi ${contact_name ?? "there"}, thank you for submitting
    <strong style="color:#1e293b;">${company_name}</strong> to FoodXchange.
  </p>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
    ${reason?.trim() || "After review, we've found that this doesn't match our current sourcing focus. We'll keep your details on file and may reach out if that changes."}
  </p>

  <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
    <p style="color:#475569;font-size:14px;margin:0 0 6px;">
      Questions? Reply to this email or write to:
    </p>
    <a href="mailto:info@foodz-x.com" style="color:#ea580c;font-size:14px;">info@foodz-x.com</a>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · fdx.trading
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to: contact_email,
      subject: "Update on your FoodXchange application",
      html,
    });
  } catch (err) {
    console.error("sendSupplierRejectionEmail send failed:", err);
  }
}

export interface SupplierInterestNotificationPayload {
  supplierName: string;
  requestProductName: string | null;
  buyerMessage: string | null;
  matchedProductName: string | null;
  matchId: string;
}

export async function sendSupplierInterestNotification(
  payload: SupplierInterestNotificationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier interest notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { supplierName, requestProductName, buyerMessage, matchedProductName, matchId } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Supplier interested in a match</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange supplier portal</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:150px;">Supplier</td>
        <td style="color:#1e293b;font-weight:600;">${supplierName}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Buyer request</td>
        <td style="color:#1e293b;">${requestProductName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Matched product</td>
        <td style="color:#1e293b;">${matchedProductName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Match ID</td>
        <td style="color:#1e293b;font-family:monospace;font-size:12px;">${matchId}</td>
      </tr>
    </table>

    ${
      buyerMessage
        ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Buyer request</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${buyerMessage}</p>
    </div>`
        : ""
    }

    <a href="https://fdx.trading/admin/matches"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review in admin →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Supplier interested — ${supplierName} × ${requestProductName ?? "sourcing request"}`,
      html,
    });
  } catch (err) {
    console.error("sendSupplierInterestNotification email send failed:", err);
  }
}

export interface SupplierDocRequestEmailPayload {
  contact_name: string | null;
  contact_email: string;
  company_name: string;
  requestMessage: string | null;
  requestedDocs: string[];
  token: string;
}

export async function sendSupplierDocRequestEmail(payload: SupplierDocRequestEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier doc request email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { contact_name, contact_email, company_name, requestMessage, requestedDocs, token } = payload;
  const link = `https://fdx.trading/supplier-action/${token}`;

  const docsList =
    requestedDocs.length > 0
      ? `<ul style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
        ${requestedDocs.map((doc) => `<li>${doc}</li>`).join("")}
      </ul>`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="background:#ea580c;padding:4px 0;border-radius:4px;margin-bottom:28px;"></div>

  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange</p>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    Quick request from the team
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
    Hi ${contact_name ?? "there"}, we'd love a little help from
    <strong style="color:#1e293b;">${company_name}</strong> so we can keep moving on opportunities for you.
  </p>

  ${
    requestMessage
      ? `<p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;white-space:pre-wrap;">${requestMessage}</p>`
      : ""
  }

  ${
    docsList
      ? `<p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 8px;">Could you share the following?</p>${docsList}`
      : ""
  }

  <a href="${link}"
    style="display:inline-block;margin:0 0 24px;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
    Respond to this request →
  </a>

  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px;">
    No login needed — the link above opens a simple form where you can upload files and reply.
  </p>

  <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
    <p style="color:#475569;font-size:14px;margin:0 0 6px;">
      Questions? Reply to this email or write to:
    </p>
    <a href="mailto:info@foodz-x.com" style="color:#ea580c;font-size:14px;">info@foodz-x.com</a>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · fdx.trading
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to: contact_email,
      subject: "FoodXchange — quick request from the team",
      html,
    });
  } catch (err) {
    console.error("sendSupplierDocRequestEmail send failed:", err);
  }
}

export interface BuyerInterestNotificationPayload {
  buyerName: string | null;
  buyerEmail: string | null;
  supplierName: string | null;
  requestProductName: string | null;
  matchedProductName: string | null;
  matchId: string;
  termsAcceptedAt?: string | null;
}

export async function sendBuyerInterestNotification(
  payload: BuyerInterestNotificationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping buyer interest notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { buyerName, buyerEmail, supplierName, requestProductName, matchedProductName, matchId, termsAcceptedAt } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Buyer interested in a supplier</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange buyer portal</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:150px;">Buyer</td>
        <td style="color:#1e293b;font-weight:600;">${buyerName ?? "—"} ${buyerEmail ? `(${buyerEmail})` : ""}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Supplier</td>
        <td style="color:#1e293b;">${supplierName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Request</td>
        <td style="color:#1e293b;">${requestProductName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Matched product</td>
        <td style="color:#1e293b;">${matchedProductName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Match ID</td>
        <td style="color:#1e293b;font-family:monospace;font-size:12px;">${matchId}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Terms accepted</td>
        <td style="color:#1e293b;">${
          termsAcceptedAt
            ? `Yes (${new Date(termsAcceptedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })})`
            : "No"
        }</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Commission clause</td>
        <td style="color:#1e293b;">${termsAcceptedAt ? "Acknowledged" : "—"}</td>
      </tr>
    </table>

    <a href="https://fdx.trading/admin/matches"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review in admin →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Buyer ${buyerName ?? "—"} interested in supplier ${supplierName ?? "—"} for request ${requestProductName ?? "—"}`,
      html,
    });
  } catch (err) {
    console.error("sendBuyerInterestNotification email send failed:", err);
  }
}

export interface BuyerInfoRequestNotificationPayload {
  buyerName: string | null;
  buyerEmail: string | null;
  supplierName: string | null;
  matchedProductName: string | null;
  requestedInfo: string[];
  message: string | null;
  matchId: string;
}

export async function sendBuyerInfoRequestNotification(
  payload: BuyerInfoRequestNotificationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping buyer info request notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { buyerName, buyerEmail, supplierName, matchedProductName, requestedInfo, message, matchId } = payload;

  const infoList =
    requestedInfo.length > 0
      ? `<ul style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
        ${requestedInfo.map((item) => `<li>${item}</li>`).join("")}
      </ul>`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Buyer requesting more info on a match</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange buyer portal</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:150px;">Buyer</td>
        <td style="color:#1e293b;font-weight:600;">${buyerName ?? "—"} ${buyerEmail ? `(${buyerEmail})` : ""}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Supplier</td>
        <td style="color:#1e293b;">${supplierName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Matched product</td>
        <td style="color:#1e293b;">${matchedProductName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Match ID</td>
        <td style="color:#1e293b;font-family:monospace;font-size:12px;">${matchId}</td>
      </tr>
    </table>

    ${infoList}

    ${
      message
        ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Buyer's message</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>
    </div>`
        : ""
    }

    <a href="https://fdx.trading/admin/matches"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review in admin →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Buyer requesting more info on match ${matchId}`,
      html,
    });
  } catch (err) {
    console.error("sendBuyerInfoRequestNotification email send failed:", err);
  }
}

export interface BuyerSupportMessagePayload {
  buyerName: string | null;
  buyerEmail: string | null;
  companyName: string | null;
  message: string;
}

export async function sendBuyerSupportMessage(payload: BuyerSupportMessagePayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping buyer support message notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { buyerName, buyerEmail, companyName, message } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Buyer support message</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange buyer portal</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:150px;">Buyer</td>
        <td style="color:#1e293b;font-weight:600;">${buyerName ?? "—"} ${buyerEmail ? `(${buyerEmail})` : ""}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Company</td>
        <td style="color:#1e293b;">${companyName ?? "—"}</td>
      </tr>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Buyer support — ${companyName ?? buyerName ?? buyerEmail ?? "—"}`,
      html,
    });
  } catch (err) {
    console.error("sendBuyerSupportMessage email send failed:", err);
  }
}

export interface BuyerQuestionNotificationPayload {
  buyerName: string | null;
  buyerEmail: string | null;
  supplierName: string | null;
  matchedProductName: string | null;
  questions: string[];
  message: string | null;
  matchId: string;
}

export async function sendBuyerQuestionNotification(
  payload: BuyerQuestionNotificationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping buyer question notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { buyerName, buyerEmail, supplierName, matchedProductName, questions, message, matchId } = payload;

  const questionsList =
    questions.length > 0
      ? `<ul style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
        ${questions.map((q) => `<li>${q}</li>`).join("")}
      </ul>`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Buyer question on a match</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange buyer portal</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="color:#64748b;padding:5px 0;width:150px;">Buyer</td>
        <td style="color:#1e293b;font-weight:600;">${buyerName ?? "—"} ${buyerEmail ? `(${buyerEmail})` : ""}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Supplier</td>
        <td style="color:#1e293b;">${supplierName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Matched product</td>
        <td style="color:#1e293b;">${matchedProductName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:5px 0;">Match ID</td>
        <td style="color:#1e293b;font-family:monospace;font-size:12px;">${matchId}</td>
      </tr>
    </table>

    ${questionsList}

    ${
      message
        ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Buyer's message</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>
    </div>`
        : ""
    }

    <a href="https://fdx.trading/admin/matches"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review in admin →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Buyer question on match — ${supplierName ?? "supplier"} for ${matchedProductName ?? "match"}`,
      html,
    });
  } catch (err) {
    console.error("sendBuyerQuestionNotification email send failed:", err);
  }
}

export interface AdminPasswordResetPayload {
  requestedFromEmail: string | null;
}

export async function sendAdminPasswordReminder(payload: AdminPasswordResetPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping admin password reminder");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const to = "udi@fdx.trading";
  const { requestedFromEmail } = payload;
  const currentPassword = process.env.ADMIN_PASSWORD ?? "(not set)";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="background:#ea580c;padding:4px 0;border-radius:4px;margin-bottom:28px;"></div>

  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange</p>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    Admin password reset requested
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
    Someone requested a password reminder for the FoodXchange admin login${requestedFromEmail ? ` (entered email: ${requestedFromEmail})` : ""}.
  </p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Current admin password</p>
    <p style="color:#1e293b;font-size:16px;font-family:monospace;margin:0;">${currentPassword}</p>
  </div>

  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px;">
    If you did not request this, you can ignore this email — no changes were made to your account.
  </p>

  <a href="https://fdx.trading/admin/login"
    style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
    Go to admin login →
  </a>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · fdx.trading
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: "FoodXchange Admin — password reset requested",
      html,
    });
  } catch (err) {
    console.error("sendAdminPasswordReminder email send failed:", err);
  }
}

export interface AdminMagicLinkPayload {
  email: string;
  link: string;
}

export async function sendAdminMagicLinkEmail(payload: AdminMagicLinkPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping admin magic link email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { email, link } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="background:#ea580c;padding:4px 0;border-radius:4px;margin-bottom:28px;"></div>

  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">FoodXchange</p>

  <h1 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">
    Your admin sign-in link
  </h1>

  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
    Click the button below to sign in to the FoodXchange admin dashboard. This link expires in 1 hour.
  </p>

  <a href="${link}"
    style="display:inline-block;margin:0 0 24px;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
    Sign in to admin →
  </a>

  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px;">
    If you did not request this, you can safely ignore this email.
  </p>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      FoodXchange · Strategic sourcing · fdx.trading
    </p>
  </div>

</div>`;

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: "Your FoodXchange admin sign-in link",
      html,
    });
  } catch (err) {
    console.error("sendAdminMagicLinkEmail send failed:", err);
  }
}

export interface SupplierActionResponseNotificationPayload {
  companyName: string;
  supplierId: string;
  responseText: string | null;
  fileCount: number;
}

export async function sendSupplierActionResponseNotification(
  payload: SupplierActionResponseNotificationPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping supplier action response notification");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { companyName, supplierId, responseText, fileCount } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Supplier responded to a request</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange supplier action link</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:#1e293b;">${companyName}</strong> responded to a document/info request
      and uploaded ${fileCount} file${fileCount === 1 ? "" : "s"}.
    </p>

    ${
      responseText
        ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Their message</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${responseText}</p>
    </div>`
        : ""
    }

    <a href="https://fdx.trading/admin/suppliers/${supplierId}"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View in admin →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Supplier ${companyName} responded — view at /admin/suppliers/${supplierId}`,
      html,
    });
  } catch (err) {
    console.error("sendSupplierActionResponseNotification email send failed:", err);
  }
}

export interface AdminMatchReplyToBuyerPayload {
  buyerEmail: string;
  productName: string | null;
  supplierName: string | null;
  message: string;
  requestId: string;
}

export async function sendAdminMatchReplyToBuyer(
  payload: AdminMatchReplyToBuyerPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping admin match reply email to buyer");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { buyerEmail, productName, supplierName, message, requestId } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Update on your sourcing request</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${
      [productName, supplierName].filter(Boolean).join(" · ") || "FoodXchange"
    }</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>
    </div>
    <a href="https://fdx.trading/en/portal/requests/${requestId}"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View in portal →
    </a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to: buyerEmail,
      subject: `Update on your sourcing request — ${productName ?? "your request"}`,
      html,
    });
  } catch (err) {
    console.error("sendAdminMatchReplyToBuyer email send failed:", err);
  }
}

export interface AdminMatchReplyToSupplierPayload {
  supplierEmail: string;
  productName: string | null;
  message: string;
}

export async function sendAdminMatchReplyToSupplier(
  payload: AdminMatchReplyToSupplierPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping admin match reply email to supplier");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { supplierEmail, productName, message } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">Message from FoodXchange</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${productName ? `Re: ${productName}` : "FoodXchange"}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>
    </div>
    <a href="https://fdx.trading/en/supplier-portal/matches"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View in supplier portal →
    </a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to: supplierEmail,
      subject: `Message from FoodXchange${productName ? ` — ${productName}` : ""}`,
      html,
    });
  } catch (err) {
    console.error("sendAdminMatchReplyToSupplier email send failed:", err);
  }
}

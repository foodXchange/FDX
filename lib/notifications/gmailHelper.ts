export function getMatchRefTag(matchId: string): string {
  return `FDX-${matchId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function buildGmailThreadUrl(opts: {
  matchId?: string;
  supplierEmail?: string | null;
  messageId?: string | null;
}): string {
  if (opts.messageId) {
    const cleanId = opts.messageId.replace(/^<|>$/g, "");
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      `rfc822msgid:${cleanId}`
    )}`;
  }
  if (opts.matchId) {
    const ref = getMatchRefTag(opts.matchId);
    if (opts.supplierEmail) {
      return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
        `(${opts.supplierEmail} OR ${ref})`
      )}`;
    }
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(ref)}`;
  }
  if (opts.supplierEmail) {
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      opts.supplierEmail
    )}`;
  }
  return "https://mail.google.com/mail/u/0/#inbox";
}

export function createGmailComposeUrl({
  to,
  subject,
  body,
}: {
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
  });
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildNotificationGmailLink(notification: {
  title: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
  type?: string;
}): string {
  const data = notification.data || {};
  const email =
    (data.to as string) ||
    (data.contact_email as string) ||
    (data.email as string) ||
    (data.from_email as string) ||
    (notification.message?.includes("@") ? notification.message : "");

  const company =
    (data.company_name as string) ||
    (data.company as string) ||
    (data.factory_name as string) ||
    "Partner";

  const product =
    (data.target_sku as string) ||
    (data.product_name as string) ||
    "your inquiry";

  const subject =
    (data.subject as string) ||
    `FoodXchange Update: Regarding ${company} - ${product}`;

  const body =
    (data.body_text as string) ||
    `Hi ${company},\n\nHope this email finds you well.\n\nI am following up regarding your activity on FoodXchange regarding ${product}.\n\nPlease let us know if you have any questions or if you would like us to arrange product specifications, certifications, or commercial terms.\n\nBest regards,\nFoodXchange B2B Trading Team\nhttps://fdx.trading`;

  return createGmailComposeUrl({
    to: email,
    subject,
    body,
  });
}

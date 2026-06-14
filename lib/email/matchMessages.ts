import { Resend } from "resend";

interface MatchMessageEmailPayload {
  to: string;
  productName: string | null;
  companyName: string | null;
  message: string;
  viewUrl: string;
  heading: string;
}

async function sendMatchMessageEmail(payload: MatchMessageEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping match message email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { to, productName, companyName, message, viewUrl, heading } = payload;

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">${heading}</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${productName ? `Re: ${productName}` : "FoodXchange"}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    ${companyName ? `<p style="color:#64748b;font-size:13px;margin:0 0 6px;">From ${companyName}</p>` : ""}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>
    </div>
    <a href="${viewUrl}"
      style="display:inline-block;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View &amp; reply →
    </a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({ from, to, subject: heading, html });
  } catch (err) {
    console.error("sendMatchMessageEmail failed:", err);
  }
}

export async function notifyBuyerOfMatchMessage(params: {
  buyerEmail: string;
  productName: string | null;
  supplierCompanyName: string | null;
  message: string;
  requestId: string;
}): Promise<void> {
  await sendMatchMessageEmail({
    to: params.buyerEmail,
    productName: params.productName,
    companyName: params.supplierCompanyName,
    message: params.message,
    viewUrl: `https://fdx.trading/en/portal/requests/${params.requestId}`,
    heading: "New message from a supplier",
  });
}

export async function notifySupplierOfMatchMessage(params: {
  supplierEmail: string;
  productName: string | null;
  message: string;
}): Promise<void> {
  await sendMatchMessageEmail({
    to: params.supplierEmail,
    productName: params.productName,
    companyName: null,
    message: params.message,
    viewUrl: `https://fdx.trading/en/supplier-portal/matches`,
    heading: "New message about your match",
  });
}

const REPLY_HEADINGS: Record<"accepted" | "countered" | "declined", string> = {
  accepted: "A supplier accepted your request",
  countered: "A supplier sent a counter-offer",
  declined: "A supplier declined your request",
};

const REPLY_DEFAULT_MESSAGES: Record<"accepted" | "countered" | "declined", string> = {
  accepted:
    "Good news — a supplier has accepted your sourcing request. Our team will be in touch with next steps.",
  countered:
    "A supplier has sent a counter-offer on your sourcing request. View the details and reply to continue the conversation.",
  declined:
    "A supplier was unable to fulfil your sourcing request this time. We'll keep looking for other matches.",
};

export async function notifyBuyerOfSupplierReply(params: {
  buyerEmail: string;
  productName: string | null;
  supplierCompanyName: string | null;
  response: "accepted" | "countered" | "declined";
  message: string | null;
  requestId: string;
}): Promise<void> {
  await sendMatchMessageEmail({
    to: params.buyerEmail,
    productName: params.productName,
    companyName: params.supplierCompanyName,
    message: params.message?.trim() || REPLY_DEFAULT_MESSAGES[params.response],
    viewUrl: `https://fdx.trading/en/portal/requests/${params.requestId}`,
    heading: REPLY_HEADINGS[params.response],
  });
}

export async function notifyBuyerOfDocumentUpload(params: {
  buyerEmail: string;
  productName: string | null;
  supplierCompanyName: string | null;
  fileName: string;
  requestId: string;
}): Promise<void> {
  await sendMatchMessageEmail({
    to: params.buyerEmail,
    productName: params.productName,
    companyName: params.supplierCompanyName,
    message: `${params.supplierCompanyName ?? "A supplier"} shared a new file: ${params.fileName}`,
    viewUrl: `https://fdx.trading/en/portal/requests/${params.requestId}`,
    heading: "New document from a supplier",
  });
}

export async function notifySupplierOfDocumentUpload(params: {
  supplierEmail: string;
  productName: string | null;
  fileName: string;
}): Promise<void> {
  await sendMatchMessageEmail({
    to: params.supplierEmail,
    productName: params.productName,
    companyName: null,
    message: `A buyer shared a new file: ${params.fileName}`,
    viewUrl: `https://fdx.trading/en/supplier-portal/matches`,
    heading: "New document shared with you",
  });
}

export async function notifySupplierDealClosed(params: {
  supplierEmail: string;
  productName: string | null;
}): Promise<void> {
  await sendMatchMessageEmail({
    to: params.supplierEmail,
    productName: params.productName,
    companyName: null,
    message: "This deal has been marked as won — the buyer has confirmed and the match is now closed. Thank you for working with us on this!",
    viewUrl: `https://fdx.trading/en/supplier-portal/matches`,
    heading: "Deal closed — thank you!",
  });
}

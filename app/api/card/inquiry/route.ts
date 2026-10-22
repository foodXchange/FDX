import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";
import { checkRateLimit } from "@/lib/rateLimit";

const InquirySchema = z.object({
  handle: z.string().trim().min(1).default("udi"),
  name: z.string().trim().min(2, "Name is required").max(100),
  contact: z.string().trim().min(5, "Valid Email or Phone is required").max(100),
  company: z.string().trim().max(100).optional().default(""),
  product_name: z.string().trim().min(2, "Product or specification is required").max(200),
  volume_per_year: z.string().trim().max(100).optional().default(""),
  kosher_type: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many inquiries. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = InquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const {
    handle,
    name,
    contact,
    company,
    product_name,
    volume_per_year,
    kosher_type,
    notes,
  } = parsed.data;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const email = isEmail ? contact.toLowerCase() : null;
  const whatsapp = isEmail ? null : contact.replace(/[^\d+]/g, "");

  // Upsert buyer record if email present
  let buyerId: string | null = null;
  if (email) {
    const { data: existingBuyer } = await supabaseAdmin
      .from("buyers")
      .select("id")
      .eq("contact_email", email)
      .limit(1)
      .maybeSingle();

    if (existingBuyer) {
      buyerId = existingBuyer.id;
    } else {
      const { data: newBuyer } = await supabaseAdmin
        .from("buyers")
        .insert({
          company_name: company || name,
          contact_name: name,
          contact_email: email,
          contact_whatsapp: whatsapp,
        })
        .select("id")
        .maybeSingle();

      if (newBuyer) {
        buyerId = newBuyer.id;
      }
    }
  }

  // Insert into sourcing_requests
  const certs = kosher_type && kosher_type !== "None" ? [kosher_type] : [];
  const { data: newRequest, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .insert({
      buyer_id: buyerId,
      name,
      email,
      whatsapp,
      company: company || null,
      product_name,
      volume_per_year: volume_per_year || null,
      certifications: certs,
      message: notes || `Direct inquiry from FoodXchange e-business card (${handle})`,
      source: `digital_card_${handle}`,
      status: "new",
    })
    .select("id")
    .single();

  if (reqErr) {
    console.error("Failed to insert card inquiry:", reqErr);
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }

  // Record telemetry in card_views
  try {
    await supabaseAdmin.from("card_views").insert({
      handle,
      event: "contact_card_inquiry_submitted",
      metadata: {
        requestId: newRequest.id,
        product: product_name,
        company,
        kosher: kosher_type,
      },
    });
  } catch (err) {
    console.error("Card tracking error:", err);
  }

  // In-app admin notification
  void createNotification(
    "new_request",
    `⚡ Sourcing RFQ from Card: ${product_name}`,
    `${name} (${company || "Retail Buyer"}) requested sourcing for ${product_name}.`,
    {
      request_id: newRequest.id,
      buyer_name: name,
      company,
      product_name,
      source: `business-card/${handle}`,
    }
  );

  // Email Notification to Udi
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const toEmail = process.env.NOTIFY_EMAIL_TO || "udi@fdx.trading";
      const fromEmail = process.env.NOTIFY_EMAIL_FROM || "FoodXchange <info@foodz-x.com>";

      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        replyTo: email || undefined,
        subject: `⚡ [Card Lead] New Sourcing RFQ: ${product_name} (${name})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <span style="font-size: 24px; font-weight: 700; color: #1B2A4A;">Food<span style="color: #F47920;">X</span>change</span>
              <span style="margin-left: auto; background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">e-Business Card Lead</span>
            </div>
            
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Direct Sourcing Inquiry Submitted</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">A verified buyer submitted a sourcing request directly through your business card (<strong>fdx.trading/business-card/${handle}</strong>):</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
              <tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px; width: 140px; border-bottom: 1px solid #e2e8f0;">Product Required</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${product_name}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Estimated Volume</td><td style="padding: 10px 14px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${volume_per_year || "Flexible / Not specified"}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Kosher Standard</td><td style="padding: 10px 14px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${kosher_type || "Standard / Inquire"}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Buyer Name</td><td style="padding: 10px 14px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${name}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Company</td><td style="padding: 10px 14px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${company || "—"}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Contact Method</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${email ? `<a href="mailto:${email}" style="color:#0284c7;">${email}</a>` : `<a href="https://wa.me/${whatsapp}" style="color:#16a34a;">+${whatsapp} (WhatsApp)</a>`}</td></tr>
              ${notes ? `<tr><td style="padding: 10px 14px; color: #64748b; font-size: 13px;">Notes / Specs</td><td style="padding: 10px 14px; color: #0f172a; font-size: 13px;">${notes}</td></tr>` : ""}
            </table>
            
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://fdx.trading/admin/requests/${newRequest.id}" style="display: inline-block; background: #F47920; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Open RFQ in Admin Dashboard &rarr;</a>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Card inquiry email dispatch error:", emailErr);
    }
  }

  return NextResponse.json({
    ok: true,
    requestId: newRequest.id,
    whatsappFollowup: `https://wa.me/972525222291?text=${encodeURIComponent(
      `היי אודי, שלחתי כעת בקשת רכש עבור "${product_name}" דרך כרטיס הביקור הדיגיטלי שלך.`
    )}`,
  });
}

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";

export async function POST(req: Request) {
  try {
    const { name, email, company, message, lead_type, lang = "en", phone } = await req.json();

    if (!email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const fullMessage = phone ? `Phone / WhatsApp: ${phone}\n\n${message}` : message;

    // Persist into contacts table
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from("contacts")
      .insert({
        name: name || null,
        email: email.trim(),
        company: company || null,
        message: fullMessage,
        lead_type: lead_type || "buyer",
        lang: lang || "en",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to insert contact row:", dbError);
    }

    // Trigger in-app notification in Admin Notification Center
    void createNotification(
      "lead",
      `New inquiry from ${name || company || email} (${lead_type === "supplier" ? "Supplier" : "Buyer"})`,
      message.slice(0, 180),
      {
        contact_id: inserted?.id,
        contact_name: name,
        contact_email: email,
        company_name: company,
        lead_type,
      }
    );

    // Send email via Resend if configured
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const FROM = process.env.RESEND_FROM_EMAIL || "notifications@fdx.trading";
      const TO = process.env.RESEND_TO_EMAIL || "udi@fdx.trading";

      try {
        await resend.emails.send({
          from: FROM,
          to: [TO],
          replyTo: email,
          subject: `[FoodXchange] New Contact Inquiry: ${company || name || email} (${lead_type || "buyer"})`,
          html: `
            <h2>New Contact Inquiry from FoodXchange</h2>
            <p><strong>Name:</strong> ${name || "-"}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || "-"}</p>
            <p><strong>Phone / WhatsApp:</strong> ${phone || "-"}</p>
            <p><strong>Inquiry Role:</strong> ${lead_type || "buyer"}</p>
            <p><strong>Language:</strong> ${lang || "en"}</p>
            <hr />
            <p style="white-space:pre-wrap;"><strong>Message:</strong><br/>${fullMessage}</p>
          `,
        });
      } catch (err) {
        console.error("Resend contact email failed:", err);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id || null }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Contact submission failed";
    console.error("Contact API error:", err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
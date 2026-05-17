import { Resend } from "resend";

export async function POST(req: Request) {
  const { name, email, company, message, lead_type, lang } = await req.json();

  if (!email || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const FROM = process.env.RESEND_FROM_EMAIL || "info@foodz-x.com";
  const TO = process.env.RESEND_TO_EMAIL || "info@foodz-x.com";

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [TO],
      subject: `New Contact Form Submission (${lead_type || "unknown"})`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name || "-"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || "-"}</p>
        <p><strong>Type:</strong> ${lead_type || "-"}</p>
        <p><strong>Lang:</strong> ${lang || "-"}</p>
        <hr />
        <p style="white-space:pre-wrap;"><strong>Message:</strong><br/>${message}</p>
      `,
    });

    return new Response(JSON.stringify({ ok: true, id: result?.data?.id || null }), { status: 200 });
  } catch (err: any) {
    console.error("Resend contact error:", err);
    return new Response(JSON.stringify({ error: err.message || "Resend failed" }), { status: 500 });
  }
}
``
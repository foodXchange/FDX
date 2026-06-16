import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: Request) {
  const { email, lang = "en", source = "footer" } = await req.json();

  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
  }

  try {
    // ✅ Supabase insert (server-side)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: cleanEmail, lang, source }, { onConflict: "email" });

    if (dbError) {
      console.error("Supabase error:", dbError);
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    // ✅ Resend email (server-side)
    const resend = new Resend(process.env.RESEND_API_KEY);

    // IMPORTANT:
    // Use a verified sender. If your domain isn't verified yet, temporarily use onboarding@resend.dev
    const FROM = process.env.RESEND_FROM_EMAIL || "info@foodz-x.com";
    const TO = process.env.RESEND_TO_EMAIL || "info@foodz-x.com";

    const result = await resend.emails.send({
      from: FROM, // e.g. "FoodXchange <info@foodz-x.com>" once verified
      to: [TO],
      subject: "New Newsletter Subscriber",
      html: `
        <h2>New Subscriber</h2>
        <p><strong>Email:</strong> ${cleanEmail}</p>
        <p><strong>Source:</strong> ${source}</p>
        <p><strong>Lang:</strong> ${lang}</p>
      `,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
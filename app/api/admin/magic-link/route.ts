import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAdminMagicLinkEmail } from "@/lib/email/mailer";
import { getOriginFromHeaders } from "@/lib/getOrigin";

const ALLOWED_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "udi@fdx.trading")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const BodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email;

  // Always respond with success — avoids revealing which emails are authorized.
  if (!ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())) {
    return Response.json({ ok: true });
  }

  const origin = getOriginFromHeaders(req.headers);

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${origin}/admin/auth/callback`,
    },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    console.error("admin magic-link generateLink failed:", linkError?.message);
    return Response.json({ ok: true });
  }

  const link = `${origin}/admin/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;

  void sendAdminMagicLinkEmail({ email, link });

  return Response.json({ ok: true });
}
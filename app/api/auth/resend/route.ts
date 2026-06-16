import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSignupLink } from "@/lib/email/mailer";
import { getOriginFromHeaders } from "@/lib/getOrigin";

const Schema = z.object({
  email: z.string().email(),
  user_type: z.enum(["buyer", "supplier"]).default("buyer"),
  company_name: z.string().max(300).default(""),
});

export async function POST(req: Request) {
  const origin = getOriginFromHeaders(req.headers);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email, user_type, company_name } = parsed.data;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/en/auth/callback` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("resend generateLink failed:", linkError?.message);
    // Always return ok — don't reveal whether email exists
    return Response.json({ ok: true });
  }

  void sendSignupLink({
    email,
    magicLink: linkData.properties.action_link,
    user_type,
    company_name,
  });

  return Response.json({ ok: true });
}

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendLoginLink } from "@/lib/email/mailer";
import { getOriginFromHeaders } from "@/lib/getOrigin";

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
    return Response.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const origin = getOriginFromHeaders(req.headers);

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${origin}/en/auth/callback`,
    },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    // Never reveal whether the account exists
    console.error("magic-link generateLink failed:", linkError?.message);
    return Response.json({ ok: true });
  }

  const link = `${origin}/en/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;

  void sendLoginLink({ email, link });

  return Response.json({ ok: true });
}

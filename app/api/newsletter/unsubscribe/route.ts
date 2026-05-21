import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UnsubSchema = z.object({
  email: z.string().email(),
});

async function unsubscribeEmail(email: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email.toLowerCase().trim());
  if (error) {
    console.error("Unsubscribe error:", error);
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UnsubSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  await unsubscribeEmail(parsed.data.email);
  return Response.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") ?? "";
  if (email) {
    await unsubscribeEmail(email);
  }
  return Response.redirect(
    new URL("/en/unsubscribe?success=true", req.nextUrl.origin)
  );
}

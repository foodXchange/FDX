import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBuyerSupportMessage } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

const BodySchema = z.object({
  message: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { message } = parsed.data;

  const { data: buyerProfile } = await supabaseAdmin
    .from("buyer_profiles")
    .select("name, company")
    .eq("id", user.id)
    .maybeSingle();

  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("company_name")
    .eq("contact_email", user.email ?? "")
    .maybeSingle();

  void sendBuyerSupportMessage({
    buyerName: buyerProfile?.name ?? null,
    buyerEmail: user.email ?? null,
    companyName: buyerProfile?.company ?? buyer?.company_name ?? null,
    message,
  });

  void logEvent(user.id, "buyer", "support_message_sent", undefined, undefined, { message });

  return NextResponse.json({ success: true });
}

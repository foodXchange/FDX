import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("id")
    .eq("contact_email", user.email)
    .maybeSingle();

  if (!buyer?.id) return NextResponse.json({ notifications: [] });

  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, status, match_score, sent_at, updated_at, product_name, supplier_id")
    .eq("buyer_id", buyer.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  const notifications = (matches ?? []).map((m) => {
    const isNew = m.status === "sent" || m.status === "suggested";
    const hasReply = m.status === "responded" || m.status === "quoted";
    const message = hasReply
      ? "Supplier responded to your match"
      : isNew
      ? "New supplier matched to your request"
      : `Match update: ${m.status}`;

    return {
      id: m.id as string,
      type: hasReply ? "response" : "match_sent",
      title: message,
      message: m.product_name ? `Product: ${m.product_name}` : null,
      timestamp: (m.updated_at ?? m.sent_at) as string,
      actionUrl: `/en/portal`,
    };
  });

  return NextResponse.json({ notifications });
}

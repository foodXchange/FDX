import { NextResponse } from "next/server";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSupplierContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.supplierId) return NextResponse.json({ notifications: [] });

  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, status, match_score, sent_at, updated_at, product_name")
    .eq("supplier_id", ctx.supplierId)
    .order("updated_at", { ascending: false })
    .limit(20);

  const notifications = (matches ?? []).map((m) => {
    const isNew = m.status === "sent";
    const message = isNew
      ? "New sourcing request — please respond"
      : m.status === "suggested"
      ? "You've been matched with a buyer"
      : `Match update: ${m.status}`;

    return {
      id: m.id as string,
      type: isNew ? "rfq_sent" : "match_sent",
      title: message,
      message: m.product_name ? `Product: ${m.product_name}` : null,
      timestamp: (m.updated_at ?? m.sent_at) as string,
      actionUrl: `/en/supplier-portal/matches`,
    };
  });

  return NextResponse.json({ notifications });
}

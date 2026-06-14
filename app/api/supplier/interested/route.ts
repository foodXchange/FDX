import { NextResponse } from "next/server";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSupplierInterestNotification } from "@/lib/email/mailer";

type MatchRow = {
  id: string;
  supplier_id: string;
  product_name: string | null;
  sourcing_requests: { product_name: string | null; message: string | null } | null;
};

export async function POST(req: Request) {
  const ctx = await getSupplierContext();
  if (!ctx || !ctx.supplierId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { matchId?: string };
  const matchId = body.matchId;
  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const { data: rawMatch } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, product_name, sourcing_requests(product_name, message)")
    .eq("id", matchId)
    .maybeSingle();

  const match = rawMatch as unknown as MatchRow | null;
  if (!match || match.supplier_id !== ctx.supplierId) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  await supabaseAdmin.from("sourcing_matches").update({ status: "interested" }).eq("id", matchId);

  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("company_name")
    .eq("id", ctx.supplierId)
    .maybeSingle();

  void sendSupplierInterestNotification({
    supplierName: supplier?.company_name ?? "A supplier",
    requestProductName: match.sourcing_requests?.product_name ?? null,
    buyerMessage: match.sourcing_requests?.message ?? null,
    matchedProductName: match.product_name ?? null,
    matchId: match.id,
  });

  return NextResponse.json({ success: true });
}

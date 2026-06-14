import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { sendSupplierOutreachEmail } from "@/lib/email/supplierOutreach";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const { message } = body as { message?: string };

  const result = await sendSupplierOutreachEmail(id, message);

  if (!result.success) {
    const status = result.error === "Match not found" || result.error?.startsWith("No contact email") ? 400 : 500;
    return Response.json({ error: result.error }, { status });
  }

  const { data: match } = await supabaseAdmin
    .from("sourcing_matches")
    .select("supplier_id, request_id, product_name, company_name")
    .eq("id", id)
    .single();

  if (match) {
    void createNotification(
      "match_sent",
      `Match sent to ${match.company_name}`,
      undefined,
      {
        match_id: id,
        supplier_id: match.supplier_id,
        request_id: match.request_id,
        product_name: match.product_name,
      }
    );
  }

  return Response.json({ success: true, messageId: result.messageId, sent_at: result.sent_at });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BodySchema = z.object({
  actionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { actionId } = parsed.data;

  const { data: action } = await supabaseAdmin
    .from("supplier_actions")
    .select("id, supplier_id, status")
    .eq("id", actionId)
    .maybeSingle();

  if (!action) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (action.status !== "pending" && action.status !== "opened") {
    return NextResponse.json({ error: "Only pending requests can be revoked" }, { status: 400 });
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("supplier_actions")
    .update({ status: "revoked", expires_at: now, revoked_at: now })
    .eq("id", actionId);

  revalidatePath(`/admin/suppliers/${action.supplier_id}`);

  return NextResponse.json({ success: true });
}

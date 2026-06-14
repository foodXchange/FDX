import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { sendSupplierDocRequestEmail } from "@/lib/email/mailer";

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
    .select("id, supplier_id, token, request_message, requested_docs, status, resend_count")
    .eq("id", actionId)
    .maybeSingle();

  if (!action) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (action.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be resent" }, { status: 400 });
  }

  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("company_name")
    .eq("id", action.supplier_id)
    .maybeSingle();

  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const { data: primaryContact } = await supabaseAdmin
    .from("supplier_contacts")
    .select("name")
    .eq("supplier_id", action.supplier_id)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  const contactEmail = await getSupplierContactEmail(action.supplier_id);
  if (!contactEmail) {
    return NextResponse.json({ error: "No contact email on file for this supplier" }, { status: 400 });
  }

  await sendSupplierDocRequestEmail({
    contact_name: (primaryContact?.name as string | null) ?? null,
    contact_email: contactEmail,
    company_name: supplier.company_name as string,
    requestMessage: action.request_message as string | null,
    requestedDocs: (action.requested_docs as string[] | null) ?? [],
    token: action.token as string,
  });

  await supabaseAdmin
    .from("supplier_actions")
    .update({
      resend_count: ((action.resend_count as number | null) ?? 0) + 1,
      last_resent_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  revalidatePath(`/admin/suppliers/${action.supplier_id}`);

  return NextResponse.json({ success: true });
}

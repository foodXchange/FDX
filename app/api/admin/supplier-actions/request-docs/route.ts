import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession, COOKIE_NAME, getAdminEmail } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { sendSupplierDocRequestEmail } from "@/lib/email/mailer";

const BodySchema = z.object({
  supplierId: z.string().uuid(),
  requestedDocs: z.array(z.string()).default([]),
  message: z.string().optional(),
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

  const { supplierId, requestedDocs, message } = parsed.data;

  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("company_name")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const { data: primaryContact } = await supabaseAdmin
    .from("supplier_contacts")
    .select("name")
    .eq("supplier_id", supplierId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  const contactEmail = await getSupplierContactEmail(supplierId);

  const token = crypto.randomBytes(32).toString("hex");

  const { data: inserted, error } = await supabaseAdmin
    .from("supplier_actions")
    .insert({
      supplier_id: supplierId,
      action_type: "request_docs",
      request_message: message?.trim() || null,
      requested_docs: requestedDocs,
      token,
      created_by: getAdminEmail(),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  let emailSent = false;
  if (contactEmail) {
    await sendSupplierDocRequestEmail({
      contact_name: (primaryContact?.name as string | null) ?? null,
      contact_email: contactEmail,
      company_name: supplier.company_name as string,
      requestMessage: message?.trim() || null,
      requestedDocs,
      token,
    });
    emailSent = true;
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);

  return NextResponse.json({ success: true, id: inserted.id as string, emailSent });
}

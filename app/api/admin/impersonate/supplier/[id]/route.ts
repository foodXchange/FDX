import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME, getAdminEmail } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAdminAction } from "@/lib/auditLog";
import { getOriginFromHeaders } from "@/lib/getOrigin";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id, company_name, contact_email")
    .eq("id", id)
    .single();

  if (!supplier) {
    return Response.json({ error: "Supplier not found" }, { status: 404 });
  }

  const contactEmail = supplier.contact_email as string | null;
  const email = contactEmail || `supplier-${supplier.id}@fdx.internal`;

  const adminEmail = getAdminEmail();
  if (email.toLowerCase() === adminEmail.toLowerCase()) {
    return Response.json({ error: "Cannot impersonate an admin account" }, { status: 403 });
  }

  const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (
    createUserError &&
    createUserError.code !== "email_exists" &&
    createUserError.code !== "user_already_exists"
  ) {
    return Response.json({ error: createUserError.message }, { status: 500 });
  }

  if (!contactEmail) {
    await supabaseAdmin.from("supplier_offerings").update({ contact_email: email }).eq("id", supplier.id);
  }

  const companyName = (supplier.company_name as string | null) ?? email;
  const origin = getOriginFromHeaders(req.headers);
  const redirectParams = new URLSearchParams({
    impersonation: "1",
    admin_email: adminEmail,
    target_type: "supplier",
    target_id: supplier.id as string,
    target_label: companyName,
  });

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${origin}/en/supplier-portal/auth/callback?${redirectParams.toString()}`,
    },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return Response.json({ error: linkError?.message ?? "Failed to generate link" }, { status: 500 });
  }

  await logAdminAction({
    adminEmail,
    action: "impersonation_started",
    targetType: "supplier",
    targetId: supplier.id as string,
    targetEmail: email,
    metadata: { company_name: companyName },
  });

  const callbackParams = new URLSearchParams(redirectParams);
  callbackParams.set("token_hash", linkData.properties.hashed_token);
  callbackParams.set("type", "recovery");

  return Response.json({
    url: `${origin}/en/supplier-portal/auth/callback?${callbackParams.toString()}`,
    supplierName: companyName,
  });
}

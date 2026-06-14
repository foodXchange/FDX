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

  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("id, company_name, contact_email")
    .eq("id", id)
    .single();

  if (!buyer) {
    return Response.json({ error: "Buyer not found" }, { status: 404 });
  }

  const contactEmail = buyer.contact_email as string | null;
  const email = contactEmail || `buyer-${buyer.id}@fdx.internal`;

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
    await supabaseAdmin.from("buyers").update({ contact_email: email }).eq("id", buyer.id);
  }

  const companyName = (buyer.company_name as string | null) ?? email;
  const origin = getOriginFromHeaders(req.headers);
  const redirectParams = new URLSearchParams({
    impersonation: "1",
    admin_email: adminEmail,
    target_type: "buyer",
    target_id: buyer.id as string,
    target_label: companyName,
  });

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${origin}/en/portal/auth/callback?${redirectParams.toString()}`,
    },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return Response.json({ error: linkError?.message ?? "Failed to generate link" }, { status: 500 });
  }

  await logAdminAction({
    adminEmail,
    action: "impersonation_started",
    targetType: "buyer",
    targetId: buyer.id as string,
    targetEmail: email,
    metadata: { company_name: companyName },
  });

  const callbackParams = new URLSearchParams(redirectParams);
  callbackParams.set("token_hash", linkData.properties.hashed_token);
  callbackParams.set("type", "recovery");

  return Response.json({
    url: `${origin}/en/portal/auth/callback?${callbackParams.toString()}`,
    buyerName: companyName,
  });
}

import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME, getAdminEmail } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAdminAction } from "@/lib/auditLog";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(
  _req: Request,
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
  if (!contactEmail) {
    return Response.json({ error: "Supplier has no contact email on file" }, { status: 400 });
  }

  const adminEmail = getAdminEmail();
  if (contactEmail.toLowerCase() === adminEmail.toLowerCase()) {
    return Response.json({ error: "Cannot impersonate an admin account" }, { status: 403 });
  }

  const companyName = (supplier.company_name as string | null) ?? contactEmail;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fdx.trading";
  const redirectParams = new URLSearchParams({
    impersonation: "1",
    admin_email: adminEmail,
    target_type: "supplier",
    target_id: supplier.id as string,
    target_label: companyName,
  });

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: contactEmail,
    options: {
      redirectTo: `${site}/en/supplier-portal/auth/callback?${redirectParams.toString()}`,
    },
  });

  if (linkError || !linkData.properties?.action_link) {
    return Response.json({ error: linkError?.message ?? "Failed to generate link" }, { status: 500 });
  }

  await logAdminAction({
    adminEmail,
    action: "impersonation_started",
    targetType: "supplier",
    targetId: supplier.id as string,
    targetEmail: contactEmail,
    metadata: { company_name: companyName },
  });

  return Response.json({ magicLink: linkData.properties.action_link, supplierName: companyName });
}

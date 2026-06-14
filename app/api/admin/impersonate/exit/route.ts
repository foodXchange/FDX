import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyImpersonation, IMPERSONATION_COOKIE } from "@/lib/impersonation";
import { logAdminAction } from "@/lib/auditLog";

async function handle(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();
  const impersonation = await verifyImpersonation(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  const supabase = await createClient();
  await supabase.auth.signOut();
  cookieStore.delete(IMPERSONATION_COOKIE);

  const expired = searchParams.get("expired") === "1";
  let redirectUrl: string;
  if (expired) {
    const portal = searchParams.get("portal") === "supplier" ? "supplier-portal" : "portal";
    redirectUrl = `${origin}/en/${portal}/login`;
  } else if (impersonation) {
    const section = impersonation.targetType === "supplier" ? "suppliers" : "buyers";
    redirectUrl = `${origin}/admin/${section}/${impersonation.targetId}`;
  } else {
    redirectUrl = `${origin}/admin`;
  }

  if (impersonation) {
    await logAdminAction({
      adminEmail: impersonation.adminEmail,
      action: "impersonation_ended",
      targetType: impersonation.targetType,
      targetId: impersonation.targetId,
      metadata: { reason: expired ? "expired" : "manual" },
    });
  }

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

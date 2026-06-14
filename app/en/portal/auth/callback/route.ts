import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signImpersonation, IMPERSONATION_COOKIE, IMPERSONATION_MAX_AGE_MS } from "@/lib/impersonation";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (searchParams.get("impersonation") === "1") {
        const cookieStore = await cookies();
        const signed = await signImpersonation({
          adminEmail: searchParams.get("admin_email") ?? "admin",
          targetType: "buyer",
          targetId: searchParams.get("target_id") ?? "",
          targetLabel: searchParams.get("target_label") ?? "",
          startedAt: Date.now(),
        });
        cookieStore.set(IMPERSONATION_COOKIE, signed, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: IMPERSONATION_MAX_AGE_MS / 1000,
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/en/portal/login`);
}

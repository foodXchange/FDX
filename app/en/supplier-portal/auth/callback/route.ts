import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signImpersonation, IMPERSONATION_COOKIE, IMPERSONATION_MAX_AGE_MS } from "@/lib/impersonation";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";
  const next = searchParams.get("next") ?? "/en/portal";

  console.log("Callback hit. Code:", code ? "present" : "MISSING");
  console.log("Token hash:", tokenHash ? "present" : "MISSING");
  console.log("Impersonation:", searchParams.get("impersonation"));
  console.log("Search params:", Object.fromEntries(searchParams));

  let success = false;

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    console.log("verifyOtp result. Error:", error?.message || "none");
    success = !error;
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("Exchange result. Error:", error?.message || "none");
    success = !error;
  } else {
    console.log("No code or token_hash param, redirecting to login");
  }

  if (success) {
    if (searchParams.get("impersonation") === "1") {
      const cookieStore = await cookies();
      const signed = await signImpersonation({
        adminEmail: searchParams.get("admin_email") ?? "admin",
        targetType: "supplier",
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
    console.log("Impersonation cookie:", (await cookies()).get(IMPERSONATION_COOKIE));
    console.log("Redirecting to:", `${origin}${next}`);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/en/portal/login`);
}
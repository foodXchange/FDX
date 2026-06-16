import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getOriginFromHeaders } from "@/lib/getOrigin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") ?? "magiclink";
  const origin = getOriginFromHeaders(request.headers);

  if (!tokenHash && !code) {
    return NextResponse.redirect(`${origin}/en/login?error=invalid_link`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Expected in GET route handlers — cookie writes aren't always possible
            }
          },
        },
      }
    );

    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "magiclink" | "email",
      });
      if (error) {
        console.error("verifyOtp failed:", error.message);
        return NextResponse.redirect(`${origin}/en/login?error=invalid_link`);
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("exchangeCodeForSession failed:", error.message);
        return NextResponse.redirect(`${origin}/en/login?error=invalid_link`);
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.redirect(`${origin}/en/login?error=auth_failed`);
    }

    // Admin users bypass portal routing
    const adminEmails = (process.env.ADMIN_EMAILS ?? "udi@fdx.trading")
      .split(",")
      .map((e) => e.trim().toLowerCase());

    if (adminEmails.includes(user.email.toLowerCase()) || user.user_metadata?.role === "admin") {
      return NextResponse.redirect(`${origin}/admin`);
    }

    // Route by account type — check both contact_email and email columns
    const { data: buyer } = await supabase
      .from("buyers")
      .select("id")
      .or(`contact_email.eq.${user.email},email.eq.${user.email}`)
      .maybeSingle();

    if (buyer) {
      return NextResponse.redirect(`${origin}/en/portal`);
    }

    const { data: supplier } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (supplier) {
      return NextResponse.redirect(`${origin}/en/supplier-portal`);
    }

    return NextResponse.redirect(`${origin}/en/login?error=no_account`);
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(`${origin}/en/login?error=server_error`);
  }
}

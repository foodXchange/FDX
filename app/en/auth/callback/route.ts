import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOriginFromHeaders } from "@/lib/getOrigin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "email";
  const origin = getOriginFromHeaders(request.headers);

  try {
    const supabase = await createClient();

    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "magiclink" | "email",
      });
      if (error) throw error;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      return NextResponse.redirect(`${origin}/en/login?error=invalid_link`);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.redirect(`${origin}/en/login?error=auth_failed`);
    }

    const { data: buyer } = await supabase
      .from("buyers")
      .select("id")
      .eq("contact_email", user.email)
      .single();

    if (buyer) {
      return NextResponse.redirect(`${origin}/en/portal`);
    }

    const { data: supplier } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("email", user.email)
      .single();

    if (supplier) {
      return NextResponse.redirect(`${origin}/en/supplier-portal`);
    }

    return NextResponse.redirect(`${origin}/en/login?error=no_account`);
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(`${origin}/en/login?error=server_error`);
  }
}

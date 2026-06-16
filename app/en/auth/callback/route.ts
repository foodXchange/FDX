import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOriginFromHeaders } from "@/lib/getOrigin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "email";
  const origin = getOriginFromHeaders(request.headers);

  console.log('=== AUTH CALLBACK ===');
  console.log('tokenHash:', tokenHash?.substring(0, 20) + '...');
  console.log('code:', code?.substring(0, 20) + '...');
  console.log('origin:', origin);

  try {
    const supabase = await createClient();

    if (tokenHash) {
      console.log('Verifying token_hash...');
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "magiclink" | "email",
      });
      if (error) {
        console.log('verifyOtp error:', error.message);
        throw error;
      }
      console.log('verifyOtp success');
    } else if (code) {
      console.log('Exchanging code for session...');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      console.log('No token_hash or code, redirecting to login');
      return NextResponse.redirect(`${origin}/en/login?error=invalid_link`);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('User email:', user?.email);

    if (userError || !user?.email) {
      console.log('No user, redirecting to login');
      return NextResponse.redirect(`${origin}/en/login?error=auth_failed`);
    }

    const { data: buyer } = await supabase
      .from("buyers")
      .select("id")
      .eq("contact_email", user.email)
      .single();

    console.log('Buyer lookup:', buyer ? 'found' : 'not found');
    if (buyer) {
      console.log('Redirecting to /en/portal');
      return NextResponse.redirect(`${origin}/en/portal`);
    }

    const { data: supplier } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("email", user.email)
      .single();

    console.log('Supplier lookup:', supplier ? 'found' : 'not found');
    if (supplier) {
      console.log('Redirecting to /en/supplier-portal');
      return NextResponse.redirect(`${origin}/en/supplier-portal`);
    }

    console.log('No account found, redirecting to login');
    return NextResponse.redirect(`${origin}/en/login?error=no_account`);
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${origin}/en/login?error=server_error`);
  }
}

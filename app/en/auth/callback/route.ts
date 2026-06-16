import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOriginFromHeaders } from "@/lib/getOrigin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "email";
  const origin = getOriginFromHeaders(request.headers);

  console.log("=== AUTH CALLBACK START ===");
  console.log("URL:", request.url);
  console.log("origin:", origin);
  console.log("token_hash present:", !!tokenHash);
  console.log("code present:", !!code);
  console.log("type:", type);

  try {
    const supabase = await createClient();
    console.log("Supabase client created");

    if (tokenHash) {
      console.log("Calling verifyOtp...");
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "magiclink" | "email",
      });
      if (error) {
        console.error("verifyOtp error:", error.message, "status:", error.status);
        throw error;
      }
      console.log("verifyOtp success");
    } else if (code) {
      console.log("Calling exchangeCodeForSession...");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("exchangeCodeForSession error:", error.message);
        throw error;
      }
      console.log("exchangeCodeForSession success");
    } else {
      console.error("No token_hash or code in URL");
      return NextResponse.redirect(`${origin}/en/login?error=invalid_link`);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("getUser result — email:", user?.email ?? "null", "error:", userError?.message ?? "none");

    if (userError || !user?.email) {
      console.error("getUser failed or no email:", userError?.message);
      return NextResponse.redirect(`${origin}/en/login?error=auth_failed`);
    }

    console.log("Checking buyers table for:", user.email);
    const { data: buyer, error: buyerError } = await supabase
      .from("buyers")
      .select("id")
      .eq("contact_email", user.email)
      .single();

    console.log("buyers query — found:", !!buyer, "error:", buyerError?.message ?? "none");

    if (buyer) {
      console.log("Routing to /en/portal");
      return NextResponse.redirect(`${origin}/en/portal`);
    }

    console.log("Checking supplier_profiles table for:", user.email);
    const { data: supplier, error: supplierError } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("email", user.email)
      .single();

    console.log("supplier_profiles query — found:", !!supplier, "error:", supplierError?.message ?? "none");

    if (supplier) {
      console.log("Routing to /en/supplier-portal");
      return NextResponse.redirect(`${origin}/en/supplier-portal`);
    }

    console.log("No matching buyer or supplier — redirecting to login with no_account error");
    return NextResponse.redirect(`${origin}/en/login?error=no_account`);
  } catch (error) {
    console.error("=== AUTH CALLBACK CRASH ===");
    console.error("Error:", error);
    console.error("Message:", (error as Error)?.message);
    console.error("Stack:", (error as Error)?.stack);
    console.error("=== END CRASH ===");
    return NextResponse.redirect(`${origin}/en/login?error=server_error`);
  }
}

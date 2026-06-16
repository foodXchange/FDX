import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signSession, COOKIE_NAME } from "@/lib/adminAuth";
import { getOriginFromHeaders } from "@/lib/getOrigin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "magiclink") as "magiclink" | "email";
  const origin = getOriginFromHeaders(request.headers);

  try {
    if (tokenHash) {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

      if (!error) {
        const token = await signSession();
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
        return NextResponse.redirect(`${origin}/admin`);
      }

      console.error("verifyOtp failed:", error.message);
    }
  } catch (err) {
    console.error("Admin auth callback crashed:", err);
    return NextResponse.redirect(`${origin}/admin/login?error=server_error`);
  }

  return NextResponse.redirect(`${origin}/admin/login?error=invalid_link`);
}
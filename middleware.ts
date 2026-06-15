import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { updateSession } from "@/lib/supabase/middleware";
import { verifyImpersonation, IMPERSONATION_COOKIE } from "@/lib/impersonation";

const PORTAL_AUTH_PATHS = [
  "/en/portal/login",
  "/en/portal/register",
  "/en/portal/auth/callback",
];

const SUPPLIER_PORTAL_AUTH_PATHS = [
  "/en/supplier-portal/login",
  "/en/supplier-portal/register",
  "/en/supplier-portal/auth/callback",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/en/admin");
  if (isAdminRoute) {
    if (pathname === "/admin/login" || pathname.startsWith("/admin/auth/callback")) {
      return NextResponse.next();
    }
    const cookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!cookie || !(await verifySession(cookie))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/en/portal")) {
    const impersonationCookie = req.cookies.get(IMPERSONATION_COOKIE)?.value;
    if (impersonationCookie && !(await verifyImpersonation(impersonationCookie))) {
      return NextResponse.redirect(
        new URL("/api/admin/impersonate/exit?expired=1&portal=buyer", req.url)
      );
    }

    const { response, user } = await updateSession(req);
    const isAuthPath = PORTAL_AUTH_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isAuthPath) {
      return NextResponse.redirect(new URL("/en/portal/login", req.url));
    }
    return response;
  }

  if (pathname.startsWith("/en/supplier-portal")) {
    const impersonationCookie = req.cookies.get(IMPERSONATION_COOKIE)?.value;
    if (impersonationCookie && !(await verifyImpersonation(impersonationCookie))) {
      return NextResponse.redirect(
        new URL("/api/admin/impersonate/exit?expired=1&portal=supplier", req.url)
      );
    }

    const { response, user } = await updateSession(req);
    const isAuthPath = SUPPLIER_PORTAL_AUTH_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isAuthPath) {
      return NextResponse.redirect(new URL("/en/supplier-portal/login", req.url));
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/en/admin/:path*",
    "/en/portal/:path*",
    "/en/supplier-portal/:path*",
  ],
};

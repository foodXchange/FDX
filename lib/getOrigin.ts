export function getOriginFromHeaders(headers: Headers): string {
  // On production, always use the canonical domain — Supabase magic links
  // are origin-locked, so generation and verification must agree exactly.
  if (process.env.NODE_ENV === "production") {
    return "https://fdx.trading";
  }

  const origin = headers.get("origin");
  if (origin) return origin;

  const referer = headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin; } catch {}
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
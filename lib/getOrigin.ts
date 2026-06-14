export function getOriginFromHeaders(headers: Headers): string {
  const origin = headers.get("origin");
  if (origin) return origin;

  const referer = headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin; } catch {}
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
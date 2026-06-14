const COOKIE_NAME = "admin_session";
const MAX_AGE_DAYS = 7;

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.ADMIN_SESSION_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signSession(): Promise<string> {
  const payload = btoa(JSON.stringify({ ts: Date.now(), role: "admin" }));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySession(cookie: string): Promise<boolean> {
  try {
    const [payload, sig] = cookie.split(".");
    if (!payload || !sig) return false;
    const expected = await hmac(payload);
    if (sig !== expected) return false;
    const { ts } = JSON.parse(atob(payload)) as { ts: number };
    const ageDays = (Date.now() - ts) / 86_400_000;
    return ageDays < MAX_AGE_DAYS;
  } catch {
    return false;
  }
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? "admin";
}

export { COOKIE_NAME };

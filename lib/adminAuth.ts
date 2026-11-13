import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const MAX_AGE_DAYS = 7;

async function hmac(message: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  }
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
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

export function getAllowedAdminEmails(): string[] {
  const configured = process.env.ADMIN_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (configured && configured.length > 0) return configured;

  const fallback = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (fallback && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallback)) {
    return [fallback];
  }

  return ["udi@fdx.trading"];
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && getAllowedAdminEmails().includes(email.trim().toLowerCase()));
}

export async function requireAdminApiAuth(): Promise<Response | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export { COOKIE_NAME };

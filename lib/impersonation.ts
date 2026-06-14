const COOKIE_NAME = "fdx_impersonation";
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface ImpersonationPayload {
  adminEmail: string;
  targetType: "buyer" | "supplier";
  targetId: string;
  targetLabel: string;
  startedAt: number;
}

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

function toBase64(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function signImpersonation(payload: ImpersonationPayload): Promise<string> {
  const data = toBase64(JSON.stringify(payload));
  const sig = await hmac(data);
  return `${data}.${sig}`;
}

export async function verifyImpersonation(cookie: string | undefined): Promise<ImpersonationPayload | null> {
  if (!cookie) return null;
  try {
    const [data, sig] = cookie.split(".");
    if (!data || !sig) return null;
    const expected = await hmac(data);
    if (sig !== expected) return null;
    const payload = JSON.parse(fromBase64(data)) as ImpersonationPayload;
    if (Date.now() - payload.startedAt > MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getImpersonationContext(
  cookie: string | undefined
): Promise<{ adminEmail: string } | null> {
  const payload = await verifyImpersonation(cookie);
  return payload ? { adminEmail: payload.adminEmail } : null;
}

export { COOKIE_NAME as IMPERSONATION_COOKIE, MAX_AGE_MS as IMPERSONATION_MAX_AGE_MS };

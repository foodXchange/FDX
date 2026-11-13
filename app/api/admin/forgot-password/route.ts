import { z } from "zod";
import { sendAdminPasswordReminder } from "@/lib/email/mailer";
import { isAllowedAdminEmail } from "@/lib/adminAuth";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

const BodySchema = z.object({
  email: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
  const now = Date.now();
  const current = requestsByIp.get(ip);
  const rateLimitEntry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }
    : { count: current.count + 1, resetAt: current.resetAt };
  requestsByIp.set(ip, rateLimitEntry);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = BodySchema.safeParse(body);
  const email = parsed.success && parsed.data.email ? parsed.data.email : null;

  if (
    email &&
    isAllowedAdminEmail(email) &&
    rateLimitEntry.count <= RATE_LIMIT_MAX_REQUESTS
  ) {
    void sendAdminPasswordReminder({ requestedFromEmail: email });
  }

  // Always respond with success — avoids leaking whether admin auth is configured.
  return Response.json({ ok: true });
}

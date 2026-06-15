import { z } from "zod";
import { sendAdminPasswordReminder } from "@/lib/email/mailer";

const BodySchema = z.object({
  email: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = BodySchema.safeParse(body);
  const email = parsed.success && parsed.data.email ? parsed.data.email : null;

  void sendAdminPasswordReminder({ requestedFromEmail: email });

  // Always respond with success — avoids leaking whether admin auth is configured.
  return Response.json({ ok: true });
}

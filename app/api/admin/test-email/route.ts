import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { sendTestEmail } from "@/lib/email/mailer";

const BodySchema = z.object({ to: z.string().email() });

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!adminCookie || !(await verifySession(adminCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await sendTestEmail(parsed.data.to);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}

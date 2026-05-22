import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PatchSchema = z.object({
  status: z.enum(["approved", "rejected", "sent", "pending"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { status } = parsed.data;
  const now = new Date().toISOString();
  const update: Record<string, string> = { status };
  if (status === "approved") update.approved_at = now;
  if (status === "rejected") update.rejected_at = now;
  if (status === "sent") update.sent_at = now;

  const { error } = await supabaseAdmin
    .from("sourcing_matches")
    .update(update)
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

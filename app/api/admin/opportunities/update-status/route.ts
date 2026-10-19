import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "proposed",
    "reviewed",
    "pitched",
    "in_negotiation",
    "accepted",
    "deal_won",
    "rejected",
  ]),
});

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request data", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id, status } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("assortment_matches")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, data });
}

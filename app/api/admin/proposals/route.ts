import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CreateSchema = z.object({
  buyer_name: z.string().min(1),
  buyer_company: z.string().optional(),
  buyer_id: z.string().uuid().optional(),
  product_ids: z.array(z.string().uuid()).min(1).max(20),
  title: z.string().optional(),
  personal_message: z.string().max(500).optional(),
  expires_days: z.number().int().min(1).max(90).optional(),
});

async function auth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? "";
  return verifySession(session);
}

export async function POST(req: Request) {
  if (!(await auth())) {
    return new Response("Unauthorised", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;

  const { data: proposal, error } = await supabaseAdmin
    .from("proposals")
    .insert({
      buyer_name: d.buyer_name,
      buyer_company: d.buyer_company ?? null,
      buyer_id: d.buyer_id ?? null,
      product_ids: d.product_ids,
      title: d.title ?? null,
      personal_message: d.personal_message ?? null,
      status: "active",
      expires_at: d.expires_days
        ? new Date(Date.now() + d.expires_days * 86_400_000).toISOString()
        : null,
    })
    .select("id, token")
    .single();

  if (error || !proposal) {
    console.error("Create proposal error:", error);
    return Response.json({ ok: false, error: "Database error" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    token: proposal.token,
    url: `https://fdx.trading/proposals/${proposal.token}`,
  });
}

export async function GET() {
  if (!(await auth())) {
    return new Response("Unauthorised", { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("proposals")
    .select(
      "id,token,buyer_name,buyer_company,title,status,view_count,last_viewed_at,product_ids,viewed_product_ids,created_at,expires_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ ok: false, error: "Database error" }, { status: 500 });
  }

  return Response.json({ ok: true, proposals: data ?? [] });
}

import { createClient } from "@supabase/supabase-js";

const BUCKET = "content-images";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const path = String(body.path || "").trim();
  if (!path) return Response.json({ error: "Missing path" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
``
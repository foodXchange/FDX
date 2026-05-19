import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["trash_enabled", "trash_days"]);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const out: Record<string, string> = {};
  for (const row of data || []) out[row.key] = row.value;

  return Response.json(out);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const trash_enabled = String(body.trash_enabled);
  const trash_days = String(body.trash_days);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("app_settings")
    .upsert([
      { key: "trash_enabled", value: trash_enabled },
      { key: "trash_days", value: trash_days },
    ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

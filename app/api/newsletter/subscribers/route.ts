import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count, error } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ count: count ?? 0 });
}

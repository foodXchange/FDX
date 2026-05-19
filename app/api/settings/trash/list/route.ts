import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("content_image_history")
    .select("id, trashed_object_path, changed_at")
    .not("trashed_object_path", "is", null)
    .order("changed_at", { ascending: false })
    .limit(30);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Return only valid paths
  const items = (data || []).filter((x) => x.trashed_object_path);

  return Response.json({ items });
}

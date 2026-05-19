import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim();

    if (!slug) {
      return Response.json({ error: "Missing slug" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("content_image_history")
      .select(`
        id,
        action,
        field_name,
        old_url,
        new_url,
        changed_at,
        trashed_object_path
      `)
      .eq("content_type", "blog")
      .eq("content_slug", slug)
      .order("changed_at", { ascending: false })
      .limit(30);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ history: data || [] });

  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
``
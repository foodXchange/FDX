import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, created_at, cover_image, hero_image")
    .eq("lang", "en")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ posts: data || [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
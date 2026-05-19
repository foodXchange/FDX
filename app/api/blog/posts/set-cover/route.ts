import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  const cover_image = String(body.cover_image || "").trim();

  if (!slug || !cover_image) {
    return new Response(JSON.stringify({ error: "Missing slug or cover_image" }), { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("blog_posts")
    .update({ cover_image })
    .eq("slug", slug)
    .eq("lang", "en");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

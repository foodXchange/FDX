// FILE: app/api/blog/editor/post/route.ts

import { createClient } from "@supabase/supabase-js";

function normalizeStatus(status: string) {
  const s = (status || "").toLowerCase().trim();
  if (["draft", "review", "scheduled", "published"].includes(s)) return s;
  return "draft";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();

  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("lang", "en")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ post: data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const title = String(body.title || "").trim();
  const slug = String(body.slug || "").trim();
  const status = normalizeStatus(String(body.status || "draft"));
  const content = String(body.content || "");
  const excerpt = String(body.excerpt || "").trim();

  const tagsRaw = Array.isArray(body.tags) ? body.tags : [];
  const tags = tagsRaw
    .map((t: any) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const meta_title = String(body.meta_title || "").trim();
  const meta_description = String(body.meta_description || "").trim();
  const published_at = body.published_at ? String(body.published_at) : null;

  // ── Images — accept null to clear, undefined to leave unchanged ──
  const cover_image = body.cover_image !== undefined
    ? (body.cover_image ? String(body.cover_image).trim() : null)
    : null;
  const hero_image = body.hero_image !== undefined
    ? (body.hero_image ? String(body.hero_image).trim() : null)
    : null;

  if (!title) return Response.json({ error: "Missing title" }, { status: 400 });
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

  const published = status === "published";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const payload: any = {
    title,
    slug,
    lang: "en",
    status,
    published,
    content,
    excerpt,
    tags,
    meta_title,
    meta_description,
    published_at: published
      ? (published_at || new Date().toISOString())
      : published_at,
    // ── Images now included ──
    cover_image,
    hero_image,
    cover_alt: body.cover_alt ? String(body.cover_alt).trim() : null,
    hero_alt: body.hero_alt ? String(body.hero_alt).trim() : null,
    cover_position: body.cover_position ? String(body.cover_position).trim() : null,
    hero_position: body.hero_position ? String(body.hero_position).trim() : null,
  };

  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, post: data });
}
import { createClient } from "@supabase/supabase-js";

function normalizeStatus(s: string) {
  const v = (s || "").toLowerCase().trim();
  if (["draft", "scheduled", "sent"].includes(v)) return v;
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
    .from("newsletter_issues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ issue: data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const slug = String(body.slug || "").trim();
  const title = String(body.title || "").trim();
  const status = normalizeStatus(String(body.status || "draft"));
  const subject = String(body.subject || "").trim();
  const preview_text = String(body.preview_text || "").trim();
  const content = String(body.content || "");
  const intro = String(body.intro || "").trim();
  const cta = String(body.cta || "").trim();
  const selected_posts = Array.isArray(body.selected_posts) ? body.selected_posts : [];
  const send_date = body.send_date ? String(body.send_date) : null;

  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("newsletter_issues")
    .upsert(
      { slug, title: title || slug, status, subject, preview_text, content, intro, cta, selected_posts, send_date },
      { onConflict: "slug" }
    )
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, issue: data });
}

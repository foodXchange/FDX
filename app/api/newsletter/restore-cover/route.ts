import { createClient } from "@supabase/supabase-js";

const BUCKET = "content-images";

function isoForPath(d = new Date()) {
  return d.toISOString().replaceAll(":", "-");
}

function fileNameFromPath(p: string) {
  const parts = p.split("/");
  return parts[parts.length - 1] || "file";
}

function publicUrlFor(supabaseUrl: string, bucket: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  const trashed_object_path = String(body.trashed_object_path || "").trim();

  if (!slug || !trashed_object_path) {
    return new Response(JSON.stringify({ error: "Missing slug or trashed_object_path" }), { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Move from trash -> restored
  const restoredPath = `restored/newsletter/${slug}/cover/${isoForPath()}_${fileNameFromPath(trashed_object_path)}`;

  const { error: mvErr } = await supabase.storage.from(BUCKET).move(trashed_object_path, restoredPath);
  if (mvErr) return new Response(JSON.stringify({ error: mvErr.message }), { status: 500 });

  const newUrl = publicUrlFor(supabaseUrl, BUCKET, restoredPath);

  // Update DB
  const { error: upErr } = await supabase
    .from("newsletter_issues")
    .update({ cover_image: newUrl, cover_object_path: restoredPath })
    .eq("slug", slug);

  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });

  // History
  await supabase.from("content_image_history").insert({
    content_type: "newsletter",
    content_slug: slug,
    field_name: "cover_image",
    old_url: null,
    old_object_path: null,
    new_url: newUrl,
    new_object_path: restoredPath,
    trashed_object_path,
    action: "restore",
  });

  return new Response(JSON.stringify({ ok: true, url: newUrl }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

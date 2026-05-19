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

async function removeNewUploadIfNeeded(supabase: any, newPath?: string) {
  if (!newPath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([newPath]);
  if (error) console.warn("Cleanup remove new failed:", error.message);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const slug = String(body.slug || "").trim();
  const field = String(body.field || "").trim();
  const trashed_object_path = String(body.trashed_object_path || "").trim();

  if (!slug || !trashed_object_path || (field !== "cover" && field !== "hero")) {
    return new Response(JSON.stringify({ error: "Missing/invalid params" }), { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const restoredPath = `restored/blog/${slug}/${field}/${isoForPath()}_${fileNameFromPath(trashed_object_path)}`;

  const { error: mvErr } = await supabase.storage.from(BUCKET).move(trashed_object_path, restoredPath); // 
  if (mvErr) return new Response(JSON.stringify({ error: mvErr.message }), { status: 500 });

  const newUrl = publicUrlFor(supabaseUrl, BUCKET, restoredPath);

  const urlField = field === "cover" ? "cover_image" : "hero_image";
  const pathField = field === "cover" ? "cover_object_path" : "hero_object_path";

  const patch: any = {};
  patch[urlField] = newUrl;
  patch[pathField] = restoredPath;

  const { error: upErr } = await supabase
    .from("blog_posts")
    .update(patch)
    .eq("slug", slug)
    .eq("lang", "en");

  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });

  await supabase.from("content_image_history").insert({
    content_type: "blog",
    content_slug: slug,
    field_name: urlField,
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

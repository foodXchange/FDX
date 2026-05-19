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

async function moveToTrash(
  supabase: any,
  slug: string,
  field: "cover" | "hero",
  oldPath: string | null,
  newPath?: string | null
) {
  if (!oldPath) return { trashedPath: null as string | null };
  if (newPath && oldPath === newPath) return { trashedPath: null as string | null };

  const trashedPath = `trash/blog/${slug}/${field}/${isoForPath()}_${fileNameFromPath(oldPath)}`;

  const { error } = await supabase.storage.from(BUCKET).move(oldPath, trashedPath);
  if (error) {
    console.warn("Trash move failed (blog):", error.message);
    return { trashedPath: null as string | null };
  }

  return { trashedPath };
}

async function removeNewUploadIfNeeded(supabase: any, newPath?: string) {
  if (!newPath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([newPath]);
  if (error) console.warn("Cleanup remove new failed:", error.message);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const slug = String(body.slug || "").trim();
  const field = String(body.field || "").trim(); // "cover" | "hero"
  const action = String(body.action || "replace").trim(); // "replace" | "delete"

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const object_path = typeof body.object_path === "string" ? body.object_path.trim() : "";

  if (!slug) return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });
  if (field !== "cover" && field !== "hero") {
    return new Response(JSON.stringify({ error: "Invalid field" }), { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const urlField = field === "cover" ? "cover_image" : "hero_image";
  const pathField = field === "cover" ? "cover_object_path" : "hero_object_path";

  const { data: current, error: curErr } = await supabase
    .from("blog_posts")
    .select(`${urlField}, ${pathField}`)
    .eq("slug", slug)
    .eq("lang", "en")
    .single();

  if (curErr) {
    await removeNewUploadIfNeeded(supabase, object_path);
    return new Response(JSON.stringify({ error: curErr.message }), { status: 500 });
  }

  const old_url = (current as any)?.[urlField] ?? null;
  const old_path = (current as any)?.[pathField] ?? null;

  if (action === "delete") {
    const { trashedPath } = await moveToTrash(
      supabase,
      slug,
      field as "cover" | "hero",
      old_path,
      null
    );

    const { error: hErr } = await supabase.from("content_image_history").insert({
      content_type: "blog",
      content_slug: slug,
      field_name: urlField,
      old_url,
      old_object_path: old_path,
      new_url: null,
      new_object_path: null,
      trashed_object_path: trashedPath,
      action: "delete",
    });

    if (hErr) return new Response(JSON.stringify({ error: hErr.message }), { status: 500 });

    const patch: any = {};
    patch[urlField] = null;
    patch[pathField] = null;

    const { error: upErr } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("slug", slug)
      .eq("lang", "en");

    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // replace
  if (!url) {
    await removeNewUploadIfNeeded(supabase, object_path);
    return new Response(JSON.stringify({ error: "Missing url" }), { status: 400 });
  }

  const { trashedPath } = await moveToTrash(
    supabase,
    slug,
    field as "cover" | "hero",
    old_path,
    object_path || null
  );

  const { error: hErr } = await supabase.from("content_image_history").insert({
    content_type: "blog",
    content_slug: slug,
    field_name: urlField,
    old_url,
    old_object_path: old_path,
    new_url: url,
    new_object_path: object_path || null,
    trashed_object_path: trashedPath,
    action: "replace",
  });

  if (hErr) {
    await removeNewUploadIfNeeded(supabase, object_path);
    return new Response(JSON.stringify({ error: hErr.message }), { status: 500 });
  }

  const patch: any = {};
  patch[urlField] = url;
  patch[pathField] = object_path || null;

  const { error: upErr } = await supabase
    .from("blog_posts")
    .update(patch)
    .eq("slug", slug)
    .eq("lang", "en");

  if (upErr) {
    await removeNewUploadIfNeeded(supabase, object_path);
    return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

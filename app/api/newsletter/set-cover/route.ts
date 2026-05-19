import { createClient } from "@supabase/supabase-js";

const BUCKET = "content-images";

function isoForPath(d = new Date()) {
  return d.toISOString().replaceAll(":", "-");
}

function fileNameFromPath(p: string) {
  const parts = p.split("/");
  return parts[parts.length - 1] || "file";
}

async function removeNewUploadIfNeeded(supabase: any, newPath?: string) {
  if (!newPath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([newPath]); // remove takes array 
  if (error) console.warn("Cleanup remove new failed:", error.message);
}

async function moveToTrash(
  supabase: any,
  oldPath: string | null,
  slug: string,
  field: string,
  newPath?: string | null
) {
  if (!oldPath) return { trashedPath: null as string | null };
  if (newPath && oldPath === newPath) return { trashedPath: null as string | null };

  const trashedPath = `trash/newsletter/${slug}/${field}/${isoForPath()}_${fileNameFromPath(oldPath)}`;

  const { error } = await supabase.storage.from(BUCKET).move(oldPath, trashedPath); // move within same bucket 
  if (error) {
    console.warn("Trash move failed (newsletter):", error.message);
    return { trashedPath: null as string | null };
  }

  return { trashedPath };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const slug = String(body.slug || "").trim();
  const action = String(body.action || "replace").trim(); // "replace" | "delete"

  const cover_image = typeof body.cover_image === "string" ? body.cover_image.trim() : "";
  const cover_object_path = typeof body.cover_object_path === "string" ? body.cover_object_path.trim() : "";

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Current values for history + trash
  const { data: current, error: curErr } = await supabase
    .from("newsletter_issues")
    .select("cover_image, cover_object_path")
    .eq("slug", slug)
    .single();

  if (curErr) {
    // if a new upload exists, remove it so it won’t orphan
    await removeNewUploadIfNeeded(supabase, cover_object_path);
    return new Response(JSON.stringify({ error: curErr.message }), { status: 500 });
  }

  const old_url = current?.cover_image ?? null;
  const old_path = current?.cover_object_path ?? null;

  if (action === "delete") {
    // Move old file to trash (safer than delete)
    const { trashedPath } = await moveToTrash(supabase, old_path, slug, "cover", null);

    // History
    const { error: hErr } = await supabase.from("content_image_history").insert({
      content_type: "newsletter",
      content_slug: slug,
      field_name: "cover_image",
      old_url,
      old_object_path: old_path,
      new_url: null,
      new_object_path: null,
      trashed_object_path: trashedPath,
      action: "delete",
    });

    if (hErr) {
      return new Response(JSON.stringify({ error: hErr.message }), { status: 500 });
    }

    // DB update
    const { error: upErr } = await supabase
      .from("newsletter_issues")
      .update({ cover_image: null, cover_object_path: null })
      .eq("slug", slug);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Replace
  if (!cover_image) {
    await removeNewUploadIfNeeded(supabase, cover_object_path);
    return new Response(JSON.stringify({ error: "Missing cover_image" }), { status: 400 });
  }

  // Move old file to trash first (so we can record its trash location)
  const { trashedPath } = await moveToTrash(supabase, old_path, slug, "cover", cover_object_path || null);

  // History
  const { error: hErr } = await supabase.from("content_image_history").insert({
    content_type: "newsletter",
    content_slug: slug,
    field_name: "cover_image",
    old_url,
    old_object_path: old_path,
    new_url: cover_image,
    new_object_path: cover_object_path || null,
    trashed_object_path: trashedPath,
    action: "replace",
  });

  if (hErr) {
    // DB history failed → delete NEW upload to avoid orphan
    await removeNewUploadIfNeeded(supabase, cover_object_path);
    return new Response(JSON.stringify({ error: hErr.message }), { status: 500 });
  }

  // DB update
  const { error: upErr } = await supabase
    .from("newsletter_issues")
    .update({ cover_image, cover_object_path: cover_object_path || null })
    .eq("slug", slug);

  if (upErr) {
    // DB update failed → delete NEW upload to avoid orphan
    await removeNewUploadIfNeeded(supabase, cover_object_path);
    return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Supabase storage setup (one-time, in Supabase dashboard):
//   Storage → New bucket → Name: "portfolio" → Public: YES → File size limit: 5MB
//   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string | null) ?? "portfolio";
  const folder = (formData.get("folder") as string | null) ?? "hero";

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Invalid file type — use JPG, PNG, or WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: "File too large — max 5MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    if (
      uploadError.message?.includes("not found") ||
      uploadError.message?.includes("does not exist")
    ) {
      return Response.json(
        {
          error: `Storage bucket "${bucket}" not found. Create it in Supabase: Storage → New bucket → name "${bucket}" → enable Public.`,
        },
        { status: 500 }
      );
    }
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filename);

  return Response.json({ ok: true, url: urlData.publicUrl });
}

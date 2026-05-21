import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const urlObj = new URL(req.url);
  const bucketParam = urlObj.searchParams.get("bucket");
  const bucket = bucketParam === "suppliers" ? "suppliers" : "requests";

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];

  if (!allowed.includes(file.type)) {
    return Response.json(
      { error: "Invalid file type. Use JPG, PNG, WebP or PDF." },
      { status: 400 }
    );
  }

  const maxSize = bucket === "suppliers" ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return Response.json(
      { error: `File too large — maximum ${bucket === "suppliers" ? "20" : "10"}MB.` },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filename, Buffer.from(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);

  return Response.json({ ok: true, url: data.publicUrl, filename });
}

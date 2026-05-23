import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { getCategoryFilename } from "@/lib/images/imageUtils";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie || !(await verifySession(cookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;

  if (!file || !category) {
    return NextResponse.json({ error: "Missing file or category" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(buffer)
    .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Ensure bucket exists (swallow "already exists" error)
  await supabaseAdmin.storage.createBucket("category-images", { public: true });

  // Always use SEO-friendly filename; sharp always outputs jpeg
  const path = getCategoryFilename(category, "jpg");

  const { error: uploadError } = await supabaseAdmin.storage
    .from("category-images")
    .upload(path, resized, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("category-images").getPublicUrl(path);

  await supabaseAdmin
    .from("category_images")
    .upsert(
      { category, image_url: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: "category" }
    );

  return NextResponse.json({ ok: true, url: publicUrl });
}

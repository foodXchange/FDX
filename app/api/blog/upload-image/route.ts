// FILE LOCATION: app/api/blog/upload-image/route.ts
//
// Receives an image file from the blog editor (drag-drop or click-to-upload),
// uploads it to Supabase Storage, and returns the public URL.
//
// Supabase setup needed (one-time, in your Supabase dashboard):
//   1. Go to Storage → New bucket
//   2. Name it: blog-images
//   3. Make it PUBLIC (toggle "Public bucket" on)
//   4. That's it — no extra policies needed for a public bucket
//
// Your .env.local already has these from your existing Supabase setup:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
//   (optionally) SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← preferred for uploads

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for uploads if available (bypasses RLS),
// otherwise fall back to anon key (works on public buckets)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

const BUCKET = "blog-images";
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Use: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // ── Build a unique filename ──────────────────────────────────────────────
    // Format: posts/2025-05-19_143022_original-name.jpg
    // Stored in a posts/ subfolder to keep the bucket organised
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10); // 2025-05-19
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, ""); // 143022
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const fileName = `posts/${datePart}_${timePart}_${safeName}`;

    // ── Upload to Supabase Storage ───────────────────────────────────────────
    const supabase = getSupabaseClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false, // never overwrite — timestamp ensures uniqueness
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);

      // Friendly error for the most common mistake: bucket doesn't exist yet
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              'Storage bucket "blog-images" not found. Create it in your Supabase dashboard: Storage → New bucket → name it "blog-images" → enable Public.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: uploadError.message || "Upload failed" },
        { status: 500 }
      );
    }

    // ── Get the public URL ───────────────────────────────────────────────────
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "Upload succeeded but could not get public URL" },
        { status: 500 }
      );
    }

    // ── Return the URL to the editor ─────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      url: urlData.publicUrl,
      fileName,
    });

  } catch (err) {
    console.error("Image upload route error:", err);
    return NextResponse.json(
      { error: "Unexpected server error during upload" },
      { status: 500 }
    );
  }
}
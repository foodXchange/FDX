import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await context.params;
    if (!matchId) {
      return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 15MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `supplier-matches/${matchId}/${Date.now()}-${safeName}`;

    // Attempt upload to Supabase Storage "product-images"
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from("product-images")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    let publicUrl: string;

    if (!uploadErr && uploadData) {
      const { data: pub } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(storagePath);
      publicUrl = pub.publicUrl;
    } else {
      // Fallback: If bucket does not exist or upload errored, convert to data URL
      console.warn("Storage bucket upload fallback to Data URI:", uploadErr?.message);
      const mime = file.type || "application/octet-stream";
      publicUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err: unknown) {
    console.error("Supplier file upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

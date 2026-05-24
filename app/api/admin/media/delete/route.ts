import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "blog-images";

export async function DELETE(req: NextRequest) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { path } = body;
  if (!path?.trim()) {
    return NextResponse.json({ error: "No path provided" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Storage delete error:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

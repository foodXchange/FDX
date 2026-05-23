import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie || !(await verifySession(cookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    category: string;
    url?: string | null;
    alt?: string;
  };
  const { category } = body;

  if (!category) {
    return NextResponse.json({ error: "Missing category" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if ("url" in body) updates.image_url = body.url ?? null;
  if ("alt" in body) updates.image_alt = body.alt;

  await supabaseAdmin
    .from("category_images")
    .upsert({ category, ...updates }, { onConflict: "category" });

  return NextResponse.json({ ok: true });
}

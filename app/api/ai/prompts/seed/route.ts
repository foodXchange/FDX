// FILE LOCATION: app/api/ai/prompts/seed/route.ts
//
// Called once automatically when the prompt library is empty.
// Seeds the 8 default prompts into Supabase.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompts = body.prompts as { name: string; category: string; text: string }[];

  if (!prompts?.length) {
    return NextResponse.json({ error: "No prompts provided" }, { status: 400 });
  }

  // Check again if already seeded — avoid duplicates on double-click
  const { count } = await supabase()
    .from("prompt_library")
    .select("*", { count: "exact", head: true });

  if ((count || 0) > 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const rows = prompts.map(p => ({
    name: p.name,
    category: p.category,
    text: p.text,
  }));

  const { error } = await supabase()
    .from("prompt_library")
    .insert(rows);

  if (error) {
    console.error("seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, seeded: rows.length });
}
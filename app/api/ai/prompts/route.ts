// FILE LOCATION: app/api/ai/prompts/route.ts
//
// Supabase table (run once in SQL editor):
//
// create table prompt_library (
//   id uuid default gen_random_uuid() primary key,
//   name text not null,
//   category text not null default 'My prompts',
//   text text not null,
//   created_at timestamptz not null default now()
// );
//
// No RLS needed — internal admin tool.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    text: row.text,
    createdAt: row.created_at,
  };
}

// ── GET — load all prompts ─────────────────────────────────────────────────────
export async function GET() {
  const { data, error } = await supabase()
    .from("prompt_library")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("prompt_library GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prompts: (data || []).map(mapRow) });
}

// ── POST — create a new prompt ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, category, text } = body;

  if (!name?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "name and text are required" }, { status: 400 });
  }

  const { data, error } = await supabase()
    .from("prompt_library")
    .insert({ name: name.trim(), category: category || "My prompts", text: text.trim() })
    .select()
    .single();

  if (error) {
    console.error("prompt_library POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prompt: mapRow(data) });
}

// ── PATCH — update an existing prompt ─────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, name, category, text } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase()
    .from("prompt_library")
    .update({
      name: name?.trim(),
      category: category || "My prompts",
      text: text?.trim(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("prompt_library PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prompt: mapRow(data) });
}

// ── DELETE — remove a prompt ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase()
    .from("prompt_library")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("prompt_library DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
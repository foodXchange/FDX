// FILE LOCATION: app/api/ai/chat-history/route.ts
//
// Supabase table (run once in SQL editor):
//
// create table chat_history (
//   id uuid default gen_random_uuid() primary key,
//   post_slug text not null default 'unknown',
//   post_title text not null default 'Untitled',
//   preview text not null default '',
//   messages jsonb not null default '[]',
//   saved_at timestamptz not null default now()
// );
//
// No RLS needed — this is an internal admin-only tool.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── GET — load all history, newest first (max 30) ─────────────────────────────
export async function GET() {
  const { data, error } = await supabase()
    .from("chat_history")
    .select("*")
    .order("saved_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("chat_history GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map DB columns to frontend shape
  const history = (data || []).map(row => ({
    id: row.id,
    postSlug: row.post_slug,
    postTitle: row.post_title,
    savedAt: row.saved_at,
    preview: row.preview,
    messages: row.messages,
  }));

  return NextResponse.json({ history });
}

// ── POST — save a new conversation ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { post_slug, post_title, preview, messages } = body;

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const { error } = await supabase()
    .from("chat_history")
    .insert({
      post_slug: post_slug || "unknown",
      post_title: post_title || "Untitled",
      preview: preview || "",
      messages,
    });

  if (error) {
    console.error("chat_history POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return updated history list
  const { data } = await supabase()
    .from("chat_history")
    .select("*")
    .order("saved_at", { ascending: false })
    .limit(30);

  const history = (data || []).map(row => ({
    id: row.id,
    postSlug: row.post_slug,
    postTitle: row.post_title,
    savedAt: row.saved_at,
    preview: row.preview,
    messages: row.messages,
  }));

  return NextResponse.json({ ok: true, history });
}

// ── DELETE — remove one conversation by id ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase()
    .from("chat_history")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("chat_history DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
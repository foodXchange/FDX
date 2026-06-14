import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadMatch, resolveParty } from "@/lib/matches/matchAuth";

type Params = Promise<{ id: string; docId: string }>;

const BUCKET = "match-documents";

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id: matchId, docId } = await params;

  const match = await loadMatch(matchId);
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const party = await resolveParty(match);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: doc } = await supabaseAdmin
    .from("match_documents")
    .select("id, match_id, uploader_id, file_path")
    .eq("id", docId)
    .maybeSingle();

  if (!doc || doc.match_id !== matchId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (party.role !== "admin" && doc.uploader_id !== party.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin.storage.from(BUCKET).remove([doc.file_path]);

  const { error } = await supabaseAdmin.from("match_documents").delete().eq("id", docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

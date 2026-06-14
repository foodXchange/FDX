import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";
import { loadMatch, resolveParty } from "@/lib/matches/matchAuth";
import { createNotification } from "@/lib/notifications/createNotification";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { notifyBuyerOfDocumentUpload, notifySupplierOfDocumentUpload } from "@/lib/email/matchMessages";
import { logEvent } from "@/lib/events/logEvent";

type Params = Promise<{ id: string }>;

const BUCKET = "match-documents";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

const MAX_SIZE = 10 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id: matchId } = await params;

  const match = await loadMatch(matchId);
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const party = await resolveParty(match);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("match_documents")
    .select("id, file_name, file_path, file_size, mime_type, uploader_id, uploader_type, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const documents = (data ?? []).map((doc) => ({
    ...doc,
    url: supabaseAdmin.storage.from(BUCKET).getPublicUrl(doc.file_path).data.publicUrl,
  }));

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id: matchId } = await params;

  const match = await loadMatch(matchId);
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const party = await resolveParty(match);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (party.role === "admin") {
    return NextResponse.json({ error: "Admin uploads are not available yet" }, { status: 403 });
  }

  const pipeline = getPipelineStatus(match);
  if (pipeline === "closed" || pipeline === "declined") {
    return NextResponse.json({ error: "This match is no longer open for documents" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large — maximum 10MB." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, image, Word, Excel, CSV or text files." },
      { status: 400 }
    );
  }

  await supabaseAdmin.storage.createBucket(BUCKET, { public: true });

  const filePath = `matches/${matchId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: inserted, error } = await supabaseAdmin
    .from("match_documents")
    .insert({
      match_id: matchId,
      uploader_id: party.userId,
      uploader_type: party.role,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select("id, file_name, file_path, file_size, mime_type, uploader_id, uploader_type, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logEvent(party.userId, party.role, "document_uploaded", "document", inserted.id, {
    match_id: matchId,
    file_name: file.name,
    file_size: file.size,
  });

  if (party.role === "supplier") {
    void createNotification(
      "match_message",
      `${match.company_name ?? "A supplier"} shared a document for ${match.product_name ?? "a match"}`,
      file.name,
      { match_id: matchId, supplier_id: match.supplier_id }
    );

    const buyerEmail = match.sourcing_requests?.email;
    if (buyerEmail) {
      void notifyBuyerOfDocumentUpload({
        buyerEmail,
        productName: match.product_name,
        supplierCompanyName: match.company_name,
        fileName: file.name,
        requestId: match.request_id,
      });
    }
  } else {
    void createNotification(
      "match_message",
      `New document from buyer about ${match.product_name ?? "a match"}`,
      file.name,
      { match_id: matchId, supplier_id: match.supplier_id }
    );

    void (async () => {
      const supplierEmail = await getSupplierContactEmail(match.supplier_id);
      if (supplierEmail) {
        await notifySupplierOfDocumentUpload({
          supplierEmail,
          productName: match.product_name,
          fileName: file.name,
        });
      }
    })();
  }

  const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

  return NextResponse.json({ document: { ...inserted, url } });
}

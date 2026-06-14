import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSupplierActionResponseNotification } from "@/lib/email/mailer";

type Params = Promise<{ token: string }>;

const BUCKET = "supplier-uploads";

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

type ActionRow = {
  id: string;
  supplier_id: string;
  status: string | null;
  expires_at: string;
  supplier_offerings: { company_name: string } | null;
};

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { token } = await params;

  const { data: rawAction } = await supabaseAdmin
    .from("supplier_actions")
    .select("id, supplier_id, status, expires_at, supplier_offerings(company_name)")
    .eq("token", token)
    .maybeSingle();

  const action = rawAction as unknown as ActionRow | null;
  if (!action) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  }
  if (new Date(action.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }
  if (action.status === "completed") {
    return NextResponse.json({ error: "This request has already been completed." }, { status: 409 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const responseText = (formData.get("response_text") as string | null)?.trim() || null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  let docLabels: (string | null)[] = [];
  try {
    docLabels = JSON.parse((formData.get("docLabels") as string | null) ?? "[]");
  } catch {
    docLabels = [];
  }

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `"${file.name}" is too large — maximum 10MB.` }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `"${file.name}": unsupported file type. Use PDF, image, Word, Excel, CSV or text files.` },
        { status: 400 }
      );
    }
  }

  if (files.length > 0) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }

  const uploadedFiles: { name: string; url: string; doc_label: string | null; size: number; mime_type: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = `${token}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
    uploadedFiles.push({
      name: file.name,
      url,
      doc_label: docLabels[i] ?? null,
      size: file.size,
      mime_type: file.type,
    });
  }

  await supabaseAdmin
    .from("supplier_actions")
    .update({
      response_text: responseText,
      uploaded_files: uploadedFiles,
      status: "completed",
      responded_at: new Date().toISOString(),
    })
    .eq("id", action.id);

  void sendSupplierActionResponseNotification({
    companyName: action.supplier_offerings?.company_name ?? "A supplier",
    supplierId: action.supplier_id,
    responseText,
    fileCount: uploadedFiles.length,
  });

  return NextResponse.json({ success: true });
}

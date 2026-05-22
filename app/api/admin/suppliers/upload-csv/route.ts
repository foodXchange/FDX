import { parse } from "csv-parse/sync";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cleanUrl(url: string): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  try {
    new URL(u);
    return u;
  } catch {
    return null;
  }
}

function parseCategories(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

type CsvRow = {
  company_name?: string;
  website?: string;
  country?: string;
  categories?: string;
  priority?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  contact_name?: string;
  notes?: string;
};

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();

  let rows: CsvRow[];
  try {
    rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as CsvRow[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CSV parse failed";
    return Response.json({ error: msg }, { status: 400 });
  }

  if (rows.length > 500) {
    return Response.json({ error: "Maximum 500 rows per upload" }, { status: 400 });
  }

  const batchId = `csv-${Date.now()}`;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let invalidUrls = 0;
  const skippedNames: string[] = [];
  const errorDetails: string[] = [];

  for (const row of rows) {
    const name = (row.company_name ?? "").trim();
    const website = (row.website ?? "").trim();

    if (!name) {
      errors++;
      errorDetails.push("Row missing company_name");
      continue;
    }
    if (!website) {
      errors++;
      errorDetails.push(`${name}: missing website`);
      continue;
    }

    const cleanedUrl = cleanUrl(website);
    if (!cleanedUrl) {
      invalidUrls++;
      errorDetails.push(`${name}: invalid website URL "${website}"`);
      continue;
    }

    const priorityRaw = parseInt(row.priority ?? "0");
    const priority = isNaN(priorityRaw) ? 0 : Math.min(Math.max(priorityRaw, 0), 10);

    // Duplicate check
    const { data: existing } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id")
      .ilike("company_name", name)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      skippedNames.push(name);
      continue;
    }

    const { error: insertError } = await supabaseAdmin
      .from("supplier_offerings")
      .insert({
        company_name: name,
        website: cleanedUrl,
        country_of_origin: row.country || null,
        categories: parseCategories(row.categories ?? ""),
        priority,
        contact_email: row.contact_email || null,
        contact_phone: row.contact_whatsapp || null,
        contact_name: row.contact_name || null,
        internal_notes: row.notes || null,
        status: "pending",
        scrape_status: "pending",
        csv_import_batch: batchId,
        source: "csv-upload",
      });

    if (insertError) {
      errors++;
      errorDetails.push(`${name}: ${insertError.message}`);
    } else {
      inserted++;
    }
  }

  return Response.json({
    ok: true,
    batchId,
    total: rows.length,
    inserted,
    skipped,
    errors,
    invalidUrls,
    skippedNames,
    errorDetails,
  });
}

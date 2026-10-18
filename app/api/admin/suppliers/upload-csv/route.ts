import { parse } from "csv-parse/sync";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cleanUrl(url: string): string | null {
  if (!url) return null;
  let u = url.trim();
  if (
    u.includes("@") ||
    u.includes("linkedin.com") ||
    u.includes("facebook.com") ||
    u.includes("youtube.com")
  ) {
    return null;
  }
  if (!u.startsWith("http")) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase().trim();
    return host.length > 3 ? host : null;
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

function ensureValidUtf8(text: string): string {
  try {
    const encoded = new TextEncoder().encode(text);
    return new TextDecoder("utf-8", { fatal: false }).decode(encoded);
  } catch {
    return text.replace(/[\uFFFD]/g, "?");
  }
}

async function fetchAllExistingSuppliers(): Promise<{
  names: Set<string>;
  domains: Set<string>;
}> {
  const names = new Set<string>();
  const domains = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("supplier_offerings")
      .select("company_name, website")
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      if (row.company_name) {
        names.add(row.company_name.trim().toLowerCase());
      }
      const dom = normalizeDomain(row.website);
      if (dom) {
        domains.add(dom);
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return { names, domains };
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  const mode = (form.get("mode") as string | null) ?? "upload"; // "check" | "upload"

  if (!file) {
    return Response.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  let text = await file.text();
  text = ensureValidUtf8(text);

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
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }

  // Load all existing supplier names & domains from DB for 100% deduplication
  const { names: existingNames, domains: existingDomains } = await fetchAllExistingSuppliers();
  const seenNamesInFile = new Set<string>();
  const seenDomainsInFile = new Set<string>();

  let validUniqueCount = 0;
  let duplicateDbNameCount = 0;
  let duplicateDbDomainCount = 0;
  let duplicateInternalCount = 0;
  let invalidUrls = 0;
  let missingNameCount = 0;

  // Parameter existence counters across all rows in CSV
  let hasNameCount = 0;
  let hasValidUrlCount = 0;
  let hasCountryCount = 0;
  let hasCategoriesCount = 0;
  let hasContactCount = 0;
  let hasNotesCount = 0;

  const skippedNames: string[] = [];
  const errorDetails: string[] = [];
  const uniqueRowsToInsert: {
    company_name: string;
    website: string;
    country_of_origin: string | null;
    categories: string[];
    priority: number;
    contact_email: string | null;
    contact_phone: string | null;
    contact_name: string | null;
    internal_notes: string | null;
  }[] = [];

  for (const row of rows) {
    const name = (row.company_name ?? "").trim();
    const website = (row.website ?? "").trim();
    const country = (row.country ?? "").trim();
    const categories = parseCategories(row.categories ?? "");
    const email = (row.contact_email ?? "").trim();
    const whatsapp = (row.contact_whatsapp ?? "").trim();
    const contactName = (row.contact_name ?? "").trim();
    const notes = (row.notes ?? "").trim();

    if (name) hasNameCount++;
    if (country) hasCountryCount++;
    if (categories.length > 0) hasCategoriesCount++;
    if (email || whatsapp || contactName) hasContactCount++;
    if (notes) hasNotesCount++;

    if (!name) {
      missingNameCount++;
      errorDetails.push("Row missing company_name");
      continue;
    }

    const cleanedUrl = cleanUrl(website);
    if (!cleanedUrl) {
      invalidUrls++;
      errorDetails.push(`${name}: invalid or missing website URL "${website}"`);
      continue;
    }
    hasValidUrlCount++;

    const nameKey = name.toLowerCase();
    const domainKey = normalizeDomain(cleanedUrl);

    // 1. Check internal CSV duplicates
    if (seenNamesInFile.has(nameKey) || (domainKey && seenDomainsInFile.has(domainKey))) {
      duplicateInternalCount++;
      skippedNames.push(`${name} (duplicate inside CSV)`);
      continue;
    }
    seenNamesInFile.add(nameKey);
    if (domainKey) seenDomainsInFile.add(domainKey);

    // 2. Check existing DB by company_name
    if (existingNames.has(nameKey)) {
      duplicateDbNameCount++;
      skippedNames.push(`${name} (already in DB)`);
      continue;
    }

    // 3. Check existing DB by normalized website domain
    if (domainKey && existingDomains.has(domainKey)) {
      duplicateDbDomainCount++;
      skippedNames.push(`${name} (domain ${domainKey} already in DB)`);
      continue;
    }

    const priorityRaw = parseInt(row.priority ?? "0", 10);
    const priority = isNaN(priorityRaw) ? 0 : Math.min(Math.max(priorityRaw, 0), 10);

    validUniqueCount++;
    uniqueRowsToInsert.push({
      company_name: name,
      website: cleanedUrl,
      country_of_origin: country || null,
      categories,
      priority,
      contact_email: email || null,
      contact_phone: whatsapp || null,
      contact_name: contactName || null,
      internal_notes: notes || null,
    });
  }

  const totalRows = rows.length;
  const pct = (n: number) => (totalRows > 0 ? Math.round((n / totalRows) * 100) : 0);

  const paramCompleteness = {
    companyNamePct: pct(hasNameCount),
    websitePct: pct(hasValidUrlCount),
    countryPct: pct(hasCountryCount),
    categoriesPct: pct(hasCategoriesCount),
    contactPct: pct(hasContactCount),
    notesPct: pct(hasNotesCount),
  };

  const totalSkippedDuplicates =
    duplicateDbNameCount + duplicateDbDomainCount + duplicateInternalCount;

  // If mode === "check", return the full dry-run verification without inserting anything
  if (mode === "check") {
    return Response.json({
      ok: true,
      mode: "check",
      total: totalRows,
      uniqueReady: validUniqueCount,
      skipped: totalSkippedDuplicates,
      duplicateDbNameCount,
      duplicateDbDomainCount,
      duplicateInternalCount,
      invalidUrls,
      errors: missingNameCount,
      paramCompleteness,
      sampleUnique: uniqueRowsToInsert.slice(0, 8).map((r) => ({
        name: r.company_name,
        website: r.website,
        country: r.country_of_origin,
      })),
      skippedNames: skippedNames.slice(0, 25),
      errorDetails: errorDetails.slice(0, 15),
    });
  }

  // mode === "upload" — Insert only unique records
  if (uniqueRowsToInsert.length === 0) {
    return Response.json({
      ok: true,
      mode: "upload",
      total: totalRows,
      inserted: 0,
      skipped: totalSkippedDuplicates,
      duplicateDbNameCount,
      duplicateDbDomainCount,
      duplicateInternalCount,
      invalidUrls,
      errors: missingNameCount,
      paramCompleteness,
      skippedNames: skippedNames.slice(0, 25),
      errorDetails: errorDetails.slice(0, 15),
    });
  }

  const batchId = `csv-${Date.now()}`;
  const fileName = file.name;

  const { data: batchData, error: batchError } = await supabaseAdmin
    .from("scrape_batches")
    .insert({
      batch_key: batchId,
      filenames: [fileName],
      original_filename: fileName,
      total_rows: uniqueRowsToInsert.length,
      status: "pending",
    })
    .select("id")
    .single();

  if (batchError || !batchData) {
    return Response.json(
      { ok: false, error: `Failed to create batch record: ${batchError?.message || "unknown"}` },
      { status: 500 }
    );
  }

  const batchUuid = batchData.id;
  let inserted = 0;
  let insertErrors = missingNameCount;

  // Batch insert in chunks of 100 for speed and reliability
  const payloadRows = uniqueRowsToInsert.map((r) => ({
    ...r,
    status: "approved",
    verified: true,
    scrape_status: "pending",
    csv_import_batch: batchId,
    source: "csv-upload",
  }));

  for (let i = 0; i < payloadRows.length; i += 100) {
    const chunk = payloadRows.slice(i, i + 100);
    const { error: chunkErr } = await supabaseAdmin.from("supplier_offerings").insert(chunk);
    if (chunkErr) {
      // Fallback row-by-row if a chunk had a constraint issue
      for (const single of chunk) {
        const { error: singleErr } = await supabaseAdmin.from("supplier_offerings").insert(single);
        if (singleErr) {
          insertErrors++;
          errorDetails.push(`${single.company_name}: ${singleErr.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += chunk.length;
    }
  }

  await supabaseAdmin.from("scraper_csv_uploads").insert({
    batch_id: batchId,
    filename: fileName,
    rows_total: totalRows,
    rows_pending: inserted,
    uploaded_at: new Date().toISOString(),
  });

  return Response.json({
    ok: true,
    mode: "upload",
    batchId,
    batchUuid,
    total: totalRows,
    inserted,
    skipped: totalSkippedDuplicates,
    duplicateDbNameCount,
    duplicateDbDomainCount,
    duplicateInternalCount,
    invalidUrls,
    errors: insertErrors,
    paramCompleteness,
    skippedNames: skippedNames.slice(0, 25),
    errorDetails: errorDetails.slice(0, 15),
  });
}

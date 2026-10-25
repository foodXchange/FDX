import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function cleanUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  let u = url.trim();
  if (u.includes("@") || u.includes("linkedin.com") || u.includes("facebook.com")) {
    return null;
  }
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = "https://" + u;
  }
  try {
    const parsed = new URL(u);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    return u.hostname.replace(/^www\./i, "").toLowerCase().trim();
  } catch {
    return null;
  }
}

function parseArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function suggestFieldMapping(header: string): string | null {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(company|companyname|name|supplier|buyer|firm|vendor|businessname|producer)$/.test(h)) {
    return "company_name";
  }
  if (/^(website|url|web|domain|homepage|site|link)$/.test(h)) {
    return "website";
  }
  if (/^(country|countryoforigin|origin|nation|state)$/.test(h)) {
    return "country";
  }
  if (/^(category|categories|products|productcategory|producttypes|industry|sector)$/.test(h)) {
    return "categories";
  }
  if (/^(email|contactemail|mail|emailaddress)$/.test(h)) {
    return "contact_email";
  }
  if (/^(phone|tel|telephone|mobile|whatsapp|contactphone)$/.test(h)) {
    return "contact_phone";
  }
  if (/^(contact|contactname|person|representative|lead|manager)$/.test(h)) {
    return "contact_name";
  }
  if (/^(notes|description|comments|about|details|profile|summary)$/.test(h)) {
    return "notes";
  }
  if (/^(certifications|certs|kosher|halal|brc|ifs)$/.test(h)) {
    return "certifications";
  }
  if (/^(city|town|municipality)$/.test(h)) {
    return "city";
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "analyze";
    const target = (formData.get("target") as string) || "suppliers";
    const duplicateStrategy = (formData.get("duplicateStrategy") as string) || "skip";
    const autoQueueScrape = formData.get("autoQueueScrape") === "true";
    const columnMapRaw = formData.get("columnMap") as string | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ ok: false, error: "Workbook is empty" }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json({ ok: false, error: "No data found in sheet" }, { status: 400 });
    }

    const headers = Object.keys(rawRows[0] || {});

    // ── MODE: ANALYZE / PREVIEW ──────────────────────────────────────────────────
    if (mode === "analyze") {
      const suggestedMapping: Record<string, string> = {};
      headers.forEach((h) => {
        const field = suggestFieldMapping(h);
        if (field) suggestedMapping[h] = field;
      });

      const previewRows = rawRows.slice(0, 5).map((row, idx) => {
        const preview: Record<string, unknown> = { _rowIndex: idx + 1 };
        headers.forEach((h) => {
          preview[h] = row[h];
        });
        return preview;
      });

      return NextResponse.json({
        ok: true,
        sheetName,
        totalRows: rawRows.length,
        headers,
        suggestedMapping,
        previewRows,
      });
    }

    // ── MODE: COMMIT ─────────────────────────────────────────────────────────────
    if (mode === "commit") {
      let columnMap: Record<string, string> = {};
      try {
        if (columnMapRaw) columnMap = JSON.parse(columnMapRaw);
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid columnMap JSON" }, { status: 400 });
      }

      // Check existing database records for deduplication
      let existingNames = new Set<string>();
      let existingDomains = new Set<string>();

      if (target === "suppliers" || target === "ecosystem") {
        const { data: existing } = await supabaseAdmin
          .from("supplier_offerings")
          .select("company_name, website");
        (existing ?? []).forEach((r) => {
          if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
          const dom = normalizeDomain(r.website);
          if (dom) existingDomains.add(dom);
        });
      } else if (target === "buyers") {
        const { data: existing } = await supabaseAdmin
          .from("buyers")
          .select("company_name, website");
        (existing ?? []).forEach((r) => {
          if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
          const dom = normalizeDomain(r.website);
          if (dom) existingDomains.add(dom);
        });
      }

      const rowsToInsert: Record<string, unknown>[] = [];
      const rowsToUpdate: { matchField: string; matchValue: string; payload: Record<string, unknown> }[] = [];
      let skippedCount = 0;

      for (const raw of rawRows) {
        const mapped: Record<string, unknown> = {};
        for (const [header, field] of Object.entries(columnMap)) {
          if (field && raw[header] !== undefined) {
            mapped[field] = raw[header];
          }
        }

        const companyName = String(mapped.company_name || "").trim();
        if (!companyName) {
          skippedCount++;
          continue;
        }

        const rawUrl = mapped.website ? String(mapped.website) : null;
        const validUrl = cleanUrl(rawUrl);
        const domain = normalizeDomain(validUrl);

        const nameLower = companyName.toLowerCase();
        const isDuplicate = existingNames.has(nameLower) || (domain && existingDomains.has(domain));

        if (isDuplicate) {
          if (duplicateStrategy === "skip") {
            skippedCount++;
            continue;
          } else if (duplicateStrategy === "merge") {
            const updatePayload: Record<string, unknown> = {
              updated_at: new Date().toISOString(),
            };
            if (validUrl) updatePayload.website = validUrl;
            if (mapped.contact_email) updatePayload.contact_email = String(mapped.contact_email).trim();
            if (mapped.contact_phone) updatePayload.contact_phone = String(mapped.contact_phone).trim();
            if (mapped.contact_name) updatePayload.contact_name = String(mapped.contact_name).trim();

            rowsToUpdate.push({
              matchField: domain ? "website" : "company_name",
              matchValue: domain ? validUrl! : companyName,
              payload: updatePayload,
            });
            continue;
          }
        }

        // New record assembly
        existingNames.add(nameLower);
        if (domain) existingDomains.add(domain);

        const now = new Date().toISOString();
        const batchTag = `import_${now.slice(0, 10)}_${file.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`;

        if (target === "suppliers") {
          rowsToInsert.push({
            company_name: companyName,
            website: validUrl,
            country_of_origin: mapped.country ? String(mapped.country).trim() : null,
            categories: parseArray(mapped.categories),
            certifications: parseArray(mapped.certifications),
            contact_email: mapped.contact_email ? String(mapped.contact_email).trim() : null,
            contact_phone: mapped.contact_phone ? String(mapped.contact_phone).trim() : null,
            contact_name: mapped.contact_name ? String(mapped.contact_name).trim() : null,
            product_description: mapped.notes ? String(mapped.notes).trim() : null,
            sector: "food_beverage",
            scrape_status: validUrl && autoQueueScrape ? "pending" : "not_queued",
            status: "approved",
            csv_import_batch: batchTag,
            created_at: now,
          });
        } else if (target === "ecosystem") {
          rowsToInsert.push({
            company_name: companyName,
            website: validUrl,
            country_of_origin: mapped.country ? String(mapped.country).trim() : null,
            categories: parseArray(mapped.categories),
            contact_email: mapped.contact_email ? String(mapped.contact_email).trim() : null,
            contact_phone: mapped.contact_phone ? String(mapped.contact_phone).trim() : null,
            contact_name: mapped.contact_name ? String(mapped.contact_name).trim() : null,
            product_description: mapped.notes ? String(mapped.notes).trim() : null,
            sector: (mapped.sector as string) || "other",
            scrape_status: validUrl && autoQueueScrape ? "pending" : "not_queued",
            status: "approved",
            csv_import_batch: batchTag,
            created_at: now,
          });
        } else if (target === "buyers") {
          rowsToInsert.push({
            company_name: companyName,
            website: validUrl,
            country: mapped.country ? String(mapped.country).trim() : null,
            contact_email: mapped.contact_email ? String(mapped.contact_email).trim() : null,
            contact_whatsapp: mapped.contact_phone ? String(mapped.contact_phone).trim() : null,
            contact_name: mapped.contact_name ? String(mapped.contact_name).trim() : null,
            notes: mapped.notes ? String(mapped.notes).trim() : null,
            buyer_type: "wholesale_importer",
            active: true,
            created_at: now,
          });
        }
      }

      // Execute insertions in chunks of 200
      let insertedCount = 0;
      const CHUNK = 200;
      for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
        const chunk = rowsToInsert.slice(i, i + CHUNK);
        const tableName = target === "buyers" ? "buyers" : "supplier_offerings";
        const { error: insErr } = await supabaseAdmin.from(tableName).insert(chunk);
        if (insErr) {
          console.error("Bulk commit insert error:", insErr.message);
        } else {
          insertedCount += chunk.length;
        }
      }

      // Execute merge updates
      let mergedCount = 0;
      for (const upd of rowsToUpdate) {
        const tableName = target === "buyers" ? "buyers" : "supplier_offerings";
        const { error: upErr } = await supabaseAdmin
          .from(tableName)
          .update(upd.payload)
          .eq(upd.matchField, upd.matchValue);
        if (!upErr) mergedCount++;
      }

      return NextResponse.json({
        ok: true,
        totalRows: rawRows.length,
        inserted: insertedCount,
        merged: mergedCount,
        skipped: skippedCount,
        target,
        autoQueueScrape,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("Import file error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to process file" },
      { status: 500 }
    );
  }
}

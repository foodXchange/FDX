import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScraperTableClient, { classifyRowFailure } from "@/components/admin/ScraperTableClient";
import { ProviderHealthBar } from "@/components/admin/scraper/ProviderHealthBar";
import { ScraperWorkspaceClient } from "@/components/admin/scraper/ScraperWorkspaceClient";
import {
  FailedDiagnosticsPanel,
  type FailureBreakdownStats,
} from "@/components/admin/scraper/FailedDiagnosticsPanel";

export const dynamic = "force-dynamic";

type FactoryRow = {
  supplier_id: string;
  is_primary: boolean;
  kosher_types: string[];
};

type FullSupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  scrape_status: string | null;
  last_scraped_at: string | null;
  products_found: number | null;
  product_count: number | null;
  status: string | null;
  source: string | null;
  categories: string[] | null;
  csv_import_batch: string | null;
  created_at: string | null;
  product_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  certifications: string[] | null;
  kosher_types: string[] | null;
  internal_notes: string | null;
  website_domain: string | null;
};

type ScrapeBatchRow = {
  batch_key: string;
  original_filename: string | null;
  created_at: string | null;
  total_rows: number | null;
};

type UploadHistoryRow = {
  id: string;
  batch_id: string | null;
  filename: string;
  rows_total: number;
  rows_pending: number;
  uploaded_at: string | null;
};

type ParamStats = {
  websitePct: number;
  countryPct: number;
  categoriesPct: number;
  productsPct: number;
  profilePct: number;
  contactPct: number;
  certsPct: number;
};

type BatchSummary = {
  batchId: string;
  filename: string;
  batchNumber?: string;
  firstSeen: string | null;
  total: number;
  done: number;
  donePct: number;
  scraped: number;
  pending: number;
  failed: number;
  skipped: number;
  productsCount: number;
  directCrawlCount: number;
  searchAiCount: number;
  params: ParamStats;
};

function extractBatchNumber(filename?: string): string | undefined {
  if (!filename) return undefined;
  const match = filename.match(/_(\d+)(?:\.\w+)?$/);
  if (match && match[1]) {
    return `Split ${match[1]}`;
  }
  return undefined;
}

async function fetchAllSuppliers(): Promise<FullSupplierRow[]> {
  const { count } = await supabaseAdmin
    .from("supplier_offerings")
    .select("*", { count: "exact", head: true });

  const total = count ?? 0;
  const pageSize = 1000;
  const pages = Math.ceil(total / pageSize);
  const ranges = Array.from({ length: Math.max(pages, 1) }, (_, i) => [
    i * pageSize,
    (i + 1) * pageSize - 1,
  ]);

  const results = await Promise.all(
    ranges.map(([from, to]) =>
      supabaseAdmin
        .from("supplier_offerings")
        .select(
          "id, company_name, website, website_domain, country_of_origin, scrape_status, last_scraped_at, products_found, product_count, status, source, categories, csv_import_batch, created_at, product_description, contact_email, contact_phone, certifications, kosher_types, internal_notes"
        )
        .order("id", { ascending: true })
        .range(from, to)
    )
  );

  const all: FullSupplierRow[] = [];
  for (const r of results) {
    if (r.data) all.push(...(r.data as FullSupplierRow[]));
  }
  return all;
}

async function fetchAllFactories(): Promise<FactoryRow[]> {
  const { count } = await supabaseAdmin
    .from("supplier_factories")
    .select("*", { count: "exact", head: true });

  const total = count ?? 0;
  const pageSize = 1000;
  const pages = Math.ceil(total / pageSize);
  const ranges = Array.from({ length: Math.max(pages, 1) }, (_, i) => [
    i * pageSize,
    (i + 1) * pageSize - 1,
  ]);

  const results = await Promise.all(
    ranges.map(([from, to]) =>
      supabaseAdmin
        .from("supplier_factories")
        .select("supplier_id, is_primary, kosher_types")
        .range(from, to)
    )
  );

  const all: FactoryRow[] = [];
  for (const r of results) {
    if (r.data) all.push(...(r.data as FactoryRow[]));
  }
  return all;
}

function computeParamStats(
  rows: FullSupplierRow[],
  factoryCountMap: Record<string, number>
): ParamStats {
  const n = Math.max(rows.length, 1);
  let web = 0;
  let country = 0;
  let cat = 0;
  let prod = 0;
  let profile = 0;
  let contact = 0;
  let certs = 0;

  for (const r of rows) {
    if (r.website && r.website.trim()) web++;
    if (r.country_of_origin && r.country_of_origin.trim()) country++;
    if (r.categories && r.categories.length > 0) cat++;
    if ((r.products_found ?? r.product_count ?? 0) > 0) prod++;
    if (r.product_description && r.product_description.trim()) profile++;
    if (
      (r.contact_email && r.contact_email.trim()) ||
      (r.contact_phone && r.contact_phone.trim())
    ) {
      contact++;
    }
    if (
      (r.certifications && r.certifications.length > 0) ||
      (r.kosher_types && r.kosher_types.length > 0) ||
      (factoryCountMap[r.id] ?? 0) > 0
    ) {
      certs++;
    }
  }

  return {
    websitePct: Math.round((web / n) * 100),
    countryPct: Math.round((country / n) * 100),
    categoriesPct: Math.round((cat / n) * 100),
    productsPct: Math.round((prod / n) * 100),
    profilePct: Math.round((profile / n) * 100),
    contactPct: Math.round((contact / n) * 100),
    certsPct: Math.round((certs / n) * 100),
  };
}

export default async function ScraperPage() {
  const [
    allSuppliers,
    productsCountResult,
    factories,
    uploadHistoryResult,
    scrapeBatchFilenamesResult,
  ] = await Promise.all([
    fetchAllSuppliers(),
    supabaseAdmin
      .from("supplier_products")
      .select("*", { count: "exact", head: true }),
    fetchAllFactories(),
    supabaseAdmin
      .from("scraper_csv_uploads")
      .select("id, batch_id, filename, rows_total, rows_pending, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("scrape_batches")
      .select("batch_key, original_filename, created_at, total_rows")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const totalProducts = productsCountResult.count ?? 0;
  const uploadHistory = (uploadHistoryResult.data ?? []) as UploadHistoryRow[];
  const scrapeBatchRows = (scrapeBatchFilenamesResult.data ?? []) as ScrapeBatchRow[];

  const factoryCountMap: Record<string, number> = {};
  const primaryKosherMap: Record<string, string[]> = {};
  for (const f of factories) {
    factoryCountMap[f.supplier_id] = (factoryCountMap[f.supplier_id] ?? 0) + 1;
    if (f.is_primary && f.kosher_types && f.kosher_types.length > 0) {
      primaryKosherMap[f.supplier_id] = f.kosher_types;
    }
  }

  // Global status counts across ALL suppliers
  const globalCounts = {
    total: allSuppliers.length,
    scraped: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
  };
  for (const s of allSuppliers) {
    const st = s.scrape_status ?? "pending";
    if (st === "scraped") globalCounts.scraped++;
    else if (st === "failed") globalCounts.failed++;
    else if (st === "skipped") globalCounts.skipped++;
    else globalCounts.pending++;
  }

  const globalParams = computeParamStats(allSuppliers, factoryCountMap);

  // Filename lookup map from both scrape_batches and scraper_csv_uploads
  const origFilenameMap: Record<string, string> = {};
  const batchMetaMap: Record<
    string,
    { filename: string; createdAt: string | null; totalRows: number }
  > = {};

  for (const u of uploadHistory) {
    if (u.batch_id && u.filename) {
      origFilenameMap[u.batch_id] = u.filename;
      batchMetaMap[u.batch_id] = {
        filename: u.filename,
        createdAt: u.uploaded_at,
        totalRows: u.rows_total ?? 0,
      };
    }
  }
  for (const b of scrapeBatchRows) {
    if (b.original_filename) {
      origFilenameMap[b.batch_key] = b.original_filename;
    }
    batchMetaMap[b.batch_key] = {
      filename: b.original_filename ?? origFilenameMap[b.batch_key] ?? b.batch_key,
      createdAt: b.created_at,
      totalRows: b.total_rows ?? 0,
    };
  }

  // Group suppliers by csv_import_batch
  const rowsByBatch: Record<string, FullSupplierRow[]> = {};
  for (const s of allSuppliers) {
    const batchId = s.csv_import_batch?.trim();
    if (!batchId) continue;
    if (!rowsByBatch[batchId]) rowsByBatch[batchId] = [];
    rowsByBatch[batchId].push(s);
  }

  // Ensure any batch recorded in scrape_batches or scraper_csv_uploads is also included
  const allBatchIds = new Set<string>([
    ...Object.keys(rowsByBatch),
    ...Object.keys(batchMetaMap),
  ]);

  const batchSummaries: BatchSummary[] = Array.from(allBatchIds)
    .map((batchId) => {
      const rows = rowsByBatch[batchId] ?? [];
      const meta = batchMetaMap[batchId];
      let scraped = 0;
      let pending = 0;
      let failed = 0;
      let skipped = 0;
      let productsCount = 0;
      let directCrawlCount = 0;
      let searchAiCount = 0;
      let firstSeen: string | null = meta?.createdAt ?? null;

      for (const r of rows) {
        const st = r.scrape_status ?? "pending";
        if (st === "scraped") scraped++;
        else if (st === "failed") failed++;
        else if (st === "skipped") skipped++;
        else pending++;

        productsCount += r.products_found ?? r.product_count ?? 0;

        const src = (r.source ?? "").toLowerCase();
        if (src.includes("perplexity") || src.includes("search_grounding")) {
          searchAiCount++;
        } else if (src) {
          directCrawlCount++;
        }

        if (r.created_at) {
          if (
            !firstSeen ||
            new Date(r.created_at).getTime() < new Date(firstSeen).getTime()
          ) {
            firstSeen = r.created_at;
          }
        }
      }

      const total = rows.length > 0 ? rows.length : meta?.totalRows ?? 0;
      const done = scraped + skipped;
      const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
      const filename = origFilenameMap[batchId] ?? meta?.filename ?? batchId;

      return {
        batchId,
        filename,
        batchNumber: extractBatchNumber(filename),
        firstSeen,
        total,
        done,
        donePct,
        scraped,
        pending,
        failed,
        skipped,
        productsCount,
        directCrawlCount,
        searchAiCount,
        params: computeParamStats(rows, factoryCountMap),
      };
    })
    .filter((b) => b.total > 0)
    .sort((a, b) => {
      const aTime = a.firstSeen ? new Date(a.firstSeen).getTime() : 0;
      const bTime = b.firstSeen ? new Date(b.firstSeen).getTime() : 0;
      return bTime - aTime;
    });

  const effectiveBatchOptions = batchSummaries.map((b) => ({
    batchId: b.batchId,
    filename: b.filename,
    rowsTotal: b.total,
    pendingCount: b.pending,
    failedCount: b.failed,
    uploadedAt: b.firstSeen,
  }));

  // Sort table suppliers: pending/failed first so unscraped records are right at the top
  const tableSuppliers = allSuppliers
    .filter((s) => s.website && s.website.trim() !== "")
    .map((s) => ({
      id: s.id,
      company_name: s.company_name,
      website: s.website,
      country_of_origin: s.country_of_origin,
      scrape_status: s.scrape_status,
      last_scraped_at: s.last_scraped_at,
      products_found: s.products_found ?? s.product_count,
      status: s.status,
      scrape_source: s.source,
      categories: s.categories,
      csv_import_batch: s.csv_import_batch,
      internal_notes: s.internal_notes,
    }));

  // Compute root-cause breakdown for all failed records
  const scrapedDomainsSet = new Set<string>();
  for (const s of allSuppliers) {
    if (s.scrape_status === "scraped" && s.website_domain) {
      scrapedDomainsSet.add(s.website_domain);
    }
  }

  const failureStats: FailureBreakdownStats = {
    totalFailed: globalCounts.failed,
    noProductsCount: 0,
    emptyOrBlockedCount: 0,
    timeoutCount: 0,
    aiBillingCount: 0,
    otherCount: 0,
    duplicateOfScrapedCount: 0,
  };

  for (const s of allSuppliers) {
    if (s.scrape_status === "failed") {
      const cat = classifyRowFailure(s.internal_notes).cat;
      if (cat === "no_products") failureStats.noProductsCount++;
      else if (cat === "empty_or_blocked") failureStats.emptyOrBlockedCount++;
      else if (cat === "timeout") failureStats.timeoutCount++;
      else if (cat === "ai_billing") failureStats.aiBillingCount++;
      else failureStats.otherCount++;

      if (s.website_domain && scrapedDomainsSet.has(s.website_domain)) {
        failureStats.duplicateOfScrapedCount++;
      }
    }
  }

  const doneGlobal = globalCounts.scraped + globalCounts.skipped;
  const doneGlobalPct =
    globalCounts.total > 0
      ? Math.round((doneGlobal / globalCounts.total) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sticky Global KPI & Parameter Completeness Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wider mr-1">
              Supplier Scraper
            </h1>

            <KpiPill
              color="slate"
              label="Total"
              count={globalCounts.total}
              tooltip="Total unique supplier records in database"
            />
            <KpiPill
              color="emerald"
              label="Done"
              count={doneGlobal}
              pct={doneGlobalPct}
              tooltip={`Processed records: ${globalCounts.scraped.toLocaleString()} Scraped + ${globalCounts.skipped.toLocaleString()} Skipped`}
            />
            <KpiPill
              color="green"
              label="Scraped"
              count={globalCounts.scraped}
              pct={Math.round(
                (globalCounts.scraped / Math.max(globalCounts.total, 1)) * 100
              )}
              tooltip="Confirmed manufacturers with extracted products & profile (Click to filter table)"
              href="#status=scraped"
            />
            <KpiPill
              color="orange"
              label="Pending"
              count={globalCounts.pending}
              pct={Math.round(
                (globalCounts.pending / Math.max(globalCounts.total, 1)) * 100
              )}
              tooltip="Waiting to be scraped (Click to filter table)"
              href="#status=pending"
            />
            <KpiPill
              color="red"
              label="Failed"
              count={globalCounts.failed}
              pct={Math.round(
                (globalCounts.failed / Math.max(globalCounts.total, 1)) * 100
              )}
              tooltip="Website blocked or unreachable — eligible for retry (Click to filter table)"
              href="#status=failed"
            />
            <KpiPill
              color="gray"
              label="Skipped"
              count={globalCounts.skipped}
              tooltip="Non-manufacturers (distributors, retailers, packaging) automatically filtered out (Click to filter table)"
              href="#status=skipped"
            />
            <KpiPill
              color="blue"
              label="Products"
              count={totalProducts}
              tooltip={`Total extracted products in supplier_products (${factories.length.toLocaleString()} factories mapped) — Click to open Catalog`}
              href="/admin/products"
            />
          </div>

          {/* Global Parameter Existence % */}
          <div
            className="flex items-center gap-1.5 flex-wrap"
            title="Percentage of all database suppliers that have each parameter populated"
          >
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              DB Params:
            </span>
            <ParamChip
              label="Web"
              pct={globalParams.websitePct}
              tooltip="Has valid website URL"
            />
            <ParamChip
              label="Country"
              pct={globalParams.countryPct}
              tooltip="Has country_of_origin"
            />
            <ParamChip
              label="Cat"
              pct={globalParams.categoriesPct}
              tooltip="Has food categories array"
            />
            <ParamChip
              label="Products"
              pct={globalParams.productsPct}
              tooltip="Has extracted products (>0)"
            />
            <ParamChip
              label="Profile"
              pct={globalParams.profilePct}
              tooltip="Has extracted product/company description"
            />
            <ParamChip
              label="Contact"
              pct={globalParams.contactPct}
              tooltip="Has contact_email or contact_phone"
            />
            <ParamChip
              label="Certs/Fac"
              pct={globalParams.certsPct}
              tooltip="Has certifications, kosher types, or factories"
            />
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Provider Health & Circuit Breaker Status Bar */}
        <ProviderHealthBar />

        {/* Interactive Failed Records Root-Cause Inspector & 1-Click Recovery */}
        {globalCounts.failed > 0 && (
          <FailedDiagnosticsPanel stats={failureStats} />
        )}

        {/* Unified Ingestion & Scraper Workspace */}
        <ScraperWorkspaceClient
          totalPending={globalCounts.pending}
          totalFailed={globalCounts.failed}
          totalAll={globalCounts.total}
          batchOptions={effectiveBatchOptions}
        />

        {/* Batch Status Cards (Quick-Launch Grid for Uploaded CSV Files) */}
        {batchSummaries.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  CSV Batch Status Cards ({batchSummaries.length} Uploaded Files)
                </h2>
                <p className="text-xs text-slate-500">
                  Click <strong className="text-orange-600">Scrape pending →</strong> or{" "}
                  <strong className="text-red-600">Retry failed</strong> on any uploaded CSV file to immediately load it into the scraper console above.
                </p>
              </div>
              <span className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                {globalCounts.pending.toLocaleString()} total pending · {globalCounts.failed.toLocaleString()} failed
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 max-h-136 overflow-y-auto pr-1">
              {batchSummaries.map((batch) => (
                <div
                  key={batch.batchId}
                  className={`rounded-2xl border p-4 shadow-2xs transition ${
                    batch.pending > 0
                      ? "border-orange-200 bg-orange-50/20"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p
                        className="text-sm font-bold text-slate-900 truncate"
                        title={batch.filename}
                      >
                        {batch.filename}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {batch.batchId}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Uploaded {getRelativeTime(batch.firstSeen)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {batch.pending > 0 && (
                          <a
                            href={`#batchId=${encodeURIComponent(batch.batchId)}&status=pending`}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition"
                          >
                            ▶ Scrape pending ({batch.pending}) →
                          </a>
                        )}
                        {batch.failed > 0 && (
                          <a
                            href={`#batchId=${encodeURIComponent(batch.batchId)}&status=failed`}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                          >
                            ↻ Retry failed ({batch.failed})
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {batch.total} rows
                    </span>
                  </div>

                  {/* Products & source stats */}
                  {(batch.productsCount > 0 ||
                    batch.directCrawlCount > 0 ||
                    batch.searchAiCount > 0 ||
                    batch.batchNumber) && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {batch.batchNumber && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800 uppercase">
                          {batch.batchNumber}
                        </span>
                      )}
                      {batch.productsCount > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {batch.productsCount} products
                        </span>
                      )}
                      {batch.directCrawlCount > 0 && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          Direct: {batch.directCrawlCount}
                        </span>
                      )}
                      {batch.searchAiCount > 0 && (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                          Search AI: {batch.searchAiCount}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Pending</span>
                      <span className="font-bold text-orange-600">{batch.pending}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Scraped</span>
                      <span className="font-bold text-green-700">{batch.scraped}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Failed</span>
                      <span className="font-bold text-red-600">{batch.failed}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 border border-slate-200">
                      <span className="text-slate-500">Skipped</span>
                      <span className="font-bold text-slate-600">{batch.skipped}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Done ({batch.done}/{batch.total})</span>
                      <span className="font-semibold">{batch.donePct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${batch.donePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unified Uploaded Documents & Batches Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Uploaded CSV Documents & Parameter Coverage Table ({batchSummaries.length})
              </h2>
              <span
                className="text-xs text-slate-400 cursor-help border border-slate-200 rounded-full w-4 h-4 inline-flex items-center justify-center"
                title="Shows every uploaded CSV batch, unique records imported, scraping completion %, status breakdown, extracted products, and parameter completeness % per batch. Hover any badge for details."
              >
                ?
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Click <strong className="text-slate-600">▶ Pending</strong> or{" "}
              <strong className="text-slate-600">↻ Failed</strong> to load a batch into the console
            </span>
          </div>

          {batchSummaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
              No CSV batches uploaded yet
            </div>
          ) : (
            <div className="overflow-x-auto max-h-112 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5">Document / Batch</th>
                    <th
                      className="px-3 py-2.5 text-right"
                      title="Unique non-duplicate records uploaded in this CSV"
                    >
                      Unique
                    </th>
                    <th
                      className="px-3 py-2.5 w-32"
                      title="Done = (Scraped + Skipped) / Unique"
                    >
                      Done %
                    </th>
                    <th className="px-3 py-2.5 text-right">Scraped</th>
                    <th className="px-3 py-2.5 text-right">Pending</th>
                    <th className="px-3 py-2.5 text-right">Failed</th>
                    <th className="px-3 py-2.5 text-right">Skipped</th>
                    <th
                      className="px-3 py-2.5 text-right"
                      title="Total products extracted for suppliers in this batch"
                    >
                      Products
                    </th>
                    <th
                      className="px-3 py-2.5"
                      title="Percentage of records in this batch that have each parameter populated"
                    >
                      Parameter Coverage %
                    </th>
                    <th className="px-3 py-2.5 text-right">Run Only</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchSummaries.map((b) => {
                    const p = b.params;
                    const paramTooltip = [
                      `Website: ${p.websitePct}%`,
                      `Country: ${p.countryPct}%`,
                      `Categories: ${p.categoriesPct}%`,
                      `With Products: ${p.productsPct}%`,
                      `Company Profile: ${p.profilePct}%`,
                      `Contact (Email/Phone): ${p.contactPct}%`,
                      `Certs / Factories: ${p.certsPct}%`,
                      `Sources: ${b.directCrawlCount} Direct Crawl · ${b.searchAiCount} Search AI`,
                    ].join(" | ");

                    return (
                      <tr
                        key={b.batchId}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Document / Batch */}
                        <td className="px-3 py-2.5 max-w-52">
                          <div
                            className="font-semibold text-slate-800 truncate"
                            title={`${b.filename} (${b.batchId})`}
                          >
                            {b.filename}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>{getRelativeTime(b.firstSeen)}</span>
                            <span className="font-mono text-[10px] text-slate-300 truncate max-w-28">
                              {b.batchId}
                            </span>
                          </div>
                        </td>

                        {/* Unique uploaded */}
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                          {b.total.toLocaleString()}
                        </td>

                        {/* Done % progress */}
                        <td
                          className="px-3 py-2.5"
                          title={`${b.done} of ${b.total} processed (${b.scraped} scraped + ${b.skipped} skipped)`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                            <span>{b.donePct}%</span>
                            <span className="text-[10px] text-slate-400">
                              {b.done}/{b.total}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${b.donePct}%` }}
                            />
                          </div>
                        </td>

                        {/* Scraped */}
                        <td className="px-3 py-2.5 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                            {b.scraped}
                          </span>
                        </td>

                        {/* Pending */}
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              b.pending > 0
                                ? "bg-orange-50 text-orange-700"
                                : "text-slate-300"
                            }`}
                          >
                            {b.pending}
                          </span>
                        </td>

                        {/* Failed */}
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              b.failed > 0
                                ? "bg-red-50 text-red-700"
                                : "text-slate-300"
                            }`}
                          >
                            {b.failed}
                          </span>
                        </td>

                        {/* Skipped */}
                        <td className="px-3 py-2.5 text-right text-slate-500 font-medium">
                          {b.skipped > 0 ? b.skipped : "—"}
                        </td>

                        {/* Products */}
                        <td className="px-3 py-2.5 text-right">
                          {b.productsCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              {b.productsCount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Parameter Coverage % */}
                        <td className="px-3 py-2.5" title={paramTooltip}>
                          <div className="flex flex-wrap gap-1 cursor-help">
                            <MiniParam label="Web" pct={p.websitePct} />
                            <MiniParam label="Ctry" pct={p.countryPct} />
                            <MiniParam label="Cat" pct={p.categoriesPct} />
                            <MiniParam label="Prod" pct={p.productsPct} />
                            <MiniParam label="Prof" pct={p.profilePct} />
                            <MiniParam label="Cont" pct={p.contactPct} />
                            <MiniParam label="Cert" pct={p.certsPct} />
                          </div>
                        </td>

                        {/* Run Actions (Pending Only / Failed Only) */}
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {b.pending > 0 && (
                              <a
                                href={`#batchId=${encodeURIComponent(
                                  b.batchId
                                )}&status=pending`}
                                title={`Load ${b.pending} pending suppliers from this batch into console`}
                                className="px-2.5 py-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold transition whitespace-nowrap"
                              >
                                ▶ Pending ({b.pending})
                              </a>
                            )}
                            {b.failed > 0 && (
                              <a
                                href={`#batchId=${encodeURIComponent(
                                  b.batchId
                                )}&status=failed`}
                                title={`Retry ${b.failed} failed suppliers from this batch in console`}
                                className="px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition whitespace-nowrap"
                              >
                                ↻ Failed ({b.failed})
                              </a>
                            )}
                            {b.pending === 0 && b.failed === 0 && (
                              <span className="text-[11px] text-emerald-600 font-semibold">
                                ✓ Complete
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Suppliers Table */}
        <div>
          <ScraperTableClient
            suppliers={tableSuppliers}
            factoryCountMap={factoryCountMap}
            primaryKosherMap={primaryKosherMap}
          />
        </div>
      </div>
    </main>
  );
}

function getRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function KpiPill({
  color,
  label,
  count,
  pct,
  tooltip,
  href,
}: {
  color: "slate" | "emerald" | "green" | "orange" | "red" | "gray" | "blue";
  label: string;
  count: number;
  pct?: number;
  tooltip: string;
  href?: string;
}) {
  const styles = {
    slate: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    orange: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    gray: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
    blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  };

  const pillContent = (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
        href ? "cursor-pointer hover:shadow-xs active:scale-95" : "cursor-help"
      } ${styles[color]}`}
    >
      <span>{count.toLocaleString()}</span>
      <span className="font-medium opacity-85">{label}</span>
      {pct !== undefined && (
        <span className="text-[10px] opacity-70">({pct}%)</span>
      )}
    </span>
  );

  if (href) {
    return <a href={href}>{pillContent}</a>;
  }
  return pillContent;
}

function ParamChip({
  label,
  pct,
  tooltip,
}: {
  label: string;
  pct: number;
  tooltip: string;
}) {
  const tone =
    pct >= 75
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : pct >= 35
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      title={`${tooltip}: ${pct}%`}
      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-help ${tone}`}
    >
      {label} {pct}%
    </span>
  );
}

function MiniParam({ label, pct }: { label: string; pct: number }) {
  const tone =
    pct >= 75
      ? "bg-emerald-50 text-emerald-700"
      : pct >= 30
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-500";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tone}`}>
      {label}:{pct}%
    </span>
  );
}

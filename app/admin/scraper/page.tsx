import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScraperTableClient from "@/components/admin/ScraperTableClient";
import { CsvUploader } from "@/components/admin/CsvUploader";
import { ScraperConsole } from "@/components/admin/ScraperConsole";

export const dynamic = "force-dynamic";

type FactoryRow = {
  supplier_id: string;
  is_primary: boolean;
  kosher_types: string[];
};

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  scrape_status: string | null;
  last_scraped_at: string | null;
  products_found: number | null;
  status: string | null;
  scrape_source: string | null;
  categories: string[] | null;
};

type BatchRow = {
  id: string;
  csv_import_batch: string | null;
  scrape_status: string | null;
  created_at: string | null;
};

type BatchSourceRow = {
  id: string;
  csv_import_batch: string | null;
  scrape_source: string | null;
};

type ScrapeBatchFilenameRow = {
  batch_key: string;
  original_filename: string | null;
};

type BatchSummary = {
  batchId: string;
  pending: number;
  failed: number;
  skipped: number;
  scraped: number;
  total: number;
  firstSeen: string | null;
  filename?: string;
  batchNumber?: string;
  productsCount?: number;
  firecrawlCount?: number;
  perplexityCount?: number;
};

type BatchSummaryInternal = BatchSummary;

type UploadHistoryRow = {
  id: string;
  batch_id: string | null;
  filename: string;
  rows_total: number;
  rows_pending: number;
  uploaded_at: string | null;
};

function extractBatchNumber(filename?: string): string | undefined {
  if (!filename) return undefined;
  const match = filename.match(/_(\d+)(?:\.\w+)?$/);
  if (match && match[1]) {
    return `Split ${match[1]}`;
  }
  return undefined;
}

export default async function ScraperPage() {
  const [
    suppliersResult,
    productsCountResult,
    factoriesResult,
    batchStatsResult,
    uploadHistoryResult,
    batchSourceResult,
    scrapeBatchFilenamesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("supplier_offerings")
      .select(
        "id, company_name, website, country_of_origin, scrape_status, last_scraped_at, products_found, status, scrape_source, categories"
      )
      .not("website", "is", null)
      .neq("website", "")
      .order("scrape_status", { ascending: true })
      .order("company_name", { ascending: true }),
    supabaseAdmin
      .from("supplier_products")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("supplier_factories")
      .select("supplier_id, is_primary, kosher_types"),
    supabaseAdmin
      .from("supplier_offerings")
      .select("id, csv_import_batch, scrape_status, created_at")
      .not("csv_import_batch", "is", null)
      .neq("csv_import_batch", ""),
    supabaseAdmin
      .from("scraper_csv_uploads")
      .select("id, batch_id, filename, rows_total, rows_pending, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("supplier_offerings")
      .select("id, csv_import_batch, scrape_source")
      .not("csv_import_batch", "is", null)
      .neq("csv_import_batch", ""),
    supabaseAdmin
      .from("scrape_batches")
      .select("batch_key, original_filename")
      .not("original_filename", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const suppliers = (suppliersResult.data ?? []) as SupplierRow[];
  const totalProducts = productsCountResult.count ?? 0;
  const uploadHistory = (uploadHistoryResult.data ?? []) as UploadHistoryRow[];
  const batchSourceRows = (batchSourceResult.data ?? []) as BatchSourceRow[];

  // Map batch_key → original_filename for display in batch cards and upload history
  const origFilenameMap: Record<string, string> = {};
  for (const b of (scrapeBatchFilenamesResult.data ?? []) as ScrapeBatchFilenameRow[]) {
    if (b.original_filename) origFilenameMap[b.batch_key] = b.original_filename;
  }

  const factories = (factoriesResult.data ?? []) as FactoryRow[];
  const factoryCountMap: Record<string, number> = {};
  const primaryKosherMap: Record<string, string[]> = {};

  for (const f of factories) {
    factoryCountMap[f.supplier_id] = (factoryCountMap[f.supplier_id] ?? 0) + 1;
    if (f.is_primary && f.kosher_types.length > 0) {
      primaryKosherMap[f.supplier_id] = f.kosher_types;
    }
  }

  // Keep counts from website-filtered suppliers for ScraperConsole (pending count)
  const counts = suppliers.reduce(
    (acc, s) => {
      const st = s.scrape_status ?? "pending";
      if (st in acc) acc[st as keyof typeof acc]++;
      return acc;
    },
    { pending: 0, scraped: 0, failed: 0, skipped: 0 }
  );

  const batchRows = (batchStatsResult.data ?? []) as BatchRow[];
  const batchMapInternal: Record<string, BatchSummaryInternal> = {};

  for (const row of batchRows) {
    const batchId = row.csv_import_batch?.trim();
    if (!batchId) continue;

    if (!batchMapInternal[batchId]) {
      batchMapInternal[batchId] = {
        batchId,
        pending: 0,
        failed: 0,
        skipped: 0,
        scraped: 0,
        total: 0,
        firstSeen: row.created_at,
      };
    }

    const summary = batchMapInternal[batchId];

    summary.total += 1;
    if (row.scrape_status === "failed") {
      summary.failed += 1;
    } else if (row.scrape_status === "skipped") {
      summary.skipped += 1;
    } else if (row.scrape_status === "scraped") {
      summary.scraped += 1;
    } else {
      summary.pending += 1;
    }

    if (row.created_at) {
      const current = new Date(summary.firstSeen ?? row.created_at).getTime();
      const candidate = new Date(row.created_at).getTime();
      if (candidate < current || !summary.firstSeen) {
        summary.firstSeen = row.created_at;
      }
    }
  }

  const batchMap: Record<string, BatchSummary> = batchMapInternal;

  // Top stats bar: sum across all batches (same source as batch cards)
  const batchCounts = Object.values(batchMap).reduce(
    (acc, b) => {
      acc.pending += b.pending;
      acc.scraped += b.scraped;
      acc.failed += b.failed;
      acc.skipped += b.skipped;
      return acc;
    },
    { pending: 0, scraped: 0, failed: 0, skipped: 0 }
  );

  // Build source stats per batch from batchSourceRows
  const batchSupplierMap: Record<string, string[]> = {};
  const batchFirecrawlCount: Record<string, number> = {};
  const batchPerplexityCount: Record<string, number> = {};

  for (const row of batchSourceRows) {
    const batchId = row.csv_import_batch?.trim();
    if (!batchId) continue;
    if (!batchSupplierMap[batchId]) batchSupplierMap[batchId] = [];
    batchSupplierMap[batchId].push(row.id);

    const src = (row.scrape_source ?? "").toLowerCase();
    if (src.includes("perplexity")) {
      batchPerplexityCount[batchId] = (batchPerplexityCount[batchId] ?? 0) + 1;
    } else if (src) {
      batchFirecrawlCount[batchId] = (batchFirecrawlCount[batchId] ?? 0) + 1;
    }
  }

  // Build map from batch_id → upload record for filename lookup
  const uploadByBatchId: Record<string, UploadHistoryRow> = {};
  for (const u of uploadHistory) {
    if (u.batch_id) uploadByBatchId[u.batch_id] = u;
  }

  const batchSummaries = Object.values(batchMap)
    .sort((a, b) => {
      const aTime = a.firstSeen ? new Date(a.firstSeen).getTime() : 0;
      const bTime = b.firstSeen ? new Date(b.firstSeen).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  // Backfill scraper_csv_uploads if table is empty but batches exist
  if (uploadHistory.length === 0 && batchSummaries.length > 0) {
    const toInsert = batchSummaries.map((b) => ({
      batch_id: b.batchId,
      filename: b.batchId,
      rows_total: b.total,
      rows_pending: b.pending,
      uploaded_at: b.firstSeen ?? null,
    }));
    await supabaseAdmin.from("scraper_csv_uploads").insert(toInsert);
  }

  // Per-batch product counts (top 6 only to keep queries bounded)
  const batchProductCounts = await Promise.all(
    batchSummaries.slice(0, 6).map(async (batch) => {
      const supplierIds = batchSupplierMap[batch.batchId] ?? [];
      if (supplierIds.length === 0) return { batchId: batch.batchId, count: 0 };
      const { count } = await supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true })
        .in("supplier_id", supplierIds);
      return { batchId: batch.batchId, count: count ?? 0 };
    })
  );
  const productCountByBatch: Record<string, number> = {};
  for (const r of batchProductCounts) {
    productCountByBatch[r.batchId] = r.count;
  }

  // Enrich batch summaries with filename, productsCount, source counts, and batch number.
  // Prefer original_filename from scrape_batches; fall back to scraper_csv_uploads.filename.
  const enrichedBatches: BatchSummary[] = batchSummaries.map((b) => {
    const uploadRecord = uploadByBatchId[b.batchId];
    const filename = origFilenameMap[b.batchId] ?? uploadRecord?.filename;
    return {
      ...b,
      filename,
      batchNumber: extractBatchNumber(filename),
      productsCount: productCountByBatch[b.batchId] ?? 0,
      firecrawlCount: batchFirecrawlCount[b.batchId] ?? 0,
      perplexityCount: batchPerplexityCount[b.batchId] ?? 0,
    };
  });

  // Build options for ScraperConsole dropdown
  const batchOptions = uploadHistory
    .filter((u) => u.batch_id)
    .map((u) => ({
      batchId: u.batch_id as string,
      filename: u.filename,
      rowsTotal: u.rows_total,
      uploadedAt: u.uploaded_at,
    }));

  const effectiveBatchOptions =
    batchOptions.length > 0
      ? batchOptions
      : enrichedBatches.map((b) => ({
          batchId: b.batchId,
          filename: b.filename ?? b.batchId,
          rowsTotal: b.total,
          uploadedAt: b.firstSeen,
        }));

  // Upload history display: fall back to enriched batches if scraper_csv_uploads is empty.
  // Prefer original_filename from scrape_batches over whatever was stored in scraper_csv_uploads.
  const displayHistory: UploadHistoryRow[] =
    uploadHistory.length > 0
      ? uploadHistory.map((u) => ({
          ...u,
          filename: (u.batch_id && origFilenameMap[u.batch_id]) ?? u.filename,
        }))
      : enrichedBatches.map((b) => ({
          id: b.batchId,
          batch_id: b.batchId,
          filename: b.filename ?? b.batchId,
          rows_total: b.total,
          rows_pending: b.pending,
          uploaded_at: b.firstSeen,
        }));

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-base font-semibold text-gray-800 mb-3">
          Supplier Scraper
        </h1>

        {/* Stats row — derived from all CSV batches */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatCard color="green" label="Scraped" count={batchCounts.scraped} />
          <StatCard color="orange" label="Pending" count={batchCounts.pending} />
          <StatCard color="red" label="Failed" count={batchCounts.failed} />
          <StatCard color="gray" label="Skipped" count={batchCounts.skipped} />
          <StatCard color="blue" label="Products" count={totalProducts} />
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Batch summary section */}
        {enrichedBatches.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Recent CSV upload batches
                </p>
                <p className="text-sm text-slate-500">
                  Latest batch uploads and their current scrape status counts.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enrichedBatches.map((batch) => {
                const denominator = batch.total - batch.skipped;
                const isUnhealthy =
                  denominator > 0 && batch.failed / denominator > 0.1;
                const pct =
                  denominator > 0
                    ? Math.round((batch.scraped / denominator) * 100)
                    : 0;

                return (
                  <div
                    key={batch.batchId}
                    className={`rounded-3xl border bg-slate-50 p-4 ${
                      isUnhealthy
                        ? "border-l-4 border-l-red-500 border-slate-200"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        {/* Primary: relative date */}
                        <p className="text-sm font-semibold text-slate-900">
                          {batch.firstSeen
                            ? getRelativeTime(batch.firstSeen)
                            : "Unknown date"}
                        </p>
                        {/* Secondary: filename / batch key de-emphasised */}
                        <p
                          className="text-xs text-slate-400 truncate max-w-40"
                          title={batch.filename ?? batch.batchId}
                        >
                          {batch.filename ?? batch.batchId}
                        </p>
                        {/* Action buttons */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a
                            href={`#batchId=${encodeURIComponent(batch.batchId)}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                          >
                            Use this batch →
                          </a>
                          {batch.failed > 0 && (
                            <a
                              href={`#batchId=${encodeURIComponent(batch.batchId)}&status=failed`}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Retry failed ({batch.failed})
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {batch.total} rows
                      </span>
                    </div>

                    {/* Products & source stats */}
                    {((batch.productsCount ?? 0) > 0 ||
                      (batch.firecrawlCount ?? 0) > 0 ||
                      (batch.perplexityCount ?? 0) > 0 ||
                      batch.batchNumber) && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {batch.batchNumber && (
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 uppercase tracking-wide">
                            {batch.batchNumber}
                          </span>
                        )}
                        {(batch.productsCount ?? 0) > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                            {batch.productsCount} products
                          </span>
                        )}
                        {(batch.firecrawlCount ?? 0) > 0 && (
                          <span className="rounded-full bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700">
                            Firecrawl: {batch.firecrawlCount}
                          </span>
                        )}
                        {(batch.perplexityCount ?? 0) > 0 && (
                          <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700">
                            Perplexity: {batch.perplexityCount}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid gap-2">
                      <StatRow label="Pending" value={batch.pending} color="orange" />
                      <StatRow label="Scraped" value={batch.scraped} color="green" />
                      <StatRow label="Failed" value={batch.failed} color="red" />
                      <StatRow label="Skipped" value={batch.skipped} color="gray" />
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CSV upload section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <CsvUploader />
        </div>

        {/* CSV upload history */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <p className="text-base font-semibold text-slate-900">
                Upload history
              </p>
              <p className="text-sm text-slate-500">Last 20 CSV uploads.</p>
            </div>
          </div>

          {displayHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-500">
              No uploads yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Total rows</th>
                    <th className="px-4 py-3">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHistory.map((upload) => (
                    <tr
                      key={upload.id}
                      className="border-b border-slate-200 last:border-none hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 align-top max-w-55">
                        <span className="block max-w-55 truncate text-slate-800">
                          {upload.filename}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500">
                        {getRelativeTime(upload.uploaded_at)}
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-slate-900">
                        {upload.rows_total}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-green-700">
                        {upload.rows_pending}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Batch scraper section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="font-semibold text-slate-800 mb-4">Run batch scrape</p>
          <ScraperConsole
            totalPending={counts.pending}
            totalAll={suppliers.length}
            batchOptions={effectiveBatchOptions}
          />
        </div>

        {/* Supplier table — filtering/sorting owned by client component */}
        <div>
          <ScraperTableClient
            suppliers={suppliers}
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
  return date.toLocaleDateString();
}

function StatCard({
  color,
  label,
  count,
}: {
  color: "green" | "orange" | "red" | "gray" | "blue";
  label: string;
  count: number;
}) {
  const styles = {
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-slate-50 text-slate-600",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${styles[color]}`}
    >
      {count} {label}
    </span>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "orange" | "red" | "gray";
}) {
  const styles = {
    green: "text-green-700",
    orange: "text-orange-700",
    red: "text-red-700",
    gray: "text-slate-700",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm border border-slate-200">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${styles[color]}`}>{value}</span>
    </div>
  );
}

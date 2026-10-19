"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type TargetEntity = "suppliers" | "buyers" | "ecosystem";
type DuplicateStrategy = "skip" | "merge" | "force";

interface AnalyzeResult {
  ok: boolean;
  sheetName: string;
  totalRows: number;
  headers: string[];
  suggestedMapping: Record<string, string>;
  previewRows: Record<string, unknown>[];
  error?: string;
}

interface CommitResult {
  ok: boolean;
  totalRows: number;
  inserted: number;
  merged: number;
  skipped: number;
  target: string;
  autoQueueScrape: boolean;
  error?: string;
}

const TARGET_FIELDS: Record<TargetEntity, { key: string; label: string; required?: boolean }[]> = {
  suppliers: [
    { key: "company_name", label: "Company Name", required: true },
    { key: "website", label: "Website URL" },
    { key: "country", label: "Country of Origin" },
    { key: "categories", label: "Product Categories (comma-separated)" },
    { key: "certifications", label: "Certifications (Kosher, BRC, Halal)" },
    { key: "contact_email", label: "Contact Email" },
    { key: "contact_phone", label: "Contact Phone / WhatsApp" },
    { key: "contact_name", label: "Contact Person Name" },
    { key: "notes", label: "Description / Notes" },
  ],
  buyers: [
    { key: "company_name", label: "Buyer Company Name", required: true },
    { key: "website", label: "Website URL" },
    { key: "country", label: "Country / HQ Location" },
    { key: "contact_email", label: "Buyer Contact Email" },
    { key: "contact_phone", label: "Phone / WhatsApp" },
    { key: "contact_name", label: "Buyer Contact Name" },
    { key: "notes", label: "Sourcing Criteria / Notes" },
  ],
  ecosystem: [
    { key: "company_name", label: "Partner Company Name", required: true },
    { key: "website", label: "Website URL" },
    { key: "country", label: "Country" },
    { key: "sector", label: "Trade Sector (packaging, logistics, lab...)" },
    { key: "categories", label: "Capabilities / Offerings" },
    { key: "contact_email", label: "Contact Email" },
    { key: "contact_phone", label: "Contact Phone" },
    { key: "contact_name", label: "Contact Person" },
    { key: "notes", label: "Service Description" },
  ],
};

export default function SmartFileImportWizard({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [target, setTarget] = useState<TargetEntity>("suppliers");
  const [analyzeData, setAnalyzeData] = useState<AnalyzeResult | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [autoQueueScrape, setAutoQueueScrape] = useState(true);

  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Step 1: File selection & upload ─────────────────────────────────────────
  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setErrorMsg(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", "analyze");
      formData.append("target", target);

      const res = await fetch("/api/admin/scraper/import-file", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as AnalyzeResult;
      if (!data.ok) {
        setErrorMsg(data.error || "Failed to analyze file");
        setAnalyzing(false);
        return;
      }

      setAnalyzeData(data);
      setColumnMap(data.suggestedMapping || {});
      setStep(2);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error analyzing file");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Step 4: Commit ingestion ────────────────────────────────────────────────
  async function handleCommit() {
    if (!file || !analyzeData) return;
    setCommitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "commit");
      formData.append("target", target);
      formData.append("duplicateStrategy", duplicateStrategy);
      formData.append("autoQueueScrape", String(autoQueueScrape));
      formData.append("columnMap", JSON.stringify(columnMap));

      const res = await fetch("/api/admin/scraper/import-file", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as CommitResult;
      if (!data.ok) {
        setErrorMsg(data.error || "Failed to import rows");
        setCommitting(false);
        return;
      }

      setCommitResult(data);
      setStep(4);
      router.refresh();
      if (onComplete) onComplete();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Commit error");
    } finally {
      setCommitting(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setFile(null);
    setAnalyzeData(null);
    setColumnMap({});
    setCommitResult(null);
    setErrorMsg(null);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Wizard Header with Progress Steps */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm">📁</span>
              Smart File Ingestion Wizard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload spreadsheets (.csv, .xlsx, .xls) and map directly into catalog or buyer databases
            </p>
          </div>

          {/* Stepper pills */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {[
              { num: 1, label: "Upload" },
              { num: 2, label: "Target & Mapping" },
              { num: 3, label: "Preview & Review" },
              { num: 4, label: "Completed" },
            ].map((s) => {
              const active = step === s.num;
              const done = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                    active
                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                      : done
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    active ? "bg-white/20 text-white" : done ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-400"
                  }`}>
                    {done ? "✓" : s.num}
                  </span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800 font-bold">×</button>
        </div>
      )}

      {/* ── STEP 1: DROPZONE ──────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="p-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-emerald-500 bg-emerald-50/50 scale-[0.99]"
                : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-4 border border-emerald-100 shadow-xs">
              📊
            </div>

            <h4 className="text-sm font-bold text-slate-800">
              {analyzing ? "Analyzing spreadsheet structure..." : "Drag & drop spreadsheet here, or browse"}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supports <strong>.csv, .xlsx, .xls, .tsv</strong> up to 50MB. Columns will be auto-matched to FoodXchange taxonomy.
            </p>

            {analyzing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-600 font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Reading sheets & headers...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: TARGET & COLUMN MAPPING ──────────────────────────────── */}
      {step === 2 && analyzeData && (
        <div className="p-6 space-y-6">
          {/* Target Entity Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              1. Select Destination Database Table
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: "suppliers",
                  icon: "🏭",
                  title: "Food Producers & Suppliers",
                  desc: "Adds to supplier_offerings catalog. Enables product scraping & deal matching.",
                },
                {
                  id: "buyers",
                  icon: "🏢",
                  title: "Wholesale Buyers & Importers",
                  desc: "Adds to buyers directory. Powers inbound demand & RFQ matching.",
                },
                {
                  id: "ecosystem",
                  icon: "🤝",
                  title: "Trade Partners & Enablers",
                  desc: "Logistics, Kosher labs, Packaging manufacturers & Trade promotion bodies.",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTarget(t.id as TargetEntity)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    target === t.id
                      ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl mb-1.5 block">{t.icon}</span>
                  <div className="text-sm font-bold text-slate-900">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Column Mapper Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Map File Headers to Database Fields ({analyzeData.headers.length} columns found in {analyzeData.sheetName})
              </label>
              <span className="text-xs text-slate-500">
                Total Rows: <strong>{analyzeData.totalRows.toLocaleString()}</strong>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Spreadsheet Column Header</th>
                    <th className="px-4 py-2.5">Sample Value (Row 1)</th>
                    <th className="px-4 py-2.5">Target Database Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyzeData.headers.map((h) => {
                    const sampleVal = String(analyzeData.previewRows[0]?.[h] ?? "");
                    const currentField = columnMap[h] ?? "";

                    return (
                      <tr key={h} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {h}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                          {sampleVal || <span className="text-slate-300 italic">empty</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={currentField}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColumnMap((prev) => ({ ...prev, [h]: val }));
                            }}
                            className={`w-full py-1.5 px-3 text-xs rounded-lg border focus:ring-2 focus:ring-emerald-500 font-medium ${
                              currentField
                                ? "border-emerald-300 bg-emerald-50/50 text-emerald-900 font-semibold"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            <option value="">-- Ignore this column --</option>
                            {TARGET_FIELDS[target].map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label} {f.required ? "(Required)" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={resetWizard}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Cancel & Choose Another File
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs flex items-center gap-1.5"
            >
              Continue to Preview & Ingestion Settings →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW & DEDUPLICATION STRATEGY ──────────────────────── */}
      {step === 3 && analyzeData && (
        <div className="p-6 space-y-6">
          {/* Deduplication & Automated Scrape Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Duplicate Handling Strategy
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: "skip",
                    title: "Skip Existing (Recommended)",
                    desc: "If domain or company name already exists, skip row to prevent duplicates.",
                  },
                  {
                    id: "merge",
                    title: "Merge & Enrich Existing",
                    desc: "Updates existing records with any non-empty contact info or notes from file.",
                  },
                  {
                    id: "force",
                    title: "Force Create All",
                    desc: "Inserts every row as a new record regardless of existing matches.",
                  },
                ].map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === s.id}
                      onChange={() => setDuplicateStrategy(s.id as DuplicateStrategy)}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{s.title}</div>
                      <div className="text-[11px] text-slate-500">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Automated Scrape Queue
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoQueueScrape}
                    onChange={(e) => setAutoQueueScrape(e.target.checked)}
                    className="mt-0.5 text-emerald-600 rounded-sm focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Auto-queue valid website URLs for scraping
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Sets <code>scrape_status = 'pending'</code> so our 4-worker scraper extracts their full catalog, certifications, and contacts immediately.
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200/60 rounded-lg text-[11px] text-emerald-800">
                💡 <strong>Target Database:</strong> Ready to ingest {analyzeData.totalRows.toLocaleString()} rows into{" "}
                <span className="font-mono font-bold text-emerald-900">
                  {target === "buyers" ? "buyers" : "supplier_offerings"}
                </span>.
              </div>
            </div>
          </div>

          {/* Sample Preview Rows */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Mapped Data Preview (First 5 Rows)
            </label>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Row</th>
                    {Object.entries(columnMap)
                      .filter(([, field]) => Boolean(field))
                      .map(([header, field]) => (
                        <th key={header} className="px-3 py-2.5">
                          {field} <span className="text-[10px] text-slate-400 font-normal">({header})</span>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyzeData.previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      {Object.entries(columnMap)
                        .filter(([, field]) => Boolean(field))
                        .map(([header]) => (
                          <td key={header} className="px-3 py-2 text-slate-700 max-w-xs truncate">
                            {String(row[header] ?? "") || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Column Mapping
            </button>
            <button
              type="button"
              disabled={committing}
              onClick={handleCommit}
              className="px-8 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {committing ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Ingesting {analyzeData.totalRows.toLocaleString()} rows into database...
                </>
              ) : (
                <>
                  ✓ Execute Ingestion ({analyzeData.totalRows.toLocaleString()} Rows)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUCCESS RECEIPT ───────────────────────────────────────── */}
      {step === 4 && commitResult && (
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto border border-emerald-200 shadow-xs">
            🎉
          </div>

          <h4 className="text-lg font-bold text-slate-900">Ingestion Successfully Executed!</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your spreadsheet has been parsed and committed to the database with active deduplication.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Total Rows</div>
              <div className="text-lg font-bold text-slate-900">{commitResult.totalRows.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-700 font-medium">New Inserted</div>
              <div className="text-lg font-bold text-emerald-800">{commitResult.inserted.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-xs text-blue-700 font-medium">Merged Existing</div>
              <div className="text-lg font-bold text-blue-800">{commitResult.merged.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs text-amber-700 font-medium">Skipped Dups</div>
              <div className="text-lg font-bold text-amber-800">{commitResult.skipped.toLocaleString()}</div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetWizard}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Upload Another Spreadsheet
            </button>
            <button
              type="button"
              onClick={() => {
                if (commitResult.target === "buyers") {
                  router.push("/admin/buyers");
                } else if (commitResult.target === "ecosystem") {
                  router.push("/admin/ecosystem");
                } else {
                  router.push("/admin/suppliers");
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs"
            >
              View Ingested Records in Directory →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

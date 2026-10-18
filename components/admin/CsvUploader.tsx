"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ParamCompleteness = {
  companyNamePct: number;
  websitePct: number;
  countryPct: number;
  categoriesPct: number;
  contactPct: number;
  notesPct: number;
};

type UploadResult = {
  ok: boolean;
  mode?: "check" | "upload";
  batchId?: string;
  batchUuid?: string;
  total: number;
  uniqueReady?: number;
  inserted: number;
  skipped: number;
  duplicateCount?: number;
  duplicateDbNameCount?: number;
  duplicateDbDomainCount?: number;
  duplicateInternalCount?: number;
  errors: number;
  invalidUrls?: number;
  paramCompleteness?: ParamCompleteness;
  skippedNames?: string[];
  errorDetails?: string[];
  error?: string;
};

type QueuedFileState = {
  file: File;
  status: "checking" | "checked" | "uploading" | "uploaded" | "error";
  checkResult?: UploadResult;
  uploadResult?: UploadResult;
};

export function CsvUploader() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<QueuedFileState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runApi(file: File, mode: "check" | "upload"): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    try {
      const res = await fetch("/api/admin/suppliers/upload-csv", {
        method: "POST",
        body: form,
      });
      return (await res.json()) as UploadResult;
    } catch {
      return {
        ok: false,
        mode,
        total: 0,
        inserted: 0,
        skipped: 0,
        errors: 1,
        error: "Network error",
      };
    }
  }

  async function addAndCheckFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (arr.length === 0) return;

    const newEntries: QueuedFileState[] = arr.map((file) => ({
      file,
      status: "checking",
    }));

    setItems((prev) => [...newEntries, ...prev]);

    for (const entry of newEntries) {
      const checkRes = await runApi(entry.file, "check");
      setItems((prev) =>
        prev.map((it) =>
          it.file === entry.file
            ? {
                ...it,
                status: checkRes.ok ? "checked" : "error",
                checkResult: checkRes,
              }
            : it
        )
      );
    }
  }

  async function uploadItem(targetFile: File) {
    setItems((prev) =>
      prev.map((it) => (it.file === targetFile ? { ...it, status: "uploading" } : it))
    );
    const upRes = await runApi(targetFile, "upload");
    setItems((prev) =>
      prev.map((it) =>
        it.file === targetFile
          ? {
              ...it,
              status: upRes.ok ? "uploaded" : "error",
              uploadResult: upRes,
            }
          : it
      )
    );
    if (upRes.ok) {
      router.refresh();
    }
  }

  async function uploadAllChecked() {
    const ready = items.filter(
      (it) => it.status === "checked" && (it.checkResult?.uniqueReady ?? 0) > 0
    );
    for (const it of ready) {
      await uploadItem(it.file);
    }
  }

  function removeItem(targetFile: File) {
    setItems((prev) => prev.filter((it) => it.file !== targetFile));
  }

  const totalUniqueReady = items
    .filter((it) => it.status === "checked")
    .reduce((sum, it) => sum + (it.checkResult?.uniqueReady ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            CSV Import & Deduplication
          </h2>
          <span
            className="text-xs text-slate-400 cursor-help border border-slate-200 rounded-full w-4 h-4 inline-flex items-center justify-center"
            title="Every CSV is automatically audited against all existing database suppliers (by company name and normalized website domain) before importing. Only unique records are uploaded."
          >
            ?
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/suppliers/template"
            download
            title="Download standard CSV column template"
            className="px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
          >
            ⬇ Template
          </a>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            + Select CSV
          </button>
          {totalUniqueReady > 0 && (
            <button
              type="button"
              onClick={uploadAllChecked}
              className="px-3 py-1 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition shadow-sm"
            >
              ⬆ Upload Unique ({totalUniqueReady})
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addAndCheckFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Compact Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) addAndCheckFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-4 py-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
          dragging
            ? "border-orange-400 bg-orange-50/60"
            : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📄</span>
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Drop CSV file(s) to check uniqueness & parameter coverage
            </p>
            <p className="text-[11px] text-slate-400">
              Auto-checks duplicates by Company Name + Domain before inserting
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
          Browse
        </span>
      </div>

      {/* File Audit & Upload Results */}
      {items.length > 0 && (
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {items.map((item, idx) => {
            const res = item.uploadResult ?? item.checkResult;
            const pc = res?.paramCompleteness;
            const uniqueCount = res?.uniqueReady ?? 0;
            const dupCount = res?.duplicateCount ?? 0;

            return (
              <div
                key={`${item.file.name}-${idx}`}
                className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-slate-800 truncate">
                      {item.file.name}
                    </span>
                    {res?.ok && (
                      <span className="text-[11px] text-slate-400 shrink-0">
                        ({res.total} rows)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === "checking" && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        Checking…
                      </span>
                    )}
                    {item.status === "uploading" && (
                      <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                        <span className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        Uploading…
                      </span>
                    )}
                    {item.status === "checked" && uniqueCount > 0 && (
                      <button
                        type="button"
                        onClick={() => uploadItem(item.file)}
                        className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md transition"
                        title="Insert only the unique non-duplicate suppliers into the database"
                      >
                        ⬆ Upload {uniqueCount} Unique
                      </button>
                    )}
                    {item.status === "checked" && uniqueCount === 0 && (
                      <span
                        className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium"
                        title="All rows in this CSV already exist in the database or lack a valid website"
                      >
                        0 New (All Duplicate)
                      </span>
                    )}
                    {item.status === "uploaded" && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                        ✓ Uploaded {item.uploadResult?.inserted ?? 0}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.file)}
                      className="text-slate-400 hover:text-slate-600 px-1"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {res?.ok && (
                  <>
                    {/* Uniqueness Breakdown Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 cursor-help"
                        title="Unique records with valid websites not found in the database"
                      >
                        ✓ {uniqueCount} Unique
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200 cursor-help"
                        title={`Duplicates skipped: ${res.duplicateDbNameCount ?? 0} by Company Name in DB, ${res.duplicateDbDomainCount ?? 0} by Website Domain in DB, ${res.duplicateInternalCount ?? 0} internal CSV duplicates`}
                      >
                        ⊘ {dupCount} Duplicates (Name: {res.duplicateDbNameCount ?? 0} · Domain:{" "}
                        {res.duplicateDbDomainCount ?? 0} · CSV: {res.duplicateInternalCount ?? 0})
                      </span>
                      {(res.invalidUrls ?? 0) > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-medium border border-red-200 cursor-help"
                          title="Rows missing a valid http/https website or social-only links"
                        >
                          ✗ {res.invalidUrls} Invalid URL
                        </span>
                      )}
                    </div>

                    {/* Parameter Completeness % in CSV */}
                    {pc && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[11px] text-slate-400 mr-1">CSV Params:</span>
                        <ParamBadge label="Web" pct={pc.websitePct} title="Rows with valid website URL" />
                        <ParamBadge label="Country" pct={pc.countryPct} title="Rows with country specified" />
                        <ParamBadge label="Cat" pct={pc.categoriesPct} title="Rows with category specified" />
                        <ParamBadge label="Contact" pct={pc.contactPct} title="Rows with email or phone" />
                        <ParamBadge label="Desc" pct={pc.notesPct} title="Rows with notes/description" />
                      </div>
                    )}
                  </>
                )}

                {!res?.ok && res?.error && (
                  <p className="text-red-600 font-medium">✗ {res.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParamBadge({
  label,
  pct,
  title,
}: {
  label: string;
  pct: number;
  title: string;
}) {
  const color =
    pct >= 80
      ? "bg-slate-100 text-slate-700"
      : pct >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-50 text-slate-400";
  return (
    <span
      title={`${title}: ${pct}%`}
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium cursor-help ${color}`}
    >
      {label} {pct}%
    </span>
  );
}

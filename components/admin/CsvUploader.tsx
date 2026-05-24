"use client";

import { useRef, useState } from "react";

type UploadResult = {
  ok: boolean;
  batchId?: string;
  batchUuid?: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
  invalidUrls?: number;
  skippedNames?: string[];
  errorDetails?: string[];
  error?: string;
};

type FileResult = UploadResult & { fileName: string };

export function CsvUploader() {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [results, setResults] = useState<FileResult[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadSingleFile(file: File): Promise<FileResult> {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/suppliers/upload-csv", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as UploadResult;
      return { ...data, fileName: file.name };
    } catch {
      return {
        ok: false,
        fileName: file.name,
        total: 0,
        inserted: 0,
        skipped: 0,
        errors: 1,
        error: "Network error — upload failed",
      };
    }
  }

  async function uploadAll() {
    if (queue.length === 0) return;
    setGlobalError(null);
    const newResults: FileResult[] = [];

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      if (!file.name.endsWith(".csv")) {
        newResults.push({
          ok: false,
          fileName: file.name,
          total: 0,
          inserted: 0,
          skipped: 0,
          errors: 1,
          error: "Not a CSV file",
        });
        setResults([...newResults]);
        continue;
      }
      setUploadingIndex(i);
      const result = await uploadSingleFile(file);
      newResults.push(result);
      setResults([...newResults]);
    }

    setUploadingIndex(null);
    setQueue([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    setQueue((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const deduped = arr.filter((f) => !existingNames.has(f.name));
      return [...prev, ...deduped];
    });
    setGlobalError(null);
  }

  function removeFromQueue(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  }

  const isUploading = uploadingIndex !== null;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left side */}
      <div className="flex-1">
        <p className="text-lg font-semibold text-slate-800 mb-1">
          Import suppliers from CSV
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Upload one or more supplier lists — we scrape and enrich automatically
        </p>

        <div className="flex gap-3 flex-wrap">
          <a
            href="/api/admin/suppliers/template"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            ⬇ Download template
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            + Add CSV files
          </button>
          {queue.length > 0 && (
            <button
              onClick={uploadAll}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading {uploadingIndex! + 1} of {queue.length}…
                </>
              ) : (
                `⬆ Upload all (${queue.length} file${queue.length !== 1 ? "s" : ""})`
              )}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        {/* Queue list */}
        {queue.length > 0 && (
          <div className="mt-4 space-y-2">
            {queue.map((file, idx) => (
              <div
                key={file.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                  uploadingIndex === idx
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                {uploadingIndex === idx ? (
                  <span className="inline-block h-3.5 w-3.5 shrink-0 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-slate-400">📄</span>
                )}
                <span className="flex-1 truncate text-slate-700 font-medium">
                  {file.name}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                {uploadingIndex === null && (
                  <button
                    type="button"
                    onClick={() => removeFromQueue(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors text-xs shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Per-file results */}
        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map((r, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-sm space-y-2 ${
                  r.ok
                    ? "bg-slate-50 border-slate-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="font-semibold text-slate-800">
                  📄 {r.fileName}
                  {r.ok ? (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {r.total} rows processed
                    </span>
                  ) : null}
                </p>
                {r.ok ? (
                  <div className="space-y-1 text-slate-600">
                    <p>
                      ✓{" "}
                      <span className="font-medium text-green-700">
                        {r.inserted}
                      </span>{" "}
                      new suppliers added
                    </p>
                    <p>
                      ⊘{" "}
                      <span className="font-medium text-slate-500">
                        {r.skipped}
                      </span>{" "}
                      duplicates skipped
                    </p>
                    {(r.invalidUrls ?? 0) > 0 && (
                      <p>
                        ✗{" "}
                        <span className="font-medium text-red-600">
                          {r.invalidUrls}
                        </span>{" "}
                        invalid URLs skipped
                      </p>
                    )}
                    {r.errors > 0 && (
                      <p className="text-amber-700">
                        ⚠ {r.errors} other error{r.errors !== 1 ? "s" : ""}
                      </p>
                    )}
                    {r.batchId && (
                      <p className="text-xs text-slate-500 font-mono pt-1">
                        Batch: {r.batchId}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-red-700">✗ {r.error ?? "Upload failed"}</p>
                )}
                {r.errorDetails && r.errorDetails.length > 0 && (
                  <ul className="text-xs text-red-700 list-disc list-inside">
                    {r.errorDetails.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {r.errorDetails.length > 5 && (
                      <li className="text-slate-500">
                        …and {r.errorDetails.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {globalError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ✗ {globalError}
          </div>
        )}
      </div>

      {/* Drag-and-drop zone */}
      <div
        className={`md:w-56 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
          ${dragging ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-slate-300"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <span className="text-2xl mb-2">📂</span>
        {queue.length > 0 ? (
          <p className="text-xs text-slate-600 font-medium">
            {queue.length} file{queue.length !== 1 ? "s" : ""} queued
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">Drag CSVs here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}

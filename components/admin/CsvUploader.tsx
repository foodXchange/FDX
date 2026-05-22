"use client";

import { useRef, useState } from "react";

type UploadResult = {
  ok: boolean;
  batchId?: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
  invalidUrls?: number;
  skippedNames?: string[];
  errorDetails?: string[];
};

export function CsvUploader() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [resultTime, setResultTime] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setResult(null);
    setResultTime(null);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/suppliers/upload-csv", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as UploadResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setResult(data);
        setResultTime(new Date().toLocaleString());
      }
    } catch {
      setError("Network error — upload failed");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left side */}
      <div className="flex-1">
        <p className="text-lg font-semibold text-slate-800 mb-1">
          Import suppliers from CSV
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Upload a list of supplier websites — we scrape and enrich automatically
        </p>

        <div className="flex gap-3">
          <a
            href="/api/admin/suppliers/template"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            ⬇ Download template
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              "⬆ Upload CSV"
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        {/* Detailed result card */}
        {result && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-2">
            <p className="font-semibold text-slate-800">
              CSV processed — {result.total} rows
            </p>
            <div className="space-y-1 text-slate-600">
              <p>
                ✓{" "}
                <span className="font-medium text-green-700">
                  {result.inserted}
                </span>{" "}
                new suppliers added
              </p>
              <p>
                ⊘{" "}
                <span className="font-medium text-slate-500">
                  {result.skipped}
                </span>{" "}
                already existed (duplicates)
              </p>
              <p>
                ✗{" "}
                <span className="font-medium text-red-600">
                  {result.invalidUrls ?? 0}
                </span>{" "}
                invalid URLs skipped
              </p>
              {result.errors > 0 && (
                <p className="text-amber-700">
                  ⚠ {result.errors} other error{result.errors !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {result.errorDetails && result.errorDetails.length > 0 && (
              <ul className="text-xs text-red-700 list-disc list-inside">
                {result.errorDetails.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-200">
              {result.batchId && <span>Batch {result.batchId}</span>}
              {result.batchId && resultTime && <span> · </span>}
              {resultTime && <span>{resultTime}</span>}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ✗ {error}
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
        {fileName ? (
          <p className="text-xs text-slate-600 font-medium break-all">
            {fileName}
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">Drag CSV here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}

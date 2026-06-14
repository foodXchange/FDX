"use client";

import { useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocDropzone({
  label,
  files,
  onAdd,
  onRemove,
}: {
  label: string;
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = Array.from(e.dataTransfer.files ?? []);
          if (dropped.length > 0) onAdd(dropped);
        }}
        className={`border-2 border-dashed rounded-lg px-4 py-6 text-center transition ${
          dragging ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-slate-50"
        }`}
      >
        <p className="text-sm text-slate-500">
          Drag a file here or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-orange-600 hover:text-orange-700 font-medium underline"
          >
            browse
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length > 0) onAdd(picked);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-3 py-1.5"
            >
              <span className="truncate">
                {file.name} <span className="text-slate-400">({formatSize(file.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-slate-400 hover:text-red-500 ml-2"
                aria-label="Remove file"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SupplierActionForm({
  token,
  requestedDocs,
}: {
  token: string;
  requestedDocs: string[];
}) {
  const [filesByDoc, setFilesByDoc] = useState<Record<string, File[]>>({});
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const docs = requestedDocs.length > 0 ? requestedDocs : ["Files"];

  function addFiles(doc: string, files: File[]) {
    setFilesByDoc((prev) => ({ ...prev, [doc]: [...(prev[doc] ?? []), ...files] }));
  }

  function removeFile(doc: string, index: number) {
    setFilesByDoc((prev) => ({ ...prev, [doc]: (prev[doc] ?? []).filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("response_text", responseText);

    const docLabels: string[] = [];
    for (const [doc, files] of Object.entries(filesByDoc)) {
      for (const file of files) {
        formData.append("files", file);
        docLabels.push(doc);
      }
    }
    formData.append("docLabels", JSON.stringify(docLabels));

    try {
      const res = await fetch(`/api/supplier-action/${token}/respond`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Something went wrong — please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <p className="text-lg font-semibold text-slate-900 mb-1">Thank you! 🎉</p>
        <p className="text-sm text-slate-500">
          We&apos;ve received your response and our team will follow up if anything else is needed.
        </p>
      </div>
    );
  }

  return (
    <div>
      {docs.map((doc) => (
        <DocDropzone
          key={doc}
          label={doc}
          files={filesByDoc[doc] ?? []}
          onAdd={(files) => addFiles(doc, files)}
          onRemove={(i) => removeFile(doc, i)}
        />
      ))}

      <div className="mb-5">
        <p className="text-sm font-medium text-slate-700 mb-2">Anything you&apos;d like to add?</p>
        <textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={4}
          placeholder="Write a message…"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm py-3 rounded-lg disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Submit"}
      </button>
    </div>
  );
}

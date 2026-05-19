"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Status =
  | { stage: "idle"; progress: 0; message?: string }
  | { stage: "uploading"; progress: number; message?: string }
  | { stage: "canceled"; progress: 0; message?: string }
  | { stage: "done"; progress: 100; message?: string }
  | { stage: "error"; progress: 0; message?: string };

type Props = {
  bucket?: string;
  folder?: string;
  onUploaded: (publicUrl: string, objectPath: string) => void;
  onStatus?: (s: Status) => void;
};

export default function DragDropUpload({
  bucket = "content-images",
  folder = "newsletter",
  onUploaded,
  onStatus,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  const accept = useMemo(() => "image/png,image/jpeg,image/webp", []);

  function pushStatus(next: Status) {
    onStatus?.(next);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  async function uploadFile(file: File) {
    setErrorMsg("");
    setCancelRequested(false);

    if (!file.type.startsWith("image/")) {
      const msg = "Please upload an image (PNG/JPG/WebP).";
      setErrorMsg(msg);
      pushStatus({ stage: "error", progress: 0, message: msg });
      return;
    }

    setLastFile(file);
    setUploading(true);
    pushStatus({ stage: "uploading", progress: 8, message: "Preparing upload…" });

    let p = 8;
    const tick = setInterval(() => {
      if (cancelRequested) return;
      p = Math.min(p + 7, 85);
      pushStatus({ stage: "uploading", progress: p, message: "Uploading to Supabase…" });
    }, 220);

    try {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const objectPath = `${folder}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      clearInterval(tick);

      if (cancelRequested) {
        setUploading(false);
        pushStatus({ stage: "canceled", progress: 0, message: "Canceled." });
        return;
      }

      if (error) throw error;

      pushStatus({ stage: "uploading", progress: 92, message: "Finalizing…" });

      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const publicUrl = data.publicUrl;

      setUploading(false);
      pushStatus({ stage: "done", progress: 100, message: "Upload complete ✅" });

      onUploaded(publicUrl, objectPath);
    } catch (e: any) {
      clearInterval(tick);
      if (cancelRequested) {
        setUploading(false);
        pushStatus({ stage: "canceled", progress: 0, message: "Canceled." });
        return;
      }
      const msg = e?.message || "Upload failed. Check bucket/policies.";
      setErrorMsg(msg);
      setUploading(false);
      pushStatus({ stage: "error", progress: 0, message: msg });
    } finally {
      setDragOver(false);
    }
  }

  function cancelUpload() {
    if (!uploading) return;
    setCancelRequested(true);
    setUploading(false);
    pushStatus({ stage: "canceled", progress: 0, message: "Canceled." });
  }

  function retryUpload() {
    if (uploading) return;
    if (!lastFile) return openPicker();
    uploadFile(lastFile);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.currentTarget.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? openPicker() : null)}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file) uploadFile(file);
        }}
        className={[
          "w-full rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer select-none transition",
          "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-white",
          dragOver ? "border-orange-500 bg-orange-50" : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50",
          uploading ? "opacity-85" : "",
        ].join(" ")}
      >
        <div className="text-slate-900 font-semibold text-lg">
          {uploading ? "Uploading…" : "Drag & drop an image here"}
        </div>
        <div className="text-sm text-slate-600 mt-2">or click to choose a file</div>
        <div className="text-xs text-slate-500 mt-3">Recommended: 1200×630, under ~500KB</div>
      </div>

      <div className="mt-4 flex gap-3 flex-wrap">
        <button type="button" onClick={retryUpload} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">
          Retry
        </button>
        <button type="button" onClick={cancelUpload} disabled={!uploading} className={`px-4 py-2 rounded-lg border text-sm font-medium ${uploading ? "border-slate-200 hover:bg-slate-50" : "border-slate-100 text-slate-300 cursor-not-allowed"}`}>
          Cancel
        </button>
      </div>

      {errorMsg ? <p className="mt-2 text-sm text-red-600">{errorMsg}</p> : null}
    </div>
  );
}

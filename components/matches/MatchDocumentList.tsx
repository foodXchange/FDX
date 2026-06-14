"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MatchDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploader_id: string;
  uploader_type: "buyer" | "supplier" | "admin";
  created_at: string;
  url: string;
}

function fileIcon(mimeType: string | null): string {
  if (!mimeType) return "📎";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType === "text/csv") return "📊";
  if (mimeType.includes("word") || mimeType === "application/msword") return "📝";
  return "📎";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MatchDocumentList({
  matchId,
  disabled,
  viewerRole,
}: {
  matchId: string;
  disabled: boolean;
  viewerRole: "supplier" | "buyer";
}) {
  const [documents, setDocuments] = useState<MatchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch(`/api/matches/${matchId}/documents`);
    if (res.ok) {
      const json = await res.json();
      setDocuments((json.documents ?? []) as MatchDocument[]);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match_documents:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_documents", filter: `match_id=eq.${matchId}` },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/matches/${matchId}/documents`, {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to upload");
          continue;
        }
        const doc = json.document as MatchDocument;
        setDocuments((prev) => (prev.some((d) => d.id === doc.id) ? prev : [...prev, doc]));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/matches/${matchId}/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <p className="text-sm text-slate-400">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="text-lg shrink-0">{fileIcon(doc.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-300 hover:text-orange-200 truncate block"
                >
                  {doc.file_name}
                </a>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {doc.uploader_type === viewerRole ? "You" : viewerRole === "buyer" ? "Supplier" : "Buyer"} ·{" "}
                  {formatSize(doc.file_size)} ·{" "}
                  {new Date(doc.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {doc.uploader_type === viewerRole && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-slate-400 hover:text-slate-200 text-lg leading-none shrink-0"
                  title="Delete"
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {disabled ? (
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-white/10">
          This match is closed — document sharing is disabled.
        </p>
      ) : (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-lg px-4 py-4 text-center text-sm transition ${
              dragOver ? "border-orange-400 text-orange-300" : "border-white/20 text-slate-400 hover:border-orange-400/60"
            }`}
          >
            {uploading ? (
              "Uploading…"
            ) : (
              <>
                Drag a file here or{" "}
                <button onClick={() => fileInputRef.current?.click()} className="text-orange-400 hover:text-orange-300 font-medium">
                  browse
                </button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

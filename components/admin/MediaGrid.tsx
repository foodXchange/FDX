"use client";
import { useState } from "react";

export type MediaItem = {
  name: string;
  path: string;
  url: string;
  size: number;
  createdAt: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaGrid({ items: initial }: { items: MediaItem[] }) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyUrl(url: string, name: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(name);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function deleteFile(item: MediaItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(item.name);
    setError(null);
    try {
      const res = await fetch("/api/admin/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: item.path }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Delete failed");
      } else {
        setItems((prev) => prev.filter((i) => i.name !== item.name));
      }
    } catch {
      setError("Network error during delete");
    } finally {
      setDeleting(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg mb-1">No images yet</p>
        <p className="text-sm">Upload images via the Blog Editor to see them here.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-slate-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            {/* Info */}
            <div className="p-3">
              <p
                className="text-xs text-slate-700 font-medium truncate"
                title={item.name}
              >
                {item.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{formatBytes(item.size)}</p>

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyUrl(item.url, item.name)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 transition font-medium"
                >
                  {copied === item.name ? "Copied!" : "Copy URL"}
                </button>
                <button
                  onClick={() => deleteFile(item)}
                  disabled={deleting === item.name}
                  className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                >
                  {deleting === item.name ? "…" : "✕"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

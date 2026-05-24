"use client";
import { useState } from "react";

export type TrashItem = {
  id: string;
  trashed_object_path: string;
  changed_at: string;
};

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

export default function TrashManager({
  items: initial,
  supabaseUrl,
}: {
  items: TrashItem[];
  supabaseUrl: string;
}) {
  const [items, setItems] = useState<TrashItem[]>(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bucket = "content-images";

  function publicUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  async function deleteItem(item: TrashItem) {
    if (!confirm(`Permanently delete "${fileName(item.trashed_object_path)}"? This cannot be undone.`)) return;
    setDeleting(item.id);
    setError(null);
    try {
      const res = await fetch("/api/settings/trash/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: item.trashed_object_path }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Delete failed");
      } else {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    } catch {
      setError("Network error");
    } finally {
      setDeleting(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">Trash is empty — no items to delete</p>
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">File</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const age = ageDays(item.changed_at);
              const name = fileName(item.trashed_object_path);
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicUrl(item.trashed_object_path)}
                        alt={name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800 font-medium truncate max-w-xs" title={name}>{name}</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate max-w-xs" title={item.trashed_object_path}>{item.trashed_object_path}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${age >= 14 ? "text-red-500" : age >= 7 ? "text-orange-500" : "text-slate-500"}`}>
                      {age === 0 ? "Today" : age === 1 ? "1 day ago" : `${age} days ago`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteItem(item)}
                      disabled={deleting === item.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {deleting === item.id ? "Deleting…" : "Delete permanently"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

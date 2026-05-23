"use client";

import { useState } from "react";

interface Props {
  url: string;
  categories: string[];
  initialCategory: string;
  images: Record<string, string | null>;
  onAssign: (category: string) => void;
  onDismiss: () => void;
}

export default function PasteAssignPanel({
  url,
  categories,
  initialCategory,
  images,
  onAssign,
  onDismiss,
}: Props) {
  // Sort: categories without images first
  const sorted = [
    ...categories.filter((c) => !images[c]),
    ...categories.filter((c) => !!images[c]),
  ];

  const defaultCat =
    initialCategory && categories.includes(initialCategory)
      ? initialCategory
      : sorted[0] ?? "";

  const [selected, setSelected] = useState(defaultCat);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Image URL detected
        </p>

        <div className="flex items-start gap-3 mb-4">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
            {imgError ? (
              <span className="text-slate-400 text-xs text-center px-1">
                Preview unavailable
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Pasted image preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 mb-2">
              Assign image to category
            </p>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-400 mb-3"
            >
              {sorted.map((cat) => (
                <option key={cat} value={cat}>
                  {images[cat] ? `${cat} (replace)` : cat}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onAssign(selected)}
                disabled={!selected}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-xl transition"
              >
                Assign →
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm text-slate-400 hover:text-slate-600 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 truncate" title={url}>
          {url}
        </p>
      </div>
    </div>
  );
}

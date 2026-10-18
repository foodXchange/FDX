"use client";

import { useState } from "react";

export default function DigestButton() {
  const [loading, setLoading] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleFetchDigest() {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline/digest");
      if (!res.ok) throw new Error("Failed to fetch digest");
      const text = await res.text();
      setPreviewText(text);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function handleOpenMailto() {
    if (!previewText) return;
    window.open(
      `mailto:?subject=${encodeURIComponent("FoodXchange Pipeline Daily Digest")}&body=${encodeURIComponent(previewText)}`,
      "_blank"
    );
  }

  function handleCopy() {
    if (!previewText) return;
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleFetchDigest}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
      >
        <span>📊</span>
        <span>{loading ? "Preparing…" : "Daily Digest"}</span>
      </button>

      {previewText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>📊</span> Pipeline Daily Digest
              </h3>
              <button
                type="button"
                onClick={() => setPreviewText(null)}
                className="text-gray-400 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              <pre className="text-xs font-mono p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {previewText}
              </pre>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewText(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Open in Email Client →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

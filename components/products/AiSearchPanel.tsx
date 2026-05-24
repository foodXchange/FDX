"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PublicCatalogueProduct } from "@/app/en/products/page";
import { toCategorySlug } from "@/lib/products/categorySlug";
import type { ImageAnalysis } from "@/app/api/sourcing/analyse-image/route";

interface Props {
  category?: string;
  onResults: (products: PublicCatalogueProduct[], query: string) => void;
  onClear: () => void;
}

const EXAMPLE_QUERIES = [
  "Kosher EVOO 750ml Spain",
  "Organic granola Badatz",
  "Frozen potato wedges kosher",
  "Canned tuna Chief Rabbinate",
];

type SearchResponse = {
  ok: boolean;
  results?: PublicCatalogueProduct[];
  category_suggestion?: string | null;
  error?: string;
};

type UploadResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
};

type AnalyseResponse = {
  ok?: boolean;
  analysis?: ImageAnalysis | null;
};

export default function AiSearchPanel({ category, onResults, onClear }: Props) {
  const [tab, setTab] = useState<"describe" | "upload">("describe");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageAnalysing, setImageAnalysing] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    query: string;
    count: number;
    suggestion: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function search(q: string, imageAnalysis?: ImageAnalysis) {
    const trimmed = q.trim();
    if (!trimmed && !imageAnalysis) return;
    setLoading(true);
    setError(null);
    setResultMeta(null);
    onClear();
    try {
      const body: Record<string, unknown> = { query: trimmed, category };
      if (imageAnalysis) {
        body.imageAnalysis = {
          product_name: imageAnalysis.product_name,
          category: imageAnalysis.category,
          packaging_format: imageAnalysis.packaging_format,
          certifications_visible: imageAnalysis.certifications_visible,
          sourcing_keywords: imageAnalysis.sourcing_keywords,
        };
      }
      const res = await fetch("/api/products/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as SearchResponse;
      if (!json.ok) throw new Error(json.error ?? "Search failed");
      const results = json.results ?? [];
      onResults(results, trimmed);
      setResultMeta({
        query: trimmed,
        count: results.length,
        suggestion: json.category_suggestion ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(file: File) {
    setImageUploading(true);
    setDetectedProduct(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/sourcing/upload-image", { method: "POST", body: fd });
      const upData = (await upRes.json()) as UploadResponse;
      if (!upData.ok || !upData.url) throw new Error(upData.error ?? "Upload failed");
      setImageUploading(false);

      setImageAnalysing(true);
      const anRes = await fetch("/api/sourcing/analyse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: upData.url }),
      });
      const anData = (await anRes.json()) as AnalyseResponse;
      const analysis = anData.analysis ?? null;
      setImageAnalysing(false);

      if (analysis) {
        setDetectedProduct(analysis.product_name);
        const autofill = [
          analysis.product_name,
          analysis.packaging_format,
          analysis.approximate_size,
          ...analysis.certifications_visible,
        ]
          .filter(Boolean)
          .join(" ");
        setQuery(autofill);
        setTab("describe");
        await search(autofill, analysis);
      } else {
        setTab("describe");
      }
    } catch (err) {
      setImageUploading(false);
      setImageAnalysing(false);
      setError(err instanceof Error ? err.message : "Image processing failed");
    }
  }

  function handleClear() {
    setQuery("");
    setResultMeta(null);
    setError(null);
    setDetectedProduct(null);
    onClear();
  }

  const isImageProcessing = imageUploading || imageAnalysing;

  return (
    <div className="dark-card p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-dark-text-primary">
          ✦ Find products with AI
        </span>
        <span className="text-xs text-slate-500">Powered by Claude</span>
      </div>

      {/* Tabs — hidden once results are active */}
      {!resultMeta && (
        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-4 text-sm">
          <button
            type="button"
            onClick={() => setTab("describe")}
            className={`flex-1 py-2 transition ${
              tab === "describe"
                ? "bg-orange-500 text-white font-medium"
                : "bg-white/5 text-slate-400 hover:text-slate-300"
            }`}
          >
            Describe
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`flex-1 py-2 border-l border-white/10 transition ${
              tab === "upload"
                ? "bg-orange-500 text-white font-medium"
                : "bg-white/5 text-slate-400 hover:text-slate-300"
            }`}
          >
            Upload Image
          </button>
        </div>
      )}

      {/* Tab: Describe (also shown when results are active) */}
      {(tab === "describe" || resultMeta) && (
        <div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) search(query);
            }}
            placeholder={
              "Describe what you need...\ne.g. kosher olive oil 750ml glass bottle\nChief Rabbinate private label Spain or Italy"
            }
            rows={3}
            className="dark-input w-full rounded-xl py-2.5 px-3 resize-none text-sm"
          />

          {/* Example chips — hidden when results are active */}
          {!resultMeta && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    search(ex);
                  }}
                  className="text-xs bg-white/4 border border-white/10 text-slate-400 hover:border-orange-500/50 hover:text-orange-400 px-3 py-1 rounded-full transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => search(query)}
            disabled={loading || !query.trim()}
            className="mt-3 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching…
              </span>
            ) : (
              "Find products →"
            )}
          </button>
        </div>
      )}

      {/* Tab: Upload */}
      {tab === "upload" && !resultMeta && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div
            onClick={() => !isImageProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-1 transition ${
              isImageProcessing
                ? "border-orange-500/40 bg-orange-500/5 cursor-default"
                : "border-white/15 hover:border-orange-500/40 hover:bg-white/3 cursor-pointer"
            }`}
            style={{ height: 120 }}
          >
            {isImageProcessing ? (
              <span className="flex items-center gap-2 text-sm text-orange-300">
                <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                {imageUploading ? "Uploading…" : "AI is analysing…"}
              </span>
            ) : (
              <>
                <span className="text-2xl">📷</span>
                <p className="text-sm text-slate-400 font-medium">Drop a product image here</p>
                <p className="text-xs text-slate-600">or click to browse</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Result meta */}
      {resultMeta && (
        <div className="mt-3">
          {detectedProduct && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-orange-500/15 border border-orange-500/30 text-orange-300 rounded-full px-3 py-1 mb-2">
              ✦ AI detected: {detectedProduct}
            </span>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-dark-text-primary">
                  AI found {resultMeta.count} match{resultMeta.count !== 1 ? "es" : ""}
                </span>{" "}
                for &ldquo;{resultMeta.query}&rdquo;
              </p>
              {resultMeta.suggestion && (
                <div className="mt-2 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-orange-300">
                    Best matches in <strong>{resultMeta.suggestion}</strong>
                  </p>
                  <Link
                    href={`/en/products/${toCategorySlug(resultMeta.suggestion)}`}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300 whitespace-nowrap transition"
                  >
                    View {resultMeta.suggestion} →
                  </Link>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-slate-500 hover:text-slate-300 transition shrink-0"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}

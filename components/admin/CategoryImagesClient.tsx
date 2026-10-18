"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import PasteAssignPanel from "@/components/admin/PasteAssignPanel";
import IdeogramDrawer from "@/components/admin/IdeogramDrawer";
import { getCategoryFilename } from "@/lib/images/imageUtils";
import { toCategorySlug } from "@/lib/products/categorySlug";

export interface CategoryImageRow {
  id: string;
  category: string;
  image_url: string | null;
  image_alt: string | null;
  gradient_from: string;
  gradient_to: string;
}

export interface CategoryProductStats {
  total: number;
  published: number;
  withPhoto: number;
  samplePhotos: Array<{ url: string; name: string }>;
}

interface Props {
  rows: CategoryImageRow[];
  productCounts: Record<string, number>;
  categoryStats?: Record<string, CategoryProductStats>;
}

type CardState = "idle" | "uploading" | "success" | "error";
type StatusFilter = "all" | "complete" | "missing-alt" | "no-image";

const FALLBACK_GRADIENTS: Record<string, { from: string; to: string }> = {
  "Oils & Fats": { from: "#D4A017", to: "#8B6914" },
  "Tomato Products": { from: "#C0392B", to: "#7B241C" },
  "Canned Foods": { from: "#5D6D7E", to: "#2C3E50" },
  Snacks: { from: "#E67E22", to: "#A04000" },
  "Sweet Biscuits & Bars": { from: "#D35400", to: "#78281F" },
  "Breakfast Cereals": { from: "#F39C12", to: "#9A7D0A" },
  "Frozen Foods": { from: "#2E86AB", to: "#1A5276" },
  Bakery: { from: "#F0B429", to: "#B7950B" },
  "Pasta & Grains": { from: "#D4A76A", to: "#8E6B3E" },
  "Sauces & Condiments": { from: "#CB4335", to: "#7B241C" },
  "Fish & Seafood": { from: "#1A6B8A", to: "#0E4460" },
  "Organic & Natural": { from: "#27AE60", to: "#1E8449" },
  "Spices & Herbs": { from: "#E74C3C", to: "#922B21" },
  Beverages: { from: "#8E44AD", to: "#6C3483" },
  Dairy: { from: "#F7DC6F", to: "#D4AC0D" },
  "Pulses & Legumes": { from: "#784212", to: "#4A235A" },
  "Meat & Poultry": { from: "#922B21", to: "#641E16" },
  "Ingredients & Additives": { from: "#5D6D7E", to: "#2C3E50" },
  Other: { from: "#888780", to: "#5D5D5A" },
};

export default function CategoryImagesClient({
  rows,
  productCounts,
  categoryStats = {},
}: Props) {
  const [localRows, setLocalRows] = useState<CategoryImageRow[]>(rows);
  const rowMap = Object.fromEntries(localRows.map((r) => [r.category, r]));
  const categories = localRows.map((r) => r.category);

  // Core image state
  const [images, setImages] = useState<Record<string, string | null>>(
    Object.fromEntries(rows.map((r) => [r.category, r.image_url]))
  );
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlInputOpen, setUrlInputOpen] = useState<Record<string, boolean>>({});
  const [urlValues, setUrlValues] = useState<Record<string, string>>({});
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  // Alt text state
  const [altTexts, setAltTexts] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.category, r.image_alt ?? ""]))
  );
  const [altGenerating, setAltGenerating] = useState<Record<string, boolean>>(
    {}
  );
  const [altEditing, setAltEditing] = useState<Record<string, boolean>>({});
  const [altDraft, setAltDraft] = useState<Record<string, string>>({});

  // Workflow state
  const [pastedUrl, setPastedUrl] = useState<string | null>(null);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [lastClickedCat, setLastClickedCat] = useState("");
  const [quickAssign, setQuickAssign] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setQuickAssign(localStorage.getItem("fdx-quick-assign") === "true");
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      const text = e.clipboardData?.getData("text")?.trim();
      if (!text) return;

      const isImageUrl =
        /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(text) ||
        text.includes("ideogram.ai") ||
        text.includes("cdn.ideogram") ||
        text.includes("supabase");

      if (isImageUrl) {
        e.preventDefault();
        setPastedUrl(text);
        setShowAssignPanel(true);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Derived counts
  const withImage = categories.filter((cat) => !!images[cat]);
  const withImageNoAlt = withImage.filter((cat) => !altTexts[cat]);
  const withoutImage = categories.filter((cat) => !images[cat]);
  const completeCount = withImage.filter((cat) => !!altTexts[cat]).length;

  const totalScrapedProducts = Object.values(categoryStats).reduce(
    (sum, s) => sum + s.total,
    0
  );
  const totalPublishedProducts = Object.values(categoryStats).reduce(
    (sum, s) => sum + s.published,
    0
  );
  const totalProductsWithPhotos = Object.values(categoryStats).reduce(
    (sum, s) => sum + s.withPhoto,
    0
  );

  const displayedCategories =
    statusFilter === "all"
      ? categories
      : statusFilter === "complete"
      ? categories.filter((cat) => !!images[cat] && !!altTexts[cat])
      : statusFilter === "missing-alt"
      ? withImageNoAlt
      : withoutImage;

  function setCardState(cat: string, state: CardState) {
    setStates((p) => ({ ...p, [cat]: state }));
  }

  async function generateAlt(category: string, imageUrl: string) {
    if (altTexts[category]) return;
    setAltGenerating((p) => ({ ...p, [category]: true }));
    try {
      const res = await fetch("/api/admin/category-images/generate-alt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, imageUrl }),
      });
      const json = (await res.json()) as { ok: boolean; alt?: string };
      if (json.ok && json.alt) {
        setAltTexts((p) => ({ ...p, [category]: json.alt! }));
      }
    } catch {
      // silent
    } finally {
      setAltGenerating((p) => ({ ...p, [category]: false }));
    }
  }

  async function saveAlt(category: string) {
    const alt = altDraft[category] ?? "";
    try {
      await fetch("/api/admin/category-images/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, alt }),
      });
      setAltTexts((p) => ({ ...p, [category]: alt }));
      setAltEditing((p) => ({ ...p, [category]: false }));
    } catch {
      // silent
    }
  }

  async function saveImageUrl(category: string, url: string) {
    setCardState(category, "uploading");
    const res = await fetch("/api/admin/category-images/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, url }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
    setImages((p) => ({ ...p, [category]: url }));
    setCardState(category, "success");
    setTimeout(() => setCardState(category, "idle"), 2000);
    generateAlt(category, url);
  }

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    setAddingCat(true);
    try {
      await fetch("/api/admin/category-images/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: name,
          alt: `${name} — Kosher European Food Manufacturers`,
        }),
      });
      setLocalRows((prev) => [
        {
          id: name,
          category: name,
          image_url: null,
          image_alt: `${name} — Kosher European Food Manufacturers`,
          gradient_from: "#475569",
          gradient_to: "#1E293B",
        },
        ...prev,
      ]);
      setAltTexts((p) => ({
        ...p,
        [name]: `${name} — Kosher European Food Manufacturers`,
      }));
      setNewCatName("");
    } finally {
      setAddingCat(false);
    }
  }

  const handleFileUpload = useCallback(async (category: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setCardState(category, "uploading");
    setErrors((p) => ({ ...p, [category]: "" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      const res = await fetch("/api/admin/category-images/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Upload failed");
      const newUrl = json.url!;
      setImages((p) => ({ ...p, [category]: newUrl }));
      setCardState(category, "success");
      setTimeout(() => setCardState(category, "idle"), 2000);
      generateAlt(category, newUrl);
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [category]: err instanceof Error ? err.message : "Upload failed",
      }));
      setCardState(category, "error");
      setTimeout(() => setCardState(category, "idle"), 3000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUrlSave(category: string) {
    const url = urlValues[category]?.trim();
    if (!url) return;
    setErrors((p) => ({ ...p, [category]: "" }));
    try {
      await saveImageUrl(category, url);
      setUrlInputOpen((p) => ({ ...p, [category]: false }));
      setUrlValues((p) => ({ ...p, [category]: "" }));
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [category]: err instanceof Error ? err.message : "Failed",
      }));
      setCardState(category, "error");
      setTimeout(() => setCardState(category, "idle"), 3000);
    }
  }

  async function handleAssignPasted(category: string) {
    if (!pastedUrl) return;
    setShowAssignPanel(false);
    setPastedUrl(null);
    setErrors((p) => ({ ...p, [category]: "" }));
    try {
      await saveImageUrl(category, pastedUrl);
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [category]: err instanceof Error ? err.message : "Failed",
      }));
      setCardState(category, "error");
      setTimeout(() => setCardState(category, "idle"), 3000);
    }
  }

  async function handleRemove(category: string) {
    setCardState(category, "uploading");
    try {
      await fetch("/api/admin/category-images/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, url: null }),
      });
      setImages((p) => ({ ...p, [category]: null }));
      setCardState(category, "idle");
    } catch {
      setCardState(category, "idle");
    }
  }

  async function generateAllMissingAlt() {
    setBatchGenerating(true);
    for (const cat of withImageNoAlt) {
      await generateAlt(cat, images[cat]!);
    }
    setBatchGenerating(false);
  }

  function getGradient(category: string) {
    const row = rowMap[category];
    if (row?.gradient_from && row?.gradient_to) {
      return `linear-gradient(135deg, ${row.gradient_from}, ${row.gradient_to})`;
    }
    const fb = FALLBACK_GRADIENTS[category];
    if (fb) return `linear-gradient(135deg, ${fb.from}, ${fb.to})`;
    return "linear-gradient(135deg, #475569, #1E293B)";
  }

  function toggleFilter(f: StatusFilter) {
    setStatusFilter((prev) => (prev === f ? "all" : f));
  }

  const pillCls = (f: StatusFilter, activeColor: string) =>
    `text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
      statusFilter === f
        ? activeColor
        : "border-slate-200 text-slate-500 hover:border-slate-300"
    }`;

  return (
    <>
      {/* ── Page header ── */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                Categories & Public Catalog Hub
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ⚡ Auto-growing with Scraper ({categories.length} categories)
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Any new category extracted by the scraper is automatically added
              here and published to{" "}
              <Link
                href="/en/products"
                target="_blank"
                className="text-orange-600 hover:underline font-medium"
              >
                /en/products ↗
              </Link>
              . Click any card to upload a hero image, pick a real scraped
              product photo below the card, or press{" "}
              <kbd className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-1 py-0.5 rounded font-mono">
                Ctrl+V
              </kbd>{" "}
              to paste a URL.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCategory();
                }}
                placeholder="New category name…"
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400"
              />
              <button
                type="button"
                disabled={!newCatName.trim() || addingCat}
                onClick={handleCreateCategory}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition"
              >
                + Add Category
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !quickAssign;
                setQuickAssign(next);
                localStorage.setItem("fdx-quick-assign", String(next));
              }}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                quickAssign
                  ? "bg-orange-50 border-orange-300 text-orange-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              ⚡ {quickAssign ? "Quick assign ON" : "Quick assign"}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-xs font-semibold border border-slate-200 text-slate-700 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2 rounded-xl transition"
            >
              Ideogram workflow →
            </button>
          </div>
        </div>

        {/* Live Catalog KPI summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Categories
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {categories.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Scraped Products
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {totalScrapedProducts.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Published on Public Site
            </p>
            <p className="text-lg font-extrabold text-emerald-800">
              {totalPublishedProducts.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Products with Real Photos
            </p>
            <p className="text-lg font-extrabold text-blue-800">
              {totalProductsWithPhotos.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress section */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Category Hero Image Coverage</span>
            <span>
              {withImage.length}/{categories.length} categories have hero images
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  categories.length > 0
                    ? (withImage.length / categories.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleFilter("complete")}
              className={pillCls(
                "complete",
                "bg-green-100 border-green-300 text-green-700"
              )}
            >
              ✓ Complete: {completeCount}
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("missing-alt")}
              className={pillCls(
                "missing-alt",
                "bg-amber-100 border-amber-300 text-amber-700"
              )}
            >
              ⚠ Missing alt: {withImageNoAlt.length}
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("no-image")}
              className={pillCls(
                "no-image",
                "bg-red-100 border-red-300 text-red-600"
              )}
            >
              ✗ No image: {withoutImage.length}
            </button>
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Clear ×
              </button>
            )}
            {withImageNoAlt.length > 0 && (
              <button
                type="button"
                onClick={generateAllMissingAlt}
                disabled={batchGenerating}
                className="ml-auto text-xs border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 disabled:opacity-50 px-3 py-1 rounded-xl transition"
              >
                {batchGenerating
                  ? "Generating…"
                  : `Generate ${withImageNoAlt.length} missing alt text${
                      withImageNoAlt.length !== 1 ? "s" : ""
                    }`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Category grid ── */}
      <div className="p-8">
        {displayedCategories.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">
            No categories match this filter.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCategories.map((cat) => {
            const cardState = states[cat] ?? "idle";
            const imageUrl = images[cat];
            const isDragging = draggingOver === cat;
            const isUrlOpen = urlInputOpen[cat] ?? false;
            const errorMsg = errors[cat];
            const altText = altTexts[cat] ?? "";
            const isAltGenerating = altGenerating[cat] ?? false;
            const isAltEditing = altEditing[cat] ?? false;
            const needsImage = !imageUrl && quickAssign;
            const st = categoryStats[cat];
            const totalCount = st?.total ?? productCounts[cat] ?? 0;
            const pubCount = st?.published ?? totalCount;
            const photoCount = st?.withPhoto ?? 0;
            const samples = st?.samplePhotos ?? [];
            const slug = toCategorySlug(cat);

            return (
              <div
                key={cat}
                className={`rounded-2xl overflow-visible border bg-white flex flex-col transition-all shadow-2xs ${
                  cardState === "error"
                    ? "border-red-400 shadow-md shadow-red-100"
                    : isDragging
                    ? "border-orange-400"
                    : needsImage
                    ? "border-2 border-dashed border-orange-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Image area */}
                <div
                  className="relative cursor-pointer group overflow-hidden rounded-t-2xl"
                  style={{ height: 160 }}
                  onClick={() => {
                    setLastClickedCat(cat);
                    if (quickAssign && !imageUrl) {
                      setUrlInputOpen((p) => ({ ...p, [cat]: true }));
                    } else {
                      fileInputRefs.current[cat]?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDraggingOver(cat);
                  }}
                  onDragLeave={() => setDraggingOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggingOver(null);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(cat, file);
                  }}
                >
                  {/* Gradient base layer */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: getGradient(cat) }}
                  >
                    <span className="text-white font-semibold text-sm px-3 text-center drop-shadow">
                      {cat}
                    </span>
                  </div>

                  {/* Image floats above; hides itself on error */}
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={altText || cat}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  {/* Top-left count pill */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      {totalCount.toLocaleString()} products
                    </span>
                    {photoCount > 0 && (
                      <span className="bg-blue-600/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        🖼 {photoCount} photos
                      </span>
                    )}
                  </div>

                  {/* Quick assign badge */}
                  {needsImage && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                      <span className="bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Click to paste URL
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <span className="text-white text-xs font-medium bg-black/40 px-3 py-1.5 rounded-lg">
                      {quickAssign && !imageUrl
                        ? "Click to paste URL"
                        : "Click to upload hero image"}
                    </span>
                  </div>

                  {isDragging && (
                    <div className="absolute inset-0 bg-orange-500/20 border-2 border-dashed border-orange-500 rounded-t-2xl flex items-center justify-center">
                      <span className="text-orange-700 text-xs font-semibold">
                        Drop to upload
                      </span>
                    </div>
                  )}

                  {cardState === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-white text-xs">Saving…</span>
                      </div>
                    </div>
                  )}

                  {cardState === "success" && (
                    <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-t-2xl">
                      <span className="text-white text-sm font-semibold">
                        ✓ Saved
                      </span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={(el) => {
                      fileInputRefs.current[cat] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(cat, file);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Action bar */}
                <div className="px-3.5 py-2.5 flex items-center gap-2 bg-white border-t border-slate-100">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-900 truncate block leading-tight">
                      {cat}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{pubCount.toLocaleString()} public</span>
                      <span>·</span>
                      <Link
                        href={`/admin/products?category=${encodeURIComponent(
                          cat
                        )}`}
                        className="text-orange-600 hover:underline font-medium"
                      >
                        Admin ↗
                      </Link>
                      <span>·</span>
                      <Link
                        href={`/en/products/${slug}`}
                        target="_blank"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Live ↗
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setUrlInputOpen((p) => ({ ...p, [cat]: !p[cat] }))
                    }
                    className="text-[11px] font-medium text-slate-600 hover:text-orange-600 border border-slate-200 transition px-2 py-1 rounded-lg"
                  >
                    {isUrlOpen ? "Cancel" : "URL"}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemove(cat)}
                      className="text-[11px] text-red-400 hover:text-red-600 transition px-1.5 py-1 rounded"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Sample scraped product photos strip (1-click use as category hero) */}
                {samples.length > 0 && (
                  <div className="px-3.5 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                      Scraped samples:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {samples.slice(0, 5).map((sp, i) => (
                        <button
                          key={i}
                          type="button"
                          title={`Use photo from "${sp.name}" as category hero`}
                          onClick={() => saveImageUrl(cat, sp.url)}
                          className="w-7 h-7 rounded-md overflow-hidden border border-slate-200 hover:border-orange-500 shrink-0 transition hover:scale-105 bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sp.url}
                            alt={sp.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alt text display */}
                {(altText || isAltGenerating) && !isAltEditing && (
                  <div className="px-3.5 pb-2.5 pt-1.5 bg-white border-t border-slate-50 flex items-start justify-between gap-2 rounded-b-2xl">
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {isAltGenerating
                        ? "Generating alt text…"
                        : `Alt: ${altText.slice(0, 60)}${
                            altText.length > 60 ? "…" : ""
                          }`}
                    </p>
                    {!isAltGenerating && (
                      <button
                        type="button"
                        onClick={() => {
                          setAltEditing((p) => ({ ...p, [cat]: true }));
                          setAltDraft((p) => ({ ...p, [cat]: altText }));
                        }}
                        className="text-[11px] text-orange-500 hover:text-orange-600 shrink-0 transition"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}

                {/* Alt text edit */}
                {isAltEditing && (
                  <div className="px-3.5 pb-3 pt-1.5 bg-white border-t border-slate-50 flex flex-col gap-2 rounded-b-2xl">
                    <textarea
                      rows={2}
                      value={altDraft[cat] ?? ""}
                      onChange={(e) =>
                        setAltDraft((p) => ({ ...p, [cat]: e.target.value }))
                      }
                      placeholder="Image alt text…"
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-orange-400 w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveAlt(cat)}
                        className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAltEditing((p) => ({ ...p, [cat]: false }))
                        }
                        className="text-xs text-slate-500 hover:text-slate-700 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* URL paste row */}
                {isUrlOpen && (
                  <div className="px-3.5 pb-3 pt-1.5 bg-white border-t border-slate-50 rounded-b-2xl flex gap-2">
                    <input
                      type="url"
                      value={urlValues[cat] ?? ""}
                      onChange={(e) =>
                        setUrlValues((p) => ({ ...p, [cat]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUrlSave(cat);
                      }}
                      placeholder="Paste image URL…"
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleUrlSave(cat)}
                      disabled={!urlValues[cat]?.trim()}
                      className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      Use
                    </button>
                  </div>
                )}

                {/* Error */}
                {cardState === "error" && errorMsg && (
                  <div className="px-3.5 pb-2 bg-white rounded-b-2xl">
                    <p className="text-[11px] text-red-500">{errorMsg}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEO Status Table ── */}
      <div className="px-8 pb-12">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Category & SEO Status Overview
        </h2>
        <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-slate-600">
            <thead className="bg-slate-50 text-left border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-500">
                  Category
                </th>
                <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">
                  Total Products
                </th>
                <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">
                  With Photos
                </th>
                <th className="px-4 py-2.5 font-semibold text-slate-500">
                  Public URL Slug
                </th>
                <th className="px-4 py-2.5 font-semibold text-slate-500">
                  Alt text
                </th>
                <th className="px-4 py-2.5 font-semibold text-slate-500">
                  Hero Status
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const hasImage = !!images[cat];
                const hasAlt = !!(altTexts[cat] ?? "");
                const status = !hasImage
                  ? "✗ No image"
                  : !hasAlt
                  ? "⚠ Missing alt"
                  : "✓ Complete";
                const statusCls = !hasImage
                  ? "text-red-500"
                  : !hasAlt
                  ? "text-amber-600"
                  : "text-green-600";
                const st = categoryStats[cat];

                return (
                  <tr key={cat} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {cat}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {(st?.total ?? productCounts[cat] ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-blue-700 font-medium">
                      {(st?.withPhoto ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">
                      /en/products/{toCategorySlug(cat)}
                    </td>
                    <td className="px-4 py-2.5 truncate max-w-45 text-slate-500">
                      {altTexts[cat] || "—"}
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${statusCls}`}>
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Global paste assign panel ── */}
      {showAssignPanel && pastedUrl && (
        <PasteAssignPanel
          url={pastedUrl}
          categories={categories}
          initialCategory={lastClickedCat}
          images={images}
          onAssign={handleAssignPasted}
          onDismiss={() => {
            setShowAssignPanel(false);
            setPastedUrl(null);
          }}
        />
      )}

      {/* ── Ideogram workflow drawer ── */}
      {drawerOpen && (
        <IdeogramDrawer
          categories={categories}
          images={images}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ArrayInput from "@/components/admin/ArrayInput";
import type { CatalogueProductInput } from "@/app/admin/catalogue/actions";

type ActionResult = { ok: boolean; id?: string; error?: string };
type Action = (data: CatalogueProductInput) => Promise<ActionResult>;

interface Props {
  action: Action;
  initialData?: Partial<CatalogueProductInput> & { id?: string };
  redirectOnCreate?: string;
}

const CATEGORIES = [
  "Tomato Products",
  "Pasta & Grains",
  "Snacks",
  "Dairy",
  "Beverages",
  "Sauces & Condiments",
  "Canned Foods",
  "Frozen Foods",
  "Oils & Fats",
  "Fish & Seafood",
  "Bakery",
  "Spices & Herbs",
  "Meat & Poultry",
  "Pulses & Legumes",
  "Organic & Natural",
  "Ingredients & Additives",
  "Other",
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
      <span className="text-sm text-gray-700 font-medium">{label}</span>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{children}</p>;
}

export default function CatalogueProductForm({ action, initialData, redirectOnCreate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Section 1 — Product identity
  const [productName, setProductName] = useState(initialData?.product_name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [subcategory, setSubcategory] = useState(initialData?.subcategory ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialData?.country_of_origin ?? "");
  const [format, setFormat] = useState(initialData?.format ?? "");
  const [size, setSize] = useState(initialData?.size ?? "");
  const [certifications, setCertifications] = useState<string[]>(initialData?.certifications ?? []);
  const [privateLabel, setPrivateLabel] = useState(initialData?.private_label_available ?? false);

  // Section 2 — Brand
  const [brandName, setBrandName] = useState(initialData?.brand_name ?? "");
  const [tagline, setTagline] = useState(initialData?.tagline ?? "");
  const [rationale, setRationale] = useState(initialData?.brand_name_rationale ?? "");
  const [generatingBrand, setGeneratingBrand] = useState(false);
  const [brandError, setBrandError] = useState("");

  // Section 3 — Image
  const [imageUrl, setImageUrl] = useState(initialData?.catalogue_image_url ?? "");
  const [imagePrompt, setImagePrompt] = useState(initialData?.image_prompt ?? "");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  // Section 4 — Settings
  const [status, setStatus] = useState<"draft" | "ready" | "archived">(initialData?.status ?? "draft");
  const [featured, setFeatured] = useState(initialData?.featured ?? false);
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [internalNotes, setInternalNotes] = useState(initialData?.internal_notes ?? "");

  async function handleGenerateBrand() {
    if (!productName || !category) {
      setBrandError("Product name and category required");
      return;
    }
    setGeneratingBrand(true);
    setBrandError("");
    try {
      const res = await fetch("/api/admin/catalogue/generate-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          category,
          country_of_origin: countryOfOrigin,
          format,
          certifications,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setBrandError(data.error ?? "Generation failed");
        return;
      }
      if (data.brand_name) setBrandName(data.brand_name as string);
      if (data.tagline) setTagline(data.tagline as string);
      if (data.rationale) setRationale(data.rationale as string);
      if (data.image_prompt) setImagePrompt(data.image_prompt as string);
    } catch {
      setBrandError("Network error");
    } finally {
      setGeneratingBrand(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/sourcing/upload-image?bucket=suppliers", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.url) {
        setImageUrl(data.url as string);
        if (initialData?.id) {
          const { updateImageUrl } = await import("@/app/admin/catalogue/actions");
          await updateImageUrl(initialData.id, data.url as string);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await action({
        product_name: productName,
        brand_name: brandName || null,
        tagline: tagline || null,
        category,
        subcategory: subcategory || null,
        format: format || null,
        size: size || null,
        country_of_origin: countryOfOrigin || null,
        certifications,
        private_label_available: privateLabel,
        catalogue_image_url: imageUrl || null,
        image_prompt: imagePrompt || null,
        brand_name_rationale: rationale || null,
        status,
        featured,
        tags,
        internal_notes: internalNotes || null,
        supplier_id: null,
      });

      if (!result.ok) {
        setError(result.error ?? "Save failed");
        return;
      }

      if (redirectOnCreate && result.id) {
        router.push(redirectOnCreate.replace("[id]", result.id));
      } else if (redirectOnCreate) {
        router.push(redirectOnCreate);
      }
    });
  }

  const inputCls =
    "border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition";

  const sectionCls = "bg-white border border-gray-200 rounded-2xl p-6 space-y-4";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-12">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Section 1 — Product identity */}
      <div className={sectionCls}>
        <SectionLabel>Product identity</SectionLabel>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Product name *</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Extra Virgin Olive Oil"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Subcategory</label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. Finishing oils"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Country of origin</label>
            <input
              type="text"
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value)}
              placeholder="e.g. Spain"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Format</label>
            <input
              type="text"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="e.g. Glass bottle 750ml"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Size</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. 750ml"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition"
          />
        </div>

        <ArrayInput values={certifications} onChange={setCertifications} label="Certifications" placeholder="e.g. Kosher, BRC" />

        <Toggle checked={privateLabel} onChange={setPrivateLabel} label="Private label available" />
      </div>

      {/* Section 2 — Brand */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <SectionLabel>Brand identity</SectionLabel>
          <button
            type="button"
            onClick={handleGenerateBrand}
            disabled={generatingBrand || !productName || !category}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
          >
            {generatingBrand ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              "✦ Generate brand"
            )}
          </button>
        </div>

        {brandError && (
          <p className="text-xs text-red-600">{brandError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Brand name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Valloria"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. From the hills of Andalusia"
              className={inputCls}
            />
          </div>
        </div>

        {rationale && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">
              Brand rationale
            </p>
            <p className="text-sm text-orange-800 italic">{rationale}</p>
          </div>
        )}
      </div>

      {/* Section 3 — Catalogue image */}
      <div className={sectionCls}>
        <SectionLabel>Catalogue image</SectionLabel>

        {imageUrl && (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Product"
              className="max-h-64 object-contain rounded-xl border border-gray-100"
            />
          </div>
        )}

        <div className="flex gap-3 items-start flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <span>📎</span>
                Upload image
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </label>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Or paste image URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => {
                if (imageUrlInput.trim()) setImageUrl(imageUrlInput.trim());
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition whitespace-nowrap"
            >
              Set URL
            </button>
          </div>
        </div>

        {imagePrompt && (
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Image prompt (AI-generated)</label>
            <textarea
              value={imagePrompt}
              readOnly
              rows={4}
              className="border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600 w-full bg-gray-50 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <a
                href="https://ideogram.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Open Ideogram →
              </a>
              <a
                href="https://www.midjourney.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Open Midjourney →
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Copy the prompt above, paste into Ideogram or Midjourney, download the result, upload it above.
            </p>
          </div>
        )}

        {/* Social card */}
        {initialData?.id && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Social card (1080×1080)
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href={`/api/admin/catalogue/social-card?id=${initialData.id}&bg=light`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-slate-200 hover:border-orange-400 text-slate-600 hover:text-orange-600 px-4 py-2 rounded-lg text-sm transition"
              >
                ☀️ Light card
              </a>
              <a
                href={`/api/admin/catalogue/social-card?id=${initialData.id}&bg=dark`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                🌙 Dark card
              </a>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Opens in new tab. Screenshot with Cmd+Shift+4 (Mac) or Win+Shift+S (Windows).
              1080×1080px — ready for Instagram and LinkedIn.
            </p>
          </div>
        )}
      </div>

      {/* Section 4 — Settings */}
      <div className={sectionCls}>
        <SectionLabel>Settings</SectionLabel>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "ready" | "archived")}
              className={inputCls}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <Toggle checked={featured} onChange={setFeatured} label="Featured" />
          </div>
        </div>

        <ArrayInput values={tags} onChange={setTags} label="Tags" placeholder="e.g. kosher, private label, retail" />

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Internal notes</label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Notes for internal use only"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition resize-none"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !productName || !category}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition"
        >
          {pending ? "Saving…" : "Save product"}
        </button>
      </div>

    </div>
  );
}

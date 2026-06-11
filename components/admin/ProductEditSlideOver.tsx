"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import ArrayInput from "@/components/admin/ArrayInput";
import {
  updateProduct,
  deleteProduct,
  getFactoriesForSupplier,
  type FactoryOption,
} from "@/app/admin/products/actions";

const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

const KOSHER_OPTIONS = [
  "Chief Rabbinate",
  "Badatz Beit Yosef",
  "Badatz Eida Chareidis",
  "Mehadrin",
  "OU Kosher",
  "OK Kosher",
  "KF Kosher",
];

const QUALITY_CERTS = [
  "BRC",
  "IFS",
  "FSSC 22000",
  "ISO 22000",
  "ISO 9001",
  "HACCP",
  "GlobalG.A.P.",
];

const DIETARY_CERTS = ["Organic", "Halal", "Gluten Free", "Vegan", "Non-GMO"];

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  certifications: string[];
  kosher_types: string[];
  formats: string[];
  description: string | null;
  needs_review: boolean;
  scrape_confidence: number;
  manually_verified: boolean;
  private_label: boolean;
  image_url: string | null;
  supplier_id: string;
  factory_id?: string | null;
  product_override_kosher?: boolean;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
  } | null;
};

interface Props {
  product: ProductRow;
  onClose: () => void;
  onSave: (updated: ProductRow) => void;
  onDelete: (id: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function InheritancePreview({ factory }: { factory: FactoryOption }) {
  const inherited = [
    ...factory.kosher_types,
    ...factory.certifications_quality,
    ...factory.certifications_dietary,
  ];
  if (inherited.length === 0) return null;
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mt-2">
      <p className="text-xs font-semibold text-green-700 mb-1">
        Inheriting from {factory.factory_name}:
      </p>
      <div className="flex flex-wrap gap-1">
        {factory.kosher_types.map((k) => (
          <span key={k} className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
            ✡ {k}
          </span>
        ))}
        {[...factory.certifications_quality, ...factory.certifications_dietary].map((c) => (
          <span key={c} className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProductEditSlideOver({
  product,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [form, setForm] = useState({
    product_name: product.product_name,
    category: product.category,
    kosher_types: [...product.kosher_types],
    certifications: [...product.certifications],
    formats: [...product.formats],
    description: product.description ?? "",
    manually_verified: product.manually_verified,
    needs_review: product.needs_review,
    factory_id: product.factory_id ?? null,
    product_override_kosher: product.product_override_kosher ?? false,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(product.image_url);
  const [imageUrlInput, setImageUrlInput] = useState(product.image_url ?? "");
  const [previewBroken, setPreviewBroken] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    getFactoriesForSupplier(product.supplier_id).then(setFactories);
  }, [product.supplier_id]);

  useEffect(() => {
    setPreviewBroken(false);
  }, [imageUrl]);

  const selectedFactory = factories.find((f) => f.id === form.factory_id) ?? null;

  function handleFile(file: File) {
    setUploadError(null);

    // Show the picked file immediately via a base64 data URL preview.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    (async () => {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${product.supplier_id}/${product.id}.${ext}`;
        const { error: uploadErr } = await supabaseStorage.storage
          .from("product-images")
          .upload(path, file, { upsert: true });

        if (uploadErr) {
          setUploadError(
            /not found/i.test(uploadErr.message)
              ? `Bucket "product-images" not found — ask an admin to create it in Supabase Storage.`
              : uploadErr.message
          );
          return;
        }

        const { data: pub } = supabaseStorage.storage.from("product-images").getPublicUrl(path);
        setImageUrl(pub.publicUrl);
        setImageUrlInput(pub.publicUrl);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    })();
  }

  function clearImage() {
    setImageUrl(null);
    setImageUrlInput("");
    setUploadError(null);
  }

  function toggleKosher(k: string) {
    setForm((f) => ({
      ...f,
      kosher_types: f.kosher_types.includes(k)
        ? f.kosher_types.filter((x) => x !== k)
        : [...f.kosher_types, k],
    }));
  }

  function toggleCert(c: string) {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.includes(c)
        ? f.certifications.filter((x) => x !== c)
        : [...f.certifications, c],
    }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateProduct(product.id, {
      product_name: form.product_name,
      category: form.category,
      kosher_types: form.kosher_types,
      certifications: form.certifications,
      formats: form.formats,
      description: form.description.trim() || null,
      manually_verified: form.manually_verified,
      needs_review: form.needs_review,
      factory_id: form.factory_id,
      product_override_kosher: form.product_override_kosher,
      image_url: imageUrl,
    });
    setSaving(false);
    if (result.ok) {
      onSave({
        ...product,
        product_name: form.product_name,
        category: form.category,
        kosher_types: form.kosher_types,
        certifications: form.certifications,
        formats: form.formats,
        description: form.description.trim() || null,
        manually_verified: form.manually_verified,
        needs_review: form.needs_review,
        factory_id: form.factory_id,
        product_override_kosher: form.product_override_kosher,
        image_url: imageUrl,
      });
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const result = await deleteProduct(product.id);
    if (result.ok) {
      onDelete(product.id);
    }
  }

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200";

  return (
    <>
      {/* Backdrop — blocks page interaction but does not close on click */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {product.product_name}
            </p>
            {product.supplier && (
              <p className="text-xs text-slate-400 mt-0.5">
                {product.supplier.company_name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Image */}
          <div>
            <SectionLabel>Image</SectionLabel>
            <div className="flex gap-4 items-start">
              <div className="shrink-0">
                {imageUrl && !previewBroken ? (
                  <img
                    src={imageUrl}
                    alt="Product preview"
                    className="w-30 h-30 rounded-lg object-cover border border-gray-200"
                    onError={() => setPreviewBroken(true)}
                  />
                ) : (
                  <div className="w-30 h-30 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-300"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div>
                  <SectionLabel>Image URL</SectionLabel>
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onBlur={() => {
                      const trimmed = imageUrlInput.trim();
                      if (trimmed.startsWith("http")) {
                        setImageUrl(trimmed);
                      }
                    }}
                    placeholder="https://example.com/product.jpg"
                    className={inputCls}
                  />
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 text-xs text-gray-400 transition ${
                    dragOver ? "border-orange-300 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2 text-gray-500">
                      <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                      Uploading…
                    </span>
                  ) : (
                    <>
                      <span>or drag &amp; drop an image</span>
                      <label className="text-orange-600 hover:text-orange-700 cursor-pointer underline">
                        browse
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFile(file);
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                      </label>
                    </>
                  )}
                </div>

                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

                {imageUrl && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕ Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Product name */}
          <div>
            <SectionLabel>Product name</SectionLabel>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, product_name: e.target.value }))
              }
              className={inputCls}
            />
          </div>

          {/* Category */}
          <div>
            <SectionLabel>Category</SectionLabel>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Factory */}
          <div>
            <SectionLabel>Factory</SectionLabel>
            <p className="text-xs text-gray-500 mb-2">
              Certifications are inherited from the factory unless overridden
            </p>
            <select
              value={form.factory_id ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  factory_id: e.target.value || null,
                  product_override_kosher: e.target.value
                    ? f.product_override_kosher
                    : false,
                }))
              }
              className={inputCls}
            >
              <option value="">No factory assigned</option>
              {factories.map((factory) => (
                <option key={factory.id} value={factory.id}>
                  {factory.factory_name}
                  {factory.city ? ` — ${factory.city}` : ""}
                  {factory.country ? `, ${factory.country}` : ""}
                </option>
              ))}
            </select>

            {selectedFactory && !form.product_override_kosher && (
              <InheritancePreview factory={selectedFactory} />
            )}

            {form.factory_id && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.product_override_kosher}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      product_override_kosher: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
                />
                <span className="text-sm text-gray-700">
                  Override factory certifications for this product
                </span>
              </label>
            )}
          </div>

          {/* Kosher — shown when no factory assigned or override is ON */}
          {(!form.factory_id || form.product_override_kosher) && (
            <div>
              <SectionLabel>Kosher</SectionLabel>
              <div className="space-y-2">
                {KOSHER_OPTIONS.map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.kosher_types.includes(k)}
                      onChange={() => toggleKosher(k)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
                    />
                    <span className="text-sm text-gray-700">{k}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Quality certifications — shown when no factory or override is ON */}
          {(!form.factory_id || form.product_override_kosher) && (
            <div>
              <SectionLabel>Quality certifications</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {QUALITY_CERTS.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.certifications.includes(c)}
                      onChange={() => toggleCert(c)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
                    />
                    <span className="text-sm text-gray-700">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dietary — shown when no factory or override is ON */}
          {(!form.factory_id || form.product_override_kosher) && (
            <div>
              <SectionLabel>Dietary</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_CERTS.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.certifications.includes(c)}
                      onChange={() => toggleCert(c)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
                    />
                    <span className="text-sm text-gray-700">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Formats */}
          <ArrayInput
            label="Formats"
            values={form.formats}
            onChange={(formats) => setForm((f) => ({ ...f, formats }))}
            placeholder="e.g. bulk, tin, jar — press Enter"
          />

          {/* Description */}
          <div>
            <SectionLabel>Description</SectionLabel>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Status toggles */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Manually verified</span>
              <input
                type="checkbox"
                checked={form.manually_verified}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    manually_verified: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Needs review</span>
              <input
                type="checkbox"
                checked={form.needs_review}
                onChange={(e) =>
                  setForm((f) => ({ ...f, needs_review: e.target.checked }))
                }
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 px-5 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition"
          >
            Delete product
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
          >
            {saving && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}

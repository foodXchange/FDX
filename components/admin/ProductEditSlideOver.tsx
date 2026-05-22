"use client";

import { useState } from "react";
import ArrayInput from "@/components/admin/ArrayInput";
import { updateProduct, deleteProduct } from "@/app/admin/products/actions";

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
  supplier_id: string;
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

export default function ProductEditSlideOver({
  product,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: product.product_name,
    category: product.category,
    kosher_types: [...product.kosher_types],
    certifications: [...product.certifications],
    formats: [...product.formats],
    description: product.description ?? "",
    manually_verified: product.manually_verified,
    needs_review: product.needs_review,
  });

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

          {/* Kosher */}
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

          {/* Quality certifications */}
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

          {/* Dietary */}
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

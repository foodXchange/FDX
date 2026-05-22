"use client";

import { useState, useTransition } from "react";
import {
  saveSupplierProduct,
  deleteSupplierProduct,
  applyKosherToAllProducts,
  applyBulkCertification,
  type ProductFormData,
} from "@/app/admin/suppliers/[id]/actions";

export interface SupplierProduct {
  id: string;
  product_name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  formats: string[];
  sizes: string[];
  certifications: string[];
  kosher_types: string[];
  product_type: string | null;
  primary_ingredients: string[];
  private_label: boolean;
  tags: string[];
  markets_suitable: string[];
  scrape_confidence: number;
  manually_verified: boolean;
  factory_id: string | null;
}

const VALID_CATEGORIES = [
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
  "OU",
  "OK Kosher",
  "KF Kosher",
  "Star-K",
];

const QUALITY_CERTS = [
  "BRC",
  "IFS",
  "FSSC 22000",
  "ISO 22000",
  "ISO 9001",
  "HACCP",
  "SQF",
  "GlobalG.A.P.",
  "FDA Registered",
];

const DIETARY_CERTS = [
  "Organic",
  "Halal",
  "Gluten Free",
  "Vegan",
  "Non-GMO",
  "Rainforest Alliance",
  "Fairtrade",
];

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const labelCls =
  "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";

const BULK_ACTIONS = [
  { label: "✡ Add Chief Rabbinate kosher", type: "kosher", values: ["Chief Rabbinate"] },
  { label: "✡ Add Badatz Beit Yosef kosher", type: "kosher", values: ["Badatz Beit Yosef"] },
  { label: "✡ Add Mehadrin kosher", type: "kosher", values: ["Mehadrin"] },
  { label: "✓ Add BRC certification", type: "quality", values: ["BRC"] },
  { label: "✓ Add IFS certification", type: "quality", values: ["IFS"] },
  { label: "✓ Add HACCP", type: "quality", values: ["HACCP"] },
  { label: "✓ Add Organic", type: "dietary", values: ["Organic"] },
  { label: "✓ Add Halal", type: "dietary", values: ["Halal"] },
] as const;

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8 ? "bg-green-500" : score >= 0.5 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs rounded-full px-2 py-0.5"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-slate-400 hover:text-slate-700 leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          placeholder="Type and press Enter"
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mt-4 mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-gray-300 text-orange-500"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function EMPTY_FORM(): ProductFormData {
  return {
    product_name: "",
    category: "Other",
    subcategory: null,
    description: null,
    formats: [],
    sizes: [],
    certifications: [],
    kosher_types: [],
    product_type: null,
    primary_ingredients: [],
    private_label: false,
    tags: [],
    markets_suitable: [],
    manually_verified: false,
    factory_id: null,
  };
}

function ProductSlideOver({
  supplierId,
  product,
  onSave,
  onClose,
}: {
  supplierId: string;
  product: SupplierProduct | null;
  onSave: (p: SupplierProduct) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductFormData>(
    product
      ? {
          product_name: product.product_name,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          formats: product.formats,
          sizes: product.sizes,
          certifications: product.certifications,
          kosher_types: product.kosher_types,
          product_type: product.product_type,
          primary_ingredients: product.primary_ingredients,
          private_label: product.private_label,
          tags: product.tags,
          markets_suitable: product.markets_suitable,
          manually_verified: product.manually_verified,
          factory_id: product.factory_id,
        }
      : EMPTY_FORM()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductFormData>(key: K, val: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    if (!form.product_name.trim()) {
      setError("Product name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveSupplierProduct(supplierId, product?.id ?? null, form);
      if (!result.ok) {
        setError(result.error ?? "Save failed");
        return;
      }
      onSave({
        id: result.id ?? product?.id ?? "",
        scrape_confidence: product?.scrape_confidence ?? 1.0,
        ...form,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            {product ? "Edit product" : "Add product"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={labelCls}>Product name *</label>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputCls}
              >
                {VALID_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subcategory</label>
              <input
                type="text"
                value={form.subcategory ?? ""}
                onChange={(e) => set("subcategory", e.target.value || null)}
                placeholder="e.g. Crushed tomatoes"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <TagInput
            label="Formats"
            values={form.formats}
            onChange={(v) => set("formats", v)}
          />
          <TagInput
            label="Sizes"
            values={form.sizes}
            onChange={(v) => set("sizes", v)}
          />

          <CheckGroup
            label="Kosher certification"
            options={KOSHER_OPTIONS}
            selected={form.kosher_types}
            onChange={(v) => set("kosher_types", v)}
          />
          <CheckGroup
            label="Food safety certifications"
            options={QUALITY_CERTS}
            selected={form.certifications}
            onChange={(v) => set("certifications", v)}
          />
          <CheckGroup
            label="Dietary & sustainability"
            options={DIETARY_CERTS}
            selected={form.certifications}
            onChange={(v) => set("certifications", v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Product type</label>
              <select
                value={form.product_type ?? ""}
                onChange={(e) => set("product_type", e.target.value || null)}
                className={inputCls}
              >
                <option value="">— Unknown —</option>
                <option value="pure_ingredient">Pure ingredient</option>
                <option value="processed_food">Processed food</option>
                <option value="semi_processed">Semi-processed</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.private_label}
                  onChange={(e) => set("private_label", e.target.checked)}
                  className="rounded"
                />
                Private label
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.manually_verified}
                onChange={(e) => set("manually_verified", e.target.checked)}
                className="rounded"
              />
              Manually verified
            </label>
          </div>

          {product && (
            <div className="text-xs text-gray-400">
              Confidence: {Math.round(product.scrape_confidence * 100)}%
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SupplierProductsTab({
  supplierId,
  initialProducts,
}: {
  supplierId: string;
  initialProducts: SupplierProduct[];
}) {
  const [products, setProducts] = useState<SupplierProduct[]>(initialProducts);
  const [slideOver, setSlideOver] = useState<{
    open: boolean;
    product: SupplierProduct | null;
  }>({ open: false, product: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [pending, startTransition] = useTransition();

  function handleProductSave(saved: SupplierProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setSlideOver({ open: false, product: null });
  }

  function handleDelete(product: SupplierProduct) {
    if (!confirm(`Delete "${product.product_name}"?`)) return;
    startTransition(async () => {
      const result = await deleteSupplierProduct(supplierId, product.id);
      if (!result.ok) {
        alert(result.error ?? "Delete failed");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyBulk() {
    if (!bulkAction) return;
    const action = BULK_ACTIONS.find((a) => a.label === bulkAction);
    if (!action) return;
    if (!confirm(`Apply "${action.label}" to ALL ${products.length} products?`)) return;

    startTransition(async () => {
      const actionValues = [...action.values] as string[];
      if (action.type === "kosher") {
        await applyKosherToAllProducts(supplierId, actionValues);
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            kosher_types: Array.from(new Set([...p.kosher_types, ...actionValues])),
          }))
        );
      } else if (action.type === "quality" || action.type === "dietary") {
        await applyBulkCertification(supplierId, action.type, actionValues);
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            certifications: Array.from(new Set([...p.certifications, ...actionValues])),
          }))
        );
      }
    });
  }

  return (
    <div className="p-6">
      {/* Bulk action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-500">Apply to ALL products:</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-300"
          >
            <option value="">— Choose action —</option>
            {BULK_ACTIONS.map((a) => (
              <option key={a.label} value={a.label}>{a.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulk}
            disabled={!bulkAction || pending}
            className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            Apply
          </button>
        </div>

        <button
          onClick={() => setSlideOver({ open: true, product: null })}
          className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          + Add product
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No products yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 w-8" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  Kosher
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  Conf
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  Verified
                </th>
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-gray-900">{p.product_name}</span>
                    {p.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {p.certifications.slice(0, 3).map((c) => (
                          <span key={c} className="text-xs bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{p.category}</td>
                  <td className="px-3 py-2.5">
                    {p.kosher_types.length > 0 ? (
                      <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">
                        ✡ {p.kosher_types[0]}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <ConfidenceBar score={p.scrape_confidence} />
                  </td>
                  <td className="px-3 py-2.5">
                    {p.manually_verified ? (
                      <span className="text-green-600 text-xs">✓ Verified</span>
                    ) : (
                      <span className="text-gray-300 text-xs">○</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSlideOver({ open: true, product: p })}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {slideOver.open && (
        <ProductSlideOver
          supplierId={supplierId}
          product={slideOver.product}
          onSave={handleProductSave}
          onClose={() => setSlideOver({ open: false, product: null })}
        />
      )}
    </div>
  );
}

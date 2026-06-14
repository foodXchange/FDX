"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import ProductImage from "@/components/ProductImage";
import {
  createSupplierProduct,
  updateSupplierProduct,
  deleteSupplierProduct,
  type SupplierPortalProductData,
} from "@/app/en/supplier-portal/products/actions";

const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SupplierPortalProduct {
  id: string;
  product_name: string;
  category: string;
  description: string | null;
  certifications: string[];
  kosher_types: string[];
  private_label: boolean;
  image_url: string | null;
  image_source: string | null;
  is_published: boolean;
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

const QUALITY_CERTS = ["BRC", "IFS", "FSSC 22000", "ISO 22000", "ISO 9001", "HACCP", "SQF", "GlobalG.A.P.", "FDA Registered"];

const DIETARY_CERTS = ["Organic", "Halal", "Gluten Free", "Vegan", "Non-GMO", "Rainforest Alliance", "Fairtrade"];

function EMPTY_FORM(): SupplierPortalProductData {
  return {
    product_name: "",
    category: "Other",
    description: null,
    certifications: [],
    kosher_types: [],
    private_label: false,
    image_url: null,
    image_source: null,
  };
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
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }
  return (
    <div>
      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-white/20"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function ProductSlideOver({
  supplierId,
  product,
  onSave,
  onClose,
}: {
  supplierId: string;
  product: SupplierPortalProduct | null;
  onSave: (p: SupplierPortalProduct) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SupplierPortalProductData>(
    product
      ? {
          product_name: product.product_name,
          category: product.category,
          description: product.description,
          certifications: product.certifications,
          kosher_types: product.kosher_types,
          private_label: product.private_label,
          image_url: product.image_url,
          image_source: product.image_source,
        }
      : EMPTY_FORM()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [imageUrlInput, setImageUrlInput] = useState(product?.image_url ?? "");
  const [previewBroken, setPreviewBroken] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tempId] = useState(() => product?.id ?? crypto.randomUUID());

  useEffect(() => {
    setPreviewBroken(false);
  }, [form.image_url]);

  function set<K extends keyof SupplierPortalProductData>(key: K, val: SupplierPortalProductData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleFile(file: File) {
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") set("image_url", reader.result);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    (async () => {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${supplierId}/${tempId}.${ext}`;
        const { error: uploadErr } = await supabaseStorage.storage
          .from("product-images")
          .upload(path, file, { upsert: true });

        if (uploadErr) {
          setUploadError(
            /not found/i.test(uploadErr.message)
              ? `Image storage isn't set up yet — contact us and we'll add your image manually.`
              : uploadErr.message
          );
          return;
        }

        const { data: pub } = supabaseStorage.storage.from("product-images").getPublicUrl(path);
        set("image_url", pub.publicUrl);
        set("image_source", "manual_upload");
        setImageUrlInput(pub.publicUrl);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    })();
  }

  function clearImage() {
    set("image_url", null);
    set("image_source", null);
    setImageUrlInput("");
    setUploadError(null);
  }

  function handleSave() {
    if (!form.product_name.trim()) {
      setError("Product name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (product) {
        const result = await updateSupplierProduct(product.id, form);
        if (!result.ok) {
          setError(result.error ?? "Save failed");
          return;
        }
        onSave({ id: product.id, is_published: product.is_published, ...form });
      } else {
        const result = await createSupplierProduct(form);
        if (!result.ok) {
          setError(result.error ?? "Save failed");
          return;
        }
        onSave({ id: result.id ?? "", is_published: false, ...form });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">{product ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Image</label>
            <div className="flex gap-4 items-start">
              <div className="shrink-0">
                {form.image_url && !previewBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    className="w-24 h-24 rounded-lg object-cover border border-white/10"
                    onError={() => setPreviewBroken(true)}
                  />
                ) : (
                  <ProductImage imageUrl={null} categoryName={form.category} productName={form.product_name} size={96} />
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onBlur={() => {
                    const trimmed = imageUrlInput.trim();
                    if (trimmed.startsWith("http")) {
                      set("image_url", trimmed);
                      set("image_source", "manual_url");
                    }
                  }}
                  placeholder="https://example.com/product.jpg"
                  className="dark-input"
                />

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
                  className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 text-xs text-slate-400 transition ${
                    dragOver ? "border-orange-400/50 bg-orange-500/5" : "border-white/10"
                  }`}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
                      Uploading…
                    </span>
                  ) : (
                    <>
                      <span>or drag &amp; drop an image</span>
                      <label className="text-orange-400 hover:text-orange-300 cursor-pointer underline">
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

                {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

                {form.image_url && (
                  <button type="button" onClick={clearImage} className="text-xs text-slate-400 hover:text-slate-200">
                    ✕ Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Product name *</label>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
              className="dark-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="dark-input">
              {VALID_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
              rows={3}
              className="dark-input resize-none"
            />
          </div>

          <CheckGroup label="Kosher certification" options={KOSHER_OPTIONS} selected={form.kosher_types} onChange={(v) => set("kosher_types", v)} />
          <CheckGroup label="Food safety certifications" options={QUALITY_CERTS} selected={form.certifications} onChange={(v) => set("certifications", v)} />
          <CheckGroup label="Dietary & sustainability" options={DIETARY_CERTS} selected={form.certifications} onChange={(v) => set("certifications", v)} />

          <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.private_label}
              onChange={(e) => set("private_label", e.target.checked)}
              className="rounded border-white/20"
            />
            Private label available
          </label>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-md text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
          >
            {pending ? "Saving…" : "Save product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsManager({
  supplierId,
  initialProducts,
}: {
  supplierId: string;
  initialProducts: SupplierPortalProduct[];
}) {
  const [products, setProducts] = useState<SupplierPortalProduct[]>(initialProducts);
  const [slideOver, setSlideOver] = useState<{ open: boolean; product: SupplierPortalProduct | null }>({
    open: false,
    product: null,
  });
  const [pending, startTransition] = useTransition();

  function handleSave(saved: SupplierPortalProduct) {
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

  function handleDelete(product: SupplierPortalProduct) {
    if (!confirm(`Delete "${product.product_name}"?`)) return;
    startTransition(async () => {
      const result = await deleteSupplierProduct(product.id);
      if (!result.ok) {
        alert(result.error ?? "Delete failed");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setSlideOver({ open: true, product: null })}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
        >
          + Add product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="dark-card p-8 text-center text-sm text-slate-400">
          No products yet. Add your first product to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="dark-card p-4 flex items-center gap-4">
              <ProductImage imageUrl={p.image_url} categoryName={p.category} productName={p.product_name} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white truncate">{p.product_name}</h3>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                      p.is_published ? "bg-green-500/10 text-green-300" : "bg-yellow-500/10 text-yellow-300"
                    }`}
                  >
                    {p.is_published ? "Published" : "Pending review"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-300">{p.category}</span>
                  {p.kosher_types.slice(0, 1).map((k) => (
                    <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                      ✡ {k}
                    </span>
                  ))}
                  {p.private_label && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">Private label</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => setSlideOver({ open: true, product: p })} className="text-xs text-orange-400 hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(p)} disabled={pending} className="text-xs text-red-400 hover:underline disabled:opacity-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {slideOver.open && (
        <ProductSlideOver
          supplierId={supplierId}
          product={slideOver.product}
          onSave={handleSave}
          onClose={() => setSlideOver({ open: false, product: null })}
        />
      )}
    </div>
  );
}

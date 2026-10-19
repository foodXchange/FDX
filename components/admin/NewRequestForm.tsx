"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createRequestForBuyer,
  createQuickBuyer,
  type CreateQuickBuyerInput,
} from "@/app/admin/requests/actions";

export type BuyerOption = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_whatsapp?: string | null;
  country?: string | null;
  buyer_type?: string | null;
};

const CATEGORY_OPTIONS = [
  "Savory Snacks & Cereals",
  "Sweet Biscuits & Bars",
  "Breakfast Cereals",
  "Confectionery & Chocolate",
  "Canned & Preserved Goods",
  "Canned Vegetables & Pulses",
  "Tomato Products",
  "Raw Meat & Poultry",
  "Fresh & Frozen Fish",
  "Dairy Products & Analogues",
  "Dairy-Free Desserts",
  "Ingredients & Additives",
  "Herbs",
  "Plant-Based Proteins",
  "Bakery & Bread Products",
  "Specialty Sauces & Condiments",
  "Beverages (Non-Alcoholic)",
  "Fats, Oils & Spreads",
  "Pasta/Noodles",
  "Prepared Meals (Frozen & Shelf-Stable)",
  "Sugars & Sweeteners",
  "Other",
];

const CERT_OPTIONS = [
  "Kosher (Chief Rabbinate)",
  "Kosher (Badatz)",
  "Kosher (Mehadrin)",
  "Kosher (OU)",
  "Kosher for Passover",
  "BRC",
  "IFS",
  "ISO 22000",
  "HACCP",
  "Organic",
  "Non-GMO",
  "Gluten Free",
  "Vegan",
  "Halal",
];

const inputCls =
  "w-full text-sm bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const labelCls = "block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5";

interface NewRequestFormProps {
  buyers: BuyerOption[];
  initialBuyerId?: string;
  initialCompany?: string;
  initialName?: string;
  initialEmail?: string;
}

export default function NewRequestForm({
  buyers: initialBuyers,
  initialBuyerId,
  initialCompany,
  initialName,
  initialEmail,
}: NewRequestFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buyer list state (supports dynamically adding quick buyers)
  const [buyersList, setBuyersList] = useState<BuyerOption[]>(initialBuyers);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>(
    initialBuyerId || (initialBuyers[0]?.id ?? "")
  );

  // Quick Add Buyer Modal/Toggle
  const [showQuickAddBuyer, setShowQuickAddBuyer] = useState(false);
  const [quickBuyerPending, setQuickBuyerPending] = useState(false);
  const [quickBuyerError, setQuickBuyerError] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<CreateQuickBuyerInput>({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_whatsapp: "",
    country: "Israel",
    buyer_type: "retail_chain",
  });

  // Request form state
  const selectedBuyer = buyersList.find((b) => b.id === selectedBuyerId);

  const [form, setForm] = useState({
    name: initialName || selectedBuyer?.contact_name || "",
    email: initialEmail || selectedBuyer?.contact_email || "",
    company: initialCompany || selectedBuyer?.company_name || "",
    product_name: "",
    benchmark_brand: "",
    category: "",
    packaging_preference: "",
    volume_per_year: "1 x 40ft HQ FCL / month",
    target_market: "Israel",
    private_label: true as boolean | null,
    message: "",
  });

  const [certifications, setCertifications] = useState<string[]>([
    "Kosher (Chief Rabbinate)",
    "BRC",
  ]);

  // Image & Vision state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission state
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // When buyer selection changes, sync contact fields if empty
  function handleBuyerChange(buyerId: string) {
    setSelectedBuyerId(buyerId);
    const buyer = buyersList.find((b) => b.id === buyerId);
    if (buyer) {
      setForm((prev) => ({
        ...prev,
        company: buyer.company_name,
        name: buyer.contact_name || prev.name,
        email: buyer.contact_email || prev.email,
        target_market: buyer.country || prev.target_market,
      }));
    }
  }

  // Handle Quick Add Buyer
  async function handleCreateQuickBuyer(e: React.FormEvent) {
    e.preventDefault();
    setQuickBuyerError(null);
    setQuickBuyerPending(true);

    try {
      const res = await createQuickBuyer(quickForm);
      if (!res.ok) {
        setQuickBuyerError(res.error);
        return;
      }

      const newB: BuyerOption = {
        id: res.buyer.id,
        company_name: res.buyer.company_name,
        contact_name: res.buyer.contact_name,
        contact_email: res.buyer.contact_email,
        country: res.buyer.country,
        buyer_type: res.buyer.buyer_type,
      };

      setBuyersList((prev) => [newB, ...prev]);
      setSelectedBuyerId(newB.id);
      setForm((prev) => ({
        ...prev,
        company: newB.company_name,
        name: newB.contact_name || prev.name,
        email: newB.contact_email || prev.email,
        target_market: newB.country || prev.target_market,
      }));

      setShowQuickAddBuyer(false);
      setQuickForm({
        company_name: "",
        contact_name: "",
        contact_email: "",
        contact_whatsapp: "",
        country: "Israel",
        buyer_type: "retail_chain",
      });
    } catch (err: any) {
      setQuickBuyerError(err?.message || "Failed to create buyer");
    } finally {
      setQuickBuyerPending(false);
    }
  }

  // Image Upload & Vision Analysis
  async function processImageFile(file: File) {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/sourcing/upload-image", {
        method: "POST",
        body: fd,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Image upload failed");
      }

      const uploadedUrl = uploadData.url as string;
      setImageUrls((prev) => [...prev, uploadedUrl]);
      setUploading(false);
      setAnalysing(true);

      // Vision analysis call to Gemini 3.8 Flash
      const analyseRes = await fetch("/api/sourcing/analyse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedUrl }),
      });

      const analyseData = await analyseRes.json();
      if (analyseData?.ok && analyseData.analysis) {
        const a = analyseData.analysis;
        setVisionAnalysis(a);

        // Auto-fill fields if detected
        setForm((prev) => {
          const detectedName =
            a.product_name?.value || a.product_name || a.product_noun?.value || "";
          const detectedBrand =
            a.benchmark_brand?.value || a.brand?.value || a.benchmark_brand || a.brand || "";
          const detectedCategory = a.category?.category_name || a.category || "";
          const detectedSize = a.net_weight?.value
            ? `${a.net_weight.value}${a.net_weight.unit}`
            : a.size?.value || a.approximate_size || "";
          const detectedPackaging =
            a.format?.value || a.packaging?.value || a.packaging_format || "";

          const packagingStr = [detectedSize, detectedPackaging].filter(Boolean).join(" ");

          let matchedCat = prev.category;
          if (detectedCategory) {
            const found = CATEGORY_OPTIONS.find(
              (c) =>
                c.toLowerCase() === detectedCategory.toLowerCase() ||
                detectedCategory.toLowerCase().includes(c.toLowerCase()) ||
                c.toLowerCase().includes(detectedCategory.toLowerCase())
            );
            if (found) matchedCat = found;
          }

          return {
            ...prev,
            product_name: prev.product_name || detectedName,
            benchmark_brand: prev.benchmark_brand || detectedBrand,
            category: matchedCat,
            packaging_preference: prev.packaging_preference || packagingStr,
            message:
              prev.message ||
              (a.raw_text_ocr
                ? `Extracted OCR labels: ${a.raw_text_ocr.slice(0, 300)}`
                : a.notes || ""),
          };
        });

        // Certifications extraction
        const detectedCerts = [
          ...(a.certifications_visible?.value || a.certifications_visible || []),
          ...(a.kosher_marks_visible?.value || a.kosher_marks_visible || []),
        ];

        if (detectedCerts.length > 0) {
          setCertifications((prev) => {
            const set = new Set(prev);
            for (const c of detectedCerts) {
              const str = String(c).toLowerCase();
              if (str.includes("badatz")) set.add("Kosher (Badatz)");
              else if (str.includes("ou")) set.add("Kosher (OU)");
              else if (str.includes("mehadrin")) set.add("Kosher (Mehadrin)");
              else if (str.includes("rabbinate")) set.add("Kosher (Chief Rabbinate)");
              else if (str.includes("kosher")) set.add("Kosher (Chief Rabbinate)");
              else if (str.includes("brc")) set.add("BRC");
              else if (str.includes("ifs")) set.add("IFS");
              else if (str.includes("organic")) set.add("Organic");
              else if (str.includes("halal")) set.add("Halal");
              else if (str.includes("vegan")) set.add("Vegan");
              else if (str.includes("gluten")) set.add("Gluten Free");
              else set.add(String(c));
            }
            return Array.from(set);
          });
        }
      }
    } catch (err: any) {
      console.error("Machine vision processing error:", err);
      setError(err?.message || "Failed to process image");
    } finally {
      setUploading(false);
      setAnalysing(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  }

  function toggleCert(cert: string) {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    if (imageUrls.length <= 1) setVisionAnalysis(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBuyerId) {
      setError("Please select a buyer or add a new one first.");
      return;
    }
    if (!form.product_name.trim()) {
      setError("Product name is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createRequestForBuyer({
        buyer_id: selectedBuyerId,
        name: form.name || selectedBuyer?.contact_name || form.company,
        email: form.email || selectedBuyer?.contact_email || null,
        company: form.company || selectedBuyer?.company_name || null,
        product_name: form.product_name,
        category: form.category || null,
        benchmark_brand: form.benchmark_brand || null,
        packaging_preference: form.packaging_preference || null,
        volume_per_year: form.volume_per_year || null,
        message: form.message || null,
        certifications,
        target_market: form.target_market || null,
        private_label: form.private_label,
        image_urls: imageUrls,
        ai_analysis: visionAnalysis,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/admin/requests/${result.id}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Intro Card ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-3">
            <span>📸</span> Machine Vision Intake Engine
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            Create Sourcing Request on Behalf of Buyer
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upload packaging photos, shelf shots, or spec sheets. Gemini 3.8 Flash automatically
            extracts product attributes, benchmark brand, packaging, and kosher standards to trigger
            real-time reverse matching against verified European factories.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── 1. Buyer Selector Card ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">1. Buyer Account</h2>
              <p className="text-xs text-slate-500">
                Select the retail chain or importer you are opening this request for.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickAddBuyer(!showQuickAddBuyer)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition"
            >
              <span>+</span>
              <span>New Buyer</span>
            </button>
          </div>

          {/* Quick Add Buyer Drawer */}
          {showQuickAddBuyer && (
            <div className="mb-6 p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                  ⚡ Quick Register Buyer
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickAddBuyer(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕ Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company Name *</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Shufersal, Victory, Diplomat"
                    value={quickForm.company_name}
                    onChange={(e) =>
                      setQuickForm((q) => ({ ...q, company_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Contact Email *</label>
                  <input
                    type="email"
                    className={inputCls}
                    placeholder="procurement@buyer.com"
                    value={quickForm.contact_email}
                    onChange={(e) =>
                      setQuickForm((q) => ({ ...q, contact_email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Contact Person</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. David Cohen"
                    value={quickForm.contact_name}
                    onChange={(e) =>
                      setQuickForm((q) => ({ ...q, contact_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Country / Market</label>
                  <input
                    className={inputCls}
                    placeholder="Israel"
                    value={quickForm.country ?? "Israel"}
                    onChange={(e) => setQuickForm((q) => ({ ...q, country: e.target.value }))}
                  />
                </div>
              </div>

              {quickBuyerError && (
                <p className="text-xs text-red-600 font-medium">{quickBuyerError}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={quickBuyerPending}
                  onClick={handleCreateQuickBuyer}
                  className="text-xs font-semibold px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
                >
                  {quickBuyerPending ? "Saving Buyer…" : "Save & Select Buyer"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Select Registered Buyer *</label>
              <select
                className={inputCls}
                value={selectedBuyerId}
                onChange={(e) => handleBuyerChange(e.target.value)}
                required
              >
                <option value="">-- Choose Buyer --</option>
                {buyersList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.company_name} {b.country ? `(${b.country})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Company Name (Display)</label>
              <input
                className={inputCls}
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Buyer Company"
              />
            </div>
            <div>
              <label className={labelCls}>Procurement Contact Name</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Buyer Category Manager"
              />
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="buyer@chain.com"
              />
            </div>
          </div>
        </div>

        {/* ── 2. Machine Vision Dropzone Card ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📸</span>
                <span>2. Machine Vision Photo & Spec Intake</span>
              </h2>
              <p className="text-xs text-slate-500">
                Drop packaging photos, shelf benchmark pictures, or specification sheets.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
              Gemini 3.8 Flash Vision
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-orange-500 bg-orange-50/50"
                : "border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processImageFile(f);
              }}
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl shadow-xs">
                📷
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Drop packaging photo here, or{" "}
                <span className="text-orange-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Supports JPG, PNG, WebP or PDF. Our AI scans front label, nutrition facts, barcode,
                and kosher/organic certificates.
              </p>
            </div>
          </div>

          {/* Uploading / Analysing Indicators */}
          {(uploading || analysing) && (
            <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="text-xs text-orange-950">
                <span className="font-semibold">
                  {uploading
                    ? "Uploading image to secure bucket…"
                    : "Gemini 3.8 Flash Vision analyzing packaging & certifications…"}
                </span>
                <p className="text-orange-700 text-[11px] mt-0.5">
                  Extracting product noun, benchmark brand, net weight, format, and kosher marks.
                </p>
              </div>
            </div>
          )}

          {/* Uploaded Images Gallery */}
          {imageUrls.length > 0 && (
            <div className="mt-5 space-y-3">
              <span className={labelCls}>Uploaded Photos ({imageUrls.length})</span>
              <div className="flex flex-wrap gap-3">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={url}
                      alt={`Product sample ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 group-hover:opacity-100 transition"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Vision Insights Pill */}
          {visionAnalysis && (
            <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-700 text-sm font-bold">
                  ✨ Machine Vision Insights Extracted
                </span>
                <span className="text-[11px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                  Auto-populated
                </span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Detected product:{" "}
                <strong>
                  {visionAnalysis.product_name?.value ||
                    visionAnalysis.product_name ||
                    visionAnalysis.product_noun?.value ||
                    "Product identified"}
                </strong>
                {form.benchmark_brand && (
                  <span>
                    {" "}
                    · Benchmark Brand: <strong>{form.benchmark_brand}</strong>
                  </span>
                )}
                {form.category && (
                  <span>
                    {" "}
                    · Category: <strong>{form.category}</strong>
                  </span>
                )}
                {form.packaging_preference && (
                  <span>
                    {" "}
                    · Format: <strong>{form.packaging_preference}</strong>
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* ── 3. Commercial Specifications Card ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-5">
            <h2 className="text-base font-bold text-slate-900">3. Product & Commercial Terms</h2>
            <p className="text-xs text-slate-500">
              Define the requirements that will match against European manufacturer capabilities.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Product Name *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Chopped Peeled Tomatoes in Puree"
                  value={form.product_name}
                  onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Benchmark Brand (Target Quality)</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Mutti, Barilla, Nutella"
                  value={form.benchmark_brand}
                  onChange={(e) => setForm((f) => ({ ...f, benchmark_brand: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Category</label>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">-- Select Category --</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Packaging & Unit Format</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 400g Tin Can with Easy-Open, 1kg pillow bag"
                  value={form.packaging_preference}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, packaging_preference: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Estimated Annual Volume</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 1 x 40ft HQ / month"
                  value={form.volume_per_year}
                  onChange={(e) => setForm((f) => ({ ...f, volume_per_year: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelCls}>Destination Market</label>
                <input
                  className={inputCls}
                  placeholder="Israel"
                  value={form.target_market}
                  onChange={(e) => setForm((f) => ({ ...f, target_market: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelCls}>Branding Preference</label>
                <select
                  className={inputCls}
                  value={
                    form.private_label === true
                      ? "private_label"
                      : form.private_label === false
                      ? "supplier_brand"
                      : "open"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({
                      ...f,
                      private_label: val === "private_label" ? true : val === "supplier_brand" ? false : null,
                    }));
                  }}
                >
                  <option value="private_label">Private Label (Buyer's Own Brand)</option>
                  <option value="supplier_brand">Supplier Factory Brand</option>
                  <option value="open">Open to Both</option>
                </select>
              </div>
            </div>

            {/* Certifications & Kosher standards */}
            <div>
              <label className={labelCls}>Required Certifications & Kosher Standards</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {CERT_OPTIONS.map((cert) => {
                  const isSelected = certifications.includes(cert);
                  const isKosher = cert.toLowerCase().includes("kosher");
                  return (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => toggleCert(cert)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
                        isSelected
                          ? isKosher
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-orange-100 text-orange-900 border-orange-300"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelCls}>Factory Brief / Additional Specifications</label>
              <textarea
                className={inputCls}
                rows={3}
                placeholder="Include any specific brix level, acidity, shelf life, palletization requirements, or commercial targets..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* ── Submit Action ── */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={pending || uploading || analysing}
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
          >
            {pending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Reverse-Matching…</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Submit Request & Generate Factory Matches</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

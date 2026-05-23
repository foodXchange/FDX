"use client";

import { useState } from "react";
import type { PublicCatalogueProduct } from "@/app/en/products/page";
import { cleanProductName } from "@/lib/products/cleanProductName";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";

interface Props {
  product: PublicCatalogueProduct;
  onClose: () => void;
}

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "🇪🇸", Italy: "🇮🇹", France: "🇫🇷", Portugal: "🇵🇹", Greece: "🇬🇷",
  Turkey: "🇹🇷", Morocco: "🇲🇦", Israel: "🇮🇱", Germany: "🇩🇪", Netherlands: "🇳🇱",
  Poland: "🇵🇱", Belgium: "🇧🇪", Ukraine: "🇺🇦", Romania: "🇷🇴", Bulgaria: "🇧🇬",
};

type FormState = {
  company: string;
  name: string;
  email: string;
  whatsapp: string;
  volume: string;
  kosher_requirement: string;
  notes: string;
};

export default function RequestProductModal({ product, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    company: "",
    name: "",
    email: "",
    whatsapp: "",
    volume: "",
    kosher_requirement:
      product.kosher_types?.[0]?.toLowerCase().includes("chief")
        ? "Chief Rabbinate"
        : product.kosher_types?.[0] ?? "Any kosher",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const displayName = cleanProductName(product.product_name, product.category);
  const country = product.supplier?.country_of_origin ?? null;
  const flag = country ? (COUNTRY_FLAG[country] ?? "🌍") : null;
  const catColor = CATEGORY_COLORS[product.category] ?? "#888780";
  const kosherType = product.kosher_types?.[0] ?? null;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.name.trim() || !form.email.trim()) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/sourcing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          whatsapp: form.whatsapp || undefined,
          company: form.company,
          product_name: displayName,
          category: product.category,
          certifications:
            form.kosher_requirement && form.kosher_requirement !== "No preference"
              ? [form.kosher_requirement]
              : [],
          description: [
            form.volume ? `Volume needed: ${form.volume}` : "",
            form.notes || "",
            `Product ID: ${product.id}`,
          ]
            .filter(Boolean)
            .join("\n"),
          source: "product-page",
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Submission failed");
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Request this product</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Product summary */}
        <div className="mx-6 mt-4 rounded-xl border border-slate-100 p-3 bg-slate-50 flex items-start gap-3">
          <div
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: catColor }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor: catColor + "22", color: catColor }}
              >
                {product.category}
              </span>
              {kosherType && (
                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  ✡ {kosherType}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900 leading-snug">{displayName}</p>
            {product.supplier && (
              <p className="text-xs text-slate-400 mt-0.5">
                {product.supplier.company_name}
                {flag ? ` · ${flag} ${country}` : ""}
              </p>
            )}
            {product.certifications.filter((c) => !product.kosher_types.includes(c)).slice(0, 2).map((cert) => (
              <span
                key={cert}
                className="inline-block mr-1 mt-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>

        {status === "success" ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Request received</h3>
            <p className="text-sm text-slate-500 mb-1">
              We will be in touch within 24 hours via WhatsApp.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              In the meantime, browse more products →
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder="e.g. Shufersal, Yochananof"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Full name"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="you@company.com"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp number
                </label>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => setField("whatsapp", e.target.value)}
                  placeholder="+972 50 xxx xxxx"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  We respond on WhatsApp — usually within 2 hours
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Volume needed
              </label>
              <input
                type="text"
                value={form.volume}
                onChange={(e) => setField("volume", e.target.value)}
                placeholder="e.g. 20 tons/year, 2 containers/month"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Kosher requirement
              </label>
              <div className="space-y-1.5">
                {["Chief Rabbinate", "Badatz Beit Yosef", "Any kosher", "No preference"].map(
                  (opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="kosher"
                        value={opt}
                        checked={form.kosher_requirement === opt}
                        onChange={() => setField("kosher_requirement", opt)}
                        className="accent-orange-500"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Additional notes
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Specific format, size, packaging requirements..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-orange-400"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
            >
              {status === "submitting" ? "Sending…" : "Send sourcing request →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

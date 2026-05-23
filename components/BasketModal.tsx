"use client";

import { useState } from "react";
import { cleanProductName, CATEGORY_COLORS } from "@/lib/products/cleanProductName";
import type { PublicCatalogueProduct } from "@/app/en/products/page";

interface Props {
  basket: PublicCatalogueProduct[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "\u{1F1EA}\u{1F1F8}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  France: "\u{1F1EB}\u{1F1F7}",
  Portugal: "\u{1F1F5}\u{1F1F9}",
  Greece: "\u{1F1EC}\u{1F1F7}",
  Turkey: "\u{1F1F9}\u{1F1F7}",
  Morocco: "\u{1F1F2}\u{1F1E6}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Poland: "\u{1F1F5}\u{1F1F1}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Ukraine: "\u{1F1FA}\u{1F1E6}",
  Romania: "\u{1F1F7}\u{1F1F4}",
  Bulgaria: "\u{1F1E7}\u{1F1EC}",
};

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400";

export default function BasketModal({ basket, onRemove, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const session_id = crypto.randomUUID();
    try {
      const res = await fetch("/api/sourcing/basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          company: data.get("company") as string,
          name: data.get("name") as string,
          whatsapp: (data.get("whatsapp") as string) || undefined,
          notes: (data.get("notes") as string) || undefined,
          products: basket.map((p) => ({
            id: p.id,
            product_name: p.product_name,
            category: p.category,
            kosher_types: p.kosher_types,
            certifications: p.certifications,
            country_of_origin: p.supplier?.country_of_origin ?? null,
          })),
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Request failed");
      }
      setSuccess(true);
      setTimeout(onSuccess, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">
            Request {basket.length} product{basket.length !== 1 ? "s" : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Product list */}
        <div className="px-6 pt-4 pb-2 max-h-48 overflow-y-auto divide-y divide-white/5">
          {basket.map((p) => {
            const color = CATEGORY_COLORS[p.category] ?? "#888780";
            const country = p.supplier?.country_of_origin ?? null;
            const flag = country ? (COUNTRY_FLAG[country] ?? null) : null;
            return (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {cleanProductName(p.product_name, p.category)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {country && (
                      <span className="text-xs text-slate-400">
                        {flag ? `${flag} ` : ""}{country}
                      </span>
                    )}
                    {p.kosher_types[0] && (
                      <span className="text-[10px] text-amber-400">
                        &#x2721; {p.kosher_types[0]}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="text-slate-500 hover:text-red-400 text-sm shrink-0 transition-colors"
                  aria-label="Remove from request"
                >
                  &#x2715;
                </button>
              </div>
            );
          })}
        </div>

        {success ? (
          <div className="px-6 pb-10 pt-6 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-2xl text-green-400">
              &#x2713;
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                Request received for {basket.length} product{basket.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                We will review and follow up within 24 hours
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6 space-y-3">
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-slate-500 mb-3">Your details</p>
            </div>
            <input
              name="company"
              placeholder="Your company *"
              required
              className={inputCls}
            />
            <input
              name="name"
              placeholder="Your name *"
              required
              className={inputCls}
            />
            <input
              name="whatsapp"
              type="tel"
              placeholder="WhatsApp (preferred)"
              className={inputCls}
            />
            <textarea
              name="notes"
              placeholder="Any specific requirements..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition mt-1"
            >
              {submitting ? "Sending…" : "Send sourcing request →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

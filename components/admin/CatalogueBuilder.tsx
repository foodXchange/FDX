"use client";

import { useState } from "react";
import type { CatalogueProduct } from "@/app/admin/catalogue/actions";

interface Props {
  products: CatalogueProduct[];
}

export default function CatalogueBuilder({ products }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proposal state
  const [buyerNameProposal, setBuyerNameProposal] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalResult, setProposalResult] = useState<{ token: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const readyProducts = products.filter((p) => p.status === "ready");

  function toggleProduct(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (selectedIds.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalogue/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_ids: selectedIds,
          buyer_name: buyerName || undefined,
          presentation_title: title || undefined,
        }),
      });

      if (res.status === 401) {
        setError("Not authenticated");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError((data as { error?: string }).error ?? "Generation failed");
        return;
      }

      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      setError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateProposal() {
    if (selectedIds.length === 0 || !buyerNameProposal) return;
    setProposalLoading(true);
    setProposalError(null);
    try {
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: buyerNameProposal,
          buyer_company: buyerCompany || undefined,
          product_ids: selectedIds,
          personal_message: personalMessage || undefined,
          expires_days: expiryDays ?? undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; token?: string; url?: string; error?: string };
      if (!data.ok || !data.token || !data.url) {
        setProposalError(data.error ?? "Failed to create proposal");
        return;
      }
      setProposalResult({ token: data.token, url: data.url });
    } catch {
      setProposalError("Network error — please try again");
    } finally {
      setProposalLoading(false);
    }
  }

  function handleCopyLink() {
    if (!proposalResult) return;
    navigator.clipboard.writeText(proposalResult.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const selectedProducts = selectedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is CatalogueProduct => p !== undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
      >
        Generate PDF
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <p className="font-semibold text-slate-900 text-sm">Build PDF presentation</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none transition"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">

              {/* Left — product selector */}
              <div className="flex-1 border-r border-slate-100 overflow-y-auto p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Select products ({selectedIds.length} selected)
                </p>

                {readyProducts.length === 0 ? (
                  <p className="text-sm text-gray-400">No ready products yet. Set product status to "Ready" first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {readyProducts.map((product) => {
                      const selected = selectedIds.includes(product.id);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className={`relative border-2 rounded-xl overflow-hidden text-left transition ${
                            selected
                              ? "border-orange-500 shadow-sm"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                            {product.catalogue_image_url ? (
                              <img
                                src={product.catalogue_image_url}
                                alt={product.product_name}
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <span className="text-2xl text-slate-300">📦</span>
                            )}
                          </div>

                          {/* Selected badge */}
                          {selected && (
                            <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                              {selectedIds.indexOf(product.id) + 1}
                            </div>
                          )}

                          {/* Info */}
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {product.brand_name ?? product.product_name}
                            </p>
                            {product.brand_name && (
                              <p className="text-xs text-slate-500 truncate">{product.product_name}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right — settings */}
              <div className="w-72 flex-shrink-0 p-5 flex flex-col">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Settings
                </p>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Buyer name (optional)</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Shufersal"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Presentation title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="FoodXchange — Product Selection"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition"
                    />
                  </div>

                  {selectedProducts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Selected products ({selectedProducts.length}):
                      </p>
                      <ol className="space-y-1">
                        {selectedProducts.map((p, i) => (
                          <li key={p.id} className="text-xs text-slate-600 flex gap-2">
                            <span className="text-orange-500 font-semibold shrink-0">{i + 1}.</span>
                            <span className="truncate">{p.brand_name ?? p.product_name}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={selectedIds.length === 0 || generating}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition mt-4"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    `Generate PDF (${selectedIds.length} product${selectedIds.length !== 1 ? "s" : ""})`
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center mt-2">
                  Opens in new tab — use browser Print → Save as PDF
                </p>

                {/* Proposal section */}
                <div className="border-t border-slate-100 mt-4 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Or create a shareable link
                  </p>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Buyer name*"
                      value={buyerNameProposal}
                      onChange={(e) => setBuyerNameProposal(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                    />
                    <input
                      type="text"
                      placeholder="Company (optional)"
                      value={buyerCompany}
                      onChange={(e) => setBuyerCompany(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                    />
                    <textarea
                      placeholder="Personal message (optional)..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      rows={3}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition resize-none"
                    />
                    <div className="flex gap-3 text-xs">
                      {([
                        { label: "Never", val: null },
                        { label: "7 days", val: 7 },
                        { label: "30 days", val: 30 },
                      ] as { label: string; val: number | null }[]).map((opt) => (
                        <label key={opt.label} className="flex items-center gap-1 cursor-pointer text-gray-600">
                          <input
                            type="radio"
                            checked={expiryDays === opt.val}
                            onChange={() => setExpiryDays(opt.val)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {proposalError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">
                      {proposalError}
                    </p>
                  )}

                  {proposalResult ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
                      <p className="text-green-700 font-semibold text-xs mb-2">✓ Proposal ready</p>
                      <input
                        readOnly
                        value={proposalResult.url}
                        className="w-full font-mono text-xs bg-white border border-green-200 rounded-lg px-2 py-1.5 mb-2"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:border-gray-400 transition"
                        >
                          {copied ? "Copied! ✓" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(proposalResult.url, "_blank")}
                          className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:border-gray-400 transition"
                        >
                          Preview
                        </button>
                        <a
                          href={`https://wa.me/972525222291?text=${encodeURIComponent(`Hi ${buyerNameProposal}, I've put together a selection of products that might interest you. Have a look: ${proposalResult.url}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-green-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-600 transition"
                        >
                          WhatsApp →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateProposal}
                      disabled={selectedIds.length === 0 || !buyerNameProposal || proposalLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm mt-3 transition"
                    >
                      {proposalLoading
                        ? "Generating..."
                        : `Generate proposal link (${selectedIds.length} product${selectedIds.length !== 1 ? "s" : ""})`}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { confirmBriefFromBuyerLink, requestChangesFromBuyerLink } from "@/app/brief/[token]/actions";

interface ProductCardData {
  id?: string;
  image_urls?: string[];
  product_name: string;
  brand_name?: string | null;
  manufacturer?: string | null;
  origin_country?: string | null;
  origin_state?: string | null;
  eu_factory_code?: string | null;
  sweeteners?: string[];
  dietary_claims?: string[];
  certifications?: string[];
  ingredients?: string[];
  packaging_format?: string | null;
  net_weight?: string | null;
}

interface BuyerBriefViewProps {
  token: string;
  request: {
    id: string;
    product_name?: string | null;
    company?: string | null;
    name?: string | null;
    email?: string | null;
    category?: string | null;
    target_market?: string | null;
    packaging_preference?: string | null;
    volume_per_year?: string | null;
    certifications?: string[];
    message?: string | null;
    brief_status: string;
    brief_version?: number;
    confirmed_at?: string | null;
    confirmed_by?: string | null;
    created_at: string;
    ai_analysis?: any;
    request_images?: { id: string; image_url: string; sort_order?: number }[];
  };
}

export function BuyerBriefView({ token, request }: BuyerBriefViewProps) {
  const [status, setStatus] = useState<string>(request.brief_status || "sent");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(request.confirmed_at || null);
  const [confirmedBy, setConfirmedBy] = useState<string | null>(request.confirmed_by || null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmName, setConfirmName] = useState(request.name || "");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirming, startConfirmTransition] = useTransition();

  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesName, setChangesName] = useState(request.name || "");
  const [changesNotes, setChangesNotes] = useState("");
  const [requestingChanges, startChangesTransition] = useTransition();

  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Extract layered analysis if present
  const layeredAnalysis = request.ai_analysis?.layered_analysis;
  const sharedDna = layeredAnalysis?.shared_dna;
  const products: ProductCardData[] = Array.isArray(layeredAnalysis?.products) ? layeredAnalysis.products : [];

  const rawImages: string[] =
    Array.isArray(request.request_images) && request.request_images.length > 0
      ? request.request_images.map((img) => img.image_url)
      : [];

  const isConfirmed = status === "confirmed";
  const isChangesRequested = status === "changes_requested";

  function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionMessage(null);
    startConfirmTransition(async () => {
      const res = await confirmBriefFromBuyerLink(token, confirmName, confirmNotes);
      if (res.ok) {
        setStatus("confirmed");
        setConfirmedAt(new Date().toISOString());
        setConfirmedBy(confirmName || "Buyer");
        setShowConfirmModal(false);
        setActionMessage({
          type: "success",
          text: "Thank you! Your sourcing brief has been confirmed. Our deal desk is now filtering matching European factories.",
        });
      } else {
        setActionMessage({ type: "error", text: res.error });
      }
    });
  }

  function handleChangesSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionMessage(null);
    startChangesTransition(async () => {
      const res = await requestChangesFromBuyerLink(token, changesName, changesNotes);
      if (res.ok) {
        setStatus("changes_requested");
        setShowChangesModal(false);
        setActionMessage({
          type: "success",
          text: "Your adjustment request has been delivered to FoodXchange. We will update the brief specifications promptly.",
        });
      } else {
        setActionMessage({ type: "error", text: res.error });
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight">
              Food<span className="text-orange-500">X</span>change
            </span>
            <span className="hidden sm:inline-block text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
              Direct European Sourcing Desk
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                <span>✓</span> Confirmed by Buyer
              </span>
            ) : isChangesRequested ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                <span>💬</span> Adjustments Requested
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-bold">
                <span>⏳</span> Review & Approval Pending
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Status Notification Banner */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {isConfirmed ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                ✓
              </span>
              <div>
                <h2 className="text-sm font-bold text-emerald-950">Sourcing Brief Confirmed</h2>
                <p className="text-xs text-emerald-800">
                  Approved on {confirmedAt ? new Date(confirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "recently"}
                  {confirmedBy ? ` by ${confirmedBy}` : ""}. European factory matchmaking is active.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowChangesModal(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
            >
              Need to request an update?
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-extrabold text-orange-600 tracking-wider">
                Action Requested
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Please review this Sourcing Brief for {request.company || "Your Company"}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Verify target products, packaging format, dietary standards, and volume before factory outreach begins.
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowChangesModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                💬 Request Adjustments
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition"
              >
                ✓ Confirm Sourcing Brief
              </button>
            </div>
          </div>
        )}

        {/* Project Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sourcing Scope
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                {request.product_name || "Specialty Sourcing Project"}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-slate-700 block">
                {request.company || "Partner Sourcing"}
              </span>
              <span className="text-[11px] text-slate-400">
                Created {new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Key Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Packaging</span>
              <span className="font-bold text-slate-800">{request.packaging_preference || "Standard Retail Packaging"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Target Volume</span>
              <span className="font-bold text-slate-800">{request.volume_per_year || "1 x 40ft HQ FCL / month"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Target Market</span>
              <span className="font-bold text-slate-800">{request.target_market || "Israel"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Category</span>
              <span className="font-bold text-slate-800">{request.category || "General Food & Confectionery"}</span>
            </div>
          </div>

          {/* Layer 1: Shared Dietary & Quality DNA */}
          {((sharedDna && (sharedDna.dietary?.length > 0 || sharedDna.certifications?.length > 0)) || (request.certifications && request.certifications.length > 0)) && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Shared Quality & Dietary DNA
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                  Required Factory Criteria
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(sharedDna?.dietary || []).map((d: string) => (
                  <span key={d} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold shadow-2xs">
                    🌱 {d}
                  </span>
                ))}
                {(sharedDna?.certifications || []).map((c: string) => (
                  <span key={c} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold shadow-2xs">
                    ⭐ {c}
                  </span>
                ))}
                {!sharedDna && (request.certifications || []).map((c: string) => (
                  <span key={c} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold shadow-2xs">
                    ⭐ {c}
                  </span>
                ))}
              </div>
              {sharedDna?.summary && (
                <p className="text-xs text-emerald-900 leading-relaxed pt-1">
                  {sharedDna.summary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Layer 3: Multi-Product Cards (Visual OCR Extractions) */}
        {products.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Identified Reference Products</span>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  {products.length} SKU{products.length > 1 ? "s" : ""}
                </span>
              </h3>
              <span className="text-xs text-slate-500">Extracted from packaging front & back panels</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((prod, idx) => (
                <div
                  key={prod.id || idx}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 hover:border-orange-300 transition"
                >
                  {/* Images row */}
                  {Array.isArray(prod.image_urls) && prod.image_urls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {prod.image_urls.map((imgUrl, i) => (
                        <div
                          key={i}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0"
                        >
                          <img
                            src={imgUrl}
                            alt={`${prod.product_name} visual ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {prod.product_name}
                    </h4>
                    {prod.brand_name && (
                      <span className="text-xs text-slate-500 font-semibold block">
                        Benchmark Brand: {prod.brand_name}
                      </span>
                    )}
                  </div>

                  {/* Production & Origin Info */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">Manufacturer:</span>
                      <span className="text-slate-800 font-bold">{prod.manufacturer || "OEM / Unspecified"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Origin:</span>
                      <span className="text-slate-800 font-bold">
                        {[prod.origin_state, prod.origin_country].filter(Boolean).join(", ") || "European Union"}
                      </span>
                    </div>
                    {prod.eu_factory_code && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block font-medium">EU Factory Health Mark:</span>
                        <span className="inline-block px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold text-[10px]">
                          {prod.eu_factory_code}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sweeteners & Ingredients */}
                  {Array.isArray(prod.sweeteners) && prod.sweeteners.length > 0 && (
                    <div className="text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Sweeteners Identified
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {prod.sweeteners.map((sw) => (
                          <span
                            key={sw}
                            className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-md text-[11px] font-semibold"
                          >
                            {sw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dietary / Claims */}
                  {Array.isArray(prod.dietary_claims) && prod.dietary_claims.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {prod.dietary_claims.map((claim) => (
                        <span
                          key={claim}
                          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 font-medium"
                        >
                          ✓ {claim}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Brief Text / Operational Notes */}
        {request.message && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Operational Notes & Formulation Guidelines
            </h3>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              {request.message}
            </div>
          </div>
        )}

        {/* Attached Reference Images Gallery */}
        {rawImages.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Packaging & Reference Visuals ({rawImages.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {rawImages.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center hover:opacity-90 transition"
                >
                  <img
                    src={url}
                    alt={`Reference visual ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    #{idx + 1} ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Deal Desk Assistance Footer */}
        <div className="text-center text-xs text-slate-500 pt-4 space-y-1">
          <p>Questions or need immediate phone alignment?</p>
          <p className="font-semibold text-slate-700">
            Call or WhatsApp FoodXchange Deal Desk:{" "}
            <a href="https://wa.me/972508586363" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">
              +972-50-858-6363
            </a>{" "}
            &middot; Email:{" "}
            <a href="mailto:udi@fdx.trading" className="text-orange-600 hover:underline">
              udi@fdx.trading
            </a>
          </p>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Sourcing Brief
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Confirming this brief approves FoodXchange to initiate direct European manufacturer matching and sample requests based on these specifications.
            </p>
            <form onSubmit={handleConfirmSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharon Avidor"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Approval Notes or Special Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please prioritize manufacturers with Kosher Mehadrin, or confirm CIF Ashdod lead times."
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirming}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                >
                  {confirming ? "Submitting..." : "✓ Confirm Brief"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Adjustments Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Request Brief Adjustments
              </h3>
              <button
                type="button"
                onClick={() => setShowChangesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Tell our deal desk what needs to be changed (e.g. revised target price, different flavor profiles, private label preference, or updated packaging format).
            </p>
            <form onSubmit={handleChangesSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharon Avidor"
                  value={changesName}
                  onChange={(e) => setChangesName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Requested Changes / Feedback *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Please change the packaging to flow-wrap bars only (no pouches), and increase target volume to 2 containers/month."
                  value={changesNotes}
                  onChange={(e) => setChangesNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingChanges}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                >
                  {requestingChanges ? "Sending..." : "Submit Adjustments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

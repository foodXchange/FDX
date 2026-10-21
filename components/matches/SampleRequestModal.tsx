"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  factoryName: string;
  productName: string;
  defaultCompany?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SampleRequestModal({
  matchId,
  factoryName,
  productName,
  defaultCompany = "",
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  if (!isOpen) return null;

  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Tel Aviv");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contactName.trim() || !companyName.trim() || !phone.trim() || !streetAddress.trim() || !city.trim()) {
      setError("Please complete all required fields for delivery.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/buyer/request-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          contactName: contactName.trim(),
          companyName: companyName.trim(),
          phone: phone.trim(),
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          postalCode: postalCode.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to submit sample request. Please try again.");
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🥄</span>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Official Sensory Evaluation Samples
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Request Samples from {factoryName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target SKU: <span className="text-slate-200 font-semibold">{productName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-1 text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>✈️ Express DHL Courier Dispatch</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Physical samples are dispatched directly from the factory in Europe to your office in Israel for culinary sensory testing and lab verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Recipient Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Yossi Cohen"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Company / Supermarket Chain *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shufersal / Retail Import Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Direct Mobile / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +972 54 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                City / Region (Israel) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rishon LeZion, Tel Aviv, Haifa"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">
                Street Address & Suite / Floor *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 14 HaBarzel St, Floor 4"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Postal Code
              </label>
              <input
                type="text"
                placeholder="69710"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Sensory Panel Instructions / Lab Notes:
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please provide 2 units of 400g tins. We test viscosity and brix for private label benchmark."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-slate-400 hover:text-white px-3 py-2 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>🥄</span>
                  <span>Confirm Sample Delivery</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

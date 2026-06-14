"use client";

import { useState } from "react";

const INFO_OPTIONS = ["Spec sheet", "Certifications", "Sample availability", "Pricing", "Lead time", "Other"];

export default function RequestInfoModal({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function toggle(option: string) {
    setSelected((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/request-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, requestedInfo: selected, message }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send request");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-[#0b1620] border border-white/10 rounded-xl shadow-lg p-6">
        {sent ? (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-white mb-1">Request sent ✓</p>
            <p className="text-sm text-slate-400 mb-4">
              Our team will follow up with the supplier and get back to you.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-orange-400 hover:text-orange-300"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white mb-1">Request more info</h2>
            <p className="text-sm text-slate-400 mb-4">
              Let us know what you need and our team will reach out to the supplier on your behalf.
            </p>

            <p className="text-xs font-medium text-slate-300 mb-2">What do you need?</p>
            <div className="flex flex-col gap-2 mb-4">
              {INFO_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500"
                  />
                  {option}
                </label>
              ))}
            </div>

            <label className="block text-xs font-medium text-slate-300 mb-1">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add any extra context…"
              className="w-full text-sm bg-white/5 border border-white/10 text-slate-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-500"
            />

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="text-sm text-slate-400 hover:text-slate-200 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || (selected.length === 0 && !message.trim())}
                className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

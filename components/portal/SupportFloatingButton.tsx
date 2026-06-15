"use client";

import { useState } from "react";

export default function SupportFloatingButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send message");
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setSent(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-3 shadow-lg transition"
      >
        <span aria-hidden>💬</span>
        Need help?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative w-full max-w-sm h-full bg-[#0b1620] border-l border-white/10 flex flex-col">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
              <h2 className="text-base font-semibold text-white">Need help?</h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {sent ? (
                <p className="text-sm text-green-300">
                  Message sent ✓ — our team will get back to you shortly.
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-400 mb-3">
                    Ask us anything about your sourcing requests and our team will reply by email.
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Type your message…"
                    className="dark-input w-full resize-none"
                  />

                  {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={loading || !message.trim()}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
                    >
                      {loading ? "Sending…" : "Send message →"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

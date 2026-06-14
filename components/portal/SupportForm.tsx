"use client";

import { useState } from "react";

export default function SupportForm() {
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

  return (
    <div className="dark-card p-6 mt-10">
      <h2 className="text-lg font-semibold text-white mb-2">Need help?</h2>

      {sent ? (
        <p className="text-sm text-green-300">
          Message sent ✓ — our team will get back to you shortly.
        </p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Ask us anything about your sourcing requests..."
            className="w-full text-sm bg-white/5 border border-white/10 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-500"
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
  );
}

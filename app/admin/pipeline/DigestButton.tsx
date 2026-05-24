"use client";

import { useState } from "react";

export default function DigestButton() {
  const [loading, setLoading] = useState(false);

  async function handleSendDigest() {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline/digest");
      if (!res.ok) throw new Error("Failed to fetch digest");
      const text = await res.text();
      window.open(
        `mailto:?subject=${encodeURIComponent("FoodXchange Daily Digest")}&body=${encodeURIComponent(text)}`,
        "_blank"
      );
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSendDigest}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
    >
      {loading ? "Loading…" : "Send Digest"}
    </button>
  );
}

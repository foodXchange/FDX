"use client";

import { useState } from "react";

export default function ImpersonateButton({
  kind,
  id,
  label,
}: {
  kind: "buyer" | "supplier";
  id: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/impersonate/${kind}/${id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate link");
      window.open(json.url as string, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
      >
        {loading ? "Generating link…" : `${label} →`}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

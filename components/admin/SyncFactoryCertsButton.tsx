"use client";

import { useState } from "react";

export function SyncFactoryCertsButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    if (
      !confirm(
        "Sync certifications from factories to all linked products?\n\nThis will update kosher types and quality certifications on all products that have a factory assigned and no manual override."
      )
    )
      return;

    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/products/sync-factory-certs", {
        method: "POST",
      });
      const json = (await res.json()) as { ok: boolean; updated?: number; error?: string };
      if (json.ok) {
        setResult(`✓ ${json.updated ?? 0} products updated`);
      } else {
        setResult(`Error: ${json.error ?? "Sync failed"}`);
      }
    } catch {
      setResult("Error: Network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
      >
        {syncing ? "Syncing…" : "Sync factory certs"}
      </button>
      {result && (
        <span className="text-xs text-gray-500">{result}</span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  unmatchedIds: string[];
}

export default function BulkMatchButton({ unmatchedIds }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  if (unmatchedIds.length === 0) return null;

  async function handleRun() {
    setRunning(true);
    const total = unmatchedIds.length;
    for (let i = 0; i < total; i++) {
      setProgress(`Matching ${i + 1}/${total}...`);
      try {
        await fetch(`/api/admin/requests/${unmatchedIds[i]}/match`, {
          method: "POST",
        });
      } catch {
        // continue with remaining
      }
    }
    setRunning(false);
    setProgress(null);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={running}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60 transition"
    >
      {running ? (
        <>
          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {progress ?? "Matching..."}
        </>
      ) : (
        `Run matching on ${unmatchedIds.length} unmatched`
      )}
    </button>
  );
}

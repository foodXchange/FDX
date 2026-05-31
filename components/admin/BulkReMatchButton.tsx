"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reMatchIds: string[];
}

export default function BulkReMatchButton({ reMatchIds }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  if (reMatchIds.length === 0) return null;

  async function handleRun() {
    setRunning(true);
    setDone(false);
    const total = reMatchIds.length;
    for (let i = 0; i < total; i++) {
      setProgress(`Re-running... ${i + 1}/${total}`);
      try {
        await fetch(`/api/admin/requests/${reMatchIds[i]}/match`, {
          method: "POST",
        });
      } catch {
        // continue with remaining
      }
      if (i < total - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    setRunning(false);
    setProgress(null);
    setDone(true);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={running}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-500 hover:bg-slate-600 text-white rounded-lg disabled:opacity-60 transition"
    >
      {running ? (
        <>
          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {progress ?? "Re-running..."}
        </>
      ) : done ? (
        `Done — ${reMatchIds.length} requests re-matched`
      ) : (
        `Re-run all matched (${reMatchIds.length})`
      )}
    </button>
  );
}

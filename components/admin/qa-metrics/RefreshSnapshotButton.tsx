"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshQaMetricsSnapshot } from "@/app/en/admin/qa-metrics/actions";

export default function RefreshSnapshotButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await refreshQaMetricsSnapshot();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh now"}
    </button>
  );
}

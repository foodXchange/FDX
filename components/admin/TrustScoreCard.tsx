"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TrustScoreBadge from "@/components/admin/TrustScoreBadge";
import type { TrustScoreBreakdown } from "@/lib/suppliers/trustScore";

export default function TrustScoreCard({
  supplierId,
  score,
  breakdown,
}: {
  supplierId: string;
  score: number;
  breakdown: TrustScoreBreakdown;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tooltip = `Profile: ${breakdown.profile}/25\nVerification: ${breakdown.verification}/25\nActivity: ${breakdown.activity}/25\nDeals: ${breakdown.deals}/25`;

  function handleRecalculate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/recalculate-score`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Failed to recalculate");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2" title={tooltip}>
      <TrustScoreBadge score={score} title={tooltip} />
      <span className="text-xs text-gray-500">{score}/100</span>
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={isPending}
        className="text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
      >
        {isPending ? "Recalculating…" : "Recalculate"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

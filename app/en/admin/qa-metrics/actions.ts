"use server";

import { revalidatePath } from "next/cache";
import { computeQaSnapshot, saveQaMetricsSnapshot, DEFAULT_RANGE_DAYS } from "@/lib/metrics/qaMetrics";

export async function refreshQaMetricsSnapshot(): Promise<void> {
  const snapshot = await computeQaSnapshot(DEFAULT_RANGE_DAYS);
  await saveQaMetricsSnapshot(snapshot);
  revalidatePath("/en/admin/qa-metrics");
}

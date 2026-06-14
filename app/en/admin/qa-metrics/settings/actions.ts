"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function updateQaMetricsTargets(formData: FormData): Promise<void> {
  const targetReplyRate = Number(formData.get("targetReplyRate"));
  const targetResponseTimeHours = Number(formData.get("targetResponseTimeHours"));
  const targetTimeToCloseDays = Number(formData.get("targetTimeToCloseDays"));
  const replyRateDropAlertPct = Number(formData.get("replyRateDropAlertPct"));

  await supabaseAdmin.from("qa_metrics_targets").upsert({
    id: 1,
    target_reply_rate: targetReplyRate,
    target_response_time_hours: targetResponseTimeHours,
    target_time_to_close_days: targetTimeToCloseDays,
    reply_rate_drop_alert_pct: replyRateDropAlertPct,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/en/admin/qa-metrics/settings");
  revalidatePath("/en/admin/qa-metrics");
}

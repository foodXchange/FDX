import { Resend } from "resend";
import type { WeeklyReportData, ReportStatus } from "@/lib/metrics/qaMetrics";

const STATUS_COLORS: Record<ReportStatus, string> = {
  healthy: "#22c55e",
  degrading: "#f59e0b",
  critical: "#ef4444",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  healthy: "Healthy",
  degrading: "Degrading",
  critical: "Critical",
};

export async function sendQaMetricsWeeklyReport(report: WeeklyReportData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping QA metrics weekly report");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
  const { snapshotDate, metrics, alerts, suggestions } = report;

  const metricsRows = metrics
    .map(
      (m) => `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;color:#1e293b;font-weight:500;">${m.label}</td>
        <td style="padding:8px 0;color:#64748b;text-align:right;">${m.value !== null ? `${m.value}${m.unit}` : "—"} (target: ${m.target}${m.unit})</td>
        <td style="padding:8px 0;text-align:right;">
          <span style="background:${STATUS_COLORS[m.status]};color:white;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;">${STATUS_LABELS[m.status]}</span>
        </td>
      </tr>`
    )
    .join("");

  const alertsSection =
    alerts.length > 0
      ? `<h3 style="color:#1e293b;font-size:14px;margin:24px 0 8px;">Bottleneck alerts (${alerts.length})</h3>
<ul style="padding-left:16px;margin:0;color:#334155;font-size:13px;line-height:1.7;">
${alerts.map((a) => `<li><strong>${a.title}</strong> — ${a.detail}</li>`).join("")}
</ul>`
      : `<p style="color:#64748b;font-size:13px;margin:24px 0 0;">No bottleneck alerts this week.</p>`;

  const suggestionsSection =
    suggestions.length > 0
      ? `<h3 style="color:#1e293b;font-size:14px;margin:24px 0 8px;">Optimization suggestions (${suggestions.length})</h3>
<ul style="padding-left:16px;margin:0;color:#334155;font-size:13px;line-height:1.7;">
${suggestions.map((s) => `<li><strong>${s.title}</strong> — ${s.detail}</li>`).join("")}
</ul>`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">QA Metrics — Weekly Report</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Snapshot date: ${snapshotDate}</p>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:8px;">
      <thead>
        <tr style="text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">
          <th style="padding-bottom:6px;">Metric</th>
          <th style="padding-bottom:6px;text-align:right;">Value</th>
          <th style="padding-bottom:6px;text-align:right;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${metricsRows}
      </tbody>
    </table>

    ${alertsSection}

    ${suggestionsSection}

    <a href="https://fdx.trading/en/admin/qa-metrics"
      style="display:inline-block;margin-top:24px;background:#ea580c;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Open QA Metrics dashboard →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `📊 QA Metrics weekly report — ${snapshotDate}`,
      html,
    });
  } catch (err) {
    console.error("sendQaMetricsWeeklyReport email send failed:", err);
  }
}

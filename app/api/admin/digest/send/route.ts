import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: newRequests }, { data: pendingRequests }, { data: recentPosts }] =
    await Promise.all([
      supabaseAdmin
        .from("sourcing_requests")
        .select("id, product_name, company, status, created_at")
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("sourcing_requests")
        .select("id, product_name, company, created_at")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("blog_posts")
        .select("slug, title, published_at, status")
        .gte("published_at", sevenDaysAgo)
        .eq("status", "published")
        .order("published_at", { ascending: false }),
    ]);

  const requests = newRequests ?? [];
  const pending = pendingRequests ?? [];
  const posts = recentPosts ?? [];

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const STATUS_COLORS: Record<string, string> = {
    new: "#ea580c",
    matched: "#16a34a",
    pending: "#64748b",
    closed: "#94a3b8",
  };

  const requestRows =
    requests.length > 0
      ? requests
          .map((r) => {
            const color = STATUS_COLORS[r.status ?? "new"] ?? "#64748b";
            return `<tr style="border-bottom:1px solid #f1f5f9;">
  <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:500;">${r.product_name ?? "—"}</td>
  <td style="padding:8px 0;color:#64748b;font-size:13px;">${r.company ?? "—"}</td>
  <td style="padding:8px 0;text-align:right;">
    <span style="background:${color}22;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;">${r.status ?? "new"}</span>
  </td>
</tr>`;
          })
          .join("")
      : `<tr><td colspan="3" style="padding:12px 0;color:#94a3b8;font-size:13px;">No new requests in the last 24 hours</td></tr>`;

  const pendingSection =
    pending.length > 0
      ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:24px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#9a3412;">${pending.length} unmatched request${pending.length !== 1 ? "s" : ""} waiting</p>
  <p style="margin:0;font-size:12px;color:#c2410c;">${pending
    .slice(0, 3)
    .map((r) => r.product_name ?? "Unnamed")
    .join(" · ")}${pending.length > 3 ? ` + ${pending.length - 3} more` : ""}</p>
</div>`
      : "";

  const postsSection =
    posts.length > 0
      ? `<h3 style="color:#1e293b;font-size:13px;font-weight:600;margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.05em;">Recent blog posts</h3>
${posts
  .map(
    (p) =>
      `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
  <a href="https://fdx.trading/en/blog/${p.slug}" style="color:#ea580c;font-size:14px;text-decoration:none;font-weight:500;">${p.title}</a>
  <span style="color:#94a3b8;font-size:12px;margin-left:8px;">${p.published_at ? new Date(p.published_at).toLocaleDateString("en-GB") : "—"}</span>
</div>`
  )
  .join("")}`
      : "";

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:20px 24px;">
    <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Morning digest</p>
    <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">${dateLabel}</h1>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">

    ${pendingSection}

    <h3 style="color:#1e293b;font-size:13px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">
      New requests (last 24h) — ${requests.length}
    </h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr>
          <th style="text-align:left;color:#94a3b8;font-size:11px;font-weight:500;padding-bottom:6px;">Product</th>
          <th style="text-align:left;color:#94a3b8;font-size:11px;font-weight:500;padding-bottom:6px;">Company</th>
          <th style="text-align:right;color:#94a3b8;font-size:11px;font-weight:500;padding-bottom:6px;">Status</th>
        </tr>
      </thead>
      <tbody>${requestRows}</tbody>
    </table>

    ${postsSection}

    <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap;">
      <a href="https://fdx.trading/admin/requests" style="display:inline-block;background:#ea580c;color:white;text-decoration:none;font-weight:600;font-size:13px;padding:10px 18px;border-radius:8px;">
        View all requests →
      </a>
      <a href="https://fdx.trading/admin/suppliers" style="display:inline-block;background:#f1f5f9;color:#475569;text-decoration:none;font-weight:600;font-size:13px;padding:10px 18px;border-radius:8px;">
        Suppliers
      </a>
      <a href="https://fdx.trading/admin/scraper" style="display:inline-block;background:#f1f5f9;color:#475569;text-decoration:none;font-weight:600;font-size:13px;padding:10px 18px;border-radius:8px;">
        Scraper
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";

  try {
    await resend.emails.send({
      from,
      to,
      subject: `FoodXchange digest — ${dateLabel} · ${requests.length} new request${requests.length !== 1 ? "s" : ""}`,
      html,
    });
  } catch (err) {
    console.error("Digest email send failed:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    requestCount: requests.length,
    pendingCount: pending.length,
  });
}

import { Resend } from "resend";

export interface SendNewsletterInput {
  issue: {
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    created_at: string;
  };
  subscribers: string[];
  previewEmail?: string;
}

export interface SendNewsletterResult {
  ok: boolean;
  sent: number;
  failed: number;
  errors: string[];
  previewOnly: boolean;
}

export async function sendNewsletter(
  input: SendNewsletterInput
): Promise<SendNewsletterResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      errors: ["RESEND_API_KEY not configured"],
      previewOnly: false,
    };
  }

  const isPreview = !!input.previewEmail;
  const recipients = isPreview
    ? [input.previewEmail!]
    : input.subscribers;

  if (recipients.length === 0) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      errors: ["No recipients"],
      previewOnly: isPreview,
    };
  }

  const articleUrl = `https://fdx.trading/en/newsletter/${input.issue.slug}`;

  const html = buildNewsletterHtml({
    title: input.issue.title,
    excerpt: input.issue.excerpt,
    content: input.issue.content,
    articleUrl,
    issueDate: new Date(input.issue.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  const BATCH_SIZE = 50;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    try {
      await resend.emails.send({
        from,
        to: batch,
        subject: `FoodXchange Market Notes — ${input.issue.title}`,
        html,
        headers: {
          "List-Unsubscribe": "<https://fdx.trading/en/unsubscribe>",
        },
      });
      sent += batch.length;
    } catch (err) {
      failed += batch.length;
      errors.push(err instanceof Error ? err.message : "Batch send failed");
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { ok: sent > 0, sent, failed, errors, previewOnly: isPreview };
}

function buildNewsletterHtml(opts: {
  title: string;
  excerpt: string | null;
  content: string;
  articleUrl: string;
  issueDate: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#ea580c;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;">
        FOODXCHANGE MARKET NOTES
      </p>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        ${opts.issueDate}
      </p>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:32px;">
      <!-- Orange top bar -->
      <div style="height:4px;background:#ea580c;"></div>

      <div style="padding:40px 40px 32px;">
        <h1 style="font-size:26px;font-weight:700;color:#0f172a;margin:0 0 16px;line-height:1.3;">
          ${opts.title}
        </h1>

        ${opts.excerpt
          ? `<p style="font-size:16px;color:#64748b;line-height:1.7;margin:0 0 24px;">${opts.excerpt}</p>`
          : ""}

        <!-- Read button -->
        <a href="${opts.articleUrl}"
          style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Read this issue &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:24px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;">
        FoodXchange &middot; Strategic Sourcing &middot;
        <a href="https://fdx.trading" style="color:#ea580c;text-decoration:none;">fdx.trading</a>
      </p>
      <p style="color:#cbd5e1;font-size:11px;margin:0;">
        <a href="https://fdx.trading/en/unsubscribe" style="color:#cbd5e1;">Unsubscribe</a>
        &middot; No spam &middot; 1-2 updates per month
      </p>
    </div>

  </div>
</body>
</html>`;
}

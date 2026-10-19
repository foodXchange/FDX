import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { Resend } from "resend";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface GmailCredentials {
  user: string;
  appPassword: string;
  senderName?: string;
}

/**
 * Resolves Gmail credentials from environment variables (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)
 * or from the `category_images` / admin metadata store if saved via UI.
 */
export async function getGmailCredentials(): Promise<GmailCredentials | null> {
  const envUser = process.env.GMAIL_USER?.trim();
  const envPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim();
  if (envUser && envPass) {
    return {
      user: envUser,
      appPassword: envPass,
      senderName: process.env.GMAIL_SENDER_NAME?.trim() || "FoodXchange Sourcing",
    };
  }

  // Fallback: check if stored in scrape_batches metadata key "__gmail_config__"
  try {
    const { data } = await supabaseAdmin
      .from("scrape_batches")
      .select("original_filename")
      .eq("batch_key", "__gmail_config__")
      .maybeSingle();

    if (data?.original_filename) {
      const parsed = JSON.parse(data.original_filename) as {
        user?: string;
        appPassword?: string;
        senderName?: string;
      };
      if (parsed.user && parsed.appPassword) {
        return {
          user: parsed.user.trim(),
          appPassword: parsed.appPassword.replace(/\s+/g, "").trim(),
          senderName: parsed.senderName?.trim() || "FoodXchange Sourcing",
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function saveGmailCredentials(creds: GmailCredentials): Promise<void> {
  await supabaseAdmin.from("scrape_batches").upsert(
    {
      batch_key: "__gmail_config__",
      original_filename: JSON.stringify({
        user: creds.user.trim(),
        appPassword: creds.appPassword.replace(/\s+/g, "").trim(),
        senderName: creds.senderName?.trim() || "FoodXchange Sourcing",
      }),
      total_rows: 0,
    },
    { onConflict: "batch_key" }
  );
}

export function getMatchRefTag(matchId: string): string {
  return `FDX-${matchId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function buildGmailThreadUrl(opts: {
  matchId?: string;
  supplierEmail?: string | null;
  messageId?: string | null;
}): string {
  if (opts.messageId) {
    const cleanId = opts.messageId.replace(/^<|>$/g, "");
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      `rfc822msgid:${cleanId}`
    )}`;
  }
  if (opts.matchId) {
    const ref = getMatchRefTag(opts.matchId);
    if (opts.supplierEmail) {
      return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
        `(${opts.supplierEmail} OR ${ref})`
      )}`;
    }
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(ref)}`;
  }
  if (opts.supplierEmail) {
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      opts.supplierEmail
    )}`;
  }
  return "https://mail.google.com/mail/u/0/#inbox";
}

export interface SendGmailOptions {
  matchId: string;
  to: string;
  subject: string;
  bodyText: string;
  benchmarkCardHtml?: string;
  isFollowUp?: boolean;
  previousMessageId?: string | null;
  previousSentAt?: string | null;
  previousBodyText?: string | null;
}

export interface SendGmailResult {
  success: boolean;
  via: "gmail" | "resend";
  messageId?: string;
  subjectUsed?: string;
  error?: string;
}

export async function sendSupplierEmailSmart(
  opts: SendGmailOptions
): Promise<SendGmailResult> {
  const refTag = getMatchRefTag(opts.matchId);
  const baseSubject = opts.subject.includes(refTag)
    ? opts.subject
    : `${opts.subject} [${refTag}]`;

  const finalSubject =
    opts.isFollowUp && !/^re:/i.test(baseSubject)
      ? `Re: ${baseSubject}`
      : baseSubject;

  const escapedBody = opts.bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const quotedPreviousHtml =
    opts.isFollowUp && opts.previousBodyText
      ? `<div style="margin-top:24px;padding-left:14px;border-left:3px solid #cbd5e1;color:#64748b;font-size:13px;">
          <p style="margin:0 0 8px;">On ${
            opts.previousSentAt
              ? new Date(opts.previousSentAt).toUTCString()
              : "our previous message"
          }, we wrote:</p>
          <div style="white-space:pre-wrap;">${opts.previousBodyText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</div>
        </div>`
      : "";

  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1e293b;">
  <div style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapedBody}</div>
  ${opts.benchmarkCardHtml ?? ""}
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:24px 0 0;">
    Best regards,<br/>
    <strong>FoodXchange Sourcing Team</strong><br/>
    <span style="color:#64748b;font-size:12px;">www.fdx.trading · Ref: ${refTag}</span>
  </p>
  ${quotedPreviousHtml}
</div>`;

  const creds = await getGmailCredentials();

  // 1. Send via user's real Gmail SMTP if configured
  if (creds) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: creds.user,
          pass: creds.appPassword,
        },
      });

      const customMsgId = `<fdx-${opts.matchId}-${Date.now()}@gmail.com>`;
      const headers: Record<string, string> = {
        "X-FDX-Match-ID": opts.matchId,
        "X-FDX-Ref": refTag,
      };

      const mailOptions: {
        from: string;
        to: string;
        replyTo: string;
        subject: string;
        text: string;
        html: string;
        messageId: string;
        headers: Record<string, string>;
        inReplyTo?: string;
        references?: string[];
      } = {
        from: `"${creds.senderName || "FoodXchange Sourcing"}" <${creds.user}>`,
        to: opts.to,
        replyTo: creds.user,
        subject: finalSubject,
        text: opts.bodyText,
        html,
        messageId: customMsgId,
        headers,
      };

      if (opts.isFollowUp && opts.previousMessageId) {
        mailOptions.inReplyTo = opts.previousMessageId;
        mailOptions.references = [opts.previousMessageId];
      }

      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        via: "gmail",
        messageId: info.messageId || customMsgId,
        subjectUsed: finalSubject,
      };
    } catch (err) {
      return {
        success: false,
        via: "gmail",
        error:
          err instanceof Error
            ? `Gmail SMTP error: ${err.message}`
            : "Gmail SMTP failed",
      };
    }
  }

  // 2. Fallback to Resend if Gmail App Password is not configured yet
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      via: "resend",
      error:
        "Neither Gmail App Password nor RESEND_API_KEY is configured. Click '⚙ Connect Gmail' to add your Gmail App Password.",
    };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from =
      process.env.SOURCING_FROM_EMAIL ??
      "FoodXchange Sourcing <sourcing@fdx.trading>";
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: finalSubject,
      html,
    });
    if (error) {
      return { success: false, via: "resend", error: error.message };
    }
    return {
      success: true,
      via: "resend",
      messageId: data?.id ? `<${data.id}@resend.dev>` : undefined,
      subjectUsed: finalSubject,
    };
  } catch (err) {
    return {
      success: false,
      via: "resend",
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export interface SyncedReplyItem {
  matchId: string;
  supplierName: string | null;
  fromEmail: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

interface ParsedSupplierReply {
  responseType: "accepted" | "countered" | "declined";
  englishSummary: string;
  indicativePrice: string | null;
  moq: string | null;
  leadTime: string | null;
  confirmedCerts: string[];
  samplesAvailable: string | null;
}

async function parseSupplierReplyWithAI(
  rawText: string,
  subject: string
): Promise<ParsedSupplierReply> {
  const fallback: ParsedSupplierReply = {
    responseType: "accepted",
    englishSummary: rawText.slice(0, 400),
    indicativePrice: null,
    moq: null,
    leadTime: null,
    confirmedCerts: [],
    samplesAvailable: null,
  };

  if (!process.env.GEMINI_API_KEY || rawText.length < 10) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a B2B food sourcing analyst. Parse the following supplier email reply (which may be in English, Spanish, Italian, German, French, Greek, Turkish, or Hebrew).
Translate/summarize the core commercial response into clear English and extract any commercial terms mentioned.

Subject: ${subject}
Body:
${rawText.slice(0, 1500)}

Return ONLY valid JSON with this exact shape:
{
  "responseType": "accepted" | "countered" | "declined",
  "englishSummary": "Concise 1-3 sentence English summary of the supplier's reply",
  "indicativePrice": "Extracted price & currency/incoterm if mentioned, else null",
  "moq": "Extracted MOQ if mentioned, else null",
  "leadTime": "Extracted lead time if mentioned, else null",
  "confirmedCerts": ["Array of confirmed certifications like Kosher, IFS, BRC, Organic, Halal"],
  "samplesAvailable": "Extracted sample availability if mentioned, else null"
}`;

    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(res.text ?? "{}") as Partial<ParsedSupplierReply>;
    return {
      responseType:
        parsed.responseType === "declined" || parsed.responseType === "countered"
          ? parsed.responseType
          : "accepted",
      englishSummary:
        typeof parsed.englishSummary === "string" && parsed.englishSummary.trim()
          ? parsed.englishSummary.trim()
          : fallback.englishSummary,
      indicativePrice:
        typeof parsed.indicativePrice === "string" && parsed.indicativePrice.trim()
          ? parsed.indicativePrice.trim()
          : null,
      moq:
        typeof parsed.moq === "string" && parsed.moq.trim()
          ? parsed.moq.trim()
          : null,
      leadTime:
        typeof parsed.leadTime === "string" && parsed.leadTime.trim()
          ? parsed.leadTime.trim()
          : null,
      confirmedCerts: Array.isArray(parsed.confirmedCerts)
        ? parsed.confirmedCerts.filter((c): c is string => typeof c === "string")
        : [],
      samplesAvailable:
        typeof parsed.samplesAvailable === "string" && parsed.samplesAvailable.trim()
          ? parsed.samplesAvailable.trim()
          : null,
    };
  } catch {
    return fallback;
  }
}

/**
 * Connects to Gmail IMAP (`imap.gmail.com`) and scans recent inbox messages
 * for supplier replies matching `[FDX-xxxxxxxx]` reference tags or contacted supplier emails.
 */
export async function syncGmailInboxReplies(): Promise<{
  ok: boolean;
  syncedCount: number;
  replies: SyncedReplyItem[];
  error?: string;
}> {
  const creds = await getGmailCredentials();
  if (!creds) {
    return {
      ok: false,
      syncedCount: 0,
      replies: [],
      error:
        "Gmail credentials not configured yet. Click '⚙ Connect Gmail' to enter your Gmail address and 16-character App Password.",
    };
  }

  // Load contacted/active matches with their supplier emails
  const { data: activeMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, supplier_id, company_name, status, sent_at, supplier_responded_at, match_breakdown,
       supplier:supplier_offerings(contact_email)`
    )
    .in("status", ["sent", "rfq_sent", "approved", "responded", "pending"])
    .limit(500);

  const matchesList = ((activeMatches ?? []) as unknown) as Array<{
    id: string;
    supplier_id: string;
    company_name: string | null;
    status: string;
    sent_at: string | null;
    supplier_responded_at: string | null;
    match_breakdown: Record<string, unknown> | null;
    supplier:
      | { contact_email: string | null }
      | Array<{ contact_email: string | null }>
      | null;
  }>;

  const refToMatch = new Map<string, (typeof matchesList)[number]>();
  const emailToMatch = new Map<string, (typeof matchesList)[number]>();

  for (const m of matchesList) {
    refToMatch.set(getMatchRefTag(m.id), m);
    const supObj = Array.isArray(m.supplier) ? m.supplier[0] : m.supplier;
    const em = supObj?.contact_email?.toLowerCase().trim();
    if (em) emailToMatch.set(em, m);
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: creds.user,
      pass: creds.appPassword,
    },
    logger: false,
  });

  const syncedReplies: SyncedReplyItem[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const sinceDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const uids = await client.search({ since: sinceDate });

      if (uids && uids.length > 0) {
        // Check most recent 150 messages in INBOX
        const recentUids = uids.slice(-150);
        for await (const msg of client.fetch(recentUids, {
          envelope: true,
          source: true,
        })) {
          const env = msg.envelope;
          if (!env) continue;
          const fromAddr = env.from?.[0]?.address?.toLowerCase().trim() ?? "";
          if (!fromAddr || fromAddr === creds.user.toLowerCase()) continue;

          const subj = env.subject ?? "";
          const refMatch = subj.match(/FDX-[A-F0-9]{8}/i);
          const matchedRecord =
            (refMatch ? refToMatch.get(refMatch[0].toUpperCase()) : undefined) ??
            emailToMatch.get(fromAddr);

          if (!matchedRecord) continue;

          const msgDate = env.date
            ? new Date(env.date).toISOString()
            : new Date().toISOString();

          // Extract plain text snippet from raw email source
          let rawSnippet = "";
          if (msg.source) {
            const rawStr = msg.source.toString("utf-8");
            const bodyStart = rawStr.indexOf("\r\n\r\n");
            if (bodyStart !== -1) {
              rawSnippet = rawStr
                .slice(bodyStart + 4)
                .replace(/=\r?\n/g, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 1200);
            }
          }
          if (!rawSnippet) {
            rawSnippet = `Reply received from ${fromAddr}: "${subj}"`;
          }

          const existingRespondedAt = matchedRecord.supplier_responded_at;
          const isNewer =
            !existingRespondedAt ||
            new Date(msgDate).getTime() >
              new Date(existingRespondedAt).getTime();

          if (isNewer || matchedRecord.status !== "responded") {
            const aiParsed = await parseSupplierReplyWithAI(rawSnippet, subj);
            const prevQuote =
              matchedRecord.match_breakdown &&
              typeof matchedRecord.match_breakdown.supplier_quote === "object" &&
              matchedRecord.match_breakdown.supplier_quote !== null
                ? (matchedRecord.match_breakdown.supplier_quote as Record<
                    string,
                    unknown
                  >)
                : {};

            const mergedQuote = {
              ...prevQuote,
              response_type: aiParsed.responseType,
              indicative_price:
                aiParsed.indicativePrice ?? prevQuote.indicative_price ?? null,
              moq: aiParsed.moq ?? prevQuote.moq ?? null,
              lead_time: aiParsed.leadTime ?? prevQuote.lead_time ?? null,
              confirmed_certs:
                aiParsed.confirmedCerts.length > 0
                  ? aiParsed.confirmedCerts
                  : (prevQuote.confirmed_certs as string[] | undefined) ?? [],
              samples_available:
                aiParsed.samplesAvailable ?? prevQuote.samples_available ?? null,
              contact_email: fromAddr,
              submitted_at: msgDate,
            };

            const termsLine = [
              mergedQuote.indicative_price
                ? `Price: ${String(mergedQuote.indicative_price)}`
                : null,
              mergedQuote.moq ? `MOQ: ${String(mergedQuote.moq)}` : null,
              mergedQuote.lead_time
                ? `Lead Time: ${String(mergedQuote.lead_time)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

            const formattedSnippet = termsLine
              ? `${aiParsed.englishSummary} (${termsLine})`
              : aiParsed.englishSummary;

            const updatedBreakdown = {
              ...(matchedRecord.match_breakdown ?? {}),
              last_reply_from: fromAddr,
              last_reply_subject: subj,
              last_reply_snippet: formattedSnippet.slice(0, 450),
              last_reply_at: msgDate,
              supplier_quote: mergedQuote,
            };

            await supabaseAdmin
              .from("sourcing_matches")
              .update({
                status:
                  aiParsed.responseType === "declined" ? "rejected" : "responded",
                supplier_response: aiParsed.responseType,
                supplier_responded_at: msgDate,
                responded_at: msgDate,
                supplier_message: formattedSnippet.slice(0, 1000),
                match_breakdown: updatedBreakdown,
              })
              .eq("id", matchedRecord.id);

            await supabaseAdmin.from("match_messages").insert({
              match_id: matchedRecord.id,
              sender_type: "supplier",
              message: `[Gmail Reply from ${fromAddr}]\nSummary: ${formattedSnippet}\n\nRaw Excerpt:\n${rawSnippet.slice(0, 500)}`,
            });

            syncedReplies.push({
              matchId: matchedRecord.id,
              supplierName: matchedRecord.company_name,
              fromEmail: fromAddr,
              subject: subj,
              snippet: formattedSnippet,
              receivedAt: msgDate,
            });
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return {
      ok: true,
      syncedCount: syncedReplies.length,
      replies: syncedReplies,
    };
  } catch (err) {
    return {
      ok: false,
      syncedCount: 0,
      replies: [],
      error:
        err instanceof Error
          ? `Gmail IMAP sync error: ${err.message}`
          : "Gmail IMAP sync failed",
    };
  }
}

import { ImapFlow } from "imapflow";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getGmailCredentials } from "@/lib/email/gmailEngine";
import {
  parseInboundCorrespondenceWithAI,
  applyInboundParseToRequest,
  type InboundAiParseResult,
} from "@/lib/email/inboundAiParser";
import { createNotification } from "@/lib/notifications/createNotification";
import { getMatchRefTag } from "@/lib/notifications/gmailHelper";

export interface SyncedInboundItem {
  messageId: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  requestId?: string;
  matchId?: string;
  supplierName?: string;
  intent: string;
  summary: string;
  updatedStages: string[];
}

export interface ImapPollResult {
  ok: boolean;
  scannedCount: number;
  syncedCount: number;
  syncedReplies: SyncedInboundItem[];
  durationMs: number;
  error?: string;
}

/**
 * Extracts plain text from raw email source by removing headers,
 * handling basic quoted-printable encoding, and stripping HTML.
 */
function extractBodyFromSource(rawSource: Buffer | string): string {
  const rawStr = typeof rawSource === "string" ? rawSource : rawSource.toString("utf-8");
  const bodyStart = rawStr.indexOf("\r\n\r\n");
  const rawBody = bodyStart !== -1 ? rawStr.slice(bodyStart + 4) : rawStr;

  return rawBody
    .replace(/=\r?\n/g, "") // quoted-printable soft line breaks
    .replace(/=([A-F0-9]{2})/gi, (_match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _match;
      }
    })
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

/**
 * Connects to IMAP inbox, scans for recent unread or inbound replies matching
 * FoodXchange project references [FDX-REQ-...] or [FDX-...], extracts commercial terms
 * using Gemini 3.8 Flash, and auto-applies them to the sourcing pipeline stages.
 */
export async function pollAndSyncInboundEmails(options?: {
  maxMessages?: number;
  daysToLookBack?: number;
}): Promise<ImapPollResult> {
  const startTime = Date.now();
  const maxMessages = options?.maxMessages ?? 100;
  const daysToLookBack = options?.daysToLookBack ?? 7;

  const creds = await getGmailCredentials();
  if (!creds) {
    return {
      ok: false,
      scannedCount: 0,
      syncedCount: 0,
      syncedReplies: [],
      durationMs: Date.now() - startTime,
      error: "Gmail IMAP credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.",
    };
  }

  // Pre-load active requests & matches to optimize lookups
  const { data: activeMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(`
      id, request_id, supplier_id, company_name, status, sent_at, match_breakdown,
      supplier:supplier_offerings(contact_email)
    `)
    .in("status", ["sent", "rfq_sent", "approved", "responded"])
    .order("sent_at", { ascending: false })
    .limit(300);

  const emailToMatchMap = new Map<string, any>();
  const matchIdMap = new Map<string, any>();

  for (const m of activeMatches ?? []) {
    matchIdMap.set(m.id.toLowerCase(), m);
    const sup = Array.isArray(m.supplier) ? m.supplier[0] : m.supplier;
    if (sup?.contact_email) {
      emailToMatchMap.set(sup.contact_email.toLowerCase().trim(), m);
    }
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

  const syncedReplies: SyncedInboundItem[] = [];
  let scannedCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const sinceDate = new Date(Date.now() - daysToLookBack * 24 * 60 * 60 * 1000);
      const uids = await client.search({ since: sinceDate });

      if (uids && uids.length > 0) {
        const targetUids = uids.slice(-maxMessages);
        scannedCount = targetUids.length;

        for await (const msg of client.fetch(targetUids, {
          envelope: true,
          source: true,
        })) {
          const env = msg.envelope;
          if (!env) continue;

          const fromAddr = env.from?.[0]?.address?.toLowerCase().trim() ?? "";
          if (!fromAddr || fromAddr === creds.user.toLowerCase()) {
            continue; // Skip messages sent by self
          }

          const subj = env.subject ?? "";
          const msgId = env.messageId || `uid-${msg.uid}`;
          const msgDate = env.date ? new Date(env.date).toISOString() : new Date().toISOString();

          // 1. Resolve Project Reference [FDX-REQ-XXXXXXXX] or Match Tag [FDX-XXXXXXXX]
          let resolvedRequestId: string | null = null;
          let resolvedMatchId: string | null = null;

          const reqMatch = `${subj}`.match(/FDX-REQ-([A-F0-9]{8})/i);
          if (reqMatch) {
            const shortReqId = reqMatch[1].toLowerCase();
            const { data: matchedReq } = await supabaseAdmin
              .from("sourcing_requests")
              .select("id")
              .ilike("id", `${shortReqId}%`)
              .maybeSingle();

            if (matchedReq) {
              resolvedRequestId = matchedReq.id;
            }
          }

          const matchRef = `${subj}`.match(/FDX-([A-F0-9]{8})/i);
          if (matchRef && !reqMatch) {
            const shortMatchId = matchRef[1].toLowerCase();
            const matchedRow = Array.from(matchIdMap.values()).find((m) =>
              m.id.toLowerCase().startsWith(shortMatchId)
            );
            if (matchedRow) {
              resolvedMatchId = matchedRow.id;
              resolvedRequestId = matchedRow.request_id;
            }
          }

          // 2. Fallback: match by sender's email address
          if (!resolvedMatchId && emailToMatchMap.has(fromAddr)) {
            const fallbackMatch = emailToMatchMap.get(fromAddr);
            resolvedMatchId = fallbackMatch.id;
            if (!resolvedRequestId) resolvedRequestId = fallbackMatch.request_id;
          }

          // If this email doesn't pertain to an FDX request or match, ignore it
          if (!resolvedRequestId && !resolvedMatchId) {
            continue;
          }

          // 3. Deduplication: Check if this message was already processed
          const existingMatch = resolvedMatchId ? matchIdMap.get(resolvedMatchId.toLowerCase()) : null;
          const processedIds: string[] = Array.isArray(existingMatch?.match_breakdown?.processed_message_ids)
            ? existingMatch.match_breakdown.processed_message_ids
            : [];

          if (processedIds.includes(msgId)) {
            continue; // Already ingested and processed
          }

          // 4. Extract clean plain text
          const rawSnippet = msg.source ? extractBodyFromSource(msg.source) : subj;
          if (!rawSnippet || rawSnippet.length < 5) continue;

          // 5. Parse with Gemini 3.8 Flash
          const aiParsed: InboundAiParseResult = await parseInboundCorrespondenceWithAI(
            rawSnippet,
            subj,
            fromAddr
          );

          // 6. Apply to request stages (Quote, Samples, QA, Logistics)
          let updatedStages: string[] = [];
          if (resolvedRequestId) {
            const applyRes = await applyInboundParseToRequest(
              resolvedRequestId,
              resolvedMatchId,
              aiParsed,
              {
                fromEmail: fromAddr,
                subject: subj,
                bodyText: rawSnippet,
                receivedAt: msgDate,
              }
            );

            if (applyRes.ok) {
              updatedStages = applyRes.updatedStages;
            }
          }

          // 7. Track this messageId in match_breakdown so we never reprocess it
          if (resolvedMatchId && existingMatch) {
            const currentBreakdown = existingMatch.match_breakdown ?? {};
            const newProcessedIds = [...processedIds, msgId];

            await supabaseAdmin
              .from("sourcing_matches")
              .update({
                match_breakdown: {
                  ...currentBreakdown,
                  processed_message_ids: newProcessedIds,
                  last_inbound_msg_id: msgId,
                  last_inbound_at: msgDate,
                },
              })
              .eq("id", resolvedMatchId);
          }

          // 8. Fire high-priority Notification for the Agent
          const supplierName = existingMatch?.company_name || aiParsed.detected_supplier_name || fromAddr;
          const notificationTitle = `📩 Inbound Factory Reply: ${supplierName}`;
          const notificationMessage = `${aiParsed.english_summary} (${updatedStages.join(" · ") || aiParsed.intent})`;

          await createNotification("match_reply", notificationTitle, notificationMessage, {
            requestId: resolvedRequestId,
            matchId: resolvedMatchId,
            fromEmail: fromAddr,
            subject: subj,
            intent: aiParsed.intent,
            stages: updatedStages,
            confidence: aiParsed.confidence,
            action_url: resolvedRequestId ? `/admin/requests/${resolvedRequestId}` : "/admin/requests",
            priority: "urgent",
          });

          syncedReplies.push({
            messageId: msgId,
            fromEmail: fromAddr,
            subject: subj,
            receivedAt: msgDate,
            requestId: resolvedRequestId || undefined,
            matchId: resolvedMatchId || undefined,
            supplierName,
            intent: aiParsed.intent,
            summary: aiParsed.english_summary,
            updatedStages,
          });
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "IMAP connection error";
    console.error("pollAndSyncInboundEmails error:", errorMsg);

    await logPollHeartbeat({
      status: "error",
      error: errorMsg,
      durationMs: Date.now() - startTime,
      scannedCount,
      syncedCount: syncedReplies.length,
    });

    return {
      ok: false,
      scannedCount,
      syncedCount: syncedReplies.length,
      syncedReplies,
      durationMs: Date.now() - startTime,
      error: errorMsg,
    };
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }

  // 9. Record healthy heartbeat
  await logPollHeartbeat({
    status: "healthy",
    durationMs: Date.now() - startTime,
    scannedCount,
    syncedCount: syncedReplies.length,
  });

  return {
    ok: true,
    scannedCount,
    syncedCount: syncedReplies.length,
    syncedReplies,
    durationMs: Date.now() - startTime,
  };
}

async function logPollHeartbeat(data: {
  status: "healthy" | "error";
  durationMs: number;
  scannedCount: number;
  syncedCount: number;
  error?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("scrape_batches").upsert(
      {
        batch_key: "__imap_poll_status__",
        original_filename: JSON.stringify({
          ...data,
          polled_at: new Date().toISOString(),
        }),
        total_rows: data.syncedCount,
      },
      { onConflict: "batch_key" }
    );
  } catch {
    // ignore
  }
}

export async function getLastImapPollStatus(): Promise<{
  polled_at: string;
  status: "healthy" | "error";
  durationMs: number;
  scannedCount: number;
  syncedCount: number;
  error?: string;
} | null> {
  try {
    const { data } = await supabaseAdmin
      .from("scrape_batches")
      .select("original_filename")
      .eq("batch_key", "__imap_poll_status__")
      .maybeSingle();

    if (data?.original_filename) {
      return JSON.parse(data.original_filename);
    }
  } catch {
    // ignore
  }
  return null;
}

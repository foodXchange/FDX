"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  recordSupplierQuote,
  type SupplierQuotePayload,
} from "@/app/admin/requests/actions";

export interface OutreachThreadMessage {
  id: string;
  direction: "outbound" | "inbound";
  from?: string;
  to?: string;
  subject?: string;
  body: string;
  ai_summary?: string;
  intent?: string;
  provider?: string;
  is_follow_up?: boolean;
  created_at: string;
}

export interface OutreachMatchItem {
  id: string;
  request_id: string;
  supplier_id: string;
  company_name: string;
  product_name: string;
  country: string | null;
  match_score: number;
  status: string;
  sent_at: string | null;
  rfq_sent_at: string | null;
  responded_at: string | null;
  supplier_responded_at: string | null;
  supplier_response: string | null;
  supplier_message: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  delivery_status: string | null;
  quote: {
    unit_price?: number | null;
    currency?: string;
    net_weight?: string | null;
    packaging_format?: string | null;
    moq?: string | null;
    lead_time_weeks?: number | null;
    incoterm?: string | null;
    kosher_type?: string | null;
    cooperation_status?: "cooperating" | "counter_offer" | "declined";
    supplier_notes?: string | null;
    quoted_at?: string;
  } | null;
  matched_certifications: string[];
  kosher_types: string[];
  last_outreach_subject: string | null;
  last_outreach_body: string | null;
  last_outreach_at: string | null;
  outreach_history: OutreachThreadMessage[];
}

export interface OutreachRequestOption {
  id: string;
  shortTag: string; // e.g. FDX-REQ-74DD0220
  product_name: string;
  company: string | null;
  category: string | null;
  certifications: string[];
  volume_per_year: string | null;
  brief_status: string | null;
  target_market: string | null;
  temperature_regime: string | null;
  created_at: string;
}

interface Props {
  requests: OutreachRequestOption[];
  initialMatches: OutreachMatchItem[];
  initialRequestId?: string;
}

type FilterTab = "all" | "replies" | "awaiting" | "overdue_48h" | "ready_to_send";
type TemplateMode = "initial" | "followup_day3" | "followup_day7" | "ask_specs";

function formatDomain(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];
}

function ensureHttp(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function hoursSince(isoDate: string | null | undefined): number {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
}

export default function EmailOutreachHubClient({
  requests,
  initialMatches,
  initialRequestId,
}: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState<OutreachMatchItem[]>(initialMatches);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    initialRequestId || "all"
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    initialMatches[0]?.id || null
  );
  const [checkedMatchIds, setCheckedMatchIds] = useState<Set<string>>(new Set());

  // Composer state for the currently selected match
  const [templateMode, setTemplateMode] = useState<TemplateMode>("initial");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [nativeLanguagePrefix, setNativeLanguagePrefix] = useState<boolean>(true);
  const [sendingSingle, setSendingSingle] = useState<boolean>(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Sync IMAP state
  const [syncingImap, setSyncingImap] = useState(false);
  const [imapStatusMsg, setImapStatusMsg] = useState<string | null>(null);

  // Right pane: AI Inbound Paste Parser state
  const [pasteSubject, setPasteSubject] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const [parsingReply, setParsingReply] = useState(false);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  // Right pane: Direct Quote Recorder state
  const [quoteCoop, setQuoteCoop] = useState<
    "cooperating" | "counter_offer" | "declined"
  >("cooperating");
  const [quotePrice, setQuotePrice] = useState<string>("");
  const [quoteCurrency, setQuoteCurrency] = useState<string>("EUR");
  const [quoteWeight, setQuoteWeight] = useState<string>("");
  const [quoteFormat, setQuoteFormat] = useState<string>("");
  const [quoteMoq, setQuoteMoq] = useState<string>("1 Pallet / Trial Order");
  const [quoteIncoterm, setQuoteIncoterm] = useState<string>("FOB / CIF Ashdod");
  const [quoteLeadWeeks, setQuoteLeadWeeks] = useState<string>("3");
  const [quoteNotes, setQuoteNotes] = useState<string>("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteSavedMsg, setQuoteSavedMsg] = useState<string | null>(null);

  // Bulk Email Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"initial" | "followup">("initial");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkNativeLang, setBulkNativeLang] = useState(true);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResultMsg, setBulkResultMsg] = useState<string | null>(null);
  const [bulkEmailOverrides, setBulkEmailOverrides] = useState<
    Record<string, string>
  >({});

  // New Supplier Modal State
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
  const [newSuppRequestId, setNewSuppRequestId] = useState<string>(
    initialRequestId && initialRequestId !== "all"
      ? initialRequestId
      : requests[0]?.id || ""
  );
  const [newSuppCompany, setNewSuppCompany] = useState("");
  const [newSuppCountry, setNewSuppCountry] = useState("Spain");
  const [newSuppWebsite, setNewSuppWebsite] = useState("");
  const [newSuppEmail, setNewSuppEmail] = useState("");
  const [newSuppProduct, setNewSuppProduct] = useState("");
  const [newSuppNativeLang, setNewSuppNativeLang] = useState(true);
  const [newSuppSubmitting, setNewSuppSubmitting] = useState(false);
  const [newSuppError, setNewSuppError] = useState<string | null>(null);

  // Connected Email Accounts & Settings Modal State
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsData, setAccountsData] = useState<{
    activeAccount: {
      user: string;
      senderName: string;
      maskedPassword: string;
      source: "database" | "env";
    } | null;
    envAccount: {
      configured: boolean;
      user: string | null;
      senderName: string;
      maskedPassword: string;
      isActive: boolean;
    };
    savedAccounts: Array<{
      user: string;
      senderName: string;
      maskedPassword: string;
      addedAt: string;
      isActive: boolean;
    }>;
    resend: {
      configured: boolean;
      fromEmail: string;
    };
  } | null>(null);
  const [accFormUser, setAccFormUser] = useState("");
  const [accFormPassword, setAccFormPassword] = useState("");
  const [accFormSenderName, setAccFormSenderName] = useState(
    "FoodXchange Sourcing Desk"
  );
  const [accVerifyFirst, setAccVerifyFirst] = useState(true);
  const [accBusy, setAccBusy] = useState(false);
  const [accFeedback, setAccFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [testRecipient, setTestRecipient] = useState("");

  async function loadAccountsSnapshot() {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/admin/outreach/accounts");
      const data = await res.json();
      if (data.ok) {
        setAccountsData(data);
        if (!testRecipient && data.activeAccount?.user) {
          setTestRecipient(data.activeAccount.user);
        }
      }
    } catch {
      // ignore
    } finally {
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    void loadAccountsSnapshot();
  }, []);

  async function handleAccountAction(payload: Record<string, any>) {
    setAccBusy(true);
    setAccFeedback(null);
    try {
      const res = await fetch("/api/admin/outreach/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAccFeedback({
          type: "err",
          text: data.error || "Operation failed",
        });
      } else {
        if (data.activeAccount !== undefined) {
          setAccountsData(data);
        }
        setAccFeedback({
          type: "ok",
          text: data.message || "Settings updated!",
        });
        if (payload.action === "add_or_update") {
          setAccFormUser("");
          setAccFormPassword("");
        }
      }
    } catch (err: any) {
      setAccFeedback({
        type: "err",
        text: err.message || "Network error",
      });
    } finally {
      setAccBusy(false);
    }
  }

  // Map request_id -> OutreachRequestOption
  const requestMap = useMemo(() => {
    const map: Record<string, OutreachRequestOption> = {};
    for (const r of requests) {
      map[r.id] = r;
    }
    return map;
  }, [requests]);

  // Helper to classify a match
  function isReplied(m: OutreachMatchItem): boolean {
    return (
      m.status === "responded" ||
      Boolean(m.supplier_responded_at) ||
      Boolean(m.quote?.unit_price) ||
      m.outreach_history.some((h) => h.direction === "inbound")
    );
  }

  function isSentAwaiting(m: OutreachMatchItem): boolean {
    if (isReplied(m)) return false;
    return (
      m.status === "rfq_sent" ||
      m.status === "sent" ||
      Boolean(m.rfq_sent_at) ||
      Boolean(m.sent_at) ||
      Boolean(m.last_outreach_at)
    );
  }

  function isOverdue48h(m: OutreachMatchItem): boolean {
    if (!isSentAwaiting(m)) return false;
    const lastSent = m.last_outreach_at || m.rfq_sent_at || m.sent_at;
    return hoursSince(lastSent) >= 48;
  }

  function isReadyToSend(m: OutreachMatchItem): boolean {
    return !isReplied(m) && !isSentAwaiting(m) && m.status !== "rejected";
  }

  // Global KPI counts (scoped to selectedRequestId if chosen)
  const kpiStats = useMemo(() => {
    const pool =
      selectedRequestId === "all"
        ? matches
        : matches.filter((m) => m.request_id === selectedRequestId);

    let ready = 0;
    let awaiting = 0;
    let overdue = 0;
    let replied = 0;

    for (const m of pool) {
      if (isReplied(m)) replied++;
      else if (isSentAwaiting(m)) {
        awaiting++;
        if (isOverdue48h(m)) overdue++;
      } else if (isReadyToSend(m)) {
        ready++;
      }
    }

    return { total: pool.length, ready, awaiting, overdue, replied };
  }, [matches, selectedRequestId]);

  // Filtered matches for Left Pane
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedRequestId !== "all" && m.request_id !== selectedRequestId) {
        return false;
      }
      if (activeTab === "replies" && !isReplied(m)) return false;
      if (activeTab === "awaiting" && !isSentAwaiting(m)) return false;
      if (activeTab === "overdue_48h" && !isOverdue48h(m)) return false;
      if (activeTab === "ready_to_send" && !isReadyToSend(m)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const req = requestMap[m.request_id];
        const hay = `${m.company_name} ${m.product_name} ${m.country || ""} ${
          m.contact_email || ""
        } ${req?.shortTag || ""} ${req?.product_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, selectedRequestId, activeTab, searchQuery, requestMap]);

  // Currently selected match object
  const activeMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) || filteredMatches[0] || null,
    [matches, selectedMatchId, filteredMatches]
  );

  // Build smart template for a match + templateMode
  function generateTemplateForMatch(
    match: OutreachMatchItem,
    mode: TemplateMode
  ): { subject: string; body: string } {
    const req = requestMap[match.request_id];
    const reqTag = req?.shortTag || `FDX-REQ-${match.request_id.slice(0, 8).toUpperCase()}`;
    const matchTag = `FDX-${match.id.slice(0, 8).toUpperCase()}`;
    const prodName = req?.product_name || match.product_name || "Food Products";
    const certs =
      req?.certifications && req.certifications.length > 0
        ? req.certifications.join(", ")
        : "Standard Export Quality / Kosher if available";
    const vol = req?.volume_per_year || "Initial trial pallet(s), scaling to full FCL";

    const baseSubject = `[${reqTag}] [${matchTag}] Initial Supplier Inquiry & Catalog Request: ${prodName} — FoodXchange`;

    if (mode === "followup_day3") {
      return {
        subject: `Re: ${match.last_outreach_subject || baseSubject}`,
        body: `Dear Export & Commercial Team at ${match.company_name},

I am following up on our sourcing inquiry [${reqTag}] sent earlier this week regarding "${prodName}" for retail distribution in Israel.

Could you kindly let us know if your export desk can offer this line, and share:
1. Your current Export Product Catalog / Technical Spec Sheets (PDF)
2. Indicative Ex-Works / FOB pricing and Minimum Order Quantity (MOQ)
3. Kosher / quality certification status

Even a brief reply confirming availability or pointing us to the right regional manager is greatly appreciated.

Warm regards,
Udi — FoodXchange Sourcing Desk
Email: udi@foodxchange.com`,
      };
    }

    if (mode === "followup_day7") {
      return {
        subject: `Re: ${match.last_outreach_subject || baseSubject} — Final Shortlist Confirmation`,
        body: `Dear Export Team at ${match.company_name},

We are finalizing our manufacturer shortlist this week for [${reqTag}] (${prodName}) for presentation to our Israeli retail buyer committee.

Because ${match.company_name} matched our product profile (${match.match_score}% match), we would love to include your factory in the buyer presentation.

Please reply today with your catalog or preliminary price list if you wish to be included in this procurement round.

Best regards,
Udi — FoodXchange Sourcing Desk
Email: udi@foodxchange.com`,
      };
    }

    if (mode === "ask_specs") {
      return {
        subject: `Re: ${match.last_outreach_subject || baseSubject} — Commercial & Sample Details`,
        body: `Dear ${match.company_name} Team,

Thank you for your correspondence regarding [${reqTag}] (${prodName}).

To complete our Deal Desk evaluation for the buyer, could you please confirm:
- Unit price (EUR/USD) & units per master carton / pallet
- Minimum Order Quantity (MOQ) per SKU
- Lead time for production and whether tasting samples can be dispatched via courier (DHL/FedEx)

Thank you,
Udi — FoodXchange Sourcing Desk`,
      };
    }

    // Default: "initial"
    return {
      subject: baseSubject,
      body: `Dear Export & Commercial Team at ${match.company_name},

FoodXchange (FDX) is an international B2B food & beverage sourcing platform connecting manufacturers with leading retail chains, importers, and distributors in Israel.

We are currently managing an active sourcing mandate [${reqTag}] and identified ${match.company_name} as a strong manufacturing match (${match.match_score}% compatibility):

• Sourcing Reference: [${reqTag}] (Match Ref: [${matchTag}])
• Target Product Line: ${prodName}
• Dietary / Quality Profile: ${certs}
• Target Volume: ${vol}
• Destination Market: Israel (Retail & Distribution)

We would be pleased to explore a direct cooperation with your factory. Could you kindly share:
1. Confirmation that you manufacture and export relevant products in this category
2. Your current Export Product Catalog & Packaging Formats (PDF)
3. Indicative FOB / Ex-Works pricing and Minimum Order Quantities (MOQ)
4. Confirmation of available certifications (Kosher, BRC/IFS, Gluten-Free, Sugar-Free, etc.)

Please simply reply to this email (keeping [${reqTag}] in the subject line) so our Deal Desk automatically links your quotation and catalog to the buyer presentation.

Warm regards,

Udi
Managing Director — FoodXchange Sourcing Desk
Email: udi@foodxchange.com
Web: https://fdx-trading.netlify.app`,
    };
  }

  // Whenever activeMatch changes, populate composer and quote fields
  useEffect(() => {
    if (!activeMatch) return;
    setRecipientEmail(activeMatch.contact_email || "");
    const defaultMode: TemplateMode = isSentAwaiting(activeMatch)
      ? "followup_day3"
      : isReplied(activeMatch)
      ? "ask_specs"
      : "initial";
    setTemplateMode(defaultMode);
    const tpl = generateTemplateForMatch(activeMatch, defaultMode);
    setSubject(tpl.subject);
    setBodyText(tpl.body);
    setSendFeedback(null);
    setParseFeedback(null);
    setQuoteSavedMsg(null);

    // Populate quote fields from existing quote if present
    const q = activeMatch.quote;
    setQuoteCoop(q?.cooperation_status || "cooperating");
    setQuotePrice(q?.unit_price != null ? String(q.unit_price) : "");
    setQuoteCurrency(q?.currency || "EUR");
    setQuoteWeight(q?.net_weight || "100g");
    setQuoteFormat(q?.packaging_format || "Retail Pack");
    setQuoteMoq(q?.moq || "1 Pallet / Trial Order");
    setQuoteIncoterm(q?.incoterm || "FOB / CIF Ashdod");
    setQuoteLeadWeeks(q?.lead_time_weeks != null ? String(q.lead_time_weeks) : "3");
    setQuoteNotes(q?.supplier_notes || activeMatch.supplier_message || "");
  }, [activeMatch?.id]);

  // Switch template mode manually
  function handleTemplateModeChange(mode: TemplateMode) {
    setTemplateMode(mode);
    if (activeMatch) {
      const tpl = generateTemplateForMatch(activeMatch, mode);
      setSubject(tpl.subject);
      setBodyText(tpl.body);
    }
  }

  // Save updated supplier email
  async function handleSaveEmail(match: OutreachMatchItem, newEmail: string) {
    const trimmed = newEmail.trim();
    setMatches((prev) =>
      prev.map((m) =>
        m.id === match.id ? { ...m, contact_email: trimmed || null } : m
      )
    );
    if (!trimmed) return;
    try {
      await fetch("/api/admin/suppliers/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: match.supplier_id,
          email: trimmed,
        }),
      });
    } catch {}
  }

  // Send single email from Center Composer
  async function handleSendSingleEmail() {
    if (!activeMatch) return;
    if (!recipientEmail.trim()) {
      setSendFeedback({
        type: "err",
        text: "Please enter a recipient email address for this supplier first.",
      });
      return;
    }

    setSendingSingle(true);
    setSendFeedback(null);

    try {
      // Persist email if changed
      if (recipientEmail.trim() !== (activeMatch.contact_email || "")) {
        await handleSaveEmail(activeMatch, recipientEmail.trim());
      }

      const isFollowUp =
        templateMode === "followup_day3" ||
        templateMode === "followup_day7" ||
        templateMode === "ask_specs";

      const res = await fetch("/api/admin/rfq/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIds: [activeMatch.id],
          subject,
          body: bodyText,
          deadline: new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .slice(0, 10),
          isFollowUp,
          nativeLanguagePrefix,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setSendFeedback({
          type: "err",
          text: data.error || "Failed to send email.",
        });
      } else if (data.sent > 0) {
        const nowIso = new Date().toISOString();
        const newEntry: OutreachThreadMessage = {
          id: `out_${Date.now()}`,
          direction: "outbound",
          to: recipientEmail.trim(),
          subject,
          body: bodyText,
          provider: "mailer",
          is_follow_up: isFollowUp,
          created_at: nowIso,
        };
        setMatches((prev) =>
          prev.map((m) =>
            m.id === activeMatch.id
              ? {
                  ...m,
                  status: m.status === "responded" ? "responded" : "rfq_sent",
                  rfq_sent_at: nowIso,
                  last_outreach_subject: subject,
                  last_outreach_body: bodyText,
                  last_outreach_at: nowIso,
                  outreach_history: [...m.outreach_history, newEntry],
                }
              : m
          )
        );
        setSendFeedback({
          type: "ok",
          text: `✅ Sent to ${recipientEmail.trim()}! Replies will automatically route to this thread.`,
        });
      } else {
        const reason =
          data.results?.[0]?.error || "Email dispatch skipped or failed.";
        setSendFeedback({ type: "err", text: `⚠️ ${reason}` });
      }
    } catch (err: any) {
      setSendFeedback({
        type: "err",
        text: err.message || "Network error sending email.",
      });
    } finally {
      setSendingSingle(false);
    }
  }

  // Open in Gmail Web
  function handleOpenInGmail() {
    if (!activeMatch) return;
    const to = encodeURIComponent(recipientEmail.trim());
    const su = encodeURIComponent(subject);
    const body = encodeURIComponent(bodyText);
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // Poll IMAP for new replies
  async function handleSyncImap() {
    setSyncingImap(true);
    setImapStatusMsg(null);
    try {
      const res = await fetch("/api/admin/email/poll-imap", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setImapStatusMsg(
          `✅ Synced Gmail Inbox: ${data.processed || 0} new supplier replies matched (${data.scanned || 0} scanned).`
        );
        router.refresh();
      } else {
        setImapStatusMsg(`⚠️ ${data.error || "IMAP sync returned an error"}`);
      }
    } catch (err: any) {
      setImapStatusMsg(`⚠️ ${err.message || "Failed to contact IMAP sync"}`);
    } finally {
      setSyncingImap(false);
    }
  }

  // Parse pasted supplier reply with Gemini AI
  async function handleParseInboundReply() {
    if (!activeMatch || !pasteBody.trim()) return;
    setParsingReply(true);
    setParseFeedback(null);
    try {
      const res = await fetch("/api/admin/correspondence/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeMatch.request_id,
          matchId: activeMatch.id,
          fromEmail: activeMatch.contact_email || "supplier@factory.com",
          subject:
            pasteSubject.trim() ||
            `Re: ${activeMatch.last_outreach_subject || "Sourcing Inquiry"}`,
          bodyText: pasteBody.trim(),
          autoApply: true,
        }),
      });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const nowIso = new Date().toISOString();
        const inboundMsg: OutreachThreadMessage = {
          id: `in_${Date.now()}`,
          direction: "inbound",
          from: activeMatch.contact_email || "supplier",
          subject: pasteSubject.trim() || "Supplier Reply",
          body: pasteBody.trim(),
          ai_summary: data.parsed.english_summary,
          intent: data.parsed.intent,
          created_at: nowIso,
        };

        setMatches((prev) =>
          prev.map((m) =>
            m.id === activeMatch.id
              ? {
                  ...m,
                  status:
                    data.parsed.intent === "declined" ? "rejected" : "responded",
                  supplier_message: data.parsed.english_summary,
                  supplier_responded_at: nowIso,
                  quote: data.parsed.quote_data?.unit_price
                    ? {
                        ...(m.quote || {}),
                        unit_price: data.parsed.quote_data.unit_price,
                        currency: data.parsed.quote_data.currency || "EUR",
                        moq: data.parsed.quote_data.moq || m.quote?.moq,
                        incoterm:
                          data.parsed.quote_data.incoterm || m.quote?.incoterm,
                        supplier_notes: data.parsed.english_summary,
                      }
                    : m.quote,
                  outreach_history: [...m.outreach_history, inboundMsg],
                }
              : m
          )
        );

        if (data.parsed.quote_data?.unit_price) {
          setQuotePrice(String(data.parsed.quote_data.unit_price));
        }
        if (data.parsed.quote_data?.moq) {
          setQuoteMoq(data.parsed.quote_data.moq);
        }
        setQuoteNotes(data.parsed.english_summary || "");
        setPasteBody("");
        setPasteSubject("");
        setParseFeedback(
          `✅ AI Extracted (${data.parsed.intent.toUpperCase()}): ${data.parsed.english_summary}`
        );
      } else {
        setParseFeedback(`⚠️ ${data.error || "Could not parse reply"}`);
      }
    } catch (err: any) {
      setParseFeedback(`⚠️ ${err.message || "Error parsing reply"}`);
    } finally {
      setParsingReply(false);
    }
  }

  // Save Quote directly to Deal Desk
  async function handleSaveQuote() {
    if (!activeMatch) return;
    setSavingQuote(true);
    setQuoteSavedMsg(null);
    try {
      const payload: SupplierQuotePayload = {
        unit_price: quotePrice.trim() ? Number(quotePrice) : null,
        currency: quoteCurrency,
        net_weight: quoteWeight.trim() || null,
        packaging_format: quoteFormat.trim() || null,
        moq: quoteMoq.trim() || null,
        incoterm: quoteIncoterm.trim() || null,
        lead_time_weeks: quoteLeadWeeks.trim() ? Number(quoteLeadWeeks) : null,
        cooperation_status: quoteCoop,
        supplier_notes: quoteNotes.trim() || null,
      };
      const res = await recordSupplierQuote(activeMatch.id, payload);
      if (res.ok) {
        const nowIso = new Date().toISOString();
        setMatches((prev) =>
          prev.map((m) =>
            m.id === activeMatch.id
              ? {
                  ...m,
                  status: "responded",
                  supplier_responded_at: nowIso,
                  supplier_message: payload.supplier_notes || m.supplier_message,
                  quote: {
                    ...payload,
                    quoted_at: nowIso,
                  },
                }
              : m
          )
        );
        setQuoteSavedMsg("✅ Quote & cooperation status saved to Deal Desk!");
      } else {
        setQuoteSavedMsg(`⚠️ ${res.error}`);
      }
    } catch (err: any) {
      setQuoteSavedMsg(`⚠️ ${err.message || "Failed to save quote"}`);
    } finally {
      setSavingQuote(false);
    }
  }

  // Open Bulk Email Modal
  function openBulkEmailModal(mode: "initial" | "followup") {
    // If no checkboxes are ticked, auto-select all visible filteredMatches
    let targetIds = Array.from(checkedMatchIds);
    if (targetIds.length === 0) {
      targetIds = filteredMatches.map((m) => m.id);
      setCheckedMatchIds(new Set(targetIds));
    }

    const sampleMatch =
      matches.find((m) => m.id === targetIds[0]) || filteredMatches[0];
    const req = sampleMatch ? requestMap[sampleMatch.request_id] : requests[0];
    const reqTag = req?.shortTag || "FDX-REQ";
    const prodName = req?.product_name || "Food & Beverage Products";

    setBulkMode(mode);
    if (mode === "followup") {
      setBulkSubject(
        `Re: [${reqTag}] Initial Supplier Inquiry & Catalog Request: ${prodName} — FoodXchange`
      );
      setBulkBody(`Dear Export & Commercial Team at {{Supplier_Name}},

I am following up on our sourcing inquiry [${reqTag}] sent earlier regarding "${prodName}" for retail distribution in Israel.

Could you kindly confirm if your factory can offer this line for export, and share your current product catalog (PDF), pack sizes, MOQ, and indicative FOB/Ex-Works pricing?

Warm regards,
Udi — FoodXchange Sourcing Desk
Email: udi@foodxchange.com`);
    } else {
      setBulkSubject(
        `[${reqTag}] Initial Supplier Inquiry & Catalog Request: ${prodName} — FoodXchange`
      );
      setBulkBody(`Dear Export & Commercial Team at {{Supplier_Name}},

FoodXchange (FDX) is an international B2B food & beverage sourcing platform connecting manufacturers with leading retail chains and importers in Israel.

We are managing an active sourcing mandate [${reqTag}] for "${prodName}" and identified {{Supplier_Name}} as a strong manufacturing partner:

• Sourcing Reference: [${reqTag}]
• Target Product Line: ${prodName}
• Dietary / Quality Profile: ${
        req?.certifications?.join(", ") || "Export Standard / Kosher if available"
      }
• Target Volume: ${
        req?.volume_per_year || "Initial trial pallet(s), scaling to full FCL"
      }
• Destination Market: Israel

Could you kindly reply to this email with:
1. Your current Export Product Catalog & Spec Sheets (PDF)
2. Indicative Ex-Works / FOB pricing and Minimum Order Quantities (MOQ)
3. Confirmation of available certifications (Kosher, BRC/IFS, Gluten-Free, Sugar-Free)

Warm regards,
Udi — FoodXchange Sourcing Desk
Email: udi@foodxchange.com`);
    }

    const overrides: Record<string, string> = {};
    for (const m of matches) {
      if (targetIds.includes(m.id) && m.contact_email) {
        overrides[m.id] = m.contact_email;
      }
    }
    setBulkEmailOverrides(overrides);
    setBulkResultMsg(null);
    setBulkModalOpen(true);
  }

  // Execute Bulk Send
  async function handleExecuteBulkSend() {
    const targetIds = Array.from(checkedMatchIds);
    if (targetIds.length === 0) return;

    setBulkSending(true);
    setBulkResultMsg(null);

    try {
      // Save any newly typed email overrides first
      for (const mId of targetIds) {
        const m = matches.find((x) => x.id === mId);
        const overrideEmail = bulkEmailOverrides[mId]?.trim();
        if (m && overrideEmail && overrideEmail !== (m.contact_email || "")) {
          await handleSaveEmail(m, overrideEmail);
        }
      }

      const res = await fetch("/api/admin/rfq/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIds: targetIds,
          subject: bulkSubject,
          body: bulkBody,
          deadline: new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .slice(0, 10),
          isFollowUp: bulkMode === "followup",
          nativeLanguagePrefix: bulkNativeLang,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setBulkResultMsg(`⚠️ ${data.error || "Bulk dispatch failed"}`);
      } else {
        const nowIso = new Date().toISOString();
        const sentIds = new Set(
          (data.results || [])
            .filter((r: any) => r.status === "sent")
            .map((r: any) => r.matchId)
        );
        setMatches((prev) =>
          prev.map((m) =>
            sentIds.has(m.id)
              ? {
                  ...m,
                  status: m.status === "responded" ? "responded" : "rfq_sent",
                  rfq_sent_at: nowIso,
                  last_outreach_at: nowIso,
                  last_outreach_subject: bulkSubject,
                  last_outreach_body: bulkBody.replace(
                    /\{\{Supplier_Name\}\}/gi,
                    m.company_name
                  ),
                }
              : m
          )
        );
        setBulkResultMsg(
          `✅ Dispatched ${data.sent || 0} of ${targetIds.length} emails in parallel!`
        );
      }
    } catch (err: any) {
      setBulkResultMsg(`⚠️ ${err.message || "Bulk send error"}`);
    } finally {
      setBulkSending(false);
    }
  }

  // Handle New Supplier Submit
  async function handleCreateAndEmailNewSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSuppRequestId || !newSuppCompany.trim() || !newSuppEmail.trim()) {
      setNewSuppError("Request, Company Name, and Contact Email are required.");
      return;
    }

    setNewSuppSubmitting(true);
    setNewSuppError(null);

    try {
      const res = await fetch("/api/admin/outreach/new-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: newSuppRequestId,
          companyName: newSuppCompany.trim(),
          country: newSuppCountry.trim() || "Europe",
          website: newSuppWebsite.trim(),
          contactEmail: newSuppEmail.trim(),
          productName: newSuppProduct.trim(),
          sendImmediately: true,
          nativeLanguagePrefix: newSuppNativeLang,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setNewSuppError(data.error || "Failed to add supplier");
      } else {
        const req = requestMap[newSuppRequestId];
        const nowIso = new Date().toISOString();
        const createdItem: OutreachMatchItem = {
          id: data.matchId,
          request_id: newSuppRequestId,
          supplier_id: data.supplierId,
          company_name: newSuppCompany.trim(),
          product_name:
            newSuppProduct.trim() || req?.product_name || "Food Products",
          country: newSuppCountry.trim() || "Europe",
          match_score: 88,
          status: data.sent ? "rfq_sent" : "approved",
          sent_at: data.sent ? nowIso : null,
          rfq_sent_at: data.sent ? nowIso : null,
          responded_at: null,
          supplier_responded_at: null,
          supplier_response: null,
          supplier_message: null,
          website: newSuppWebsite.trim() || null,
          contact_email: newSuppEmail.trim(),
          contact_phone: null,
          delivery_status: null,
          quote: null,
          matched_certifications: req?.certifications || [],
          kosher_types: [],
          last_outreach_subject: `[${req?.shortTag || "FDX-REQ"}] Initial Supplier Inquiry`,
          last_outreach_body: `Initial cooperation email dispatched to ${newSuppEmail.trim()}`,
          last_outreach_at: data.sent ? nowIso : null,
          outreach_history: data.sent
            ? [
                {
                  id: `out_${Date.now()}`,
                  direction: "outbound",
                  to: newSuppEmail.trim(),
                  subject: `[${req?.shortTag || "FDX-REQ"}] Initial Supplier Inquiry`,
                  body: `Dispatched initial cooperation inquiry to ${newSuppCompany.trim()} (${newSuppEmail.trim()}).`,
                  provider: data.provider || "mailer",
                  created_at: nowIso,
                },
              ]
            : [],
        };

        setMatches((prev) => [createdItem, ...prev]);
        setSelectedMatchId(createdItem.id);
        setNewSupplierModalOpen(false);
        setNewSuppCompany("");
        setNewSuppWebsite("");
        setNewSuppEmail("");
        setNewSuppProduct("");
      }
    } catch (err: any) {
      setNewSuppError(err.message || "Network error");
    } finally {
      setNewSuppSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Mission Control Outreach Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-orange-400 font-bold uppercase tracking-wider">
              <Link href="/admin" className="hover:underline">
                ← Mission Control
              </Link>
              <span>·</span>
              <span>Unified Supplier Email &amp; Correspondence Command Center</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight mt-0.5 flex items-center gap-2.5">
              <span>✉️ Email &amp; Outreach Hub</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Plus-Addressed + AI Auto-Routing Active
              </span>
            </h1>
          </div>

          {/* Primary Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEmailSettingsOpen(true);
                setAccFeedback(null);
                void loadAccountsSnapshot();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-2"
              title="View, add, switch, or remove connected Gmail / SMTP accounts"
            >
              <span>⚙️</span>
              <span>
                {accountsData?.activeAccount
                  ? `Connected: ${accountsData.activeAccount.user}`
                  : "Email Accounts & Settings"}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  accountsData?.activeAccount || accountsData?.resend?.configured
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleSyncImap}
              disabled={syncingImap}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {syncingImap ? "🔄 Syncing Inbox..." : "🔄 Sync Incoming Replies"}
            </button>

            <button
              type="button"
              onClick={() => setNewSupplierModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              ➕ Email Brand-New Supplier
            </button>

            <button
              type="button"
              onClick={() => openBulkEmailModal("initial")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer"
            >
              ⚡ Bulk Email Selected ({checkedMatchIds.size || filteredMatches.length})
            </button>

            <button
              type="button"
              onClick={() => openBulkEmailModal("followup")}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-extrabold text-slate-950 shadow-xs transition-colors cursor-pointer"
            >
              🔔 Bulk Chaser Follow-Up
            </button>
          </div>
        </div>

        {imapStatusMsg && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-emerald-300 font-medium">
            {imapStatusMsg}
          </div>
        )}

        {/* 4 Real-Time KPI Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-slate-800 border-orange-500"
                : "bg-slate-800/50 border-slate-700/70 hover:bg-slate-800"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              All Matched Factories
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              {kpiStats.total}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ready_to_send")}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === "ready_to_send"
                ? "bg-slate-800 border-emerald-400"
                : "bg-slate-800/50 border-slate-700/70 hover:bg-slate-800"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              🎯 Ready to Email
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              {kpiStats.ready}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("awaiting")}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === "awaiting"
                ? "bg-slate-800 border-sky-400"
                : "bg-slate-800/50 border-slate-700/70 hover:bg-slate-800"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              📤 Sent · Awaiting Reply
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              {kpiStats.awaiting}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overdue_48h")}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === "overdue_48h"
                ? "bg-slate-800 border-amber-400"
                : "bg-slate-800/50 border-slate-700/70 hover:bg-slate-800"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              ⏰ Overdue &gt;48h Follow-Up
            </div>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              {kpiStats.overdue}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("replies")}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === "replies"
                ? "bg-slate-800 border-purple-400"
                : "bg-slate-800/50 border-slate-700/70 hover:bg-slate-800"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
              📥 Replies &amp; Quotes
            </div>
            <div className="text-xl font-black text-purple-200 mt-0.5">
              {kpiStats.replied}
            </div>
          </button>
        </div>
      </header>

      {/* Main 3-Pane Command Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* LEFT PANE: Supplier Thread Queue & Request Filter (4 cols) */}
        <aside className="lg:col-span-4 border-r border-slate-200 bg-white flex flex-col max-h-[calc(100vh-190px)]">
          {/* Request Selector + Search */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Filter by Sourcing Request ([FDX-REQ-...])
              </label>
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  setCheckedMatchIds(new Set());
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
              >
                <option value="all">
                  All Active Sourcing Requests ({matches.length} matches)
                </option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.shortTag}] {r.product_name}{" "}
                    {r.company ? `— ${r.company}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supplier, country, email, or [FDX-REQ...]..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (checkedMatchIds.size === filteredMatches.length) {
                    setCheckedMatchIds(new Set());
                  } else {
                    setCheckedMatchIds(
                      new Set(filteredMatches.map((m) => m.id))
                    );
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer shrink-0"
              >
                {checkedMatchIds.size === filteredMatches.length &&
                filteredMatches.length > 0
                  ? "Unselect All"
                  : `Select All (${filteredMatches.length})`}
              </button>
            </div>
          </div>

          {/* Supplier Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredMatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No supplier threads match this filter. Try switching tabs or selecting &ldquo;All Active Sourcing Requests&rdquo;.
              </div>
            ) : (
              filteredMatches.map((m) => {
                const req = requestMap[m.request_id];
                const reqTag =
                  req?.shortTag ||
                  `FDX-REQ-${m.request_id.slice(0, 8).toUpperCase()}`;
                const isSelected = activeMatch?.id === m.id;
                const isChecked = checkedMatchIds.has(m.id);
                const replied = isReplied(m);
                const awaiting = isSentAwaiting(m);
                const overdue = isOverdue48h(m);
                const lastSentHrs = hoursSince(
                  m.last_outreach_at || m.rfq_sent_at || m.sent_at
                );

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-orange-50/80 border-l-4 border-l-orange-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCheckedMatchIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.id)) next.delete(m.id);
                          else next.add(m.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 cursor-pointer shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          [{reqTag}]
                        </span>
                        <div className="flex items-center gap-1">
                          {replied ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              📥 Replied
                            </span>
                          ) : overdue ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              ⏰ {Math.floor(lastSentHrs / 24)}d overdue
                            </span>
                          ) : awaiting ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                              📤 Sent
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              🎯 {m.match_score}% Match
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {m.company_name}
                        </h4>
                        {m.website && (
                          <a
                            href={ensureHttp(m.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-semibold text-blue-600 hover:underline"
                          >
                            🌐 {formatDomain(m.website)} ↗
                          </a>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {m.product_name} ·{" "}
                        <span className="text-slate-400">
                          {m.country || "Global"}
                        </span>
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        {m.contact_email ? (
                          <span className="font-mono text-emerald-700 truncate">
                            ✉️ {m.contact_email}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-600">
                            ⚠️ Missing email — click to enter
                          </span>
                        )}

                        {m.quote?.unit_price && (
                          <span className="font-extrabold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {m.quote.currency || "EUR"} {m.quote.unit_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER PANE: Full Conversation Thread + Multi-Stage Smart Composer (5 cols) */}
        <section className="lg:col-span-5 border-r border-slate-200 bg-slate-50/40 flex flex-col max-h-[calc(100vh-190px)] overflow-y-auto">
          {!activeMatch ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Select a supplier from the left queue to view correspondence and compose outreach.
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Supplier Thread Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                        [
                        {requestMap[activeMatch.request_id]?.shortTag ||
                          `FDX-REQ-${activeMatch.request_id
                            .slice(0, 8)
                            .toUpperCase()}`}
                        ]
                      </span>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Match Ref: [FDX-{activeMatch.id.slice(0, 8).toUpperCase()}]
                      </span>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {activeMatch.match_score}% Match
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900 mt-1.5 flex items-center gap-2 flex-wrap">
                      <span>{activeMatch.company_name}</span>
                      {activeMatch.website && (
                        <a
                          href={ensureHttp(activeMatch.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold"
                        >
                          🌐 {formatDomain(activeMatch.website)} ↗
                        </a>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Matched Product: <strong>{activeMatch.product_name}</strong>{" "}
                      ({activeMatch.country || "International"})
                    </p>
                  </div>

                  <Link
                    href={`/admin/requests/${activeMatch.request_id}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                  >
                    Open Request Deal Desk ↗
                  </Link>
                </div>

                {/* Conversation Thread History */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Correspondence Timeline ({activeMatch.outreach_history.length}{" "}
                    messages)
                  </div>

                  {activeMatch.outreach_history.length === 0 &&
                  !activeMatch.last_outreach_body &&
                  !activeMatch.supplier_message ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
                      No emails sent yet to {activeMatch.company_name}. Use the composer below to send the Initial Cooperation Inquiry.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {activeMatch.outreach_history.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl border text-xs ${
                            msg.direction === "inbound"
                              ? "bg-purple-50/70 border-purple-200"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>
                              {msg.direction === "inbound"
                                ? `📥 INBOUND REPLY (${msg.from || "Supplier"})`
                                : `📤 SENT TO ${msg.to || activeMatch.contact_email || "Supplier"}`}
                            </span>
                            <span>
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                          {msg.subject && (
                            <div className="font-bold text-slate-800 mb-1">
                              {msg.subject}
                            </div>
                          )}
                          {msg.ai_summary && (
                            <div className="p-2 rounded-lg bg-white border border-purple-200 text-purple-900 font-semibold mb-1.5">
                              🤖 AI Summary: {msg.ai_summary}
                            </div>
                          )}
                          <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700 leading-relaxed max-h-36 overflow-y-auto">
                            {msg.body}
                          </pre>
                        </div>
                      ))}

                      {activeMatch.outreach_history.length === 0 &&
                        activeMatch.last_outreach_body && (
                          <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-xs">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span>📤 LAST OUTBOUND EMAIL</span>
                              <span>
                                {activeMatch.last_outreach_at
                                  ? new Date(
                                      activeMatch.last_outreach_at
                                    ).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-700">
                              {activeMatch.last_outreach_body}
                            </pre>
                          </div>
                        )}

                      {activeMatch.supplier_message &&
                        !activeMatch.outreach_history.some(
                          (h) => h.direction === "inbound"
                        ) && (
                          <div className="p-3 rounded-xl border bg-purple-50/70 border-purple-200 text-xs">
                            <div className="text-[10px] font-bold text-purple-700 mb-1">
                              📥 RECORDED SUPPLIER RESPONSE
                            </div>
                            <p className="text-slate-800 font-medium">
                              {activeMatch.supplier_message}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Smart Multi-Stage Email Composer */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    ✍️ Smart Supplier Email Composer
                  </h3>

                  {/* Template Mode Pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleTemplateModeChange("initial")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        templateMode === "initial"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      1. Initial Cooperation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateModeChange("followup_day3")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        templateMode === "followup_day3"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      2. Day-3 Chaser
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateModeChange("followup_day7")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        templateMode === "followup_day7"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      3. Day-7 Final Call
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateModeChange("ask_specs")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        templateMode === "ask_specs"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      4. Ask Specs/Samples
                    </button>
                  </div>
                </div>

                {/* Recipient Email Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Recipient Factory Email (auto-saves to Supplier Directory)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      onBlur={() =>
                        handleSaveEmail(activeMatch, recipientEmail)
                      }
                      placeholder="export@factory-domain.com"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Subject Line (includes [FDX-REQ-...] for automatic reply routing)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Native Language Banner Toggle */}
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nativeLanguagePrefix}
                    onChange={(e) => setNativeLanguagePrefix(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    🌍 Prepend Native-Language Greeting Banner (Spanish / Italian / German / French / Greek / Polish) based on supplier country
                  </span>
                </label>

                {/* Message Body */}
                <div>
                  <textarea
                    rows={11}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs font-sans text-slate-800 leading-relaxed focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {sendFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold ${
                      sendFeedback.type === "ok"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {sendFeedback.text}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenInGmail}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    📬 Open in Gmail Web ↗
                  </button>

                  <button
                    type="button"
                    onClick={handleSendSingleEmail}
                    disabled={sendingSingle}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {sendingSingle
                      ? "🚀 Sending Email..."
                      : `🚀 Send Email to ${activeMatch.company_name}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT PANE: AI Reply Parser & Quick Commercial Quote Capture (3 cols) */}
        <aside className="lg:col-span-3 bg-white flex flex-col max-h-[calc(100vh-190px)] overflow-y-auto p-4 space-y-5">
          {!activeMatch ? (
            <div className="text-xs text-slate-400 text-center py-10">
              Select a supplier thread to parse replies or record quotes.
            </div>
          ) : (
            <>
              {/* Box 1: Paste Supplier Reply & Parse with Gemini AI */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900">
                    🤖 Paste Supplier Reply (AI Parser)
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    Multi-Lingual
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Received a reply via direct email or WhatsApp? Paste it below — Gemini AI translates it and extracts unit price, MOQ, samples AWB, and QA certs automatically.
                </p>

                <input
                  type="text"
                  value={pasteSubject}
                  onChange={(e) => setPasteSubject(e.target.value)}
                  placeholder="Optional reply subject..."
                  className="w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900"
                />

                <textarea
                  rows={4}
                  value={pasteBody}
                  onChange={(e) => setPasteBody(e.target.value)}
                  placeholder="Paste supplier's email or WhatsApp message here (English, Spanish, Italian, German, etc.)..."
                  className="w-full rounded-xl border border-purple-200 bg-white p-2.5 text-xs text-slate-900"
                />

                {parseFeedback && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-200 text-[11px] font-semibold text-purple-900">
                    {parseFeedback}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleParseInboundReply}
                  disabled={parsingReply || !pasteBody.trim()}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {parsingReply
                    ? "🤖 Extracting Terms with AI..."
                    : "🤖 Parse Reply & Update Deal Desk"}
                </button>
              </div>

              {/* Box 2: Direct Quote & Commercial Terms Capture */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  💶 Record Supplier Quote &amp; Feedback
                </h3>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Cooperation Status
                  </label>
                  <select
                    value={quoteCoop}
                    onChange={(e) =>
                      setQuoteCoop(
                        e.target.value as
                          | "cooperating"
                          | "counter_offer"
                          | "declined"
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  >
                    <option value="cooperating">
                      ✅ Cooperating / Quoted
                    </option>
                    <option value="counter_offer">
                      🔄 Counter-Offer / Alternative SKU
                    </option>
                    <option value="declined">❌ Declined / Cannot Supply</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      placeholder="1.45"
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Currency
                    </label>
                    <select
                      value={quoteCurrency}
                      onChange={(e) => setQuoteCurrency(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="ILS">ILS (₪)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Pack Weight
                    </label>
                    <input
                      type="text"
                      value={quoteWeight}
                      onChange={(e) => setQuoteWeight(e.target.value)}
                      placeholder="e.g. 100g / 1L"
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Lead Time (Wks)
                    </label>
                    <input
                      type="number"
                      value={quoteLeadWeeks}
                      onChange={(e) => setQuoteLeadWeeks(e.target.value)}
                      placeholder="3"
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    MOQ (Minimum Order)
                  </label>
                  <input
                    type="text"
                    value={quoteMoq}
                    onChange={(e) => setQuoteMoq(e.target.value)}
                    placeholder="1 Pallet / 1 x 20ft FCL"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Incoterm
                  </label>
                  <input
                    type="text"
                    value={quoteIncoterm}
                    onChange={(e) => setQuoteIncoterm(e.target.value)}
                    placeholder="FOB / CIF Ashdod"
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Supplier Notes / Feedback Summary
                  </label>
                  <textarea
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Key feedback, kosher status, sample readiness..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-900"
                  />
                </div>

                {quoteSavedMsg && (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                    {quoteSavedMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveQuote}
                  disabled={savingQuote}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingQuote
                    ? "💾 Saving..."
                    : "💾 Save Quote & Feedback"}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* MODAL 1: Bulk Email Selected Suppliers */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold">
                  {bulkMode === "followup"
                    ? `🔔 Bulk Chaser Follow-Up (${checkedMatchIds.size} Factories)`
                    : `⚡ Bulk Initial Cooperation Email (${checkedMatchIds.size} Factories)`}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Uses{" "}
                  <code className="text-orange-300">{"{{Supplier_Name}}"}</code>{" "}
                  personalization + parallel dispatch + plus-addressed Reply-To routing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Recipient List with inline email input if missing */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                  Selected Factory Recipients ({checkedMatchIds.size})
                </label>
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {Array.from(checkedMatchIds).map((mId) => {
                    const m = matches.find((x) => x.id === mId);
                    if (!m) return null;
                    const emailVal =
                      bulkEmailOverrides[m.id] ?? m.contact_email ?? "";
                    return (
                      <div
                        key={m.id}
                        className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900">
                            {m.company_name}
                          </span>{" "}
                          <span className="text-slate-400">
                            ({m.country || "Global"})
                          </span>
                          {m.website && (
                            <a
                              href={ensureHttp(m.website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-[11px] text-blue-600 hover:underline"
                            >
                              🌐 {formatDomain(m.website)} ↗
                            </a>
                          )}
                        </div>
                        <input
                          type="email"
                          value={emailVal}
                          onChange={(e) =>
                            setBulkEmailOverrides((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder="Enter export@factory.com..."
                          className="w-64 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono text-slate-900"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkNativeLang}
                  onChange={(e) => setBulkNativeLang(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  🌍 Automatically prepend Native-Language Intro Banner (ES, IT, DE, FR, EL, PL) per supplier&apos;s country
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Body Template ({"{{Supplier_Name}}"} is replaced for each factory)
                </label>
                <textarea
                  rows={9}
                  value={bulkBody}
                  onChange={(e) => setBulkBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-sans text-slate-800 leading-relaxed"
                />
              </div>

              {bulkResultMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-900">
                  {bulkResultMsg}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkSend}
                disabled={bulkSending}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {bulkSending
                  ? "🚀 Dispatching Parallel Batch..."
                  : `🚀 Send to All ${checkedMatchIds.size} Factories Now`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add & Email Brand-New Supplier */}
      {newSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAndEmailNewSupplier}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-indigo-950 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold">
                  ➕ Add &amp; Email Brand-New Supplier
                </h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Adds factory to your Supplier Network, links it to `[FDX-REQ-...]`, and dispatches the cooperation email immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewSupplierModalOpen(false)}
                className="text-indigo-300 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link to Sourcing Request ([FDX-REQ-...]) *
                </label>
                <select
                  value={newSuppRequestId}
                  onChange={(e) => setNewSuppRequestId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.shortTag}] {r.product_name}{" "}
                      {r.company ? `— ${r.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Factory / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSuppCompany}
                    onChange={(e) => setNewSuppCompany(e.target.value)}
                    placeholder="e.g. Valor Chocolates S.A."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSuppCountry}
                    onChange={(e) => setNewSuppCountry(e.target.value)}
                    placeholder="e.g. Spain / Italy"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Export Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newSuppEmail}
                    onChange={(e) => setNewSuppEmail(e.target.value)}
                    placeholder="export@factory.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Factory Website
                  </label>
                  <input
                    type="text"
                    value={newSuppWebsite}
                    onChange={(e) => setNewSuppWebsite(e.target.value)}
                    placeholder="https://www.factory.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specific Product Line (optional — defaults to Request Product)
                </label>
                <input
                  type="text"
                  value={newSuppProduct}
                  onChange={(e) => setNewSuppProduct(e.target.value)}
                  placeholder="e.g. Sugar-Free Keto Dark Chocolate Bark"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newSuppNativeLang}
                  onChange={(e) => setNewSuppNativeLang(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>
                  🌍 Include Native-Language Greeting Banner above English brief
                </span>
              </label>

              {newSuppError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  ⚠️ {newSuppError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setNewSupplierModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newSuppSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {newSuppSubmitting
                  ? "🚀 Adding & Sending Email..."
                  : "🚀 Add Factory & Send Initial Email"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Connected Email Accounts & SMTP / IMAP Settings */}
      {emailSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2">
                  <span>⚙️ Connected Email Accounts &amp; Hybrid Mailer Settings</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Manage which Gmail / Google Workspace account sends your outreach and syncs incoming supplier replies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmailSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {accFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold border ${
                    accFeedback.type === "ok"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  {accFeedback.text}
                </div>
              )}

              {/* Section 1: Currently Active Sending & Receiving Account */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Primary Active Account (Gmail SMTP + IMAP)
                    </span>
                    {accountsLoading ? (
                      <div className="text-xs text-slate-500 mt-2">
                        Loading connected accounts...
                      </div>
                    ) : accountsData?.activeAccount ? (
                      <div className="mt-2">
                        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <span>🟢 {accountsData.activeAccount.user}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {accountsData.activeAccount.source === "database"
                              ? "Custom Admin Account"
                              : "System .env Account"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Display Name:{" "}
                          <strong>{accountsData.activeAccount.senderName}</strong>{" "}
                          · App Password:{" "}
                          <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {accountsData.activeAccount.maskedPassword}
                          </code>
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-bold text-amber-700">
                        ⚠️ No active Gmail account connected. Add an account below or use Resend fallback.
                      </div>
                    )}
                  </div>

                  {accountsData?.activeAccount && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={accBusy}
                        onClick={() =>
                          handleAccountAction({ action: "test_connection" })
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                      >
                        🔌 Verify SMTP Handshake
                      </button>
                      <button
                        type="button"
                        disabled={accBusy}
                        onClick={() =>
                          handleAccountAction({
                            action: "set_active",
                            user: "__none__",
                          })
                        }
                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Test Email Bar */}
                <div className="pt-3 border-t border-slate-200/80 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700">
                    Send Live Test Email to:
                  </span>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="your-email@domain.com"
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    disabled={accBusy || !testRecipient.trim()}
                    onClick={() =>
                      handleAccountAction({
                        action: "send_test_email",
                        to: testRecipient.trim(),
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    📨 Send Test Email
                  </button>
                </div>
              </div>

              {/* Section 2: All Connected / Saved Accounts List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  📬 Available Email Accounts (Switch or Remove)
                </h3>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {/* System Environment Account Row */}
                  {accountsData?.envAccount?.configured && (
                    <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-mono">
                            {accountsData.envAccount.user}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            System .env (GMAIL_USER)
                          </span>
                          {accountsData.envAccount.isActive && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              ✓ Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sender Name: {accountsData.envAccount.senderName} · Key:{" "}
                          {accountsData.envAccount.maskedPassword}
                        </div>
                      </div>

                      {!accountsData.envAccount.isActive && (
                        <button
                          type="button"
                          disabled={accBusy}
                          onClick={() =>
                            handleAccountAction({
                              action: "set_active",
                              user: "__env__",
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                        >
                          Use This Account
                        </button>
                      )}
                    </div>
                  )}

                  {/* Custom Saved Accounts in Supabase */}
                  {accountsData?.savedAccounts?.map((acc) => (
                    <div
                      key={acc.user}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-mono">
                            {acc.user}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Saved Account
                          </span>
                          {acc.isActive && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              ✓ Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sender Name: {acc.senderName} · App Password:{" "}
                          {acc.maskedPassword}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!acc.isActive && (
                          <button
                            type="button"
                            disabled={accBusy}
                            onClick={() =>
                              handleAccountAction({
                                action: "set_active",
                                user: acc.user,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={accBusy}
                          onClick={() =>
                            handleAccountAction({
                              action: "remove",
                              user: acc.user,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Resend Enterprise Backup Engine Row */}
                  <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800">
                          Resend Transactional Backup Engine
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            accountsData?.resend?.configured
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {accountsData?.resend?.configured
                            ? "✓ Configured (Auto-Failover Ready)"
                            : "Not Configured"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        From Address: {accountsData?.resend?.fromEmail || "N/A"} · Inbound Webhook:{" "}
                        <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">
                          /api/webhooks/resend
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Add or Update a Gmail / Google Workspace Account */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                      ➕ Connect a Gmail / Google Workspace Account
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Uses Google&apos;s official 16-character App Password so your emails appear in your native Gmail &ldquo;Sent&rdquo; folder and sync replies via IMAP.
                    </p>
                  </div>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    🔑 Get Google App Password ↗
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Gmail / Workspace Address *
                    </label>
                    <input
                      type="email"
                      value={accFormUser}
                      onChange={(e) => setAccFormUser(e.target.value)}
                      placeholder="udi@foodxchange.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      16-Char App Password *
                    </label>
                    <input
                      type="password"
                      value={accFormPassword}
                      onChange={(e) => setAccFormPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sender Display Name
                    </label>
                    <input
                      type="text"
                      value={accFormSenderName}
                      onChange={(e) => setAccFormSenderName(e.target.value)}
                      placeholder="FoodXchange Sourcing Desk"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accVerifyFirst}
                      onChange={(e) => setAccVerifyFirst(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span>
                      Verify live SMTP login with Google before saving
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={accBusy || !accFormUser.trim() || !accFormPassword.trim()}
                    onClick={() =>
                      handleAccountAction({
                        action: "add_or_update",
                        user: accFormUser.trim(),
                        appPassword: accFormPassword.trim(),
                        senderName: accFormSenderName.trim(),
                        verifyFirst: accVerifyFirst,
                      })
                    }
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {accBusy
                      ? "🔌 Verifying & Saving..."
                      : "➕ Connect & Activate Account"}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setEmailSettingsOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

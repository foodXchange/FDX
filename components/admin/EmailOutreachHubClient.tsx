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
  quotaWarning?: string | null;
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
  quotaWarning,
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
      provider?: "gmail" | "resend";
      replyTo?: string;
      role?: string;
      maskedPassword: string;
      hasCredentials?: boolean;
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
      provider?: "gmail" | "resend";
      replyTo?: string;
      role?: string;
      maskedPassword: string;
      hasCredentials?: boolean;
      addedAt: string;
      isActive: boolean;
    }>;
    resend: {
      configured: boolean;
      fromEmail: string;
    };
  } | null>(null);
  const [editingOriginalUser, setEditingOriginalUser] = useState<string | null>(
    null
  );
  const [accFormUser, setAccFormUser] = useState("");
  const [accFormProvider, setAccFormProvider] = useState<"gmail" | "resend">(
    "gmail"
  );
  const [accFormPassword, setAccFormPassword] = useState("");
  const [accFormSenderName, setAccFormSenderName] = useState(
    "FoodXchange Sourcing Desk"
  );
  const [accFormReplyTo, setAccFormReplyTo] = useState("");
  const [accFormRole, setAccFormRole] = useState(
    "Primary Sourcing & 2-Way Sync"
  );
  const [accVerifyFirst, setAccVerifyFirst] = useState(true);
  const [accBusy, setAccBusy] = useState(false);
  const [accFeedback, setAccFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [mounted, setMounted] = useState(false);

  // Staged Scraper Supplier State
  const [stagingForScraper, setStagingForScraper] = useState(false);
  const [scraperStagedFeedback, setScraperStagedFeedback] = useState<string | null>(null);

  // UX Optimization: Density Mode ("dense" vs "comfortable")
  const [densityMode, setDensityMode] = useState<"comfortable" | "dense">("comfortable");

  // UX Optimization: WhatsApp Composer Direct Web Link
  function getWhatsAppUrl(phone: string | null | undefined, company: string, messageBody: string): string {
    const rawNumber = (phone || "").replace(/[^0-9]/g, "");
    const cleanNumber = rawNumber.length >= 8 ? rawNumber : "";
    const intro = `Hello ${company} Export Team,\n\n${messageBody}`;
    const encoded = encodeURIComponent(intro);
    return cleanNumber
      ? `https://wa.me/${cleanNumber}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }

  // Quick Reply Snippet Inserter
  function handleInsertSnippet(snippet: string) {
    setBodyText((prev) => `${prev.trim()}\n\n${snippet.trim()}`);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  function startEditingAccount(acc: {
    user: string;
    senderName: string;
    provider?: "gmail" | "resend";
    replyTo?: string;
    role?: string;
  }) {
    setEditingOriginalUser(acc.user);
    setAccFormUser(acc.user);
    setAccFormProvider(acc.provider || "gmail");
    setAccFormSenderName(acc.senderName || "FoodXchange Sourcing Desk");
    setAccFormReplyTo(acc.replyTo || acc.user);
    setAccFormRole(acc.role || "Primary Sourcing & 2-Way Sync");
    setAccFormPassword("");
    setAccFeedback({
      type: "ok",
      text: `✏️ Editing account "${acc.user}". Update fields below or paste App Password and click Save.`,
    });
    // Scroll editor smoothly into view
    setTimeout(() => {
      const formEl = document.getElementById("email-account-editor-section");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }

  function resetAccountForm() {
    setEditingOriginalUser(null);
    setAccFormUser("");
    setAccFormProvider("gmail");
    setAccFormSenderName("FoodXchange Sourcing Desk");
    setAccFormReplyTo("");
    setAccFormRole("Primary Sourcing & 2-Way Sync");
    setAccFormPassword("");
  }

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
          resetAccountForm();
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
          `✅ Dispatched ${data.sent || 0} of ${targetIds.length} emails with anti-spam pacing intervals!`
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
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
      {/* Top Mission Control Outreach Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3.5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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

        {quotaWarning && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">
              <span className="font-extrabold text-amber-100 block">Supabase Project Quota Notice</span>
              <span className="text-amber-200/90 leading-relaxed block mt-0.5">
                {quotaWarning}
              </span>
              <a
                href="https://supabase.com/dashboard/project/orzfgccllmkmhzkfswha/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 font-bold underline text-amber-300 hover:text-white"
              >
                Open Supabase Billing / Remove Spend Cap ↗
              </a>
            </div>
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT PANE: Supplier Thread Queue & Request Filter (4 cols) */}
        <aside className="lg:col-span-4 border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-270px)] min-h-[500px]">
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
                onClick={() => setDensityMode((prev) => (prev === "comfortable" ? "dense" : "comfortable"))}
                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer shrink-0"
                title="Toggle between dense single-line rows and comfortable detailed cards"
              >
                {densityMode === "comfortable" ? "🗜️ Dense" : "📋 Detailed"}
              </button>
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

                if (densityMode === "dense") {
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`px-3 py-2 transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs ${
                        isSelected
                          ? "bg-orange-50/90 border-l-4 border-l-orange-500 font-bold"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
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
                          className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 cursor-pointer shrink-0"
                        />
                        <span className="truncate font-extrabold text-slate-900 text-xs">
                          {m.company_name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({m.country || "Global"})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.quote?.unit_price ? (
                          <span className="font-extrabold text-[10px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                            {m.quote.currency || "EUR"} {m.quote.unit_price}
                          </span>
                        ) : null}
                        {replied ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            📥 Replied
                          </span>
                        ) : overdue ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            ⏰ Overdue
                          </span>
                        ) : awaiting ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                            📤 Sent
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {m.match_score}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

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
        <section className="lg:col-span-5 border-r border-slate-200 bg-slate-50/40 flex flex-col h-[calc(100vh-270px)] min-h-[500px] overflow-y-auto">
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

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/requests/${activeMatch.request_id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                    >
                      Open Request Deal Desk ↗
                    </Link>
                  </div>
                </div>

                {/* UX Optimization 3: Visual 5-Stage Deal Health Tracker */}
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    <span>Deal Progression Pipeline</span>
                    <span className="text-emerald-700 font-bold">
                      {isReplied(activeMatch)
                        ? "Stage 3 · Commercial Quote Captured"
                        : isSentAwaiting(activeMatch)
                        ? "Stage 2 · Outbound RFQ Active"
                        : "Stage 1 · Ready for Initial Outreach"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { step: 1, label: "1. Matched", active: true },
                      {
                        step: 2,
                        label: "2. RFQ Sent",
                        active:
                          activeMatch.status === "rfq_sent" ||
                          activeMatch.status === "sent" ||
                          isReplied(activeMatch),
                      },
                      {
                        step: 3,
                        label: "3. Quote Received",
                        active: isReplied(activeMatch),
                      },
                      {
                        step: 4,
                        label: "4. Samples AWB",
                        active: Boolean(activeMatch.quote?.cooperation_status === "cooperating" && isReplied(activeMatch)),
                      },
                      {
                        step: 5,
                        label: "5. Decision Board",
                        active: Boolean(activeMatch.quote?.unit_price),
                      },
                    ].map((st) => (
                      <div
                        key={st.step}
                        className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-extrabold border transition-all ${
                          st.active
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        {st.label}
                      </div>
                    ))}
                  </div>
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
                              {mounted
                                ? new Date(msg.created_at).toLocaleString()
                                : msg.created_at.slice(0, 16).replace("T", " ")}
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
                                  ? mounted
                                    ? new Date(
                                        activeMatch.last_outreach_at
                                      ).toLocaleString()
                                    : activeMatch.last_outreach_at
                                        .slice(0, 16)
                                        .replace("T", " ")
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

                {/* UX Optimization 2: Quick Reply Inserter Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      ⚡ Quick Paragraph Inserters (Click to Append to Message)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        handleInsertSnippet(
                          "Could you kindly attach your technical product specifications (TDS), allergen breakdown, and shelf-life statement (PDF)?"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      + Spec Sheet / TDS Request
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInsertSnippet(
                          "Please confirm your current Kosher certification status (agency, Rabbi signature, and whether Pareve or Dairy)."
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      + Kosher Cert Request
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInsertSnippet(
                          "Could you confirm your master carton packing configuration (units per carton, cartons per standard euro pallet, Ti/Hi)?"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      + Master Carton & Ti/Hi
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInsertSnippet(
                          "Are commercial tasting samples available to be dispatched this week via DHL/FedEx Express to our sampling office in Tel Aviv?"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      + Request Courier Samples
                    </button>
                  </div>
                </div>

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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenInGmail}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📬</span>
                      <span>Open in Gmail ↗</span>
                    </button>

                    {/* UX Optimization 5: One-Click WhatsApp Web Direct Launcher */}
                    <a
                      href={getWhatsAppUrl(
                        activeMatch.contact_phone,
                        activeMatch.company_name,
                        bodyText
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Open WhatsApp Web pre-loaded with this message text"
                    >
                      <span>💬</span>
                      <span>WhatsApp Direct ↗</span>
                    </a>
                  </div>

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
        <aside className="lg:col-span-3 bg-white flex flex-col h-[calc(100vh-270px)] min-h-[500px] overflow-y-auto p-4 space-y-5">
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

                {/* 1-Click Discover New Supplier & Stage for Scraper */}
                <div className="pt-2 border-t border-purple-200/80">
                  <button
                    type="button"
                    disabled={stagingForScraper || !pasteBody.trim()}
                    onClick={async () => {
                      if (!pasteBody.trim()) return;
                      setStagingForScraper(true);
                      setScraperStagedFeedback(null);
                      try {
                        const res = await fetch("/api/admin/outreach/stage-for-scraper", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "extract_from_email",
                            rawEmailText: pasteBody.trim(),
                            fromEmail:
                              activeMatch?.contact_email ||
                              "discovered-supplier@domain.com",
                          }),
                        });
                        const data = await res.json();
                        if (data.ok) {
                          setScraperStagedFeedback(
                            data.message ||
                              "🕷️ Discovered supplier added to Pending Scraper Queue!"
                          );
                        } else {
                          setScraperStagedFeedback(`⚠️ ${data.error || "Failed to stage supplier"}`);
                        }
                      } catch (err: any) {
                        setScraperStagedFeedback(`⚠️ ${err.message || "Network error"}`);
                      } finally {
                        setStagingForScraper(false);
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 text-xs font-extrabold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    title="Extract manufacturer name, catalog links & domain from this email to stage into the Web Scraper queue"
                  >
                    <span>🕷️</span>
                    <span>
                      {stagingForScraper
                        ? "Discovering & Staging..."
                        : "Discover & Stage for Web Scraper"}
                    </span>
                  </button>

                  {scraperStagedFeedback && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-950 flex items-center justify-between">
                      <span className="flex-1">{scraperStagedFeedback}</span>
                      <Link
                        href="/admin/scraper"
                        className="ml-2 text-blue-600 underline text-[10px] shrink-0"
                      >
                        Open Scraper ↗
                      </Link>
                    </div>
                  )}
                </div>
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

                {/* UX Optimization 4: Live Estimated Landed Cost Calculator */}
                {Boolean(Number(quotePrice) > 0) && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 mb-0.5">
                      🇮🇱 Israeli Landed Cost Estimate
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-600">
                        Ex-Works {quoteCurrency} {Number(quotePrice).toFixed(2)} + 12% Freight/Duty:
                      </span>
                      <span className="font-extrabold text-indigo-950 font-mono text-xs">
                        {quoteCurrency === "EUR"
                          ? `≈ ₪${(Number(quotePrice) * 1.12 * 4.02).toFixed(2)}`
                          : quoteCurrency === "USD"
                          ? `≈ ₪${(Number(quotePrice) * 1.12 * 3.75).toFixed(2)}`
                          : `≈ ₪${(Number(quotePrice) * 1.12).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                )}

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
                  personalization + 🛡️ sequential 1-by-1 anti-spam pacing + plus-addressed reply routing.
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
              {/* Anti-Spam Human-Like Pacing Notice */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <span className="text-base shrink-0">🛡️</span>
                <div>
                  <span className="font-extrabold text-emerald-900 block">
                    Anti-Spam Human-Like Pacing Active
                  </span>
                  <span className="text-emerald-800 text-[11px] leading-relaxed">
                    Emails are dispatched sequentially 1-at-a-time with random human jitter intervals (1.8s - 3.0s) so Google Workspace, Microsoft 365, and corporate recipient mail gateways never flag your domain or Gmail account as a spam burst.
                  </span>
                </div>
              </div>

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
                  ? "🛡️ Dispatching 1-by-1 with Anti-Spam Pacing..."
                  : `🚀 Send to All ${checkedMatchIds.size} Factories (Paced)`}
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2">
                  <span>⚙️ Email Accounts Manager — View, Edit, Delete &amp; Switch Senders</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Full control over every email address connected to FoodXchange (`udi@foodxchange.com`, `info@fdx.trading`, and custom Gmail / Workspace accounts).
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

              {/* Section 1: Currently Active Sending & Receiving Account + Live Test Bar */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      ⭐ Primary Active Outbound &amp; Reply Routing Account
                    </span>
                    {accountsLoading ? (
                      <div className="text-xs text-slate-500 mt-2">
                        Loading connected accounts...
                      </div>
                    ) : accountsData?.activeAccount ? (
                      <div className="mt-2">
                        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>🟢 {accountsData.activeAccount.senderName}</span>
                          <span className="font-mono text-emerald-700">
                            &lt;{accountsData.activeAccount.user}&gt;
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {accountsData.activeAccount.provider === "resend"
                              ? "Resend Domain Mailer"
                              : "Gmail 2-Way SMTP + IMAP"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Role: <strong>{accountsData.activeAccount.role}</strong> ·{" "}
                          Replies route to:{" "}
                          <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                            {accountsData.activeAccount.replyTo ||
                              accountsData.activeAccount.user}
                          </code>
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-bold text-amber-700">
                        ⚠️ No active email account selected. Choose one from the list below or add a new account.
                      </div>
                    )}
                  </div>

                  {accountsData?.activeAccount && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={accBusy}
                        onClick={() =>
                          handleAccountAction({
                            action: "test_connection",
                            user: accountsData.activeAccount?.user,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                      >
                        🔌 Verify Active Account
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          accountsData.activeAccount &&
                          startEditingAccount(accountsData.activeAccount)
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        ✏️ Edit Active
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
                    placeholder="udi@foodxchange.com"
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

              {/* Section 2: All Connected Email Accounts — See, Edit, Delete, Set Primary */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    📬 All Connected Email Accounts ({accountsData?.savedAccounts?.length || 0}) — Click Edit or Delete on Any Account
                  </h3>
                  <button
                    type="button"
                    onClick={() => resetAccountForm()}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add Another Email Account
                  </button>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {(!accountsData?.savedAccounts ||
                    accountsData.savedAccounts.length === 0) ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No email accounts in list. Use the form below to add your first email account.
                    </div>
                  ) : (
                    accountsData.savedAccounts.map((acc) => {
                      const isBeingEdited =
                        editingOriginalUser?.toLowerCase() ===
                        acc.user.toLowerCase();
                      return (
                        <div
                          key={acc.user}
                          className={`p-4 transition ${
                            isBeingEdited
                              ? "bg-indigo-50/70"
                              : acc.isActive
                              ? "bg-emerald-50/30"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-900 font-mono">
                                  {acc.user}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    acc.provider === "resend"
                                      ? "bg-sky-50 text-sky-800 border-sky-200"
                                      : "bg-purple-50 text-purple-800 border-purple-200"
                                  }`}
                                >
                                  {acc.provider === "resend"
                                    ? "🌐 Resend Domain Mailer"
                                    : "📬 Gmail / Workspace (2-Way)"}
                                </span>
                                {acc.isActive && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ⭐ Primary Active
                                  </span>
                                )}
                                {!acc.hasCredentials && acc.provider !== "resend" && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    ⚠️ Click &apos;Edit&apos; to Add 16-Char App Password
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
                                <span>
                                  From Name: <strong>{acc.senderName}</strong>
                                </span>
                                <span>·</span>
                                <span>
                                  Reply-To:{" "}
                                  <code className="font-mono text-slate-800">
                                    {acc.replyTo || acc.user}
                                  </code>
                                </span>
                                {acc.provider !== "resend" && (
                                  <>
                                    <span>·</span>
                                    <span>
                                      App Password:{" "}
                                      <code className="font-mono">
                                        {acc.maskedPassword || "Not set"}
                                      </code>
                                    </span>
                                  </>
                                )}
                              </div>

                              {acc.role && (
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  Purpose: {acc.role}
                                </div>
                              )}
                            </div>

                            {/* 1-Click Action Bar: Set Primary | Verify | Edit | Delete */}
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
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
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold cursor-pointer"
                                  title="Make this the primary sender for all outreach"
                                >
                                  ⭐ Set Primary
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={accBusy}
                                onClick={() =>
                                  handleAccountAction({
                                    action: "test_connection",
                                    user: acc.user,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                                title="Verify connection for this account"
                              >
                                🔌 Verify
                              </button>

                              <button
                                type="button"
                                disabled={accBusy}
                                onClick={() => startEditingAccount(acc)}
                                className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-extrabold cursor-pointer"
                                title="Edit email address, display name, reply-to, or App Password"
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                disabled={accBusy}
                                onClick={() =>
                                  handleAccountAction({
                                    action: "remove",
                                    user: acc.user,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-extrabold cursor-pointer"
                                title="Delete this email account from the list"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>

                          {/* Quick inline indicator when currently being edited */}
                          {isBeingEdited && (
                            <div className="mt-2.5 pt-2 border-t border-indigo-200 text-xs text-indigo-800 font-bold flex items-center justify-between">
                              <span>👇 Editing fields loaded below in the editor form.</span>
                              <button
                                type="button"
                                onClick={() => resetAccountForm()}
                                className="text-slate-600 hover:text-slate-900 underline text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Section 3: Add New Account OR Edit Selected Account Form */}
              <div
                id="email-account-editor-section"
                className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                      <span>
                        {editingOriginalUser
                          ? `✏️ Editing ${editingOriginalUser}`
                          : "🚀 Step-by-Step Setup · Takes 30 Seconds"}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <span>
                        {editingOriginalUser
                          ? `✏️ Edit Email Account (${editingOriginalUser})`
                          : "➕ Add / Connect an Email Account"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {editingOriginalUser
                        ? "Update the email address, sender display name, Reply-To address, or paste a 16-character Google App Password below."
                        : "Connect a Gmail / Google Workspace account (2-way sync) or add a verified Resend domain address."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingOriginalUser && (
                      <button
                        type="button"
                        onClick={() => resetAccountForm()}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-xs transition"
                    >
                      <span>🔑</span>
                      <span>1-Click: Open Google App Passwords ↗</span>
                    </a>
                  </div>
                </div>

                {/* 3-Step Guided Onboarding Visual Banner */}
                {accFormProvider === "gmail" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-white border border-indigo-100 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          Open Security Page
                        </span>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          Click the blue button above to open Google App Passwords.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          Create App Password
                        </span>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          Name it &ldquo;FoodXchange&rdquo; and click Create to get a 16-character code.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          Paste &amp; Save
                        </span>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          Paste the 16 characters below and click Save.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Email Address *</span>
                      <span
                        className="cursor-help text-slate-400 hover:text-slate-600"
                        title="The sender email address (e.g. udi@foodxchange.com or info@fdx.trading)."
                      >
                        ℹ️
                      </span>
                    </label>
                    <input
                      type="email"
                      value={accFormUser}
                      onChange={(e) => setAccFormUser(e.target.value)}
                      placeholder="udi@foodxchange.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Account Provider Type</span>
                      <span
                        className="cursor-help text-slate-400 hover:text-slate-600"
                        title="Choose Gmail/Workspace for 2-way SMTP+IMAP sync, or Resend Domain for transactional domain sending."
                      >
                        ℹ️
                      </span>
                    </label>
                    <select
                      value={accFormProvider}
                      onChange={(e) =>
                        setAccFormProvider(
                          e.target.value as "gmail" | "resend"
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="gmail">
                        📬 Gmail / Google Workspace (2-Way SMTP+IMAP)
                      </option>
                      <option value="resend">
                        🌐 Resend Verified Domain (e.g. @fdx.trading)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Sender Display Name</span>
                      <span
                        className="cursor-help text-slate-400 hover:text-slate-600"
                        title="Display name shown in the recipient factory's inbox (e.g. 'Udi — FoodXchange Sourcing Desk')."
                      >
                        ℹ️
                      </span>
                    </label>
                    <input
                      type="text"
                      value={accFormSenderName}
                      onChange={(e) => setAccFormSenderName(e.target.value)}
                      placeholder="FoodXchange Sourcing Desk"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {accFormProvider === "gmail" && (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                        <span>
                          16-Char Google App Password{" "}
                          {editingOriginalUser ? "(optional if unchanged)" : "*"}
                        </span>
                        <span
                          className="cursor-help text-indigo-600 hover:text-indigo-800"
                          title="NOT your personal login password! This is the 16-letter code generated by Google App Passwords."
                        >
                          ℹ️
                        </span>
                      </label>
                      <input
                        type="password"
                        value={accFormPassword}
                        onChange={(e) => setAccFormPassword(e.target.value)}
                        placeholder={
                          editingOriginalUser
                            ? "Leave blank to keep existing, or paste new 16-char code"
                            : "abcd efgh ijkl mnop"
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Reply-To Email Address</span>
                      <span
                        className="cursor-help text-slate-400 hover:text-slate-600"
                        title="Where supplier replies are routed (e.g. udi@foodxchange.com)."
                      >
                        ℹ️
                      </span>
                    </label>
                    <input
                      type="email"
                      value={accFormReplyTo}
                      onChange={(e) => setAccFormReplyTo(e.target.value)}
                      placeholder={accFormUser || "udi@foodxchange.com"}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Role / Label
                    </label>
                    <input
                      type="text"
                      value={accFormRole}
                      onChange={(e) => setAccFormRole(e.target.value)}
                      placeholder="Primary Sourcing & 2-Way Sync"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                  {accFormProvider === "gmail" ? (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accVerifyFirst}
                        onChange={(e) => setAccVerifyFirst(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span>
                        Verify live SMTP login with Google when App Password is provided
                      </span>
                    </label>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Uses your verified Resend domain (`RESEND_API_KEY`) and routes replies to the Reply-To address above.
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={accBusy || !accFormUser.trim()}
                    onClick={() =>
                      handleAccountAction({
                        action: "add_or_update",
                        originalUser: editingOriginalUser,
                        user: accFormUser.trim(),
                        provider: accFormProvider,
                        appPassword: accFormPassword.trim(),
                        senderName: accFormSenderName.trim(),
                        replyTo: accFormReplyTo.trim() || accFormUser.trim(),
                        role: accFormRole.trim(),
                        verifyFirst: accVerifyFirst,
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {accBusy
                      ? "💾 Saving Account..."
                      : editingOriginalUser
                      ? `💾 Save Changes to ${accFormUser}`
                      : "➕ Save & Activate Email Account"}
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

"use client";

import { useMemo, useState } from "react";
import type { MatchRow } from "@/app/admin/matches/page";
import type { EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";
import { renderTemplate } from "@/lib/outreach/renderTemplate";
import { sleep } from "@/lib/outreach/waLink";

type Channel = "email" | "whatsapp";

type BulkResult = {
  matchId: string;
  success: boolean;
  via?: "gmail" | "resend" | "whatsapp";
  emailUsed?: string;
  error?: string;
  url?: string;
  company_name?: string | null;
};

const DEFAULT_SUBJECT =
  "Sourcing Inquiry: {{product_name}} (Israel Market) — FoodXchange";

const DEFAULT_BODY = `Dear {{company_name}} Export / Sales Team,

We represent a major food importer & distributor in Israel currently sourcing a benchmark equivalent for:
• Matched Product in Your Catalog: {{product_name}}
• Buyer Requirement / Category: {{buyer_product}} ({{category}})
• Required Specs & Compliance: {{specs_summary}}

Given your strong product fit (Match Score: {{match_score}}/100), could you please confirm:
1. Export availability & available packaging formats (retail / foodservice / private label)
2. Kosher certification status & BRC/IFS certificates
3. Indicative FOB/EXW pricing and MOQ

We look forward to your reply.`;

const DEFAULT_FOLLOWUP_BODY = `Dear {{company_name}} Team,

Following up on our previous sourcing inquiry regarding {{product_name}} for our buyer in Israel ({{specs_summary}}).

We are finalizing the shortlist of manufacturers to present to the buyer this week. Please let us know if you can supply this item and share your packaging formats and MOQ.`;

function buildSpecsSummary(req: MatchRow["request"]): string {
  if (!req) return "Standard export specifications, Kosher preferred";
  const parts: string[] = [];
  if (req.kosher && req.kosher !== "none") parts.push(`Kosher (${req.kosher})`);
  if (req.certifications && req.certifications.length > 0) {
    parts.push(req.certifications.join(", "));
  }
  if (req.quantity) {
    parts.push(`Qty: ${req.quantity} ${req.unit ?? ""}`.trim());
  }
  if (req.notes) {
    parts.push(req.notes.slice(0, 120));
  }
  return parts.length > 0
    ? parts.join(" · ")
    : "Standard export specifications, Kosher preferred";
}

function matchVars(m: MatchRow): Record<string, string> {
  return {
    company_name: m.company_name ?? m.supplier?.company_name ?? "Supplier Team",
    product_name:
      m.product_name ?? m.request?.product_name ?? "your food products",
    buyer_product:
      m.request?.product_name ?? m.product_name ?? "requested product",
    category: m.request?.category ?? "Food & Beverage",
    specs_summary: buildSpecsSummary(m.request),
    country: m.country ?? m.supplier?.country_of_origin ?? "",
    match_score: String(m.match_score),
  };
}

export default function BulkOutreachModal({
  matches,
  templates,
  isFollowUpInitial = false,
  gmailConnected = false,
  gmailUser = null,
  onEmailDiscovered,
  onClose,
  onDone,
}: {
  matches: MatchRow[];
  templates: EmailTemplateRow[];
  isFollowUpInitial?: boolean;
  gmailConnected?: boolean;
  gmailUser?: string | null;
  onEmailDiscovered?: (supplierId: string, email: string) => void;
  onClose: () => void;
  onDone: (matchIds: string[]) => void;
}) {
  // Always rank 100 -> 10
  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)),
    [matches]
  );

  const [channel, setChannel] = useState<Channel>("email");
  const [isFollowUp, setIsFollowUp] = useState(isFollowUpInitial);
  const [includeBenchmarkCard, setIncludeBenchmarkCard] = useState(true);
  const [templateId, setTemplateId] = useState<string>("custom");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [findingEmailFor, setFindingEmailFor] = useState<string | null>(null);
  const [localEmails, setLocalEmails] = useState<Record<string, string>>({});
  const [whatsappState, setWhatsappState] = useState<{
    index: number;
    total: number;
    company: string;
    countdown: number;
  } | null>(null);

  const availableTemplates = useMemo(
    () =>
      templates.filter((t) => t.channel === channel || t.channel === "both"),
    [templates, channel]
  );

  const selectedTemplate =
    templateId === "custom"
      ? null
      : availableTemplates.find((t) => t.id === templateId) ?? null;

  const firstMatch = sortedMatches[0];
  const previewSubject = useMemo(() => {
    if (!firstMatch) return "";
    const subjTpl =
      customSubject.trim() || selectedTemplate?.subject || DEFAULT_SUBJECT;
    const rendered = renderTemplate(subjTpl, matchVars(firstMatch));
    return isFollowUp && !/^re:/i.test(rendered)
      ? `Re: ${rendered}`
      : rendered;
  }, [customSubject, selectedTemplate, firstMatch, isFollowUp]);

  const previewBody = useMemo(() => {
    if (!firstMatch) return "";
    const template =
      customMessage.trim() ||
      selectedTemplate?.body ||
      (isFollowUp ? DEFAULT_FOLLOWUP_BODY : DEFAULT_BODY);
    return renderTemplate(template, matchVars(firstMatch));
  }, [customMessage, selectedTemplate, firstMatch, isFollowUp]);

  async function handleFindSupplierEmail(supplierId: string) {
    setFindingEmailFor(supplierId);
    try {
      const res = await fetch("/api/admin/outreach/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "find_supplier_email",
          supplierId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        email?: string;
        error?: string;
      };
      if (json.ok && json.email) {
        setLocalEmails((prev) => ({ ...prev, [supplierId]: json.email! }));
        onEmailDiscovered?.(supplierId, json.email);
      } else {
        alert(json.error ?? "Could not find email on supplier website");
      }
    } finally {
      setFindingEmailFor(null);
    }
  }

  async function handleSend() {
    setSending(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/matches/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIds: sortedMatches.map((m) => m.id),
          channel,
          templateId: templateId === "custom" ? undefined : templateId,
          customSubject: customSubject.trim() || undefined,
          customMessage: customMessage.trim() || undefined,
          isFollowUp,
          includeBenchmarkCard,
        }),
      });
      const json = (await res.json()) as {
        results?: BulkResult[];
        error?: string;
      };
      const bulkResults = json.results ?? [];
      setResults(bulkResults);

      const successful = bulkResults.filter((r) => r.success);

      if (channel === "whatsapp") {
        for (let i = 0; i < successful.length; i++) {
          const r = successful[i];
          if (r.url) window.open(r.url, "_blank");

          if (i < successful.length - 1) {
            for (let c = 1; c >= 0; c--) {
              setWhatsappState({
                index: i + 1,
                total: successful.length,
                company: successful[i + 1].company_name ?? "next supplier",
                countdown: c,
              });
              await sleep(500);
            }
          }
        }
        setWhatsappState(null);
      }

      if (successful.length > 0 && successful.length === sortedMatches.length) {
        setTimeout(() => {
          onDone(successful.map((r) => r.matchId));
        }, 900);
      } else if (successful.length > 0) {
        onDone(successful.map((r) => r.matchId));
      }
    } finally {
      setSending(false);
    }
  }

  const benchmarkImg = firstMatch?.request?.reference_image_urls?.[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">
                {isFollowUp ? "↻ Send Thread Follow-Up" : "📧 Supplier Outreach Composer"} —{" "}
                {sortedMatches.length} Supplier{sortedMatches.length !== 1 ? "s" : ""} (Ranked 100→10)
              </h2>
              {gmailConnected ? (
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ✓ Gmail Connected ({gmailUser})
                </span>
              ) : (
                <span className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Sending via Resend (Connect Gmail in dashboard for Sent/Reply sync)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Emails are personalized with each supplier&apos;s matched product and the Buyer Sourcing Brief.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Recipients list ranked by score 100 -> 10 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Recipients Ranked by Match Score:
            </p>
            {sortedMatches.map((m) => {
              const email =
                localEmails[m.supplier_id] ?? m.supplier?.contact_email ?? null;
              const name = m.company_name ?? m.supplier?.company_name ?? "Supplier";
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-extrabold px-1.5 py-0.5 rounded text-[11px] ${
                        m.match_score >= 80
                          ? "bg-emerald-50 text-emerald-700"
                          : m.match_score >= 65
                          ? "bg-green-50 text-green-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {m.match_score}/100
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {name}
                    </span>
                    {m.product_name && (
                      <span className="text-slate-400 truncate max-w-[180px]">
                        · {m.product_name}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {email ? (
                      <span className="text-emerald-700 font-mono text-[11px]">
                        ✉ {email}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={findingEmailFor === m.supplier_id}
                        onClick={() => handleFindSupplierEmail(m.supplier_id)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-800 hover:bg-orange-200 transition disabled:opacity-50"
                      >
                        {findingEmailFor === m.supplier_id
                          ? "Searching…"
                          : "🔍 Find Email"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Channel + Mode controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(["email", "whatsapp"] as Channel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setChannel(c);
                    setTemplateId("custom");
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                    channel === c
                      ? "bg-orange-50 border-orange-300 text-orange-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c === "email" ? "📧 Gmail / Email" : "💬 WhatsApp"}
                </button>
              ))}
            </div>

            {channel === "email" && (
              <div className="flex items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={isFollowUp}
                    onChange={(e) => setIsFollowUp(e.target.checked)}
                    className="rounded border-gray-300 text-orange-600"
                  />
                  <span>Quote &amp; Thread as Follow-Up (Re:)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeBenchmarkCard}
                    onChange={(e) => setIncludeBenchmarkCard(e.target.checked)}
                    className="rounded border-gray-300 text-orange-600"
                  />
                  <span>Include Benchmark Spec &amp; Photo Box</span>
                </label>
              </div>
            )}
          </div>

          {/* Template & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="custom">
                  {isFollowUp
                    ? "Smart Follow-Up (Same Thread)"
                    : "Smart Brief-Personalized Inquiry (Recommended)"}
                </option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {channel === "email" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Subject Line (optional override)
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={previewSubject}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            )}
          </div>

          {templateId === "custom" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Custom Message Override (leave blank to use auto-personalized brief template below)
              </label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={isFollowUp ? DEFAULT_FOLLOWUP_BODY : DEFAULT_BODY}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-y"
              />
            </div>
          )}

          {/* Live Email Preview */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">
              Live Preview (for #{1} highest-scored supplier:{" "}
              <span className="text-gray-900">
                {firstMatch?.company_name ?? firstMatch?.supplier?.company_name}
              </span>
              )
            </p>
            <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
              {channel === "email" && (
                <div className="pb-2 border-b border-gray-200 text-gray-800">
                  <span className="text-gray-400 font-medium">Subject: </span>
                  <span className="font-semibold">{previewSubject}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">
                {previewBody}
              </div>

              {channel === "email" && includeBenchmarkCard && firstMatch?.request && (
                <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
                  {benchmarkImg && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={benchmarkImg}
                      alt="Benchmark"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                      Buyer Sourcing Brief Summary (Attached in Email)
                    </p>
                    <p>
                      <strong>Target Benchmark:</strong>{" "}
                      {firstMatch.request.product_name ?? firstMatch.product_name}
                    </p>
                    <p>
                      <strong>Matched Catalog Item:</strong>{" "}
                      {firstMatch.product_name ?? "—"}
                    </p>
                    <p>
                      <strong>Specs:</strong>{" "}
                      {buildSpecsSummary(firstMatch.request)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {whatsappState && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Opening WhatsApp for {whatsappState.company} in{" "}
              {whatsappState.countdown}s… ({whatsappState.index}/
              {whatsappState.total})
            </p>
          )}

          {results && (
            <div className="space-y-1 max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3">
              {results.map((r) => {
                const m = sortedMatches.find((mm) => mm.id === r.matchId);
                return (
                  <p key={r.matchId} className="text-xs">
                    {r.success ? "✅" : "❌"}{" "}
                    <span className="font-semibold">
                      {m?.company_name ?? m?.supplier?.company_name ?? r.matchId}
                    </span>
                    {r.emailUsed && (
                      <span className="text-slate-500">
                        {" "}
                        ({r.emailUsed} via {r.via})
                      </span>
                    )}
                    {r.error && (
                      <span className="text-red-600 font-medium">
                        {" "}
                        — {r.error}
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">
              Sent emails are logged in the Match Thread &amp; your Gmail Sent folder.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="text-xs font-bold px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition shadow-xs"
              >
                {sending
                  ? "Sending…"
                  : isFollowUp
                  ? `↻ Send Follow-Up (${sortedMatches.length})`
                  : `📧 Send Outreach (${sortedMatches.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  error?: string;
  url?: string;
  company_name?: string | null;
};

const DEFAULT_BODY =
  "Hi {{company_name}}, we're sourcing {{product_name}} for a buyer and would love to hear from you. Please reply with availability, pricing, and MOQ.";

function matchVars(m: MatchRow): Record<string, string> {
  return {
    company_name: m.company_name ?? "",
    product_name: m.product_name ?? "",
    country: m.country ?? "",
    match_score: String(m.match_score),
  };
}

export default function BulkOutreachModal({
  matches,
  templates,
  onClose,
  onDone,
}: {
  matches: MatchRow[];
  templates: EmailTemplateRow[];
  onClose: () => void;
  onDone: (matchIds: string[]) => void;
}) {
  const [channel, setChannel] = useState<Channel>("email");
  const [templateId, setTemplateId] = useState<string>("custom");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [whatsappState, setWhatsappState] = useState<{
    index: number;
    total: number;
    company: string;
    countdown: number;
  } | null>(null);

  const availableTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel || t.channel === "both"),
    [templates, channel]
  );

  const selectedTemplate = templateId === "custom" ? null : availableTemplates.find((t) => t.id === templateId) ?? null;

  const previewBody = useMemo(() => {
    const template = customMessage.trim() || selectedTemplate?.body || DEFAULT_BODY;
    return renderTemplate(template, matchVars(matches[0]));
  }, [customMessage, selectedTemplate, matches]);

  async function handleSend() {
    setSending(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/matches/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIds: matches.map((m) => m.id),
          channel,
          templateId: templateId === "custom" ? undefined : templateId,
          customMessage: customMessage.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { results?: BulkResult[]; error?: string };
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

      onDone(successful.map((r) => r.matchId));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Bulk outreach — {matches.length} match{matches.length !== 1 ? "es" : ""}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
            <div className="flex gap-2">
              {(["email", "whatsapp"] as Channel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setChannel(c);
                    setTemplateId("custom");
                  }}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                    channel === c
                      ? "bg-orange-50 border-orange-300 text-orange-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c === "email" ? "📧 Email" : "💬 WhatsApp"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="custom">Custom message</option>
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {templateId === "custom" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={DEFAULT_BODY}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-y"
              />
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">
              Preview (for {matches[0].company_name ?? "first supplier"})
            </p>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 whitespace-pre-wrap">
              {previewBody}
            </div>
          </div>

          {whatsappState && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Opening WhatsApp for {whatsappState.company} in {whatsappState.countdown}s… (
              {whatsappState.index}/{whatsappState.total})
            </p>
          )}

          {results && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.map((r) => {
                const m = matches.find((mm) => mm.id === r.matchId);
                return (
                  <p key={r.matchId} className="text-xs">
                    {r.success ? "✅" : "❌"} {m?.company_name ?? r.matchId}
                    {r.error && <span className="text-red-500"> — {r.error}</span>}
                  </p>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="text-sm px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition"
            >
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

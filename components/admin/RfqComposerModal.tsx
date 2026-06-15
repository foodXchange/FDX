"use client";

import { useMemo, useState } from "react";
import { renderTemplate } from "@/lib/outreach/renderTemplate";

export type RfqMatch = {
  id: string;
  company_name: string | null;
  product_name: string | null;
};

export type RfqTemplateRow = {
  id: string;
  name: string;
  subject: string | null;
  body: string;
};

export type RfqRequestVars = {
  buyer_company: string;
  product_name: string;
  volume: string;
  certifications: string;
  request_description: string;
};

type RfqResult = {
  matchId: string;
  company_name: string | null;
  success: boolean;
  error?: string;
};

const VARIABLE_HINTS = [
  "{{supplier_company}}",
  "{{buyer_company}}",
  "{{product_name}}",
  "{{volume}}",
  "{{deadline}}",
  "{{certifications}}",
  "{{request_description}}",
];

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function formatDeadline(deadline: string): string {
  if (!deadline) return "";
  return new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function RfqComposerModal({
  requestId,
  matches,
  templates,
  requestVars,
  onClose,
  onDone,
}: {
  requestId: string;
  matches: RfqMatch[];
  templates: RfqTemplateRow[];
  requestVars: RfqRequestVars;
  onClose: () => void;
  onDone: () => void;
}) {
  const firstTemplate = templates[0] ?? null;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(firstTemplate?.id ?? "");
  const [subject, setSubject] = useState(firstTemplate?.subject ?? "");
  const [body, setBody] = useState(firstTemplate?.body ?? "");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<RfqResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleTemplateChange(id: string) {
    setSelectedTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setSubject(template.subject ?? "");
      setBody(template.body);
    }
  }

  const previewMatch = matches[previewIndex] ?? matches[0];

  const previewVars = useMemo(
    () => ({
      ...requestVars,
      supplier_company: previewMatch?.company_name ?? "",
      product_name: previewMatch?.product_name || requestVars.product_name,
      deadline: formatDeadline(deadline),
    }),
    [previewMatch, requestVars, deadline]
  );

  const previewSubject = renderTemplate(subject, previewVars);
  const previewBody = renderTemplate(body, previewVars);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rfq/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          matchIds: matches.map((m) => m.id),
          subject,
          body,
          deadline,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { results?: RfqResult[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to send");
        return;
      }
      setResults(json.results ?? []);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Send RFQ to {matches.length} supplier{matches.length !== 1 ? "s" : ""}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        {results ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">
              ✓ {results.filter((r) => r.success).length} RFQ{results.filter((r) => r.success).length !== 1 ? "s" : ""} sent
              {results.some((r) => !r.success) && `, ${results.filter((r) => !r.success).length} failed`}
            </p>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {results.map((r) => (
                <div key={r.matchId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">{r.company_name ?? r.matchId}</span>
                  {r.success ? (
                    <span className="text-green-600 text-xs font-medium">✓ Sent</span>
                  ) : (
                    <span className="text-red-500 text-xs font-medium">✗ {r.error ?? "Failed"}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onDone}
                className="text-sm px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
              >
                Close
              </button>
              <a
                href="/admin/matches"
                className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                View match dashboard →
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  {templates.length === 0 && <option value="">No RFQ templates</option>}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-y font-mono"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Variables available: {VARIABLE_HINTS.join(" ")}
              </p>
            </div>

            {matches.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">
                    Preview ({previewIndex + 1} of {matches.length}): {previewMatch?.company_name ?? "—"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                      disabled={previewIndex === 0}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      ◀ Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((i) => Math.min(matches.length - 1, i + 1))}
                      disabled={previewIndex === matches.length - 1}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-800">{previewSubject}</p>
                  <hr className="border-gray-200" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewBody}</p>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="text-sm px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition"
              >
                {sending ? "Sending…" : `Send ${matches.length} RFQ${matches.length !== 1 ? "s" : ""} →`}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

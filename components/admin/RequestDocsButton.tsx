"use client";

import { useState } from "react";

const DOC_OPTIONS = [
  "Kosher certificate",
  "HACCP/ISO",
  "Product spec sheet",
  "Company brochure",
  "Product images",
  "Other",
];

export default function RequestDocsButton({ supplierId }: { supplierId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function toggleDoc(doc: string) {
    setSelected((prev) => (prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]));
  }

  function reset() {
    setSelected([]);
    setMessage("");
    setError(null);
    setSent(false);
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/supplier-actions/request-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, requestedDocs: selected, message }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to send request");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
      >
        Request docs
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            {sent ? (
              <div className="text-center py-4">
                <p className="text-lg font-semibold text-gray-900 mb-1">Request sent ✓</p>
                <p className="text-sm text-gray-500 mb-4">
                  The supplier will receive an email with a link to respond.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Request docs from supplier</h2>
                <p className="text-sm text-gray-500 mb-4">
                  We&apos;ll email them a link to upload files and reply — no login required.
                </p>

                <p className="text-xs font-medium text-gray-700 mb-2">What do you need?</p>
                <div className="flex flex-col gap-2 mb-4">
                  {DOC_OPTIONS.map((doc) => (
                    <label key={doc} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selected.includes(doc)}
                        onChange={() => toggleDoc(doc)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      {doc}
                    </label>
                  ))}
                </div>

                <label className="block text-xs font-medium text-gray-700 mb-1">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Add any extra context for the supplier…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setOpen(false);
                    }}
                    disabled={loading}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={loading}
                    className="text-sm bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Send request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

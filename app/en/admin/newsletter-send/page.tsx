"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Issue = {
  slug: string;
  title: string;
  created_at: string;
};

type SendResult = {
  ok: boolean;
  sent: number;
  failed: number;
  errors: string[];
  previewOnly: boolean;
};

export default function NewsletterSendPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewSent, setPreviewSent] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("newsletter_issues")
      .select("slug, title, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as Issue[];
        setIssues(rows);
        if (rows.length > 0) setSelectedSlug(rows[0].slug);
      });

    fetch("/api/newsletter/subscribers")
      .then((r) => r.json())
      .then((d: { count?: number }) => setSubscriberCount(d.count ?? 0))
      .catch(() => setSubscriberCount(0));
  }, []);

  async function handleSendPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlug || !previewEmail) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueSlug: selectedSlug, previewEmail }),
      });
      const data = (await res.json()) as SendResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Preview failed");
      } else {
        setPreviewSent(true);
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!selectedSlug || !confirmed) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueSlug: selectedSlug, confirmed: true }),
      });
      const data = (await res.json()) as SendResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Send failed");
      } else {
        setResult(data);
        setConfirmed(false);
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
  const cardCls = "bg-white border border-gray-200 rounded-2xl p-6 shadow-sm";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">
          Send Newsletter
        </span>
        <a
          href="/admin"
          className="text-xs text-slate-400 hover:text-slate-600 transition"
        >
          ← Admin
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Step 1 — Select issue */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            1 — Select issue
          </h2>
          {issues.length === 0 ? (
            <p className="text-sm text-gray-400">No published issues found</p>
          ) : (
            <select
              value={selectedSlug}
              onChange={(e) => {
                setSelectedSlug(e.target.value);
                setPreviewSent(false);
                setResult(null);
                setConfirmed(false);
              }}
              className={inputCls}
            >
              {issues.map((issue) => (
                <option key={issue.slug} value={issue.slug}>
                  {issue.title} —{" "}
                  {new Date(issue.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2 — Preview */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            2 — Send preview email
          </h2>
          <form onSubmit={handleSendPreview} className="flex gap-3">
            <input
              type="email"
              value={previewEmail}
              onChange={(e) => {
                setPreviewEmail(e.target.value);
                setPreviewSent(false);
              }}
              placeholder="your@email.com"
              className={`${inputCls} flex-1`}
            />
            <button
              type="submit"
              disabled={sending || !selectedSlug || !previewEmail}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 shrink-0"
            >
              {sending ? "Sending…" : "Send preview"}
            </button>
          </form>
          {previewSent && (
            <p className="text-sm text-green-600 mt-3 font-medium">
              ✓ Preview sent to {previewEmail}
            </p>
          )}
        </div>

        {/* Step 3 — Subscriber stats */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            3 — Subscriber stats
          </h2>
          {subscriberCount === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <p className="text-sm text-gray-700">
              <span className="text-2xl font-bold text-slate-900 mr-2">
                {subscriberCount}
              </span>
              active subscribers will receive this
            </p>
          )}
        </div>

        {/* Step 4 — Send for real */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            4 — Send to all subscribers
          </h2>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-orange-800 font-medium">
              ⚠️ This will send to ALL {subscriberCount ?? "?"} active
              subscribers. Make sure you have previewed the email first.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-gray-700">
              I have previewed the email and it looks correct
            </span>
          </label>

          <button
            onClick={handleSend}
            disabled={!confirmed || sending || !selectedSlug}
            className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Send newsletter"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`rounded-xl p-5 border ${
              result.ok
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {result.ok ? (
              <>
                <p className="text-green-800 font-semibold text-base mb-1">
                  ✓ Sent to {result.sent} subscriber
                  {result.sent !== 1 ? "s" : ""}
                </p>
                {result.failed > 0 && (
                  <p className="text-orange-700 text-sm">
                    ⚠️ {result.failed} failed — check Resend logs
                  </p>
                )}
              </>
            ) : (
              <p className="text-red-700 font-medium">
                Send failed: {result.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

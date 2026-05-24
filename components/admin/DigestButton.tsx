"use client";
import { useState } from "react";

type State = "idle" | "sending" | "sent" | "error";

export default function DigestButton() {
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setDetail(null);
    try {
      const res = await fetch("/api/admin/digest/send", { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string; requestCount?: number; pendingCount?: number };
      if (!res.ok || !data.ok) {
        setDetail(data.error ?? "Unknown error");
        setState("error");
        return;
      }
      setDetail(`${data.requestCount ?? 0} new · ${data.pendingCount ?? 0} pending`);
      setState("sent");
      setTimeout(() => {
        setState("idle");
        setDetail(null);
      }, 4000);
    } catch {
      setDetail("Network error");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {detail && (
        <span className={`text-xs ${state === "error" ? "text-red-500" : "text-green-600"}`}>
          {state === "sent" ? `✓ Sent — ${detail}` : detail}
        </span>
      )}
      <button
        onClick={send}
        disabled={state === "sending"}
        className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition"
      >
        {state === "sending" ? "Sending…" : state === "sent" ? "Sent ✓" : "Send digest"}
      </button>
    </div>
  );
}

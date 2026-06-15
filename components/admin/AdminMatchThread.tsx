"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  sender_id: string | null;
  sender_type: "buyer" | "supplier" | "admin";
  message: string;
  created_at: string;
}

const SENDER_LABEL: Record<Message["sender_type"], string> = {
  buyer: "Buyer",
  admin: "You",
  supplier: "Supplier",
};

const BUBBLE_CLASSES: Record<Message["sender_type"], string> = {
  buyer: "mr-auto bg-gray-100 text-gray-800",
  admin: "ml-auto bg-orange-500 text-white",
  supplier: "mr-auto bg-blue-100 text-blue-900",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMatchThread({ matchId }: { matchId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [forwardToSupplier, setForwardToSupplier] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (!active) return;
      if (res.ok) {
        const json = await res.json();
        setMessages((json.messages ?? []) as Message[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/match-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, message: trimmed, forwardToSupplier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Failed to send");
        return;
      }
      const sent = json.message as Message;
      setMessages((prev) => [...prev, sent]);
      setInput("");
      setForwardToSupplier(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">Messages</h2>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 mb-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${BUBBLE_CLASSES[m.sender_type]}`}>
              <p className="text-xs font-semibold mb-1 opacity-80">{SENDER_LABEL[m.sender_type]}</p>
              <p className="whitespace-pre-wrap">{m.message}</p>
              <p className="text-[10px] mt-1 opacity-60">{formatTimestamp(m.created_at)}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="Reply to buyer..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={forwardToSupplier}
            onChange={(e) => setForwardToSupplier(e.target.checked)}
            className="rounded border-gray-300"
          />
          Also forward this reply to the supplier
        </label>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50 transition"
        >
          {sending ? "Sending…" : "Send reply →"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  sender_type: "buyer" | "supplier" | "admin";
  message: string;
  created_at: string;
}

export default function MatchMessageThread({
  matchId,
  disabled,
  viewerRole,
  sendEndpoint,
}: {
  matchId: string;
  disabled: boolean;
  viewerRole: "supplier" | "buyer";
  sendEndpoint?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
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
    const supabase = createClient();
    const channel = supabase
      .channel(`match_messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as unknown as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const res = await fetch(sendEndpoint ?? `/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, message: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to send");
        return;
      }
      const sent = json.message as Message;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setInput("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <p className="text-sm text-slate-400">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.sender_type === viewerRole ? "ml-auto bg-orange-500/15 text-orange-100" : "bg-white/5 text-slate-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.message}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {new Date(m.created_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {disabled ? (
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-white/10">
          This match is closed — messaging is disabled.
        </p>
      ) : (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="dark-input resize-none flex-1"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-semibold transition shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

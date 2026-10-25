"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionPills?: { label: string; href: string }[];
}

function BotIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 01-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

export default function FoodXchangeCopilot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isHe = pathname.startsWith("/he");
  const isAdmin = pathname.startsWith("/admin");
  const isSupplier = pathname.includes("supplier") || pathname.startsWith("/factory");

  const role: "buyer" | "supplier" | "admin" = isAdmin ? "admin" : isSupplier ? "supplier" : "buyer";
  const lang: "he" | "en" = isHe ? "he" : "en";

  // Prompt suggestions based on context
  const suggestions = isHe
    ? [
        "איך מחושב סימון אדום לפי ת״י 1145?",
        "איך מזמינים דוגמאות טעימה למשרד?",
        "מחשבון עלות שער מחסן (Landed Cost)",
        "האם המפעלים מחזיקים בכשרות הרבנות?",
      ]
    : isSupplier
    ? [
        "Sample DHL invoice customs declaration",
        "Container pallet standards (20ft vs 40ft)",
        "Kosher batch supervision rules",
        "Payment security & 30/70 milestones",
      ]
    : [
        "How do I filter factories by kosher certs?",
        "How do tasting sample courier kits work?",
        "Landed cost simulator & CIF Haifa pricing",
        "Israeli Red Warning Badges requirements",
      ];

  const welcomeMessage = isHe
    ? "שלום! אני יועץ הסורסינג והרגולציה של FoodXchange. כיצד אוכל לסייע לך באיתור מפעלים אירופאים, הזמנת דוגמאות, או בדיקת תקינה?"
    : isSupplier
    ? "Welcome! I am the European Export Concierge for FoodXchange. Ask me about quoting CIF Haifa, customs waivers for DHL samples, kosher supervision, or payment terms."
    : "Welcome to FoodXchange! Ask me anything about factory discovery, tasting samples, Israeli food import compliance, or container logistics.";

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMessage,
        },
      ]);
    }
  }, [welcomeMessage, messages.length]);

  useEffect(() => {
    const handleCustomOpen = () => setIsOpen(true);
    window.addEventListener("fdx:open-copilot", handleCustomOpen);
    return () => window.removeEventListener("fdx:open-copilot", handleCustomOpen);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          role,
          lang,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Copilot response error");

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I am available to assist you with any sourcing question.",
        actionPills: data.actionPills,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: isHe
            ? "מצטער, חלה שגיאה זמנית בתקשורת. אנא נסה שוב או פנה אלינו בכתובת desk@fdx.trading."
            : "Sorry, a temporary communication error occurred. Please try again or reach out to desk@fdx.trading.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop when open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 sm:hidden no-print"
        />
      )}

      <div
        className={`fixed ${
          isOpen
            ? "inset-x-0 bottom-0 sm:bottom-6 sm:inset-x-auto z-50"
            : `bottom-20 sm:bottom-6 z-30 sm:z-50`
        } ${isHe ? "sm:left-6" : "sm:right-6"} no-print`}
      >
        {/* ── EXPANDED CHAT DRAWER (BOTTOM SHEET ON MOBILE) ── */}
        {isOpen ? (
          <div
            className={`w-full sm:w-[420px] h-[85vh] sm:h-[550px] max-h-[85vh] bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl ${
              isHe ? "rtl" : "ltr"
            }`}
            dir={isHe ? "rtl" : "ltr"}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>FoodXchange AI Copilot</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-slate-400">
                  {isAdmin
                    ? "Deal Desk & SOP Assistant"
                    : isSupplier
                    ? "European Factory Export Concierge"
                    : "יועץ סורסינג ורגולציית יבוא"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Copilot"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 text-xs leading-relaxed">
            {messages.map((m) => {
              const isBot = m.role === "assistant";
              return (
                <div key={m.id} className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap ${
                      isBot
                        ? "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-xs shadow-xs"
                        : "bg-amber-500 text-slate-950 font-medium rounded-tr-xs shadow-xs"
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Smart Action Buttons */}
                  {m.actionPills && m.actionPills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.actionPills.map((pill, idx) => (
                        <Link
                          key={idx}
                          href={pill.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 text-[10px] font-semibold transition"
                        >
                          <span>{pill.label}</span>
                          <span className="text-[9px]">↗</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                <span>{isHe ? "מנסח תשובה מקצועית..." : "Analyzing trade database..."}</span>
              </div>
            )}
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/40 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isHe ? "שאל כל שאלה על סורסינג, מכולות, או כשרות..." : "Ask about factories, CIF quotes, or samples..."}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={isHe ? "שלח שאלה" : "Send message"}
            >
              <SendIcon className={`w-4 h-4 ${isHe ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      ) : (
        /* ── COLLAPSED FLOATING PILL ── */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold text-xs shadow-xl hover:shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/40"
        >
          <div className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
            <BotIcon className="w-3.5 h-3.5" />
          </div>
          <span>
            {isHe
              ? "שאל את יועץ הרכש של FDX 🤖"
              : isSupplier
              ? "Export Concierge AI 🤖"
              : "Ask FoodXchange AI 🤖"}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
        </button>
      )}
      </div>
    </>
  );
}

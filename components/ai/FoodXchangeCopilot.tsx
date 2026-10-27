"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionPills?: { label: string; href: string }[];
}

function BotAvatar({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`${className} rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-amber-400 text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
      <span>🤖</span>
    </div>
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

function ResetIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

/**
 * Parses markdown inline formatted text into interactive JSX elements (links, bold, code chips)
 */
function FormattedMessageContent({ content, onNavigate }: { content: string; onNavigate: () => void }) {
  const parts = useMemo(() => {
    // Regex matches [Link text](url) or **bold** or `code`
    const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
    const tokens = content.split(regex);

    return tokens.map((token, i) => {
      // Check for markdown link [Label](url)
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const href = linkMatch[2];
        const isInternal = href.startsWith("/");
        if (isInternal) {
          return (
            <Link
              key={i}
              href={href}
              onClick={onNavigate}
              className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2 py-0.5 rounded-md text-xs transition duration-150 mx-0.5"
            >
              <span>{label}</span>
              <span className="text-[10px] opacity-75">↗</span>
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 underline mx-0.5"
          >
            <span>{label}</span>
            <span className="text-[10px]">↗</span>
          </a>
        );
      }

      // Check for bold **text**
      const boldMatch = token.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {boldMatch[1]}
          </strong>
        );
      }

      // Check for inline `code`
      const codeMatch = token.match(/^`([^`]+)`$/);
      if (codeMatch) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200/60">
            {codeMatch[1]}
          </code>
        );
      }

      return <span key={i}>{token}</span>;
    });
  }, [content, onNavigate]);

  return <div className="space-y-1.5 leading-relaxed">{parts}</div>;
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

  const suggestions = isHe
    ? [
        "איך מתחילים דרישת רכש עם בינה חזותית?",
        "איך מחושב סימון אדום לפי ת״י 1145?",
        "איך שולחים ערכת דוגמאות טעימה ב-DHL?",
        "איך עובד סימולטור רווחיות ומכולה מעורבת?",
      ]
    : isAdmin
    ? [
        "How do I run machine vision on product packaging?",
        "How do I track sample kit delivery & customs waivers?",
        "Where do I simulate container pallets and freight?",
        "How do I filter products by BRC/IFS & Kosher Badatz?",
      ]
    : [
        "How do I request physical tasting sample kits?",
        "What are Israeli SI 1145 front-of-pack red badges?",
        "How do I calculate CIF Haifa/Ashdod landed cost?",
        "How to verify Kosher Badatz / Chief Rabbinate certs?",
      ];

  const initialWelcome = useMemo(() => {
    if (isHe) {
      return `שלום! אני **FoodXchange AI Copilot** 🤖.
אני כאן כדי לסייע לך לאתר מפעלי מזון אירופאים, להפעיל סריקת בינה חזותית על אריזות, לבדוק תקינת ת״י 1145 וכשרויות, או לתכנן שילוח מכולה.

במה אוכל להדריך אותך היום?`;
    }
    if (isAdmin) {
      return `Welcome to **FoodXchange Deal Desk AI** 🤖.
I can guide you step-by-step through our [✨ Machine Vision Intake](/admin/requests/new), [🎯 Deal Pipeline](/admin/pipeline), [📦 Samples Desk](/admin/samples), or [🔬 SI 1145 Label Checker](/admin/tools/spec-extractor).

Ask me anything about starting requests, buyer proposals, or supplier matchmaking!`;
    }
    return `Welcome to **FoodXchange AI** 🤖!
I am your interactive food sourcing concierge. Ask me how to find verified European factories, order free tasting sample kits, calculate CIF landed cost, or verify kosher import standards.`;
  }, [isHe, isAdmin]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: initialWelcome,
        },
      ]);
    }
  }, [initialWelcome, messages.length]);

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

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: initialWelcome,
      },
    ]);
  };

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
            ? "מצטער, חלה שגיאה זמנית בתקשורת. ניתן לפנות לדסק בכתובת desk@fdx.trading או לנסות שנית."
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 sm:hidden no-print transition-opacity"
        />
      )}

      <div
        className={`fixed ${
          isOpen
            ? "inset-x-0 bottom-0 sm:bottom-6 sm:inset-x-auto z-50"
            : "bottom-4 sm:bottom-5 z-30 sm:z-40"
        } ${isHe ? "sm:left-6" : "sm:right-6"} no-print`}
      >
        {/* ── EXPANDED CHAT DRAWER (INTERCOM MODERN LIGHT THEME) ── */}
        {isOpen ? (
          <div
            className={`w-full sm:w-[410px] h-[82vh] sm:h-[560px] max-h-[85vh] bg-slate-50/98 border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-200 ${
              isHe ? "rtl font-sans" : "ltr font-sans"
            }`}
            dir={isHe ? "rtl" : "ltr"}
          >
            {/* Mobile Drag Pill */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

            {/* Intercom-Style Header */}
            <div className="bg-white/95 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <BotAvatar className="w-8 h-8" />
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    FoodXchange AI Copilot
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {isHe ? "זמין כעת • מענה מקצועי" : "Online • Instant trade guidance"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={isHe ? "שיחה חדשה" : "Reset chat"}
                >
                  <ResetIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={isHe ? "סגור" : "Close chat"}
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Canvas */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 text-[13px] leading-relaxed">
              {messages.map((m) => {
                const isBot = m.role === "assistant";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isBot ? "items-start" : "items-end justify-end"}`}
                  >
                    {isBot && (
                      <div className="shrink-0 pt-0.5">
                        <BotAvatar className="w-6 h-6 text-[10px]" />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 max-w-[85%]">
                      <div
                        className={`p-3.5 whitespace-pre-wrap ${
                          isBot
                            ? "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-xs shadow-xs"
                            : "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-2xl rounded-tr-xs shadow-xs"
                        }`}
                      >
                        {isBot ? (
                          <FormattedMessageContent
                            content={m.content}
                            onNavigate={() => setIsOpen(false)}
                          />
                        ) : (
                          <span>{m.content}</span>
                        )}
                      </div>

                      {/* Embedded Action Navigation Pills */}
                      {m.actionPills && m.actionPills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {m.actionPills.map((pill, idx) => (
                            <Link
                              key={idx}
                              href={pill.href}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs font-semibold shadow-xs transition duration-150 cursor-pointer"
                            >
                              <span>{pill.label}</span>
                              <span className="text-orange-500 text-[10px]">↗</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <BotAvatar className="w-6 h-6 text-[10px]" />
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-2 text-slate-500 text-xs">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="font-medium text-slate-600">
                      {isHe ? "מנתח נתוני סורסינג ורגולציה..." : "Analyzing trade database..."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="px-3.5 py-2.5 border-t border-slate-200/80 bg-white/70 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
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
                placeholder={
                  isHe
                    ? "שאל אותי כל דבר (סורסינג, תקינה, דוגמאות טעימה, מכולות)..."
                    : "Ask about machine vision, factory matching, sample kits, or landed cost..."
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
                title={isHe ? "שלח" : "Send message"}
              >
                <SendIcon className={`w-4 h-4 ${isHe ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>
        ) : (
          /* ── COMPACT FLOATING BANNER (CLEAN & MINIMAL, NO REDUNDANT EMOJIS/DOTS) ── */
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold shadow-md hover:shadow-lg border border-slate-200/90 hover:border-orange-300 transition-all cursor-pointer backdrop-blur-xs group active:scale-95"
            title="Ask FDX AI"
          >
            <BotAvatar className="w-4 h-4 text-[9px]" />
            <span className="group-hover:text-orange-600 transition-colors">
              {isHe ? "שאל את FDX AI" : "Ask FDX AI"}
            </span>
          </button>
        )}
      </div>
    </>
  );
}

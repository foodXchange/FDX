"use client";

import { useState, useEffect } from "react";

interface ScriptGeneratorProps {
  defaultTopic?: string;
  open?: boolean;
  onClose?: () => void;
}

type Audience = "buyers" | "manufacturers" | "both";
type Language = "hebrew" | "english" | "both";
type Format = "short" | "medium" | "long";
type Tone = "authoritative" | "conversational" | "provocative";

const AUDIENCE_OPTIONS: { id: Audience; label: string; sub: string }[] = [
  { id: "buyers", label: "🛒 Israeli Buyers", sub: "Hebrew · Instagram · WhatsApp" },
  { id: "manufacturers", label: "🏭 Manufacturers", sub: "English · LinkedIn · YouTube" },
  { id: "both", label: "👥 Both audiences", sub: "Generate two versions" },
];

const FORMAT_OPTIONS: { id: Format; label: string }[] = [
  { id: "short", label: "60s · Instagram" },
  { id: "medium", label: "90s · LinkedIn" },
  { id: "long", label: "3min · YouTube" },
];

const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: "hebrew", label: "Hebrew" },
  { id: "english", label: "English" },
  { id: "both", label: "Both" },
];

const TONE_OPTIONS: { id: Tone; label: string }[] = [
  { id: "authoritative", label: "🎓 Authoritative" },
  { id: "conversational", label: "💬 Conversational" },
  { id: "provocative", label: "🔥 Provocative" },
];

const SECTION_HEADERS = ["HOOK", "BODY", "CTA", "DELIVERY NOTES", "CAPTION"];

function renderScriptLine(line: string): React.ReactNode {
  const isHeader = SECTION_HEADERS.some((h) => line.toUpperCase().startsWith(h));
  if (isHeader) {
    return <span className="text-orange-600 font-bold">{line}</span>;
  }

  const parts: React.ReactNode[] = [];
  const bracketRegex = /(\[[^\]]+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = bracketRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-blue-600 italic">
        {match[1]}
      </span>
    );
    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : line;
}

function renderScript(script: string): React.ReactNode {
  return script.split("\n").map((line, i) => (
    <span key={i}>
      {renderScriptLine(line)}
      {"\n"}
    </span>
  ));
}

export default function ScriptGenerator({
  defaultTopic,
  open: controlledOpen,
  onClose,
}: ScriptGeneratorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [audience, setAudience] = useState<Audience>("buyers");
  const [language, setLanguage] = useState<Language>("hebrew");
  const [format, setFormat] = useState<Format>("medium");
  const [tone, setTone] = useState<Tone>("conversational");
  const [productContext, setProductContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultTopic !== undefined) setTopic(defaultTopic);
  }, [defaultTopic]);

  useEffect(() => {
    if (audience === "buyers") setLanguage("hebrew");
    else if (audience === "manufacturers") setLanguage("english");
    else setLanguage("both");
  }, [audience]);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  function handleClose() {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  }

  async function generateScript() {
    setGenerating(true);
    setScript("");
    setError(null);

    try {
      const res = await fetch("/api/admin/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          audience,
          language,
          format,
          tone,
          product_context: productContext || undefined,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setScript(full);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function copyScript() {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyCaptionOnly() {
    const captionMatch = script.match(/CAPTION[:\s]+\n?([\s\S]+)$/i);
    if (captionMatch) {
      navigator.clipboard.writeText(captionMatch[1].trim()).then(() => {
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
      });
    }
  }

  const isRtl = /[֐-׿]/.test(script);

  return (
    <>
      {/* Trigger button (self-contained mode only) */}
      {!isControlled && (
        <button
          type="button"
          onClick={() => setInternalOpen(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          🎬 Generate video script
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  🎬 Video Script Generator
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Talking-head script — read directly to camera
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none transition"
              >
                ×
              </button>
            </div>

            {/* Form + output (scrollable) */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Topic */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    What do you want to talk about?
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={3}
                    placeholder={
                      "e.g. Why Italian olive oil is better value than Spanish right now\n" +
                      "· How to get kosher certification for export to Israel\n" +
                      "· 3 products Israeli retailers should be importing but aren't"
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition resize-none"
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Who is this for?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAudience(opt.id)}
                        className={`rounded-xl p-3 text-center cursor-pointer transition border-2 ${
                          audience === opt.id
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className="text-sm font-semibold">{opt.label}</div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            audience === opt.id ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {opt.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language + Format */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Language
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setLanguage(opt.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            language === opt.id
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Length
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {FORMAT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormat(opt.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            format === opt.id
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Tone
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTone(opt.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          tone === opt.id
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product context */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Product or context (optional)
                  </label>
                  <textarea
                    value={productContext}
                    onChange={(e) => setProductContext(e.target.value)}
                    rows={2}
                    placeholder="e.g. We are currently sourcing 750ml kosher olive oil for a major Israeli retailer · Canoliva from Spain, BRC + IFS certified"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition resize-none"
                  />
                </div>

                {/* Generate button */}
                <button
                  type="button"
                  onClick={generateScript}
                  disabled={generating || topic.trim().length < 5}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-base transition flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Writing your script...
                    </>
                  ) : (
                    "🎬 Generate script"
                  )}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Script output */}
              {(script.length > 0 || generating) && (
                <div className="px-5 pb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Generated script
                  </p>
                  <div
                    dir={isRtl ? "rtl" : "ltr"}
                    className="bg-slate-50 rounded-xl p-5 font-mono text-sm text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto"
                  >
                    {renderScript(script)}
                    {generating && (
                      <span className="animate-pulse text-slate-400">▌</span>
                    )}
                  </div>

                  {!generating && script.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        type="button"
                        onClick={copyScript}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm transition"
                      >
                        {copied ? "Copied! ✓" : "Copy script"}
                      </button>
                      <button
                        type="button"
                        onClick={copyCaptionOnly}
                        className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-3 rounded-xl text-sm transition"
                      >
                        {copiedCaption ? "Copied! ✓" : "Copy caption only"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScript("");
                          setTopic(defaultTopic ?? "");
                        }}
                        className="text-slate-400 hover:text-slate-600 text-sm px-4 py-3 transition"
                      >
                        New script
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

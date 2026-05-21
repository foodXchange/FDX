"use client";

import { useState } from "react";

interface Props {
  requestId: string;
  productName: string | null;
}

type Platform = "linkedin" | "whatsapp" | "email";

type GenerateResult = {
  post: string;
  imageBrief: string | null;
  whatsappVersion: string | null;
  platform: Platform;
};

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
];

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function PostGenerator({ requestId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedImageBrief, setCopiedImageBrief] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, platform }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }

      setResult(data as GenerateResult);
    } catch {
      setError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  }

  function openLinkedIn() {
    if (result?.post) {
      navigator.clipboard.writeText(result.post);
    }
    window.open("https://www.linkedin.com/feed/", "_blank");
  }

  const postLabel =
    platform === "linkedin"
      ? "LinkedIn post"
      : platform === "whatsapp"
      ? "WhatsApp message"
      : "Email";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition w-full justify-center"
      >
        <LinkedInIcon />
        Generate post
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Generate content</p>
                {productName && (
                  <p className="text-xs text-slate-400 mt-0.5">{productName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none transition"
              >
                ×
              </button>
            </div>

            {/* Platform tabs */}
            <div className="flex gap-2 px-5 pt-4 shrink-0">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatform(p.id);
                    setResult(null);
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    platform === p.id
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Generate button */}
            <div className="px-5 pt-4 shrink-0">
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  `✦ Generate ${platform.charAt(0).toUpperCase() + platform.slice(1)} post`
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mt-3 shrink-0 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Result area */}
            {result && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Main post */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {postLabel}
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans min-h-[160px]">
                    {result.post}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(result.post, setCopied)}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
                  >
                    {copied ? "Copied! ✓" : "Copy post"}
                  </button>
                </div>

                {/* Image brief (LinkedIn only) */}
                {result.imageBrief && platform === "linkedin" && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Image brief (for Midjourney / Ideogram)
                    </p>
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800 italic leading-relaxed">
                      {result.imageBrief}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <a
                        href="https://www.midjourney.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-3 py-2 rounded-lg transition"
                      >
                        Open Midjourney →
                      </a>
                      <a
                        href="https://ideogram.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-3 py-2 rounded-lg transition"
                      >
                        Open Ideogram →
                      </a>
                      <button
                        type="button"
                        onClick={() => copyText(result.imageBrief!, setCopiedImageBrief)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 rounded-lg transition"
                      >
                        {copiedImageBrief ? "Copied! ✓" : "Copy brief"}
                      </button>
                    </div>
                  </div>
                )}

                {/* WhatsApp version (LinkedIn only) */}
                {result.whatsappVersion && platform === "linkedin" && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      WhatsApp broadcast version
                    </p>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {result.whatsappVersion}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(result.whatsappVersion!, setCopiedWhatsapp)}
                      className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
                    >
                      {copiedWhatsapp ? "Copied! ✓" : "Copy WhatsApp message"}
                    </button>
                  </div>
                )}

                {/* Open in LinkedIn button */}
                {platform === "linkedin" && (
                  <button
                    type="button"
                    onClick={openLinkedIn}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition"
                  >
                    <LinkedInIcon />
                    Copy &amp; open LinkedIn
                  </button>
                )}

              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { PROMPTS } from "@/components/admin/IdeogramModal";

interface Props {
  categories: string[];
  images: Record<string, string | null>;
  onClose: () => void;
}

export default function IdeogramDrawer({ categories, images, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPrompt(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyAll() {
    const neededPrompts = PROMPTS.filter((p) => !images[p.category]);
    const all = neededPrompts
      .map((p, i) => `${i + 1}. ${p.category}\n${p.prompt}`)
      .join("\n\n");
    await copyPrompt("all", all);
  }

  const needed = categories.filter((c) => !images[c]);
  const done = categories.filter((c) => !!images[c]);

  // Build a map from category to prompt for quick lookup
  const promptMap = Object.fromEntries(PROMPTS.map((p) => [p.category, p.prompt]));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Generate all 17 images
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] shrink-0">
              1
            </span>
            <span>Generate</span>
            <span className="text-slate-300">→</span>
            <span className="bg-slate-200 text-slate-600 rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] shrink-0">
              2
            </span>
            <span>Copy URL</span>
            <span className="text-slate-300">→</span>
            <span className="bg-slate-200 text-slate-600 rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] shrink-0">
              3
            </span>
            <span>Ctrl+V here</span>
          </div>

          {needed.length > 0 && (
            <button
              type="button"
              onClick={copyAll}
              className="mt-3 w-full text-xs border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 py-2 rounded-xl transition"
            >
              {copied === "all"
                ? "✓ Copied all needed prompts"
                : `Copy all ${needed.length} needed prompts`}
            </button>
          )}
        </div>

        {/* Scrollable prompt list */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Needed first */}
          {needed.length > 0 && (
            <div>
              <p className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Needs image ({needed.length})
              </p>
              {needed.map((cat) => {
                const prompt = promptMap[cat] ?? "";
                return (
                  <PromptRow
                    key={cat}
                    category={cat}
                    prompt={prompt}
                    done={false}
                    copied={copied}
                    onCopy={(key, text) => copyPrompt(key, text)}
                  />
                );
              })}
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div>
              <p className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Done ({done.length})
              </p>
              {done.map((cat) => {
                const prompt = promptMap[cat] ?? "";
                return (
                  <PromptRow
                    key={cat}
                    category={cat}
                    prompt={prompt}
                    done={true}
                    copied={copied}
                    onCopy={(key, text) => copyPrompt(key, text)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky bottom reminder */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-4 bg-orange-50">
          <p className="text-xs text-orange-700 leading-relaxed">
            💡 Copy any Ideogram URL then press{" "}
            <kbd className="bg-white border border-orange-200 text-orange-800 text-[10px] px-1 py-0.5 rounded font-mono">
              Ctrl+V
            </kbd>{" "}
            anywhere on this page to assign it instantly.
          </p>
        </div>
      </div>
    </>
  );
}

interface PromptRowProps {
  category: string;
  prompt: string;
  done: boolean;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}

function PromptRow({ category, prompt, done, copied, onCopy }: PromptRowProps) {
  return (
    <div
      className={`px-5 py-3 border-b border-slate-50 flex items-start gap-3 ${
        done ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
          done
            ? "bg-green-500 border-green-500"
            : "border-slate-300"
        }`}
      >
        {done && (
          <span className="text-white text-[9px] font-bold leading-none">✓</span>
        )}
      </div>

      {/* Category + status + actions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`text-sm font-semibold ${done ? "text-slate-500" : "text-slate-800"}`}>
            {category}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
              done
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {done ? "✓ Done" : "✗ Needed"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onCopy(category, prompt)}
            className="text-[11px] border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 px-2 py-0.5 rounded-lg transition"
          >
            {copied === category ? "✓ Copied" : "Copy prompt"}
          </button>
          <a
            href="https://ideogram.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-orange-600 transition py-0.5"
          >
            Open ↗
          </a>
        </div>
      </div>
    </div>
  );
}
